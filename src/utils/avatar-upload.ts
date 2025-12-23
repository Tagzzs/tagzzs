import { createClient } from "./supabase/client";

export interface UploadOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  quality?: number;
  maxDimensions?: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  file: File,
  options: UploadOptions = {}
): ValidationResult {
  const defaultOptions = {
    maxSizeMB: 2,
    allowedTypes: ["image/jpeg", "image/jpg", "image/png"],
  };

  const opts = { ...defaultOptions, ...options };

  if (!opts.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${
        file.type
      } not supported. Please use: ${opts.allowedTypes.join(", ")}`,
    };
  }

  const maxSizeBytes = opts.maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `File size ${fileSizeMB}MB exceeds the ${opts.maxSizeMB}MB limit`,
    };
  }

  return { valid: true };
}

export async function compressImage(
  file: File,
  maxDimensions: number = 512,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      if (width > height) {
        if (width > maxDimensions) {
          height = (height * maxDimensions) / width;
          width = maxDimensions;
        }
      } else {
        if (height > maxDimensions) {
          width = (width * maxDimensions) / height;
          height = maxDimensions;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error("Failed to compress image"));
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () =>
      reject(new Error("Failed to load image for compression"));
    img.src = URL.createObjectURL(file);
  });
}

export function generateAvatarFileName(
  userId: string,
  originalName: string
): string {
  const timestamp = Date.now();
  const extension = originalName.split(".").pop()?.toLowerCase() || "jpg";

  if (!userId) {
    throw new Error("Invalid userId for avatar upload");
  }

  return `${userId}/avatar_${timestamp}.${extension}`;
}

export async function uploadAvatar(
  file: File,
  userId: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const defaultOptions = {
      maxSizeMB: 2,
      allowedTypes: ["image/jpeg", "image/jpg", "image/png"],
      quality: 0.8,
      maxDimensions: 512,
    };

    const opts = { ...defaultOptions, ...options };

    const validation = validateFile(file, opts);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    console.log(`[AVATAR_UPLOAD] Compressing image for user ${userId}`);
    const compressedFile = await compressImage(
      file,
      opts.maxDimensions,
      opts.quality
    );

    const fileName = generateAvatarFileName(userId, file.name);

    console.log(`[AVATAR_UPLOAD] Uploading to storage: ${fileName}`);
    const supabase = createClient();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (!session || sessionError) {
      return {
        success: false,
        error: "Authentication required for avatar upload",
      };
    }

    console.log(
      `[AVATAR_UPLOAD] Authenticated user: ${session.user.id}, uploading as: ${userId}`
    );

    if (session.user.id !== userId) {
      return {
        success: false,
        error: "User ID mismatch - cannot upload avatar",
      };
    }

    const { data, error } = await supabase.storage
      .from("user_avatars")
      .upload(fileName, compressedFile, {
        cacheControl: "3600",
        upsert: true, 
      });

    if (error) {
      console.log(`[AVATAR_UPLOAD] Storage error: ${error}`, {
        message: error.message,
        fullError: error,
      });

      return {
        success: false,
        error: `Upload failed: ${error.message}`,
      };
    }

    const {
      data: { publicUrl },
    } = await supabase.storage.from("user_avatars").getPublicUrl(data.path);

    if (!publicUrl) {
      return {
        success: false,
        error: `Failed to get public URL for uploaded avatar`,
      };
    }
    console.log(`[AVATAR_UPLOAD] Successfully uploaded: ${publicUrl}`);

    return {
      success: true,
      url: publicUrl,
      fileName: data.path,
    };
  } catch (error) {
    console.log(`[AVATAR_UPLOAD] Unexpected error: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected upload error",
    };
  }
}
