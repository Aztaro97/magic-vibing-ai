"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  ErrorModal,
  useErrorNotifications,
} from "@acme/error-handler/client";
import type { ErrorNotification } from "@acme/error-handler/shared";

import { useTRPC } from "~/trpc/react";

interface Props {
  projectId: string;
}

export function ErrorNotificationContainer({ projectId }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createMessage = useMutation(
    trpc.messages.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.messages.getMany.queryOptions({ projectId }),
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const {
    isModalOpen,
    errorModalData,
    handleCloseModal,
    handleSendToFix,
    errors,
    openErrorModal,
  } = useErrorNotifications(projectId, {
    onSendToFix: (errorMessage) => {
      createMessage.mutate({
        value: errorMessage,
        projectId,
        model: "",
      });
    },
    deduplicate: true,
  });

  // Show toast for new errors
  const lastShownRef = { current: 0 };
  if (errors.length > lastShownRef.current) {
    const newErrors = errors.slice(lastShownRef.current);
    lastShownRef.current = errors.length;
    for (const err of newErrors) {
      showErrorToast(err, openErrorModal, handleSendToFix);
    }
  }

  return (
    <ErrorModal
      error={errorModalData}
      isOpen={isModalOpen}
      onClose={handleCloseModal}
      onSendToFix={handleSendToFix}
    />
  );
}

function showErrorToast(
  error: ErrorNotification,
  onViewDetails: (error: ErrorNotification) => void,
  onSendToFix: (message: string) => void,
) {
  const typeLabel =
    error.type === "runtime-error"
      ? "Runtime Error"
      : error.type === "build-error"
        ? "Build Error"
        : "Error";

  toast.error(typeLabel, {
    description: error.message.slice(0, 120),
    duration: Infinity,
    action: {
      label: "Send to Fix",
      onClick: () => onSendToFix(`Fix this error:\n\`\`\`\n${error.message}\n\`\`\``),
    },
    cancel: {
      label: "Details",
      onClick: () => onViewDetails(error),
    },
  });
}
