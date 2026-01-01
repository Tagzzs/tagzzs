"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Chrome,
  Activity,
  Unlink2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
// firebase imports removed

interface ExtensionConnection {
  id: string;
  deviceName: string;
  status: "active" | "disconnected";
  isActive: boolean;
  lastActivity?: Date;
  lastHeartbeat?: Date;
  totalContentSaved?: number;
  totalAPICallsMade?: number;
  userAgent?: string;
  ipAddress?: string;
}

interface ExtensionData {
  details: {
    createdAt: Date | { toDate?: () => Date };
    lastActivity: Date | { toDate?: () => Date };
    totalActiveConnections: number;
    totalHistoricalConnections: number;
    totalContentSaved: number;
    totalAPICallsAllConnections: number;
    settings: {
      connectionTimeout: number;
      notifyOnNewConnection: boolean;
      requireReauth: boolean;
    };
  };
  connections: ExtensionConnection[];
  activeCount: number;
  totalCount: number;
}

export function PrivacyTab() {
  const [showPreviousConnections, setShowPreviousConnections] = useState(false);
  const [isConnectionDetailsOpen, setIsConnectionDetailsOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] =
    useState<ExtensionConnection | null>(null);

  // Extension data
  const [extensionData, setExtensionData] = useState<ExtensionData | null>(
    null
  );
  const [isLoadingExtensions, setIsLoadingExtensions] = useState(true);
  const [extensionError, setExtensionError] = useState<string | null>(null);

  // Change Password Form State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Adding user state
  const [user, setUser] = useState<any>(null);

  // Get user session on load from supabase
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase.auth]);

  // using swr library to poll if extension connections
  // Function to fetch with auth header
  const authorizedFetcher = async (url: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${url}`, {
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for HttpOnly cookies
    });
    return res.json();
  };

  const { data, error, isLoading } = useSWR(
    user ? "/api/extension/connections" : null,
    authorizedFetcher,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    }
  );

  // updates extension data on page when a different list is fetched
  useEffect(() => {
    if (data?.success && data.data) {
      setExtensionData(data.data);
      setIsLoadingExtensions(false);
    }
    if (error) {
      setExtensionError("Unable to fetch updates");
    }
  }, [data, error]);

  const formatDate = (
    date: Date | { toDate?: () => Date } | null | undefined
  ) => {
    if (!date) return "Never";
    try {
      const dateObj =
        (date as { toDate?: () => Date }).toDate?.() ||
        new Date(date as unknown as string);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dateObj);
    } catch {
      return "Unknown";
    }
  };

  const getActiveConnections = () => {
    if (!extensionData?.connections) return [];
    return extensionData.connections.filter(
      (c) => c.status === "active" || c.isActive
    );
  };

  const getInactiveConnections = () => {
    if (!extensionData?.connections) return [];
    return extensionData.connections.filter(
      (c) => c.status !== "active" && !c.isActive
    );
  };

  const handleViewActivity = (connection: ExtensionConnection) => {
    setSelectedConnection(connection);
    setIsConnectionDetailsOpen(true);
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/extension/connections?id=${connectionId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to disconnect extension");
      }

      toast({
        title: "Disconnected",
        description: "Extension connection has been removed.",
        variant: "default",
      });

      // Refresh data
      const dataResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/extension/connections`,
        {
          headers: {},
          credentials: "include",
        }
      );
      if (dataResponse.ok) {
        const result = await dataResponse.json();
        if (result.success && result.data) {
          setExtensionData(result.data);
        }
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect extension.",
        variant: "destructive",
      });
    }
  };

  const handleChangePasswordClick = () => {
    setIsChangePasswordOpen(true);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  const handleForgotPasswordClick = () => {
    router.push("/auth/forgot-password");
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return "Password must contain at least one special character";
    }
    return null;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setIsChangingPassword(true);

    try {
      // Validate inputs
      if (!newPassword || !confirmPassword) {
        setPasswordError("All fields are required");
        setIsChangingPassword(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setPasswordError("Passwords do not match");
        setIsChangingPassword(false);
        return;
      }

      // Validate new password strength
      const validationError = validatePassword(newPassword);
      if (validationError) {
        setPasswordError(validationError);
        setIsChangingPassword(false);
        return;
      }

      // Update password directly (Supabase will handle authentication)
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error("Password update error:", updateError);

        // Handle specific errors
        if (updateError.message.includes("same")) {
          setPasswordError(
            "New password must be different from your current password"
          );
        } else if (updateError.message.includes("session")) {
          setPasswordError("Session expired. Please sign in again.");
          setTimeout(() => {
            router.push("/auth/sign-in");
          }, 2000);
        } else {
          setPasswordError(updateError.message || "Failed to update password");
        }
        setIsChangingPassword(false);
        return;
      }

      // Success
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
        variant: "default",
      });

      setIsChangePasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Change password error:", error);
      setPasswordError("An unexpected error occurred. Please try again.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Privacy & Security
        </h2>
        <p className="text-gray-600 mb-8">
          Manage your privacy settings and account security.
        </p>

        {/* Account Security Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Account Security
          </h3>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              className="border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300"
              onClick={handleChangePasswordClick}
            >
              <Lock className="h-4 w-4 mr-2" />
              Change Password
            </Button>
            <Button
              variant="outline"
              className="border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300"
            >
              Enable Two-factor Authentication
            </Button>
          </div>
        </div>

        {/* Data Privacy Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Data Privacy
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <Label
                  htmlFor="publicProfile"
                  className="text-base font-medium text-gray-900 cursor-pointer"
                >
                  Make Profile Public
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  Allow others to see your public tags and content
                </p>
              </div>
              <Switch
                id="publicProfile"
                className="data-[state=checked]:bg-purple-600"
                style={
                  {
                    "--switch-background": "#E9D5FF",
                  } as React.CSSProperties
                }
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex-1">
                <Label
                  htmlFor="analytics"
                  className="text-base font-medium text-gray-900 cursor-pointer"
                >
                  Analytics
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  Help improve TagZ by sharing usage analytics
                </p>
              </div>
              <Switch
                id="analytics"
                defaultChecked
                className="data-[state=checked]:bg-purple-600"
                style={
                  {
                    "--switch-background": "#E9D5FF",
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
        </div>

        {/* Connected Apps Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Connected Apps
          </h3>

          {/* Browser Extensions */}
          <div className="mb-8">
            {isLoadingExtensions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 text-purple-600 animate-spin mr-2" />
                <span className="text-gray-600">Loading extension data...</span>
              </div>
            ) : extensionError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">
                  Error loading extension data: {extensionError}
                </p>
              </div>
            ) : extensionData ? (
              <>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <div className="w-4 h-4 bg-purple-400 rounded-sm flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-xs"></div>
                    </div>
                  </div>
                  <h4 className="font-semibold text-gray-900">
                    Browser Extensions
                  </h4>
                  <Badge
                    variant="secondary"
                    className="bg-purple-100 text-purple-700 border-purple-200"
                  >
                    {extensionData.activeCount} Connected
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  Manage TagZ extension connections across your devices (Max: 2)
                </p>

                {/* Active Connections */}
                {getActiveConnections().length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {getActiveConnections().map((connection) => (
                      <div
                        key={connection.id}
                        className="bg-purple-50 rounded-lg p-4 border border-purple-100"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Chrome className="h-5 w-5 text-blue-500" />
                            <div>
                              <h5 className="font-medium text-gray-900">
                                {connection.deviceName}
                              </h5>
                              <p className="text-sm text-gray-500">
                                Chrome • Last active{" "}
                                {connection.lastActivity
                                  ? formatDate(connection.lastActivity)
                                  : "Never"}
                              </p>
                              <p className="text-xs text-gray-400">
                                {connection.totalContentSaved || 0} items saved
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge
                              className="bg-purple-600 text-white hover:bg-purple-700"
                              style={{ backgroundColor: "#7C3AED" }}
                            >
                              Connected
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 hover:bg-purple-100"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => handleViewActivity(connection)}
                                  className="cursor-pointer focus:bg-purple-50 focus:text-purple-600"
                                >
                                  <Activity className="h-4 w-4 mr-2" />
                                  View Activity
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDisconnect(connection.id)
                                  }
                                  className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
                                >
                                  <Unlink2 className="h-4 w-4 mr-2" />
                                  Disconnect
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Previous/Disconnected Connections */}
                {getInactiveConnections().length > 0 && (
                  <div>
                    <button
                      onClick={() =>
                        setShowPreviousConnections(!showPreviousConnections)
                      }
                      className="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-700 mb-4"
                    >
                      {showPreviousConnections ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span>
                        View Previous Connections (
                        {getInactiveConnections().length})
                      </span>
                    </button>

                    {showPreviousConnections && (
                      <div className="space-y-3 ml-6">
                        {getInactiveConnections().map((connection) => (
                          <div
                            key={connection.id}
                            className="flex items-center justify-between p-3 border border-purple-200 rounded-lg bg-purple-25"
                          >
                            <div className="flex items-center space-x-3">
                              <Chrome className="h-5 w-5 text-gray-400" />
                              <div>
                                <h5 className="font-medium text-gray-700">
                                  {connection.deviceName}
                                </h5>
                                <p className="text-sm text-gray-500">
                                  Disconnected •{" "}
                                  {connection.lastActivity
                                    ? formatDate(connection.lastActivity)
                                    : "Never"}{" "}
                                  • Manual disconnect
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-gray-500 border-purple-300"
                            >
                              Disconnected
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* No Connections Message */}
                {getActiveConnections().length === 0 &&
                  getInactiveConnections().length === 0 && (
                    <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
                      <p className="text-gray-600 mb-2">
                        No extension connections yet
                      </p>
                      <p className="text-sm text-gray-500">
                        Install the Tagzs extension and sign in to connect your
                        browser
                      </p>
                    </div>
                  )}
              </>
            ) : null}
          </div>

          {/* Mobile App */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Mobile App</h4>
                <p className="text-sm text-gray-500">
                  Access your knowledge base on mobile
                </p>
              </div>
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                style={{ backgroundColor: "#7C3AED" }}
              >
                Connect
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Dialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4 border-b border-purple-100">
            <DialogTitle className="flex items-center space-x-2 text-lg font-semibold">
              <Lock className="h-5 w-5 text-purple-600" />
              <span>Change Password</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-2">
              Enter your new password to update your account security
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 py-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError("");
                  }}
                  disabled={isChangingPassword}
                  className={passwordError ? "border-destructive" : ""}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError("");
                  }}
                  disabled={isChangingPassword}
                  className={passwordError ? "border-destructive" : ""}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-900 mb-2">
                Password Requirements:
              </p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li className={newPassword.length >= 8 ? "text-green-600" : ""}>
                  • At least 8 characters {newPassword.length >= 8 && "✓"}
                </li>
                <li
                  className={/[A-Z]/.test(newPassword) ? "text-green-600" : ""}
                >
                  • One uppercase letter {/[A-Z]/.test(newPassword) && "✓"}
                </li>
                <li
                  className={/[a-z]/.test(newPassword) ? "text-green-600" : ""}
                >
                  • One lowercase letter {/[a-z]/.test(newPassword) && "✓"}
                </li>
                <li
                  className={/[0-9]/.test(newPassword) ? "text-green-600" : ""}
                >
                  • One number {/[0-9]/.test(newPassword) && "✓"}
                </li>
                <li
                  className={
                    /[^A-Za-z0-9]/.test(newPassword) ? "text-green-600" : ""
                  }
                >
                  • One special character{" "}
                  {/[^A-Za-z0-9]/.test(newPassword) && "✓"}
                </li>
              </ul>
            </div>

            {/* Error Message */}
            {passwordError && (
              <div className="flex items-center space-x-2 text-sm text-destructive bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="h-4 w-4" />
                <span>{passwordError}</span>
              </div>
            )}

            {/* Forgot Password Link */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Mail className="h-4 w-4 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-purple-900 mb-1">
                    Don't remember your current password?
                  </p>
                  <button
                    type="button"
                    onClick={handleForgotPasswordClick}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium hover:underline"
                  >
                    Reset password via email →
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsChangePasswordOpen(false)}
                disabled={isChangingPassword}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700"
                disabled={
                  isChangingPassword || !newPassword || !confirmPassword
                }
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Password
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Connection Details Modal */}
      <Dialog
        open={isConnectionDetailsOpen}
        onOpenChange={setIsConnectionDetailsOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-4 border-b border-purple-100">
            <DialogTitle className="flex items-center space-x-2 text-lg font-semibold">
              <Activity className="h-5 w-5 text-purple-600" />
              <span>Connection Details</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-2">
              Information about this browser extension connection
            </DialogDescription>
          </DialogHeader>

          {selectedConnection && (
            <div className="space-y-6 py-4">
              {/* Device Info */}
              <div className="flex items-center space-x-3">
                <Chrome className="h-8 w-8 text-blue-500" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    {selectedConnection.deviceName}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {selectedConnection.userAgent || "Chrome Browser"}
                  </p>
                </div>
                <Badge
                  className={`ml-auto ${
                    selectedConnection.status === "active"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                  style={
                    selectedConnection.status === "active"
                      ? { backgroundColor: "#7C3AED" }
                      : {}
                  }
                >
                  {selectedConnection.status === "active"
                    ? "Connected"
                    : "Disconnected"}
                </Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="text-2xl font-semibold text-gray-900">
                    {selectedConnection.totalContentSaved || 0}
                  </div>
                  <div className="text-sm text-gray-600">Items Saved</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="text-2xl font-semibold text-gray-900">
                    {selectedConnection.totalAPICallsMade || 0}
                  </div>
                  <div className="text-sm text-gray-600">API Requests</div>
                </div>
              </div>

              {/* Connection History */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-purple-600" />
                  Connection History
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedConnection.status === "active"
                        ? "Active"
                        : "Disconnected"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Used</span>
                    <span className="text-sm text-gray-500">
                      {selectedConnection.lastActivity
                        ? formatDate(selectedConnection.lastActivity)
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Last Heartbeat
                    </span>
                    <span className="text-sm text-gray-500">
                      {selectedConnection.lastHeartbeat
                        ? formatDate(selectedConnection.lastHeartbeat)
                        : "Never"}
                    </span>
                  </div>
                  {selectedConnection.ipAddress && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">IP Address</span>
                      <span className="text-sm text-gray-500">
                        {selectedConnection.ipAddress}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Status */}
              {selectedConnection.status === "active" ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">
                      Security Status
                    </span>
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Active & Secure
                    </Badge>
                  </div>
                  <p className="text-sm text-green-700 mt-2">
                    This connection is active and can save content to your TagZ
                    account.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-800">
                      Status
                    </span>
                    <Badge className="bg-gray-100 text-gray-800 text-xs">
                      Disconnected
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mt-2">
                    This connection has been disconnected and can no longer save
                    content.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
