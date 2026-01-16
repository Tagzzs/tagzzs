"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PublicRoute } from "../../../components/auth-guard";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { SignUpSplit } from "@/components/auth/SignUpSplit";
import { SplitScreenAuth } from "@/components/auth/SplitScreenAuth";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function SignUpPage() {
  const router = useRouter();
  const { checkAuth } = useAuth();
  const { toast } = useToast();
  
  // State for form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSignUp = async (nameVal: string, emailVal: string, passwordVal: string) => {
    // nameVal, emailVal, passwordVal are passed from the form
    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/sign-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          email: emailVal, 
          password: passwordVal,
          name: nameVal,
          confirmPassword,
          promo_code: promoCode.toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle User Already Exists specifically
        if (data.detail?.error?.code === "USER_EXISTS") {
             toast({
               title: "Account already exists",
               description: "This email is already registered. Redirecting to sign in...",
               variant: "default",
             });
             setTimeout(() => router.push("/auth/sign-in"), 2000);
             setIsLoading(false);
             return;
        }

        if (data.error?.details) {
          setErrors(data.error.details);
        } else if (data.detail && Array.isArray(data.detail)) {
           const newErrors: Record<string, string[]> = {};
           data.detail.forEach((err: any) => {
             const field = err.loc[err.loc.length - 1];
             if (!newErrors[field]) newErrors[field] = [];
             newErrors[field].push(err.msg);
           });
           setErrors(newErrors);
        } else {
             // Extract error message safely
             let errorMessage = "Failed to create account";
             if (data.error?.message) errorMessage = data.error.message;
             else if (data.detail?.error?.message) errorMessage = data.detail.error.message;
             else if (typeof data.detail === 'string') errorMessage = data.detail;

             toast({
               title: "Sign Up Failed",
               description: errorMessage,
               variant: "destructive",
             });
        }
        setIsLoading(false);
        return;
      }

      await checkAuth();
      toast({
        title: "Account created!",
        description: "Welcome to Tagzzs.",
        variant: "default",
      });
      setIsRedirecting(true);
      router.push("/dashboard");
    } catch (error) {
      console.error("Sign up error:", error);
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
            <SignUpSplit
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              promoCode={promoCode}
              setPromoCode={setPromoCode}
              onSignUp={handleSignUp}
              onSignIn={() => router.push('/auth/sign-in')}
              onSocialAuth={handleGoogleSignIn}
              loading={isLoading}
              errors={errors}
            />
        </div>
      </SplitScreenAuth>
    </PublicRoute>
  );
}
