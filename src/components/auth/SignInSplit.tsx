import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { AuthInput } from './AuthInput';
import { AuthButton } from './AuthButton';
import { SocialButton } from './SocialButton';
import { AuthDivider } from './AuthDivider';

interface SignInSplitProps {
  onSignUp?: () => void;
  onSignIn?: (e: React.FormEvent) => void;
  onSocialAuth?: () => void;
  onForgotPassword?: () => void;
  loading?: boolean;
  errors?: Record<string, string[]>;
  email?: string;
  setEmail?: (email: string) => void;
  password?: string;
  setPassword?: (password: string) => void;
}

export function SignInSplit({ 
  onSignUp, 
  onSignIn, 
  onSocialAuth, 
  onForgotPassword,
  loading = false,
  errors = {},
  email,
  setEmail,
  password,
  setPassword
}: SignInSplitProps) {
  const [localEmail, setLocalEmail] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [localErrors, setLocalErrors] = useState<{ email?: string; password?: string }>({});

  const currentEmail = email !== undefined ? email : localEmail;
  const currentPassword = password !== undefined ? password : localPassword;
  const handleEmailChange = setEmail || setLocalEmail;
  const handlePasswordChange = setPassword || setLocalPassword;

  // Clear local errors when inputs change
  useEffect(() => {
    setLocalErrors({});
  }, [currentEmail, currentPassword]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!currentEmail) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(currentEmail)) {
      newErrors.email = 'Email is invalid';
    }

    if (!currentPassword) {
      newErrors.password = 'Password is required';
    } else if (currentPassword.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setLocalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSignIn?.(e);
  };

  const getError = (field: string) => {
    if (localErrors[field as keyof typeof localErrors]) return localErrors[field as keyof typeof localErrors];
    if (errors[field] && errors[field].length > 0) return errors[field][0];
    return undefined;
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <h1
          className="text-3xl lg:text-4xl font-bold mb-3"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Welcome back
        </h1>
        <p className="text-white/50 text-sm lg:text-base">
          Sign in to continue to your second brain
        </p>
      </div>

      {/* Social Auth */}
      <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
        <SocialButton
          provider="google"
          onClick={onSocialAuth}
        />
        {/* Github removed as per old UI having it disabled/removed */}
      </div>

      <div className="animate-in fade-in duration-500 delay-200">
        <AuthDivider />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
        <AuthInput
          type="email"
          placeholder="Email address"
          value={currentEmail}
          onChange={handleEmailChange}
          error={getError('email')}
          icon={<Mail size={18} />}
        />

        <AuthInput
          type="password"
          placeholder="Password"
          value={currentPassword}
          onChange={handlePasswordChange}
          error={getError('password')}
          icon={<Lock size={18} />}
        />

        {/* Forgot Password */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-purple-400 hover:text-purple-300 transition-all duration-200 hover:underline decoration-purple-400/30"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <AuthButton
          type="submit"
          variant="primary"
          loading={loading}
          icon={<ArrowRight size={18} />}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </AuthButton>
      </form>

      {/* Sign Up Link */}
      <div className="mt-8 text-center animate-in fade-in duration-500 delay-400">
        <p className="text-sm text-white/50">
          Don't have an account?{' '}
          <button
            onClick={onSignUp}
            className="text-purple-400 hover:text-purple-300 transition-all duration-200 font-medium hover:underline decoration-purple-400/30"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}