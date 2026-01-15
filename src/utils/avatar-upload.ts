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


    const compressedFile = await compressImage(
      file,
      opts.maxDimensions,
      opts.quality
    );

    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("fileType", "avatar");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload`,
      {
        method: "POST",
        credentials: "include", // Important for HttpOnly cookies
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Upload failed with status: ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data.error || "Unknown upload error",
      };
    }

    // Backend returns { success: true, fileUrl: { publicUrl: ... }, ... }
    const publicUrl = data.fileUrl?.publicUrl;
    
    if (!publicUrl) {
       return {
         success: false,
         error: "Failed to obtain public URL from server response",
       };
    }



    return {
      success: true,
      url: publicUrl,
      fileName: data.fileName,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected upload error",
    };
  }
}
