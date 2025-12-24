"use client";

import {
  Home,
  Library,
  Plus,
  Tag,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserProfile } from "@/hooks/useUserProfile";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavUser } from "./sidebar/nav-user";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  external?: boolean;
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Quick Capture",
    url: "/dashboard/quick-capture",
    icon: Plus,
  },
  {
    title: "Memory Space",
    url: "/dashboard/memory-space",
    icon: Library,
  },
  {
    title: "Neural Tags",
    url: "/dashboard/neural-tags",
    icon: Tag,
  },
  {
    title: "Kai AI",
    url: "/dashboard/kai-ai",
    icon: Sparkles,
  },
];

const quickActions = [
  {
    title: "Recent Items",
    url: "/dashboard?filter=recent",
    icon: Clock,
  },
  {
    title: "Popular Tags",
    url: "/dashboard/neural-tags?sort=popular",
    icon: TrendingUp,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { userProfile } = useUserProfile();

  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-0.25 py-2 h-10 min-h-10">
          <div className="flex-shrink-0">
            <Image
              src="/logo.png"
              alt="TAGZS Logo"
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
          </div>
          <span className="text-lg font-bold group-data-[collapsible=icon]:hidden overflow-hidden whitespace-nowrap flex-1">
            Tagzzs
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className={cn(
                      "transition-all duration-200 ease-out",
                      pathname === item.url
                        ? "bg-[#8854f1] text-white"
                        : "hover:bg-gray-100"
                    )}
                  >
                    {item.external ? (
                      <a 
                        href={item.url} 
                        onClick={handleLinkClick}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    ) : (
                      <Link href={item.url} onClick={handleLinkClick}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickActions.map((item) => {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      className={cn(
                        "relative transition-colors duration-200 ease-out overflow-visible",
                        "flex items-center gap-2 px-2 py-2"
                      )}
                    >
                      <Link href={item.url} onClick={handleLinkClick} className="relative flex items-center gap-2 w-full group/text">
                        <item.icon className="flex-shrink-0" />
                        <span className="relative inline-block">
                          {item.title}
                          <span
                            className={cn(
                              "absolute bottom-0 left-0 h-0.5 bg-[#8b5cf6] transition-all duration-300 ease-out",
                              "w-0 group-hover/text:w-full"
                            )}
                          />
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {userProfile && <NavUser user={userProfile} />}
      </SidebarFooter>
    </Sidebar>
  );
}
