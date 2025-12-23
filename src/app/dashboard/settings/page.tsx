"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClientMeta } from "@/components/client-meta";
import { Card, CardContent } from "@/components/ui/card";
import { DataTab } from "@/app/dashboard/settings/components/DataTab";
import { ProfileTab } from "@/app/dashboard/settings/components/ProfileTab";
import { NotificationsTab } from "@/app/dashboard/settings/components/NotificationsTab";
import { PreferencesTab } from "@/app/dashboard/settings/components/PreferencesTab";
import { PrivacyTab } from "@/app/dashboard/settings/components/PrivacyTab";

const VALID_TABS = [
  "profile",
  "notifications",
  "preferences",
  "privacy",
  "data",
];

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Notifications" },
  { id: "preferences", label: "Preferences" },
  { id: "privacy", label: "Privacy" },
  { id: "data", label: "Data" },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Wrap validateTab in useCallback
  const validateTab = useCallback((tab: string | null): string => {
    return !tab || !VALID_TABS.includes(tab) ? "profile" : tab;
  }, []); 

  const updateTabInURL = useCallback(
    (tab: string, shouldReplace = false) => {
      const params = new URLSearchParams(searchParams);

      params.set("tab", tab);

      const newURL = `${pathname}?${params.toString()}`;

      if (shouldReplace) {
        router.replace(newURL);
      } else {
        router.push(newURL);
      }
    },
    [searchParams, pathname, router]
  );

  // Get initial tab from URL params or default to profile
  const initialTab = validateTab(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const currentTabParam = searchParams.get("tab");
    const validTab = validateTab(currentTabParam);

    const needsCorrection = currentTabParam !== validTab;

    if (needsCorrection) {
      updateTabInURL(validTab, true);
    }
    setActiveTab(validTab);
  }, [searchParams, updateTabInURL, validateTab]); 

  // Handle extension authentication flow
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "connect-extension") {
      setActiveTab("privacy");
      updateTabInURL("privacy", true);
    }
  }, [searchParams, updateTabInURL]);

  const handleTabChange = (tab: string) => {
    setActiveTab((prev) => {
      if (prev !== tab) {
        updateTabInURL(tab, false);
        return tab;
      }
      return prev;
    });
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-purple-50 to-lavender-50"
      style={{
        background:
          "linear-gradient(135deg, #faf7ff 0%, #f3f4f6 100%)",
      }}
    >
      <ClientMeta page="settings" personalized={true} />

      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-10 max-w-4xl">
        {/* Header */}
        <div className="mb-6 sm:mb-7 md:mb-8">
          <h1 className="text-2xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Manage your account and application preferences
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-6 sm:mb-7 md:mb-8">
          <div className="border-b border-gray-200">
            <div className="flex space-x-4 sm:space-x-6 md:space-x-8 overflow-x-auto pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`pb-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors duration-200 ${
                    activeTab === tab.id
                      ? "border-purple-600 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <Card
          className="rounded-2xl shadow-sm border-0"
          style={{
            borderRadius: "20px",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <CardContent className="p-4 sm:p-6 md:p-8">
            {activeTab === "profile" && <ProfileTab />}
            {activeTab === "notifications" && <NotificationsTab />}
            {activeTab === "preferences" && <PreferencesTab />}
            {activeTab === "privacy" && <PrivacyTab />}
            {activeTab === "data" && <DataTab />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
