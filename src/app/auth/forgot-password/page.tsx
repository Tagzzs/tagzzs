"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PublicRoute } from "../../../components/auth-guard";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { ForgotPasswordSplit } from "@/components/auth/ForgotPasswordSplit";
import { SplitScreenAuth } from "@/components/auth/SplitScreenAuth";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State for form fields
  const [email, setEmail] = useState("");
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (emailVal: string) => {
    // emailVal is passed from the form
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal }),
      });

      const data = await response.json();

      if (!response.ok) {
         setError(data.error?.message || data.detail || "Failed to send reset email");
         toast({
           title: "Error",
           description: data.error?.message || data.detail || "Failed to send reset email",
           variant: "destructive",
         });
         setIsLoading(false);
         return;
      }

      setSuccess(true);
      toast({
        title: "Email Sent",
        description: "Check your inbox for password reset instructions.",
        variant: "default",
      });
      setIsLoading(false);
    } catch (error) {
      console.error("Forgot password error:", error);
      setError("An unexpected error occurred. Please try again.");
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <PublicRoute>
      <Toaster />
      <SplitScreenAuth>
        <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 w-full max-w-md mx-auto">
            <ForgotPasswordSplit
              email={email}
              setEmail={setEmail}
              onResetPassword={handleResetPassword}
              onBack={() => router.push('/auth/sign-in')}
              loading={isLoading}
              error={error}
              success={success}
            />
        </div>
      </SplitScreenAuth>
    </PublicRoute>
  );
}
