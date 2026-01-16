import React, { useState } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { AuthInput } from './AuthInput';
import { AuthButton } from './AuthButton';
import { SocialButton } from './SocialButton';
import { AuthDivider } from './AuthDivider';

interface SignInMobileProps {
  onSignUp?: () => void;
  onSignIn?: (email: string, password: string) => void;
  onSocialAuth?: (provider: 'google' | 'github') => void;
  onForgotPassword?: () => void;
}

export function SignInMobile({ onSignUp, onSignIn, onSocialAuth, onForgotPassword }: SignInMobileProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSignIn?.(email, password);
    }, 1500);
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-center px-6 py-12"
      style={{
        background: 'radial-gradient(circle at top, #1a0a2e 0%, #0a0a0f 50%, #000000 100%)',
      }}
    >
      {/* Logo */}
      <div className="text-center mb-12">
        <h1
          className="text-5xl font-bold mb-3"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.3))',
          }}
        >
          TAGZZS
        </h1>
        <p className="text-white/40 text-sm mt-2">
          Your second brain, structured.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-2">
            Welcome back
          </h2>
          <p className="text-white/50 text-sm">
            Sign in to continue
          </p>
        </div>

        {/* Social Auth */}
        <div className="space-y-3 mb-6">
          <SocialButton
            provider="google"
            onClick={() => onSocialAuth?.('google')}
          />
          <SocialButton
            provider="github"
            onClick={() => onSocialAuth?.('github')}
          />
        </div>

        <AuthDivider />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            type="email"
            placeholder="Email address"
            value={email}
            onChange={setEmail}
            error={errors.email}
            icon={<Mail size={18} />}
          />

          <AuthInput
            type="password"
            placeholder="Password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            icon={<Lock size={18} />}
          />

          {/* Forgot Password */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs text-purple-400 active:text-purple-300 transition-colors"
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
        <div className="mt-8 text-center">
          <p className="text-sm text-white/50">
            Don't have an account?{' '}
            <button
              onClick={onSignUp}
              className="text-purple-400 active:text-purple-300 transition-colors font-medium"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>

      {/* Footer spacer */}
      <div className="h-8" />
    </div>
  );
}