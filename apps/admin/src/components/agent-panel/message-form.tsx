"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import TextareaAutosize from "react-textarea-autosize";
import { z } from "zod";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Form, FormField } from "@acme/ui/form";

import { ModelSelectForm } from "../forms/model-select-form";

const schema = z.object({
  value: z.string().min(1, "Message cannot be empty"),
  model: z.string().default("claude-sonnet-4-6"),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  projectId: string;
  isPending: boolean;
  model: string;
  onModelChange: (model: string) => void;
  onSubmit: (value: string) => void;
  onStop?: () => void;
}

export function MessageForm({
  isPending,
  model,
  onModelChange,
  onSubmit,
  onStop,
}: Props) {
  const [isFocused, setIsFocused] = React.useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { value: "", model },
  });

  function handleSubmit(data: FormValues) {
    onSubmit(data.value);
    form.reset({ value: "", model: data.model });
  }

  const isSendDisabled = isPending || !form.watch("value").trim();

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn(
          "bg-background rounded-xl border shadow-sm transition-shadow",
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

          {/* Stop button replaces send while the agent is running */}
          {isPending && onStop ? (
            <Button
              type="button"
              onClick={onStop}
              size="icon"
              className="h-7 w-7 cursor-pointer rounded-lg bg-destructive/90 text-white transition-all hover:bg-destructive"
              title="Stop generation"
            >
              <SquareIcon className="size-3 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isSendDisabled}
              size="icon"
              className={cn(
                "h-7 w-7 rounded-lg transition-all",
                isSendDisabled
                  ? "bg-muted text-muted-foreground"
                  : "cursor-pointer bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700",
              )}
            >
              <ArrowUpIcon className="size-3.5" />
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
