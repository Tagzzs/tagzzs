import { useCallback, useState } from "react";
import { useToast } from "./use-toast";
import { useUserProfile } from "./useUserProfile";

interface ProfileUpdateData {
  name?: string;
  avatar_url?: string | null;
}

export function useProfileUpdate() {
  const { userProfile, refetch } = useUserProfile();
  const { toast } = useToast();

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const updateProfile = useCallback(
    async (data: ProfileUpdateData): Promise<boolean> => {
      if (!userProfile) {
        setUpdateError("No user profile available");
        return false;
      }

      if (Object.keys(data).length === 0) {
        setUpdateError("No fields provided for update");
        return false;
      }

      setIsUpdating(true);
      setUpdateError(null);

      try {
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          let errorDetails;
          try {
            errorDetails = await response.json();
          } catch {
            errorDetails = {
              error: `HTTP ${response.status}: ${response.statusText}`,
            };
          }
          throw new Error(errorDetails.error || "Update request failed");
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Update Failed");
        }

        if (result.cacheInvalidated) {
          refetch();
        }

        toast({
          title: "Profile Updated",
          description: result.message,
        });

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setUpdateError(errorMessage);

        toast({
          title: "Update failed",
          description: errorMessage,
          variant: "destructive",
        });

        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [userProfile, refetch, toast]
  );

  return {
    updateProfile,
    isUpdating,
    updateError,
  };
}
