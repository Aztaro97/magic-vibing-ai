import Image from "next/image";

import ProjectForm from "~/components/forms/project-form";

const Page = () => {
  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col">
      {/* Subtle radial glow behind hero */}
      <div className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[600px] w-[800px] -translate-x-1/2 opacity-20 blur-3xl">
        <div className="h-full w-full rounded-full bg-gradient-to-br from-amber-500/40 via-orange-500/20 to-transparent" />
      </div>

      <section className="space-y-8 pt-[18vh] pb-12 2xl:pt-52">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo.svg"
            alt="VibeCoding"
            width={44}
            height={44}
            className="hidden md:block dark:drop-shadow-[0_0_12px_rgba(251,191,36,0.3)]"
          />
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              From conversation to{" "}
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                production code
              </span>
            </h1>
            <p className="text-muted-foreground mx-auto max-w-lg text-base md:text-lg">
              Describe what you want to build. VibeCoding writes the code, runs
              it in a sandbox, and gives you a live preview — instantly.
            </p>
          </div>
        </div>
        <div className="mx-auto w-full">
          <ProjectForm />
        </div>
      </section>
    </div>
  );
};

export default Page;
