"use client";

import type * as React from "react";
import { useEffect, useState } from "react";
import {
  CreditCardIcon,
  HelpCircleIcon,
  HomeIcon,
  LayoutDashboardIcon,
  UsersIcon,
} from "lucide-react";

import {
  useActiveOrganization,
  useListOrganizations,
  useSession,
} from "@acme/auth/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@acme/ui/sidebar";

import { NavMain } from "./dashboard/nav-menu";
import { NavUser } from "./dashboard/nav-user";

// Create a WorkspaceSkeleton component
const WorkspaceSkeleton = () => {
  return (
    <div className="p-4">
      <div className="flex items-center space-x-2">
        {/* Skeleton - avatar placeholder */}
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1">
          {/* Skeleton - workspace name placeholder */}
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          {/* Skeleton - plan name placeholder */}
          <div className="mt-1 h-3 w-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        </div>
        {/* Skeleton - dropdown button placeholder */}
        <div className="h-5 w-5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
};

// Define organization type based on database schema
interface Organization {
  id: string;
  name: string;
  slug?: string | null;
  logo?: string | null;
  createdAt: Date;
  metadata?: string | null;
}

// Update subscription data type to match API return values
interface SubscriptionData {
  id: string;
  plan: string;
  referenceId: string;
  stripeCustomerId?: string | undefined;
  stripeSubscriptionId?: string | undefined;
  status: string | undefined | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean | null;
  seats?: number | undefined;
  // Add other fields returned by API
  limits?: Record<string, number> | undefined;
  priceId?: string | undefined;

  // Keep other possible fields
  [key: string]: any;
}

// Define the workspace data structure
interface WorkspaceData extends Organization {
  subscription: SubscriptionData | null;
}

// Define user data structure
interface UserData {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  activeOrganizationId?: string;

  [key: string]: any;
}

// Define workspace interface data structure
interface ProcessedWorkspace {
  id: string;
  name: string;
  logo: React.ElementType;
  plan: string;
  planColor: string;
  planGradient: string;
  planBadgeClass: string;
  slug?: string;
}

const getNavMainItems = (userRole?: string) => {
  const items = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Teams",
      url: "/dashboard/teams",
      icon: UsersIcon,
    },
    {
      title: "Billing",
      url: "/dashboard/billing",
      icon: CreditCardIcon,
    },
  ];

  return items;
};

const getNavSecondaryItems = () => [
  {
    title: "Support",
    url: "https://forum.coding.dev",
    icon: HelpCircleIcon,
  },
  {
    title: "Forum",
    url: "https://forum.forum.dev/c/9-category/9",
    icon: HelpCircleIcon,
  },
];

export function AppSidebar({
  userData,
  ...props
}: {
  userData: UserData;
} & React.ComponentProps<typeof Sidebar>) {
  // Get user session for admin permission check
  const { data: session } = useSession();

  // Use authClient to get organization list - add isPending state
  const { data: organizations = [], isPending: organizationsPending } =
    // @ts-ignore
    useListOrganizations();
  // @ts-ignore
  const { data: activeOrganization } = useActiveOrganization();

  // Use useState to store subscription data
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  // Add loading state tracking
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Use useEffect to asynchronously fetch subscription data
  useEffect(() => {
    // Only fetch subscriptions when organizationsPending is false and organizations has data
    const orgs = organizations || []; // Ensure orgs is always an array, prevent null
    if (!organizationsPending && orgs.length > 0) {
      const fetchAllSubscriptions = async () => {
        try {
          const subscriptionPromises = orgs.map((org: any) =>
            // @ts-ignore
            subscription.list({
              query: {
                referenceId: org.id,
              },
            }),
          );
          const results = await Promise.all(subscriptionPromises);
          const allSubscriptions = results.flatMap(
            (result: { data: any }) => result.data || [],
          );
          setSubscriptions(allSubscriptions);
          setIsLoading(false);
        } catch (error) {
          setSubscriptions([]);
          setIsLoading(false);
        }
      };
      fetchAllSubscriptions();
    } else if (!organizationsPending && orgs.length === 0) {
      // Organizations loaded but empty
      setSubscriptions([]);
      setIsLoading(false);
    } else {
      // Organizations still loading, keep loading state
      setIsLoading(true);
    }
  }, [organizations, organizationsPending]);

  // Extract username from email (part before the @ symbol)
  const extractUsernameFromEmail = (email: string): string => {
    if (!email || email.trim() === "") return "";
    // Get the content before the @ symbol as the username
    const username = email.split("@")[0];
    // If extraction is successful and not empty, return that username, otherwise return empty string
    return username || "";
  };

  // Process user data
  const processedUserData = {
    name: userData.name || extractUsernameFromEmail(userData.email) || "Guest",
    email: userData.email || "No email",
    avatar: userData.image || "/avatars/default.jpg",
    status: "online" as const,
    notificationCount: 0,
  };

  // Process workspace data
  const workspaces: ProcessedWorkspace[] = (organizations || []).map(
    (organization: { id: string; name: any; slug: any }) => {
      // Find matching subscription data
      const subscription =
        subscriptions.find(
          (sub) =>
            sub &&
            sub.referenceId === organization.id &&
            sub.status === "active",
        ) || null;

      // Choose an appropriate icon
      const logo = HomeIcon;

      // Determine plan type based on subscription
      let plan = "FREE";

      if (subscription && subscription.status === "active") {
        const subscriptionPlan = subscription.plan;
        if (subscriptionPlan === "libra pro") {
          plan = "PRO";
        } else if (subscriptionPlan === "libra max") {
          plan = "MAX";
        }
      }

      // Add plan colors and icons
      let planColor = "text-gray-500";
      let planGradient = "from-gray-400 to-gray-600";
      let planBadgeClass =
        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

      switch (plan) {
        case "PRO":
          planColor = "text-blue-500";
          planGradient = "from-blue-400 to-blue-600";
          planBadgeClass =
            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
          break;
        case "MAX":
          planColor = "text-purple-500";
          planGradient = "from-purple-400 to-purple-600";
          planBadgeClass =
            "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
          break;
      }

      return {
        id: organization.id,
        name: organization.name,
        logo,
        plan,
        planColor,
        planGradient,
        planBadgeClass,
        slug: organization.slug || undefined,
      };
    },
  );

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <h1>Taro</h1>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getNavMainItems(session?.user?.role ?? undefined)} />
        {/* <NavSecondary items={getNavSecondaryItems()} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={processedUserData} />
      </SidebarFooter>
    </Sidebar>
  );
}
