"use client";

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleAccountSettings = () => {
    router.push("/dashboard/settings");
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/sign-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();

      // Manually removing browser cookies
      const { createClient: createBrowserClient } = await import("@/utils/supabase/client");
      const supabase = createBrowserClient();
      await supabase.auth.signOut();

      router.refresh(); // Ensuring server components recognize the session is gone
      
      if (data.success) {
        // Redirect to sign-in page after successful sign-out
        window.location.href = "/auth/sign-in";
      } else {
        console.error("Sign-out failed:", data.error);
        // Still redirect as a fallback
        window.location.href = "/auth/sign-in";
      }
    } catch (error) {
      console.error("Sign-out error:", error);
      // Fallback redirect
      window.location.href = "/auth/sign-in";
    }

    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      {isSigningOut && <LoadingScreen message="Signing out..." />}
      <SidebarMenu>
        <SidebarMenuItem>
          <Separator className="mb-2" />
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleAccountSettings}>
              <BadgeCheck className="w-5 h-5 mr-1.5" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell className="w-5 h-5 mr-1.5"/>
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="hover:bg-red-300 hover:text-white focus:bg-red-500 focus:text-white"
            >
              <LogOut className="w-5 h-5 mx-1.5"/>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
    </>
  );
}
