"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email?: string;
  role?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar?: string;
    avatar_url?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  const router = useRouter();

  // Check current session from backend (cookies)
  const checkAuth = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/me`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Send cookies
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          // Invalid data format, treat as logged out
          console.warn("Invalid session data received");
          // We don't necessarily want to force signout here unless we are sure,
          // but user should be null.
          setUser(null);
        }
      } else {
        // If 401, it means the token is invalid or USER DOES NOT EXIST
        // We must force signout to clear the cookies so middleware doesn't think we are logged in
        if (response.status === 401) {
          console.log(
            "Session invalid or user deleted. clearing cookies silently..."
          );
          // Perform silent cleanup - do not use signOut() as it toggles loading/redirects
          try {
            await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/sign-out`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
              }
            );
          } catch (e) {
            console.error("Silent signout failed", e);
          }
          setUser(null);
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Session check error:", error);
      setUser(null);
    } finally {
      setLoading(false);
      setHasInitialized(true);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Handle redirects after initialization
  useEffect(() => {
    if (!loading && hasInitialized) {
      const currentPath = window.location.pathname;
      if (user) {
        // If user is logged in and on auth pages, redirect to dashboard
        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get("redirect") || "/dashboard";
        if (currentPath.startsWith("/auth/") || currentPath === "/") {
          router.push(redirectTo);
        }
      } else {
        // If user is NOT logged in and on protected pages (dashboard), redirect to sign-in
        // Note: Middleware usually handles this, but client-side check doesn't hurt
        // We'll leave it to middleware mostly to avoid flicker
      }
    }
  }, [loading, hasInitialized, user, router]);

  const signOut = async () => {
    try {
      setLoading(true);
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/sign-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      setUser(null);
      router.push("/auth/sign-in");
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        }
      } else {
        // Refresh failed, maybe sign out?
        console.warn("Session refresh failed");
      }
    } catch (error) {
      console.error("Refresh session error:", error);
    }
  };

  const value = {
    user,
    loading,
    signOut,
    checkAuth,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthProvider;
