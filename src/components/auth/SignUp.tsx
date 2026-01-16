import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { AuthCard } from './AuthCard';
import { AuthInput } from './AuthInput';
import { AuthButton } from './AuthButton';
import { SocialButton } from './SocialButton';
import { AuthDivider } from './AuthDivider';

interface SignUpProps {
  onSignIn?: () => void;
  onSignUp?: (name: string, email: string, password: string) => void;
  onSocialAuth?: (provider: 'google' | 'github') => void;
}

export function SignUp({ onSignIn, onSignUp, onSocialAuth }: SignUpProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!name) {
      newErrors.name = 'Name is required';
    } else if (name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      onSignUp?.(name, email, password);
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex items-start md:items-center justify-center p-4 md:p-6 overflow-y-auto">
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
            Create account
          </h1>
          <p className="text-white/50 text-sm">
            Start building your second brain
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
            type="text"
            placeholder="Full name"
            value={name}
            onChange={setName}
            error={errors.name}
            icon={<User size={18} />}
          />

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

          <AuthInput
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={errors.confirmPassword}
            icon={<Lock size={18} />}
          />

          {/* Terms */}
          <div className="text-xs text-white/40 leading-relaxed pt-2">
            By creating an account, you agree to our{' '}
            <button 
              type="button" 
              className="text-purple-400 hover:text-purple-300 transition-all duration-200 underline decoration-purple-400/30 hover:decoration-purple-300"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button 
              type="button" 
              className="text-purple-400 hover:text-purple-300 transition-all duration-200 underline decoration-purple-400/30 hover:decoration-purple-300"
            >
              Privacy Policy
            </button>
          </div>

          {/* Submit Button */}
          <AuthButton
            type="submit"
            variant="primary"
            loading={loading}
            icon={<ArrowRight size={18} />}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </AuthButton>
        </form>

        {/* Sign In Link */}
        <div className="mt-6 text-center animate-in fade-in duration-500 delay-300">
          <p className="text-sm text-white/50">
            Already have an account?{' '}
            <button
              onClick={onSignIn}
              className="text-purple-400 hover:text-purple-300 transition-all duration-200 font-medium hover:underline decoration-purple-400/30"
            >
              Sign in
            </button>
          </p>
        </div>
      </AuthCard>
    </div>
  );
}