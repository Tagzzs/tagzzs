  "use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PublicRoute } from "../../../components/auth-guard";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { SignInSplit } from "@/components/auth/SignInSplit";
import { SplitScreenAuth } from "@/components/auth/SplitScreenAuth";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function SignInPage() {
  const router = useRouter();
  const { checkAuth } = useAuth();
  const { toast } = useToast();
  
  // State for form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSignIn = async (emailVal: string, passwordVal: string) => {
    // emailVal and passwordVal are passed from the form
    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/sign-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: emailVal, password: passwordVal }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.details) {
          setErrors(data.error.details);
        } else if (data.detail && Array.isArray(data.detail)) {
           // Handle FastAPI validation errors if structure differs
           const newErrors: Record<string, string[]> = {};
           data.detail.forEach((err: any) => {
             const field = err.loc[err.loc.length - 1];
             if (!newErrors[field]) newErrors[field] = [];
             newErrors[field].push(err.msg);
           });
           setErrors(newErrors);
        } else {
             // Generic error
             // Extract error message safely
             let errorMessage = "Invalid email or password";
             if (data.error?.message) errorMessage = data.error.message;
             else if (data.detail?.error?.message) errorMessage = data.detail.error.message;
             else if (typeof data.detail === 'string') errorMessage = data.detail;

             toast({
               title: "Sign In Failed",
               description: errorMessage,
               variant: "destructive",
             });
        }
        setIsLoading(false);
        return;
      }

      await checkAuth();
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
        variant: "default",
      });
      setIsRedirecting(true);
      router.push("/dashboard");
    } catch (error) {
      console.error("Sign in error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    try {
      window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login/google`;
    } catch (error) {
      console.error("Social auth error:", error);
      toast({
        title: "Error",
        description: "Failed to start social authentication",
        variant: "destructive",
      });
    }
  };

  return (
    <PublicRoute>
      <Toaster />
      {isRedirecting && <LoadingScreen message="Redirecting to dashboard..." />}
      <SplitScreenAuth>
        <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 w-full max-w-md mx-auto">
            <SignInSplit
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              onSignIn={handleSignIn}
              onSignUp={() => router.push('/auth/sign-up')}
              onForgotPassword={() => router.push('/auth/forgot-password')}
              onSocialAuth={handleGoogleSignIn}
              loading={isLoading}
              errors={errors}
            />
        </div>
      </SplitScreenAuth>
    </PublicRoute>
  );
}
