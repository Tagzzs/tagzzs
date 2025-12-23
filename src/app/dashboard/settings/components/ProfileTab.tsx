import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, User } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";
import { useEffect, useRef, useState } from "react";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";

export function ProfileTab() {
  const { uploadUserAvatar, isUploading, uploadProgress, uploadError } =
    useAvatarUpload();
  const {
    userProfile,
    loading: profileLoading,
    error: profileError,
  } = useUserProfile();
  const { updateProfile, isUpdating, updateError } = useProfileUpdate();

  const [hasInitialized, setHasInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [initialFormData, setInitialFormData] = useState({
    name: "",
    email: "",
  });

  const getChangedFields = () => {
    const changes: { [key: string]: string } = {};
    if (formData.name !== initialFormData.name) {
      changes.name = formData.name;
    }
    return changes;
  };

  const hasUnsavedChanges = Object.keys(getChangedFields()).length > 0;

  const hasCustomAvatar =
    userProfile?.avatar && !userProfile.avatar.includes("ui-avatars.com");

  useEffect(() => {
    if (userProfile && !hasInitialized) {
      const profileData = {
        name: userProfile.name,
        email: userProfile.email,
      };
      setFormData(profileData);
      setInitialFormData(profileData);
      setHasInitialized(true);
    }
  }, [userProfile, hasInitialized]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    const changedFields = getChangedFields();
    if (Object.keys(changedFields).length === 0) {
      return;
    }

    const success = await updateProfile(changedFields);

    if (success) {
      setInitialFormData(formData);
    }
  };

  const handleRemoveAvatar = async () => {
    await updateProfile({
      avatar_url: null,
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadUserAvatar(file);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-600">Loading profile...</span>
      </div>
    );
  }

  const currentError = profileError || updateError || uploadError;

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {currentError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{currentError}</p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Profile Information
        </h2>

        {/* Avatar Upload */}
        <div className="flex items-center space-x-6 mb-6">
          <Avatar className="h-20 w-20">
            {hasCustomAvatar ? (
              <AvatarImage src={userProfile.avatar} alt="Profile" />
            ) : (
              <AvatarFallback className="bg-purple-100 text-purple-600">
                <User className="h-8 w-8" />
              </AvatarFallback>
            )}
          </Avatar>
          <input
            type="file"
            ref={fileInputRef}
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="border-purple-200 text-purple-600 hover:bg-purple-50"
                disabled={isUpdating || isUploading}
                onClick={handleUploadClick}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading
                  ? "Uploading..."
                  : hasCustomAvatar
                  ? "Change Avatar"
                  : "Upload Avatar"}
              </Button>

              {isUploading && (
                <div className="mt-3">
                  <div className="w-48 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}

              {hasCustomAvatar && (
                <Button
                  variant="outline"
                  onClick={handleRemoveAvatar}
                  disabled={isUpdating || isUploading}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  Remove Avatar
                </Button>
              )}
            </div>

            <p className="text-sm text-gray-500">
              {hasCustomAvatar
                ? "JPG, PNG or GIF (max. 2MB)"
                : "Upload a profile picture to personalize your account"}
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              placeholder="Enter your full name"
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="focus:ring-purple-500 focus:border-purple-500"
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              value={formData.email}
              type="email"
              placeholder="Your email address"
              className="focus:ring-purple-500 focus:border-purple-500"
              disabled={true}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8">
          <Button
            onClick={handleSave}
            disabled={isUpdating || !hasUnsavedChanges}
            className={`w-full md:w-auto text-white ${
              hasUnsavedChanges && !isUpdating
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : hasUnsavedChanges ? (
              "Save Changes"
            ) : (
              "No Changes"
            )}
          </Button>
          {hasUnsavedChanges && !isUpdating && (
            <p className="text-sm text-amber-600 mt-2">
              You have unsaved changes
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
