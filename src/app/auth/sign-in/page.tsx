"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signInSchema } from "@/lib/validation/authSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { PublicRoute } from "../../../components/auth-guard";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuth } from "@/contexts/AuthContext";
import "./auth-theme.css";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { checkAuth } = useAuth();

  // Detect if sign-in is from extension
  const isExtensionAuth = searchParams.get("source") === "extension";

  // Get messages from URL parameters
  const message = searchParams.get("message");
  const error = searchParams.get("error");

  useEffect(() => {
    // Show success message if present
    if (message) {
      toast({
        title: "Success",
        description: message,
        variant: "default",
      });
    }

    // Show error message if present
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [message, error, toast]);

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    // Redirect to backend endpoint which handles the OAuth flow
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login/google`;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Validate input
      const result = signInSchema.safeParse({
        email,
        password,
      });

      if (!result.success) {
        const formattedErrors = result.error.flatten().fieldErrors;
        setErrors(formattedErrors);
        setIsLoading(false);
        return;
      }

      // Call the API route for sign in
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/sign-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Important for HttpOnly cookies
          body: JSON.stringify({
            email: result.data.email,
            password: result.data.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle API errors with specific messages
        if (data.error?.details) {
          setErrors(data.error.details || {});
        }

        // Customize toast message based on error code
        let errorTitle = "Sign In Failed";
        let errorDescription =
          data.error?.message || "An error occurred during sign in.";

        switch (data.error?.code) {
          case "USER_NOT_FOUND":
            errorTitle = "User Not Found";
            errorDescription =
              "This account doesn't exist. Please sign up to create an account.";

            toast({
              title: errorTitle,
              description: errorDescription,
              variant: "destructive",
            });

            // Prompt user to sign up
            setTimeout(() => {
              const shouldRedirect = window.confirm(
                "This account doesn't exist. Would you like to create a new account?"
              );
              if (shouldRedirect) {
                router.push("/auth/sign-up");
              }
            }, 1500);
            break;

          case "INVALID_CREDENTIALS":
            errorTitle = "Invalid Credentials";
            errorDescription =
              "The email or password you entered is incorrect. Please try again.";

            toast({
              title: errorTitle,
              description: errorDescription,
              variant: "destructive",
            });
            break;

          case "EMAIL_NOT_CONFIRMED":
            errorTitle = "Email Not Verified";
            errorDescription =
              "Please check your email and click the verification link to activate your account.";

            toast({
              title: errorTitle,
              description: errorDescription,
              variant: "destructive",
            });
            break;

          case "RATE_LIMIT_EXCEEDED":
            errorTitle = "Too Many Attempts";
            errorDescription =
              "Too many sign-in attempts. Please wait a moment before trying again.";

            toast({
              title: errorTitle,
              description: errorDescription,
              variant: "destructive",
            });
            break;

          default:
            toast({
              title: errorTitle,
              description: errorDescription,
              variant: "destructive",
            });
            break;
        }
      } else {
        // Successful sign-in
        // Update session state manually before redirecting
        await checkAuth();

        toast({
          title: "Welcome back!",
          description:
            data.data?.message || "You have been signed in successfully.",
          variant: "default",
        });

        setIsRedirecting(true);

        // Redirect based on source
        if (isExtensionAuth) {
          router.push(
            "/dashboard/settings?tab=privacy&action=connect-extension"
          );
        } else {
          router.push("/dashboard");
        }
      }
    } catch (error) {
      console.error("Sign in error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicRoute>
      <Toaster />
      {isRedirecting && <LoadingScreen message="Redirecting to dashboard..." />}
      <div className="auth-theme min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-500 via-violet-600 to-violet-700 flex-col justify-center items-center text-white p-12 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-4 bg-white p-2 rounded-full inline-block">
              <Image
                src="/logo.png"
                alt="Tagzs logo"
                width={96}
                height={96}
                className="block"
              />
            </div>
            {/* Welcome Text */}
            <h1 className="text-4xl font-bold mb-4">Welcome to Tagzzs</h1>
            <p className="text-xl text-violet-100 max-w-md">
              Congratulations on your first step towards the world of Digital
              Organization
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
          <div className="w-full max-w-md">
            {/* Tab Toggle */}
            <div className="flex mb-8">
              <Link
                href="/auth/sign-in"
                className="flex-1 text-center py-2 px-4 text-violet-600 border-b-2 border-violet-600 font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/auth/sign-up"
                className="flex-1 text-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                Sign Up
              </Link>
            </div>

            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-gray-800">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Enter your details to sign in to your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sign In Form */}
                <form onSubmit={handleSignIn} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-violet-600 font-medium"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`border-gray-200 focus:border-violet-500 focus:ring-violet-500 ${
                        errors.email ? "border-destructive" : ""
                      }`}
                      disabled={isLoading}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">
                        {errors.email[0]}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="password"
                        className="text-violet-600 font-medium"
                      >
                        Password
                      </Label>
                      <Link
                        href="/auth/forgot-password"
                        className="text-sm text-violet-600 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`pr-10 border-gray-200 focus:border-violet-500 focus:ring-violet-500 ${
                          errors.password ? "border-destructive" : ""
                        }`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">
                        {errors.password[0]}
                      </p>
                    )}
                  </div>

                  {/* Sign In Button */}
                  <Button
                    type="submit"
                    className="w-full bg-[#6f42d9] hover:bg-violet-700 text-white py-3 font-medium"
                    disabled={isLoading || isRedirecting || !email || !password}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      or continue with
                    </span>
                  </div>
                </div>

                {/* Social Login Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-200"
                    disabled={isLoading}
                    onClick={handleGoogleSignIn}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="opacity-50 cursor-not-allowed border-gray-200"
                    disabled={true}
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicRoute>
  );
}
