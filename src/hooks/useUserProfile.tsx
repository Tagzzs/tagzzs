import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/types/UserProfile";
import { useEffect, useMemo, useState, useCallback } from "react";
import type { Database } from "@/types/supabase/types";
import { generateAvatar } from "@/utils/avatar-generator";
import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";

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

  const { data: result, error: swrError, isLoading: swrLoading, mutate } = useSWR(
    user?.id ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/profile` : null,
    fetcher
  );

  useEffect(() => {
    if (result) {
      if (result.success && result.profile) {
        setDbUserData(result.profile);
      } else {
        console.log("No profile returned from backend");
        setDbUserData(null);
      }
    }
  }, [result]);

  useEffect(() => {
    if (swrError) {
        console.error("Profile fetch error:", swrError);
        setError(swrError instanceof Error ? swrError.message : "Failed to load profile");
        setDbUserData(null);
    } else {
        setError(null);
    }
  }, [swrError]);

  useEffect(() => {
    setLoading(swrLoading);
  }, [swrLoading]);

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
    mutate();
  }, [mutate]);

  return {
    userProfile,
    loading,
    error,
    refetch,
  };
}
