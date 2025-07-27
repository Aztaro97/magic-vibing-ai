"use client";

import { Button } from "@acme/ui/button";

import { useTRPC } from "~/trpc/react";

export default async function HomePage() {
  const trpc = useTRPC();

  return (
    <>
      <main className="container h-screen py-16">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Welcome to acme Platform
          </h1>
          <Button>Create Message</Button>
        </div>
      </main>
    </>
  );
}
