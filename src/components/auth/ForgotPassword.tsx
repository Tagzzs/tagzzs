import React, { useState } from 'react';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthCard } from './AuthCard';
import { AuthInput } from './AuthInput';
import { AuthButton } from './AuthButton';

interface ForgotPasswordProps {
  onBack?: () => void;
  onResetPassword?: (email: string) => void;
}

export function ForgotPassword({ onBack, onResetPassword }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    if (!email) {
      setError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      onResetPassword?.(email);
    }, 1500);
  };

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 overflow-y-auto">
        <AuthCard>
          {/* Success Icon */}
          <div className="flex justify-center mb-6 animate-in fade-in duration-500">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-50"
                style={{
                  background: 'radial-gradient(circle, rgba(34, 197, 94, 0.6) 0%, transparent 70%)',
                }}
              />
              <div className="relative bg-green-500/10 rounded-full p-4 border border-green-500/30">
                <CheckCircle2 size={48} className="text-green-500" />
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8 animate-in fade-in duration-500 delay-100">
            <h1
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Check your email
            </h1>
            <p className="text-white/60 text-sm leading-relaxed">
              We've sent password reset instructions to
            </p>
            <p className="text-purple-400 font-medium mt-1">{email}</p>
          </div>

          {/* Instructions */}
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 animate-in fade-in duration-500 delay-200">
            <p className="text-white/50 text-sm leading-relaxed">
              Click the link in the email to reset your password. If you don't see the email, check your spam folder.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3 animate-in fade-in duration-500 delay-300">
            <AuthButton
              variant="primary"
              onClick={onBack}
              icon={<ArrowLeft size={18} />}
            >
              Back to sign in
            </AuthButton>
            
            <button
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              className="w-full text-sm text-purple-400 hover:text-purple-300 transition-all duration-200 py-2 hover:underline decoration-purple-400/30"
            >
              Try a different email
            </button>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <AuthCard>
        {/* Back Button */}
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-white/50 hover:text-white/90 transition-all duration-200 mb-6 -mt-2 animate-in fade-in duration-500"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-200" />
          <span className="text-sm">Back to sign in</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in duration-500 delay-100">
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Reset password
          </h1>
          <p className="text-white/50 text-sm">
            Enter your email and we'll send you instructions to reset your password
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500 delay-200">
          <AuthInput
            type="email"
            placeholder="Email address"
            value={email}
            onChange={setEmail}
            error={error}
            icon={<Mail size={18} />}
          />

          {/* Submit Button */}
          <AuthButton
            type="submit"
            variant="primary"
            loading={loading}
            icon={<ArrowRight size={18} />}
          >
            {loading ? 'Sending...' : 'Send reset instructions'}
          </AuthButton>
        </form>

        {/* Help Text */}
        <div className="mt-6 text-center animate-in fade-in duration-500 delay-300">
          <p className="text-xs text-white/40">
            Remember your password?{' '}
            <button
              onClick={onBack}
              className="text-purple-400 hover:text-purple-300 transition-all duration-200 hover:underline decoration-purple-400/30"
            >
              Sign in
            </button>
          </p>
        </div>
      </AuthCard>
    </div>
  );
}
