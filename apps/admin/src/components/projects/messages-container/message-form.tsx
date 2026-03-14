import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpIcon, Loader2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Form, FormField } from "@acme/ui/form";

import { ModelSelectForm } from "~/components/forms/model-select-form";
import { useTRPC } from "~/trpc/react";

interface Props {
  projectId: string;
}

const formSchema = z.object({
  value: z
    .string()
    .min(1, { message: "Value is required" })
    .max(1000, { message: "Value is too long" }),
  model: z.string(),
});

function MessageForm({ projectId }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: "",
    },
  });

  const createMessage = useMutation(
    trpc.messages.create.mutationOptions({
      onSuccess: () => {
        form.reset();
        queryClient.invalidateQueries(
          trpc.messages.getMany.queryOptions({ projectId }),
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createMessage.mutateAsync({
      value: values.value,
      projectId,
      model: values.model,
    });
  };

  const [isFocused, setIsFocused] = useState(false);
  const isPending = createMessage.isPending;
  const isButtonDisabled = isPending || !form.formState.isValid;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "bg-card/80 relative rounded-xl border backdrop-blur-sm transition-all duration-200",
          isFocused
            ? "border-amber-500/30 ring-1 ring-amber-500/20"
            : "border-border/60",
        )}
      >
        <div className="px-3 pt-3 pb-0">
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <TextareaAutosize
                {...field}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={isPending}
                minRows={1}
                maxRows={6}
                className="placeholder:text-muted-foreground/60 w-full resize-none border-none bg-transparent text-sm leading-relaxed outline-none"
                placeholder="Ask VibeCoding to build something..."
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

        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <ModelSelectForm
            value={form.watch("model")}
            onChange={(model) => {
              form.setValue("model" as any, model as any, {
                shouldDirty: true,
              });
            }}
          />
          <Button
            disabled={isButtonDisabled}
            size="icon"
            className={cn(
              "h-7 w-7 rounded-lg transition-all",
              isButtonDisabled
                ? "bg-muted text-muted-foreground"
                : "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700",
            )}
          >
            {isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <ArrowUpIcon className="size-3.5" />
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default MessageForm;
