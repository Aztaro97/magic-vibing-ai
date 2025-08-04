import Navbar from "~/components/home/home-navbar";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex max-h-screen min-h-screen flex-col">
      <Navbar />
      <div className="bg-background absolute inset-0 -z-10 h-full w-full" />

      <div className="flex flex-1 flex-col px-4 pb-4">{children}</div>
    </main>
  );
}
