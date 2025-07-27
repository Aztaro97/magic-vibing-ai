"use client";

import { useMutation } from "@tanstack/react-query";

import { Button } from "@acme/ui/button";

import { useTRPC } from "~/trpc/react";

export default function HomePage() {
  const trpc = useTRPC();

  const createMessage = useMutation(
    trpc.message.create.mutationOptions({
      onSuccess: async () => {},
      onError: (err) => {},
    }),
  );

  return (
    <>
      <main className="container h-screen py-16">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Welcome to Home Page
          </h1>
          <Button
            onClick={() => createMessage.mutate({ message: "Hello World" })}
          >
            Create Message
          </Button>
        </div>
      </main>
    </>
  );
}
