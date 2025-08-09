import type React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// import { SiteHeader } from "apps/web/components/dashboard/site-header";

import { auth } from "@acme/auth";
import { SidebarInset, SidebarProvider } from "@acme/ui/sidebar";

import { AppSidebar } from "~/components/app-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get current session and user information
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const sessionUser = session?.user;
  if (!sessionUser) {
    redirect("/");
  }

  // Add active organization ID to user data
  const userData = {
    ...sessionUser,
    image: sessionUser.image ?? null,
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" userData={userData} />
      <SidebarInset>
        {/* <SiteHeader /> */}
        <main className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
