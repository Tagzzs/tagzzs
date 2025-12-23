"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import "./auth-theme.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Basic email validation
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Please provide a valid email address");
        setIsLoading(false);
        return;
      }

      // Call the API
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error responses
        if (data.error?.code === 'RATE_LIMIT_EXCEEDED') {
          setError(data.error.details || 'Too many requests. Please wait before trying again.');
        } else if (data.error?.code === 'VALIDATION_ERROR') {
          setError(data.error.details?.email?.[0] || 'Invalid email address');
        } else {
          setError(data.error?.message || 'Failed to send reset email');
        }
        setIsLoading(false);
        return;
      }

      // Success
      setIsSuccess(true);
      toast({
        title: "Email Sent",
        description: "Check your inbox for password reset instructions.",
        variant: "default",
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      setError('An unexpected error occurred. Please try again.');
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="auth-theme min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription className="text-base">
              We've sent password reset instructions to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                Click the link in the email to reset your password. The link will expire in 1 hour.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/auth/sign-in')}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Back to Sign In
              </Button>
              
              <Button 
                onClick={() => setIsSuccess(false)}
                variant="outline"
                className="w-full"
              >
                Didn't receive the email? Try again
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500 mt-4">
              Check your spam folder if you don't see the email within a few minutes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main form
  return (
    <div className="auth-theme min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Mail className="h-12 w-12 text-purple-600 mx-auto mb-4" />
          <CardTitle className="text-2xl">Forgot Password?</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you instructions to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className={error ? "border-destructive" : ""}
                disabled={isLoading}
                autoFocus
              />
              {error && (
                <div className="flex items-center space-x-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700" 
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reset Link
                </>
              )}
            </Button>

            {/* Back to Sign In */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/auth/sign-in')}
              disabled={isLoading}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Button>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Remember your password?{' '}
              <button
                onClick={() => router.push('/auth/sign-in')}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Sign In
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
