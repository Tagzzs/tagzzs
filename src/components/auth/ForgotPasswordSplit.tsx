import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { AuthInput } from './AuthInput';
import { AuthButton } from './AuthButton';
import { AuthDivider } from './AuthDivider';

interface ForgotPasswordSplitProps {
  onBack?: () => void;
  onResetPassword?: (email: string) => void;
  loading?: boolean;
  error?: string;
  success?: boolean;
  email?: string;
  setEmail?: (email: string) => void;
}

export function ForgotPasswordSplit({ 
  onBack, 
  onResetPassword,
  loading = false,
  error,
  success = false,
  email,
  setEmail
}: ForgotPasswordSplitProps) {
  const [localEmail, setLocalEmail] = useState('');
  const [localError, setLocalError] = useState('');

  const currentEmail = email ?? localEmail;
  const handleEmailChange = (val: string) => {
    if (setEmail) setEmail(val);
    else setLocalEmail(val);
  };

  useEffect(() => {
    setLocalError('');
  }, [currentEmail]);

  const validateForm = () => {
    if (!currentEmail) {
      setLocalError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S/.test(currentEmail)) {
      setLocalError('Email is invalid');
      return false;
    }
    setLocalError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onResetPassword?.(currentEmail);
  };

  const displayError = localError || error;

  if (success) {
    return (
      <div className="w-full text-center">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
          <CheckCircle className="text-green-400" size={32} />
        </div>
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
          Check your email
        </h1>
        <p className="text-white/50 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
          We've sent a password reset link to <br />
          <span className="text-purple-400 font-medium">{currentEmail}</span>
        </p>
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
          <AuthButton
            onClick={onBack}
            variant="secondary"
            icon={<ArrowLeft size={18} />}
          >
            Back to sign in
          </AuthButton>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="group flex items-center gap-2 text-white/50 hover:text-white/90 transition-all duration-200 mb-6 -mt-2 animate-in fade-in duration-500"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-200" />
        <span className="text-sm">Back to sign in</span>
      </button>

      {/* Header */}
      <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
        <h1
          className="text-3xl lg:text-4xl font-bold mb-3"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Reset password
        </h1>
        <p className="text-white/50 text-sm lg:text-base">
          Enter your email and we'll send you instructions to reset your password
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
        <AuthInput
          type="email"
          placeholder="Email address"
          value={currentEmail}
          onChange={handleEmailChange}
          error={displayError}
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
    </div>
  );
}