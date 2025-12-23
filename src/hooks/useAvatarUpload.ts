import {
  uploadAvatar,
  UploadOptions,
  validateFile,
} from "@/utils/avatar-upload";
import { useUserProfile } from "./useUserProfile";
import { useProfileUpdate } from "./useProfileUpdate";
import { useToast } from "./use-toast";
import { useCallback, useState } from "react";

interface UseAvatarUploadReturn {
  uploadUserAvatar: (file: File) => Promise<boolean>;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
}

export function useAvatarUpload(
  options: UploadOptions = {}
): UseAvatarUploadReturn {
  const { userProfile } = useUserProfile();
  const { updateProfile } = useProfileUpdate();
  const { toast } = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadUserAvatar = useCallback(
    async (file: File): Promise<boolean> => {
      if (!userProfile) {
        const errorMessage = "User profile not available for avatar upload";
        setUploadError(errorMessage);
        toast({
          title: "Upload Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return false;
      }

      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      try {
        setUploadProgress(10);
        const validation = validateFile(file, options);

        if (!validation.valid) {
          throw new Error(validation.error);
        }

        setUploadProgress(20);
        toast({
          title: "Uploading Avatar",
          description: "Compressing and uploading your image...",
        });

        setUploadProgress(40);
        const uploadResult = await uploadAvatar(
          file,
          userProfile.userId,
          options
        );

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "Upload failed");
        }

        setUploadProgress(80);
        const profileUpdateSuccess = await updateProfile({
          avatar_url: uploadResult.url,
        });

        if (!profileUpdateSuccess) {
          throw new Error("Failed to update profile with new avatar");
        }

        setUploadProgress(100);
        toast({
          title: "Avatar Uploaded",
          description: "Your profile picture has been successfully updated",
        });

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown upload error";
        console.log(`[AVATAR_UPLOAD_HOOK] Upload failed: ${errorMessage}`);

        setUploadError(errorMessage);
        toast({
          title: "Upload Failed",
          description: errorMessage,
          variant: "destructive",
        });

        return false;
      } finally {
        setIsUploading(false);
        setTimeout(() => setUploadProgress(0), 1000);
      }
    },
    [userProfile, updateProfile, options, toast]
  );

  return {
    uploadUserAvatar,
    isUploading,
    uploadProgress,
    uploadError,
  };
}