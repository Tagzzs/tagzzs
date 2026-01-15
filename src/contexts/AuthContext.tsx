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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

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
        `${BACKEND_URL}/auth/me`,
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
          // Verify if we can refresh
          await tryRefreshOrSignout();
        }
      } else {
        if (response.status === 401) {
          // Token expired, try refreshing
          await tryRefreshOrSignout();
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

  const tryRefreshOrSignout = async () => {
    try {
      // Try to refresh
      const refreshRes = await fetch(
        `${BACKEND_URL}/auth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        if (data.success && data.user) {
          setUser(data.user);
          return;
        }
      }
      
      // If refresh failed, proceed to sign out
      console.log("Session invalid/expired. Clearing cookies...");
      await fetch(
        `${BACKEND_URL}/auth/sign-out`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      setUser(null);
    } catch (e) {
      console.error("Refresh/Signout failed", e);
      setUser(null);
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
      }
    }
  }, [loading, hasInitialized, user, router]);

  // Auto-refresh session every 50 minutes to prevent 1-hour expiry
  useEffect(() => {
    if (!user) return;

    const REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes
    const intervalId = setInterval(() => {
      console.log("Auto-refreshing session...");
      refreshSession();
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [user]);

  const signOut = async () => {
    try {
      setLoading(true);
      await fetch(`${BACKEND_URL}/auth/sign-out`, {
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
    // Check for lock to prevent race conditions across tabs
    const LOCK_KEY = "auth_refresh_lock";
    if (typeof window !== "undefined") {
      const isLocked = localStorage.getItem(LOCK_KEY);
      const lockTime = parseInt(localStorage.getItem(LOCK_KEY + "_time") || "0");
      const now = Date.now();
      
      // If locked and lock is less than 10 seconds old, skip refresh
      if (isLocked && (now - lockTime < 10000)) {
        console.log("Session refresh skipped (locked by another tab)");
        return;
      }
      
      // Set lock
      localStorage.setItem(LOCK_KEY, "true");
      localStorage.setItem(LOCK_KEY + "_time", now.toString());
    }

    try {
      const response = await fetch(
        `${BACKEND_URL}/auth/refresh`,
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
    } finally {
      // Release lock
      if (typeof window !== "undefined") {
        localStorage.removeItem(LOCK_KEY);
        localStorage.removeItem(LOCK_KEY + "_time");
      }
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
