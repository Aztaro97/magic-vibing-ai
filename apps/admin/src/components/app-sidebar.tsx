"use client";

import type * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutDashboardIcon, SettingsIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@acme/ui/sidebar";

import { NavMain } from "./dashboard/nav-menu";
import { NavUser } from "./dashboard/nav-user";

interface UserData {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  [key: string]: unknown;
}

const getNavMainItems = () => [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: SettingsIcon,
  },
];

export function AppSidebar({
  userData,
  ...props
}: {
  userData: UserData;
} & React.ComponentProps<typeof Sidebar>) {
  const processedUserData = {
    name: userData.name || userData.email.split("@")[0] || "User",
    email: userData.email ?? "No email",
    avatar: userData.image ?? "/avatars/default.jpg",
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2.5 px-2 py-1">
          <Image src="/logo.svg" alt="VibeCoding" width={20} height={20} />
          <span className="text-sm font-semibold tracking-tight">
            VibeCoding
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getNavMainItems()} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={processedUserData} />
      </SidebarFooter>
    </Sidebar>
  );
}
