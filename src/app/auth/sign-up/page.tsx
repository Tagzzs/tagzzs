"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpSchema } from "@/lib/validation/authSchemas";
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
import Image from "next/image";
import { PublicRoute } from "../../../components/auth-guard";
import { TermsOfService } from "@/components/terms-of-service";
import { PrivacyPolicy } from "@/components/privacy-policy";
import "./auth-theme.css";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string>("");
  const [nameError, setNameError] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");

  const router = useRouter();
  const { toast } = useToast();

  // Real-time email validation
  useEffect(() => {
    if (email.length > 0) {
      const emailSchema = signUpSchema.shape.email;
      const result = emailSchema.safeParse(email);

      if (!result.success) {
        setEmailError(result.error.issues[0]?.message || "Invalid email");
      } else {
        setEmailError("");
      }
    } else {
      setEmailError("");
    }
  }, [email]);

  // Real-time name validation
  useEffect(() => {
    if (fullName.length > 0) {
      const nameSchema = signUpSchema.shape.name;
      const result = nameSchema.safeParse(fullName);

      if (!result.success) {
        setNameError(result.error.issues[0]?.message || "Invalid name");
      } else {
        setNameError("");
      }
    } else {
      setNameError("");
    }
  }, [fullName]);

  // Real-time password validation
  useEffect(() => {
    if (password.length > 0) {
      const passwordSchema = signUpSchema.shape.password;
      const result = passwordSchema.safeParse(password);

      if (!result.success) {
        setPasswordErrors(result.error.issues.map((issue) => issue.message));
      } else {
        setPasswordErrors([]);
      }
    } else {
      setPasswordErrors([]);
    }
  }, [password]);

  // Real-time confirm password validation
  useEffect(() => {
    if (confirmPassword.length > 0) {
      if (password !== confirmPassword) {
        setConfirmPasswordError("Passwords don't match");
      } else {
        setConfirmPasswordError("");
      }
    } else {
      setConfirmPasswordError("");
    }
  }, [password, confirmPassword]);

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    // Redirect to backend endpoint which handles the OAuth flow
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login/google`;
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Validate input
      const result = signUpSchema.safeParse({
        email,
        password,
        confirmPassword,
        name: fullName,
      });

      if (!result.success) {
        setErrors(result.error.flatten().fieldErrors);
        setIsLoading(false);
        return;
      }

      // Call the API route for sign up
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/sign-up`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Important for HttpOnly cookies
          body: JSON.stringify({
            name: fullName,
            email,
            password,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.details) {
          // Handle validation errors from the API
          setErrors(data.error.details || {});
        }

        toast({
          title: "Error",
          description: data.error?.message || "Failed to create account",
          variant: "destructive",
        });
        return;
      }

      // Check for success message or data, session cookie is set automatically
      if (data.success) {
        // No manual session setting needed

        toast({
          title: "Account Created",
          description: "Welcome to Tagzzs! Redirecting you now...",
          variant: "default",
        });

        router.refresh();
        router.push("/dashboard");
      } else {
        // TODO: Set email confirmation first
        toast({
          title: "Verify your Email",
          description:
            data.data?.message ||
            "Please check your email to verify your account.",
          variant: "default",
        });

        // Redirect to sign-in page instead of dashboard
        setTimeout(() => {
          router.push("/auth/sign-in");
        }, 3000);
      }
    } catch (error) {
      console.error("Sign up error:", error);
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
      <div className="auth-theme min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-500 via-violet-600 to-violet-700 flex-col justify-center items-center text-white p-12 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>

          <div className="relative z-10 text-center">
            {/* Logo */}
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
            <p className="text-xl text-purple-100 max-w-md">
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
                className="flex-1 text-center py-2 px-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/sign-up"
                className="flex-1 text-center py-2 px-4 text-violet-600 border-b-2 border-violet-600 font-medium"
              >
                Sign Up
              </Link>
            </div>

            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-gray-800">
                  Create Your Account
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Enter your details to create your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sign Up Form */}
                <form onSubmit={handleSignUp} className="space-y-4">
                  {/* Full Name Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="fullName"
                      className="text-violet-600 font-medium"
                    >
                      Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`border-gray-200 focus:border-violet-500 focus:ring-violet-500 ${
                        nameError
                          ? "border-red-500"
                          : errors.name
                          ? "border-destructive"
                          : ""
                      }`}
                      disabled={isLoading}
                    />
                    {/* Real-time name validation error */}
                    {nameError && (
                      <p className="text-sm text-red-500">{nameError}</p>
                    )}
                    {/* API validation errors (fallback) */}
                    {errors.name && !nameError && (
                      <p className="text-sm text-destructive">
                        {errors.name[0]}
                      </p>
                    )}
                  </div>

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
                        emailError
                          ? "border-red-500"
                          : errors.email
                          ? "border-destructive"
                          : ""
                      }`}
                      disabled={isLoading}
                    />
                    {/* Real-time email validation error */}
                    {emailError && (
                      <p className="text-sm text-red-500">{emailError}</p>
                    )}
                    {/* API validation errors (fallback) */}
                    {errors.email && !emailError && (
                      <p className="text-sm text-destructive">
                        {errors.email[0]}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-violet-600 font-medium"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`pr-10 border-gray-200 focus:border-violet-500 focus:ring-violet-500 ${
                          passwordErrors.length > 0
                            ? "border-red-500"
                            : errors.password
                            ? "border-destructive"
                            : ""
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
                    {/* Real-time password validation errors */}
                    {passwordErrors.length > 0 && (
                      <div className="space-y-1">
                        {passwordErrors.map((error, index) => (
                          <p key={index} className="text-sm text-red-500">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                    {/* API validation errors (fallback) */}
                    {errors.password && passwordErrors.length === 0 && (
                      <p className="text-sm text-destructive">
                        {errors.password[0]}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-violet-600 font-medium"
                    >
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`pr-10 border-gray-200 focus:border-violet-500 focus:ring-violet-500 ${
                          confirmPasswordError
                            ? "border-red-500"
                            : errors.confirmPassword
                            ? "border-destructive"
                            : ""
                        }`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {/* Real-time confirm password error */}
                    {confirmPasswordError && (
                      <p className="text-sm text-red-500">
                        {confirmPasswordError}
                      </p>
                    )}
                    {/* API validation errors (fallback) */}
                    {errors.confirmPassword && !confirmPasswordError && (
                      <p className="text-sm text-destructive">
                        {errors.confirmPassword[0]}
                      </p>
                    )}
                  </div>

                  {/* Create Account Button */}
                  <Button
                    type="submit"
                    className="w-full bg-[#6f42d9] hover:bg-violet-700 text-white py-3 font-medium"
                    disabled={
                      isLoading ||
                      !email ||
                      !password ||
                      !confirmPassword ||
                      !fullName ||
                      nameError !== "" ||
                      emailError !== "" ||
                      passwordErrors.length > 0 ||
                      confirmPasswordError !== ""
                    }
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Create Account
                      </>
                    ) : (
                      "Create Account"
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

                {/* Terms and Privacy */}
                <div className="text-center text-xs text-muted-foreground">
                  By creating an account, you agree to our{" "}
                  <TermsOfService className="text-violet-600 hover:underline cursor-pointer">
                    Terms of Service
                  </TermsOfService>{" "}
                  and{" "}
                  <PrivacyPolicy className="text-violet-600 hover:underline cursor-pointer">
                    Privacy Policy
                  </PrivacyPolicy>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicRoute>
  );
}
