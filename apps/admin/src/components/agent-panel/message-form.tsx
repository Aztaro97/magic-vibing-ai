
"use client";

 import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Form, FormField } from "@acme/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpIcon, Loader2Icon } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import TextareaAutosize from "react-textarea-autosize";
import { z } from "zod";
import { ModelSelectForm } from "../forms/model-select-form";

 
const schema = z.object({
  value: z.string().min(1, "Message cannot be empty"),
  model: z.string().default("claude-sonnet-4-6"),
});
type FormValues = z.infer<typeof schema>;
 
interface Props {
  projectId:     string;
  isPending:     boolean;
  model:         string;
  onModelChange: (model: string) => void;
  onSubmit:      (value: string) => void;
}
 
export function MessageForm({ isPending, model, onModelChange, onSubmit }: Props) {
  const [isFocused, setIsFocused] = React.useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { value: "", model },
  });
 
  function handleSubmit(data: FormValues) {
    onSubmit(data.value);
    form.reset({ value: "", model: data.model });
  }
 
  const isButtonDisabled = isPending || !form.watch("value").trim();
 
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn(
          "rounded-xl border bg-background shadow-sm transition-shadow",
          isFocused && !isPending
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
                    form.handleSubmit(handleSubmit)(e);
                  }
                }}
              />
            )}
          />
        </div>
 
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <ModelSelectForm
            value={form.watch("model")}
            onChange={(m) => {
              form.setValue("model", m, { shouldDirty: true });
              onModelChange(m);
            }}
          />
          <Button
            type="submit"
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
 