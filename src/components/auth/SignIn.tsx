import React, { useState } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { AuthCard } from './AuthCard';
import { AuthInput } from './AuthInput';
import { AuthButton } from './AuthButton';
import { SocialButton } from './SocialButton';
import { AuthDivider } from './AuthDivider';

interface SignInProps {
  onSignUp?: () => void;
  onSignIn?: (email: string, password: string) => void;
  onSocialAuth?: (provider: 'google' | 'github') => void;
  onForgotPassword?: () => void;
}

export function SignIn({ onSignUp, onSignIn, onSocialAuth, onForgotPassword }: SignInProps) {
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
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      onSignIn?.(email, password);
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <AuthCard>
        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in duration-500">
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Welcome back
          </h1>
          <p className="text-white/50 text-sm">
            Sign in to continue to TAGZZS
          </p>
        </div>

        {/* Social Auth */}
        <div className="space-y-3 mb-6 animate-in fade-in duration-500 delay-100">
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
        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-500 delay-200">
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
              className="text-xs text-purple-400 hover:text-purple-300 transition-all duration-200 hover:underline decoration-purple-400/30"
              onClick={onForgotPassword}
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
        <div className="mt-6 text-center animate-in fade-in duration-500 delay-300">
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
      </AuthCard>
    </div>
  );
}