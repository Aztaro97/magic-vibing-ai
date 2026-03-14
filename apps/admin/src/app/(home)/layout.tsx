import Navbar from "~/components/home/home-navbar";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex max-h-screen min-h-screen flex-col">
      <Navbar />
      {/* Dot grid pattern */}
      <div className="bg-background absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[size:20px_20px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]" />

      <div className="flex flex-1 flex-col px-4 pb-4">{children}</div>
    </main>
  );
}
