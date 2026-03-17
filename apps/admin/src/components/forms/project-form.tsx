"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpIcon, Loader2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { z } from "zod";

import { DEFAULT_MODEL } from "@acme/agents/constants";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Form, FormField } from "@acme/ui/form";

import { ModelSelectForm } from "~/components/forms/model-select-form";
import { PROJECT_TEMPLATES } from "~/constants/data";
import { useTRPC } from "~/trpc/react";

const formSchema = z.object({
  value: z
    .string()
    .min(1, { message: "Value is required" })
    .max(1000, { message: "Value is too long" }),
  model: z.string(),
});

function ProjectForm() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: "",
      model: DEFAULT_MODEL,
    },
  });

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        router.push(`/project/${data.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    createProject.mutate({
      value: values.value,
      model: values.model,
    });
  };

  const onSelect = (value: string) => {
    form.setValue("value", value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const [isFocused, setIsFocused] = useState(false);
  const isPending = createProject.isPending;
  const isButtonDisabled = isPending || !form.formState.isValid;

  return (
    <Form {...form}>
      <section className="space-y-5">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn(
            "bg-card/80 relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-200",
            isFocused
              ? "border-amber-500/30 shadow-lg ring-1 shadow-amber-500/5 ring-amber-500/20"
              : "border-border/60 shadow-sm",
          )}
        >
          <div className="p-4 pb-0">
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <TextareaAutosize
                  {...field}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  disabled={isPending}
                  minRows={3}
                  maxRows={8}
                  className="placeholder:text-muted-foreground/60 w-full resize-none border-none bg-transparent text-[15px] leading-relaxed outline-none"
                  placeholder="Describe what you want to build..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      form.handleSubmit(onSubmit)(e);
                    }
                  }}
                />
              )}
            />
          </div>

          <div className="flex items-center justify-between gap-2 p-3 pt-2">
            <div className="flex items-center gap-1">
              <ModelSelectForm
                value={form.watch("model")}
                onChange={(model) => {
                  form.setValue("model" as any, model as any, {
                    shouldDirty: true,
                  });
                }}
              />
            </div>
            <Button
              disabled={isButtonDisabled}
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg transition-all",
                isButtonDisabled
                  ? "bg-muted text-muted-foreground"
                  : "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm hover:from-amber-600 hover:to-orange-700",
              )}
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <ArrowUpIcon className="size-4" />
              )}
            </Button>
          </div>
        </form>

        {/* Template suggestions */}
        <div className="hidden flex-wrap justify-center gap-2 md:flex">
          {PROJECT_TEMPLATES.map((template) => (
            <button
              key={template.title}
              type="button"
              className={cn(
                "text-muted-foreground hover:text-foreground hover:bg-muted/80",
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs",
                "transition-all duration-150 hover:shadow-sm",
              )}
              onClick={() => onSelect(template.prompt)}
            >
              <span>{template.emoji}</span>
              <span>{template.title}</span>
            </button>
          ))}
        </div>
      </section>
    </Form>
  );
}

export default ProjectForm;
