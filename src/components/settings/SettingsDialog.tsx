"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsCard } from "./SettingsCard";
import { SettingField } from "./SettingField";
import { SettingsInput } from "./SettingsInput";
import { ToggleRow } from "./ToggleRow";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import "./settings.css";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user } = useAuth();
  
  // State for form fields
  const [name, setName] = useState(
    user?.user_metadata?.full_name || user?.user_metadata?.name || ""
  );
  const [email, setEmail] = useState(user?.email || "");
  
  // State for toggles
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Initials for avatar fallback
  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "US";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-black border-[#1a1a1a] p-0 overflow-hidden settings-modal-content max-h-[85vh] flex flex-col">
        <DialogHeader className="p-6 border-b border-[#1a1a1a]">
          <DialogTitle className="text-xl font-semibold text-white">
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Profile Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-medium text-white px-1">Profile</h2>
            <SettingsCard title="Personal Information" description="Update your personal details here.">
              <div className="flex items-center gap-4 mb-6">
                 <Avatar className="h-16 w-16 border border-[#2a2a2a]">
                    <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                    <AvatarFallback className="text-lg bg-[#1a1a1a] text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <button className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors">
                      Change Avatar
                    </button>
                    <p className="text-xs text-zinc-500 mt-1">
                      JPG, GIF or PNG. 1MB max.
                    </p>
                  </div>
              </div>

              <div className="grid gap-4">
                <SettingField label="Display Name" description="This will be displayed on your public profile.">
                  <SettingsInput
                    value={name}
                    onChange={setName}
                    placeholder="Enter your name"
                  />
                </SettingField>
                
                <SettingField label="Email Address" description="Used for notifications and login.">
                  <SettingsInput
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="Enter your email"
                    disabled
                  />
                </SettingField>
              </div>
            </SettingsCard>
          </section>

          {/* Notifications Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-medium text-white px-1">Notifications</h2>
            <SettingsCard title="Email Notifications" description="Manage your email preferences.">
              <div className="space-y-1">
                <ToggleRow
                  label="Product Updates"
                  description="Receive emails about new features and improvements."
                  checked={emailNotifications}
                  onChange={setEmailNotifications}
                />
                <ToggleRow
                  label="Security Alerts"
                  description="Get notified about important security updates."
                  checked={pushNotifications}
                  onChange={setPushNotifications}
                />
                <ToggleRow
                  label="Marketing Emails"
                  description="Receive offers and promotions."
                  checked={marketingEmails}
                  onChange={setMarketingEmails}
                />
              </div>
            </SettingsCard>
          </section>

          {/* Application Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-medium text-white px-1">Application</h2>
            <SettingsCard title="Appearance">
              <ToggleRow
                label="Dark Mode"
                description="Use dark theme across the application."
                checked={darkMode}
                onChange={setDarkMode}
              />
            </SettingsCard>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
