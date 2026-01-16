"use client";

import { useState, useRef, useEffect } from 'react';
import { X, LogOut, Lock, Download, Trash2, AlertCircle, Ticket, Camera } from 'lucide-react';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingField } from '@/components/settings/SettingField';
import { SettingsInput } from '@/components/settings/SettingsInput';
import { ToggleRow } from '@/components/settings/ToggleRow';
import { toast } from 'sonner';
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user, signOut, loading, checkAuth } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile state - initialize from auth user or defaults
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Delete Account State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Sync state with user data when it loads
  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || user.user_metadata?.name || 'User');
      setEmail(user.email || '');
      setUsername(user.user_metadata?.name || user.email?.split('@')[0] || '');
      setAvatarUrl(user.user_metadata?.avatar_url || null);
    }
  }, [user]);

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
    setDeleteConfirmation('');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        toast.success("Account deleted successfully");
        // Force sign out on client side too mostly for clearing context state
        // The backend already cleared cookies
        await signOut(); 
        router.push('/');
      } else {
        const data = await response.json();
        toast.error(data.detail || "Failed to delete account");
      }
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error("An error occurred while deleting your account");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };




  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [aiMode, setAiMode] = useState<'concise' | 'deep'>('concise');

  // Loading states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState({
    fullName: '',
    email: ''
  });

  // Sync original values when user loads
  useEffect(() => {
    if (user) {
      const name = user.user_metadata?.full_name || user.user_metadata?.name || 'User';
      const userEmail = user.email || '';
      setOriginalValues({ fullName: name, email: userEmail });
    }
  }, [user]);

  const handleAvatarClick = () => {
    setPreviewUrl(avatarUrl);
    setSelectedFile(null);
    setIsAvatarModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAvatarModalOpen(false);
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    // Show preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
  };

  const handleUploadClick = async () => {
    if (!selectedFile || !user?.id) {
      // If no file selected, trigger file picker
      fileInputRef.current?.click();
      return;
    }

    setIsUploading(true);
    try {
      const { uploadAvatar } = await import('@/utils/avatar-upload');
      const result = await uploadAvatar(selectedFile, user.id);

      if (result.success && result.url) {
        setAvatarUrl(result.url);
        await checkAuth();
        toast.success('Profile picture updated!');
        handleModalClose();
      } else {
        toast.error(result.error || 'Failed to upload profile picture');
      }
    } catch (error) {
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePromoCodeChange = (code: string) => {
    setPromoCode(code.toUpperCase());
  };

  const handleRedeemCode = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }
    setIsRedeeming(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promo/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          promo_code: promoCode.toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error?.message || data.detail || 'Failed to redeem promo code');
      } else {
        setPromoCode('');
        toast.success(data.message || 'Promo code redeemed successfully');
      }
    } catch (error) {
      console.error('Redeem promo code error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Check if there are any changes
  const hasChanges = () => {
    return fullName !== originalValues.fullName || email !== originalValues.email;
  };

  const handleSaveProfile = () => {
    if (!hasChanges()) {
      toast.error('No changes to save');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmModalOpen(false);
    setIsSavingProfile(true);

    try {
      const updates: { name?: string; email?: string } = {};
      
      if (fullName !== originalValues.fullName) {
        updates.name = fullName;
      }
      if (email !== originalValues.email) {
        updates.email = email;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.detail || 'Failed to update profile');
      } else {
        setOriginalValues({ fullName, email });
        await checkAuth();
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsSavingPassword(true);
    setTimeout(() => {
      setIsSavingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    }, 1000);
  };

  const handleExportData = () => {
    toast.success('Data export started. You will receive an email when ready.');
  };

  const handleClearCache = () => {
    toast.success('Cache cleared successfully');
  };

  const handleLogout = async () => {
    try {
        await signOut();
        toast.success('Logged out successfully');
        router.push('/');
    } catch (error) {
        toast.error("Failed to logout");
    }
  };

  return (
    <>
      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div 
            className="relative bg-[#0a0a0a] border border-red-500/20 rounded-2xl p-8 w-[420px] shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Account</h3>
              <p className="text-sm text-zinc-400">
                This action cannot be undone. This will permanently delete your account and remove your data from our servers.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="text-xs text-zinc-500 uppercase font-medium tracking-wider text-center">
                Type <span className="text-red-500 font-bold select-none">DELETE</span> to confirm
              </div>
              <SettingsInput
                value={deleteConfirmation}
                onChange={setDeleteConfirmation}
                placeholder="Type DELETE"
                className="text-center font-bold tracking-wide border-red-900/30 focus:border-red-500/50"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10 hover:border-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-red-900/20"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Upload Modal */}
      {isAvatarModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={handleModalClose}
        >
          <div 
            className="relative bg-[#0a0a0a] border border-[#2a2a2a] rounded-3xl p-10 w-[400px] shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 p-1 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <X size={18} />
            </button>

            {/* Preview circle */}
            <div className="flex flex-col items-center">
              <div className="h-40 w-40 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-5xl font-bold text-white overflow-hidden border-4 border-[#2a2a2a] shadow-xl mb-8">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  fullName.charAt(0).toUpperCase()
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Upload button */}
              <button
                onClick={handleUploadClick}
                disabled={isUploading}
                className="w-full px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10 hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : selectedFile ? (
                  'Save Photo'
                ) : (
                  <>
                    <Camera size={16} />
                    Choose Photo
                  </>
                )}
              </button>

              {selectedFile && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 text-xs text-zinc-500 hover:text-purple-400 transition-colors"
                >
                  Choose a different photo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Update Confirmation Modal */}
      {isConfirmModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setIsConfirmModalOpen(false)}
        >
          <div 
            className="relative bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl p-8 w-[420px] shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsConfirmModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-semibold text-white mb-2">Confirm Changes</h3>
            <p className="text-sm text-zinc-400 mb-6">Are you sure you want to update your profile?</p>

            {/* Show what will be changed */}
            <div className="space-y-3 mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              {fullName !== originalValues.fullName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Full Name</span>
                  <span className="text-white">{originalValues.fullName} → <span className="text-purple-400">{fullName}</span></span>
                </div>
              )}
              {email !== originalValues.email && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Email</span>
                  <span className="text-white">{originalValues.email} → <span className="text-purple-400">{email}</span></span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10 hover:border-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-black h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white mb-2">Settings</h1>
            <p className="text-sm text-zinc-500">Manage your account and preferences</p>
          </div>
          <button
            onClick={() => router.back()}
            className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile Overview */}
        <div className="glass-panel bg-[#050505] p-6 mb-6 border border-[#1a1a1a] rounded-[20px]">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar with camera overlay */}
            <div 
              className="relative cursor-pointer group"
              onMouseEnter={() => setIsAvatarHovered(true)}
              onMouseLeave={() => setIsAvatarHovered(false)}
              onClick={handleAvatarClick}
            >
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-2xl font-bold text-white overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  originalValues.fullName.charAt(0).toUpperCase()
                )}
              </div>
              {/* Camera overlay */}
              <div 
                className={`absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-all duration-200 ${
                  isAvatarHovered ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Camera 
                  size={24} 
                  className="text-white"
                />
              </div>
            </div>
            
            <div className="flex-1 space-y-1">
              <h2 className="text-xl font-semibold text-white">{originalValues.fullName || 'User'}</h2>
              <p className="text-sm text-zinc-400">{originalValues.email || 'No email'}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
                  PRO
                </span>
                <span className="text-xs text-zinc-500">
                  {user?.created_at 
                    ? `Active since ${new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                    : 'Active member'
                  }
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all border border-white/10 hover:border-white/20"
              >
                <LogOut size={14} className="inline mr-2" />
                Log out
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Settings */}
            <SettingsCard
              title="Account Settings"
              description="Update your personal information"
            >
              <SettingField label="Full Name">
                <SettingsInput
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Your full name"
                />
              </SettingField>

              <SettingField label="Email Address">
                <SettingsInput
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="your.email@example.com"
                />
              </SettingField>

              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-sm font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:!transform-none"
              >
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </SettingsCard>

            {/* Security Settings */}
            {/* <SettingsCard
              title="Security Settings"
              description="Manage your password and authentication"
            >
              <SettingField label="Change Password">
                <div className="mt-1 space-y-3">
                  <SettingsInput
                    type="password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    placeholder="Current password"
                  />
                  <SettingsInput
                    type="password"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="New password"
                  />
                  <SettingsInput
                    type="password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Confirm new password"
                  />
                  <button
                    onClick={handleChangePassword}
                    disabled={isSavingPassword}
                    className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:!transform-none"
                  >
                    {isSavingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </SettingField>
            </SettingsCard> */}

            {/* Preferences */}
            {/* <SettingsCard
              title="Preferences"
              description="Customize your experience"
            >
              <div>
                <p className="text-xs font-medium text-white/90 mb-3">Notifications</p>
                <div className="space-y-0">
                  <ToggleRow
                    label="Email Notifications"
                    description="Receive updates via email"
                    checked={emailNotifications}
                    onChange={setEmailNotifications}
                  />
                  <ToggleRow
                    label="Product Updates"
                    description="Get notified about new features"
                    checked={productUpdates}
                    onChange={setProductUpdates}
                  />
                </div>
              </div>

              <SettingField label="AI Behavior">
                <div className="flex gap-2">
                  <button
                    onClick={() => setAiMode('concise')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      aiMode === 'concise'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                    }`}
                  >
                    Concise Answers
                  </button>
                  <button
                    onClick={() => setAiMode('deep')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      aiMode === 'deep'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                    }`}
                  >
                    Deep Analysis
                  </button>
                </div>
              </SettingField>
            </SettingsCard> */}

            {/* Data & Privacy */}
            <SettingsCard
              title="Data & Privacy"
              description="Manage your data and account"
            >
              <div className="space-y-4">
                {/* <button
                  onClick={handleExportData}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Download size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
                    <div className="text-left">
                      <p className="text-xs font-medium text-white">Export Your Data</p>
                      <p className="text-[10px] text-zinc-500">Download all your information</p>
                    </div>
                  </div>
                </button> */}
  {/* 
                  <button
                    onClick={handleClearCache}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Trash2 size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
                      <div className="text-left">
                        <p className="text-xs font-medium text-white">Clear Cache</p>
                        <p className="text-[10px] text-zinc-500">Remove temporary files</p>
                      </div>
                    </div>
                  </button> */}

                <div className="pt-4 border-t border-white/5">
                  <button 
                  onClick={handleDeleteClick}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-all group">
                    <div className="flex items-center gap-3">
                      <AlertCircle size={16} className="text-red-400" />
                      <div className="text-left">
                        <p className="text-xs font-medium text-red-400">Delete Account</p>
                        <p className="text-[10px] text-red-400/70">Permanently remove your account</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </SettingsCard>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Promo Code Card */}
            <SettingsCard title="Promo Code">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-white">Redeem Code</span>
                    <Ticket size={16} className="text-zinc-400" />
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">Enter your promo code to unlock special features or credits.</p>
                  
                  <div className="space-y-3">
                    <SettingsInput
                      value={promoCode}
                      onChange={handlePromoCodeChange}
                      placeholder="ENTER CODE"
                      className="text-center tracking-wider uppercase"
                    />
                    <button 
                      onClick={handleRedeemCode}
                      disabled={isRedeeming || !promoCode.trim()}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:!transform-none"
                    >
                      {isRedeeming ? 'Redeeming...' : 'Redeem Code'}
                    </button>
                  </div>
                </div>
              </div>
            </SettingsCard>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}