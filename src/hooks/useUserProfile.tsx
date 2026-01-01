import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/types/UserProfile";
import { useEffect, useMemo, useState, useCallback } from "react";
import type { Database } from "@/types/supabase/types";
import { generateAvatar } from "@/utils/avatar-generator";

// Define the users table row type from generated Supabase types
type UsersRow = Database["public"]["Tables"]["users"]["Row"];

interface UseUserProfileReturn {
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUserProfile(): UseUserProfileReturn {
  const { user } = useAuth();

  const [dbUserData, setDbUserData] = useState<UsersRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    // If not user ID, we might still try fetching /profile if cookie is set,
    // but useAuth should supply the user.
    if (!user) {
      setDbUserData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/profile`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const result = await response.json();

      if (result.success && result.profile) {
        setDbUserData(result.profile);
      } else {
        // Fallback or error
        console.log("No profile returned from backend");
        setDbUserData(null);
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load profile");
      setDbUserData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    setError(null);

    if (user?.id) {
      fetchUserProfile();
    } else {
      setDbUserData(null);
      setLoading(false);
    }
  }, [user?.id, fetchUserProfile]);

  const userProfile = useMemo(() => {
    if (!user) return null;

    return {
      userId: user.id,
      name:
        dbUserData?.name ||
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "User",

      email: dbUserData?.email || user.email || "",

      avatar:
        dbUserData?.avatar_url ||
        user.user_metadata?.avatar ||
        generateAvatar(dbUserData?.name || user.email || "User"),

      createdAt:
        dbUserData?.created_at || user.created_at || new Date().toISOString(),
    } satisfies UserProfile;
  }, [dbUserData, user]);

  const refetch = useCallback(() => {
    if (user?.id) {
      fetchUserProfile();
    }
  }, [user?.id, fetchUserProfile]);

  return {
    userProfile,
    loading,
    error,
    refetch,
  };
}
