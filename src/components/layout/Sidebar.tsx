"use client";

import Link from "next/link";
import * as React from "react";
import { usePathname } from "next/navigation";
import {
  AudioWaveform,
  ChevronRight,
  ChevronsUpDown,
  Command,
  LogOut,
  Plus,
  Settings2,
  Sparkles,
  BadgeCheck,
  CreditCard,
  Bell,
} from "lucide-react";
import {
  SquaresFour,
  Database,
  Graph,
  Sparkle,
  Lightning,
  FileDashed,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/contexts/AuthContext";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

// Sample data matching the design with user's content
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Tagzzs",
      plan: "Basic",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: SquaresFour,
    },
    {
      title: "Database",
      url: "/database",
      icon: Database,
    },
    {
      title: "Neural Graph",
      url: "/neural-graph",
      icon: Graph,
    },
    {
      title: "Kai AI",
      url: "/kai-ai",
      icon: Sparkle,
    },
  ],
};

function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string;
    logo?: React.ElementType;
    plan: string;
  }[];
}) {
  const { isMobile, open } = useSidebar();
  const activeTeam = teams[0];

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-transparent cursor-default"
        >
          <div className="flex items-center justify-start">
            <img
              src="/logo.png"
              alt="Tagzzs"
              className="h-7 w-auto object-contain"
            />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: React.ElementType;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const { open, isMobile } = useSidebar();
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu className="gap-2">
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0;
          const isActive =
            pathname === item.url ||
            (item.url !== "/" && pathname?.startsWith(item.url));

          if (hasSubItems) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      className={
                        isActive
                          ? "bg-[rgba(160,100,255,0.35)] border-l-[3px] border-[#A064FF] text-white rounded-none hover:bg-[rgba(160,100,255,0.45)] hover:text-white transition-all duration-200"
                          : "text-zinc-500 hover:text-white hover:bg-white/5 transition-all duration-200"
                      }
                    >
                      {item.icon && <item.icon size={24} />}
                      <AnimatePresence>
                        {(open || isMobile) && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden whitespace-nowrap"
                          >
                            {item.title}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {(open || isMobile) && (
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <a href={subItem.url}>
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isActive}
                className={
                  isActive
                    ? "bg-[rgba(160,100,255,0.35)] border-l-[3px] border-[#A064FF] text-white rounded-none hover:bg-[rgba(160,100,255,0.45)] hover:text-white transition-all duration-200"
                    : "text-zinc-500 hover:text-white hover:bg-white/5 transition-all duration-200"
                }
              >
                <Link href={item.url}>
                  {item.icon && <item.icon size={24} />}
                  <AnimatePresence>
                    {(open || isMobile) && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile, open, setIsLocked } = useSidebar();
  const { signOut } = useAuth();

  // Generate initials from name (e.g. "John Doe" -> "JD")
  const initials = React.useMemo(() => {
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }, [user.name]);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu onOpenChange={(open) => setIsLocked(open)}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <AnimatePresence>
                  {(open || isMobile) && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="grid flex-1 text-left text-sm leading-tight overflow-hidden whitespace-nowrap"
                    >
                      <span className="truncate font-semibold">{user.name}</span>
                      <span className="truncate text-xs">{user.email}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                {(open || isMobile) && (
                  <ChevronsUpDown className="ml-auto size-4" />
                )}
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg dark bg-[#0a0a0a] border-[#1a1a1a]"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <Sparkles />
                  Upgrade to Pro
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <BadgeCheck />
                    <span>Account</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CreditCard />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell />
                  Notifications
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}

export function AppSidebar(props: React.ComponentProps<typeof ShadcnSidebar>) {
  const { setOpenHover, isLocked } = useSidebar();
  const { user } = useAuth();

  // Create user object from auth data or fallback to default
  const userData = user
    ? {
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User",
        email: user.email || "",
        avatar:
          user.user_metadata?.avatar_url || user.user_metadata?.avatar || "",
      }
    : data.user;

  return (
    <ShadcnSidebar
      collapsible="icon"
      className="border-none bg-[#0a0a0a]"
      onMouseEnter={() => setOpenHover(true)}
      onMouseLeave={() => !isLocked && setOpenHover(false)}
      {...props}
    >
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </ShadcnSidebar>
  );
}
