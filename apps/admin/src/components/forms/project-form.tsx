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

  const onSubmit = async (vlaues: z.infer<typeof formSchema>) => {
    console.log("Submitting project: " + vlaues.value);
    createProject.mutate({
      value: vlaues.value,
      model: vlaues.model,
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
      <section className="space-y-6">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn(
            "bg-sidebar dark:bg-sidebar relative rounded-xl border p-4 pt-1 transition-all",
            isFocused && "shadow-xs",
          )}
        >
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <TextareaAutosize
                {...field}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={isPending}
                minRows={2}
                maxRows={8}
                className="w-full resize-none border-none bg-transparent pt-4 outline-none"
                placeholder="What would you like to build?"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    form.handleSubmit(onSubmit)(e);
                  }
                }}
              />
            )}
          />

          <div className="flex items-end justify-between gap-x-2 pt-2">
            <ModelSelectForm
              value={form.watch("model")}
              onChange={(model) => {
                console.log("Model changed: " + model);
                form.setValue("model" as any, model as any, {
                  shouldDirty: true,
                });
              }}
            />
            <Button
              disabled={isButtonDisabled}
              className={cn(
                "size-8 rounded-full",
                isButtonDisabled && "bg-muted-foreground border",
              )}
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <ArrowUpIcon />
              )}
            </Button>
          </div>
        </form>
        <div className="hidden max-w-3xl flex-wrap justify-center gap-2 md:flex">
          {PROJECT_TEMPLATES.map((template) => (
            <Button
              key={template.title}
              variant="outline"
              size="sm"
              className="dark:bg-sidebar bg-white"
              onClick={() => onSelect(template.prompt)}
            >
              {template.emoji} {template.title}
            </Button>
          ))}
        </div>
      </section>
    </Form>
  );
}

export default ProjectForm;
