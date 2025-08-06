"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCardIcon,
  LogOutIcon,
  MonitorSmartphoneIcon,
  MoonIcon,
  MoreVerticalIcon,
  SunIcon,
} from "lucide-react";
import { toast } from "sonner";

import { signOut } from "@acme/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@acme/ui/avatar";
import { Badge } from "@acme/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@acme/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@acme/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@acme/ui/tooltip";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
    status?: "online" | "away" | "offline";
    notificationCount?: number;
  };
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Default values if not provided
  const status = user.status || "online";
  const notificationCount = user.notificationCount || 0;

  // Initialize theme settings
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;

      if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
        setIsDark(true);
        document.documentElement.classList.add("dark");
      } else {
        setIsDark(false);
        document.documentElement.classList.remove("dark");
      }

      // Log theme initialization
    } catch (error) {
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Get status color
  const getStatusColor = () => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-amber-500";
      case "offline":
        return "bg-gray-400";
      default:
        return "bg-green-500";
    }
  };

  // Handle theme toggle
  const toggleTheme = () => {
    if (!isLoaded) return;

    setIsLoaded(false);
    const newTheme = !isDark;
    setIsDark(newTheme);

    try {
      if (newTheme) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }

      // Log theme change
    } catch (error) {}

    // Debounce delay
    setTimeout(() => setIsLoaded(true), 300);
  };

  // Handle navigation to session page
  const handleNavigateToSession = () => {
    router.push("/dashboard/session");
  };

  // Handle navigation to billing page
  const handleNavigateToBilling = () => {
    router.push("/dashboard/billing");
  };

  // Handle sign out
  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/login");
          },
        },
      });
    } catch (error) {
      toast.error("Logout failed");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <TooltipProvider>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="group data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 relative transition-colors duration-200"
              >
                <div className="relative">
                  <Avatar className="group-hover:ring-primary/20 h-8 w-8 rounded-lg ring-2 ring-transparent transition-all duration-300">
                    <AvatarImage
                      src={user.avatar}
                      alt={user.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary rounded-lg font-semibold">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full ${getStatusColor()} ring-2 ring-white`}
                  />
                </div>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>

                {notificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="mr-1 ml-auto px-1.5 py-0.5 text-xs"
                  >
                    {notificationCount}
                  </Badge>
                )}
                <MoreVerticalIcon className="size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="border-border/40 w-[var(--radix-dropdown-menu-trigger-width)] min-w-64 rounded-lg shadow-lg backdrop-blur-sm"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={8}
              alignOffset={-5}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="border-border/20 flex items-center gap-3 border-b p-3 text-left text-sm">
                  <div className="relative">
                    <Avatar className="h-10 w-10 rounded-lg">
                      <AvatarImage
                        src={user.avatar}
                        alt={user.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary/10 text-primary rounded-lg font-semibold">
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={`absolute right-0 bottom-0 h-3 w-3 rounded-full ${getStatusColor()} cursor-pointer ring-2 ring-white`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="capitalize">{status}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="text-base font-medium">{user.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <div className="p-2">
                <DropdownMenuGroup>
                  {/* <DropdownMenuItem className="cursor-pointer rounded-md transition-colors hover:bg-accent/80">
                    <UserCircleIcon className="mr-2 h-4 w-4" />
                    <span>{m['dashboard.navUser.profile']()}</span>
                  </DropdownMenuItem> */}
                  <DropdownMenuItem
                    className="hover:bg-accent/80 cursor-pointer rounded-md transition-colors"
                    onClick={handleNavigateToSession}
                  >
                    <MonitorSmartphoneIcon className="mr-2 h-4 w-4" />
                    <span>Session</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-accent/80 cursor-pointer rounded-md transition-colors"
                    onClick={handleNavigateToBilling}
                  >
                    <CreditCardIcon className="mr-2 h-4 w-4" />
                    <span>Billing</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="hover:bg-accent/80 cursor-pointer rounded-md transition-colors"
                    onClick={toggleTheme}
                    disabled={!isLoaded}
                  >
                    <div className="relative mr-2 h-4 w-4">
                      <SunIcon
                        className={`absolute inset-0 h-full w-full transition-all duration-300 ${
                          isDark
                            ? "rotate-0 transform opacity-100"
                            : "rotate-90 transform opacity-0"
                        }`}
                      />
                      <MoonIcon
                        className={`absolute inset-0 h-full w-full transition-all duration-300 ${
                          isDark
                            ? "-rotate-90 transform opacity-0"
                            : "rotate-0 transform opacity-100"
                        }`}
                      />
                    </div>
                    <span>{isDark ? "Switch to light" : "Switch to dark"}</span>
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem className="cursor-pointer rounded-md transition-colors hover:bg-accent/80">
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>{m['dashboard.navUser.settings']()}</span>
                  </DropdownMenuItem> */}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive hover:bg-destructive/10 cursor-pointer rounded-md transition-colors"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  <span>{isSigningOut ? "Logging out..." : "Logout"}</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </TooltipProvider>
  );
}
