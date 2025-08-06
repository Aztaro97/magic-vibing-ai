"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircleIcon } from "lucide-react";

import { cn } from "@acme/ui";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@acme/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
  }[];
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => {}, [pathname]);

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip={"Create Project"}
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
              onClick={() => {
                setDialogOpen(true);
              }}
            >
              <PlusCircleIcon />
              <span>Create Project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={pathname === item.url}
                className={cn("duration-200 ease-linear")}
              >
                <Link href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
      {/* 
      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} /> */}
    </SidebarGroup>
  );
}
