import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, ArrowRight, Tag } from 'lucide-react';
import { AuthInput } from './AuthInput';
import { AuthButton } from './AuthButton';
import { SocialButton } from './SocialButton';
import { AuthDivider } from './AuthDivider';

interface SignUpSplitProps {
  onSignIn?: () => void;
  onSignUp?: (name: string, email: string, password: string) => void;
  onSocialAuth?: (provider: 'google' | 'github') => void;
  loading?: boolean;
  errors?: Record<string, string[]>;
  name?: string;
  setName?: (name: string) => void;
  email?: string;
  setEmail?: (email: string) => void;
  password?: string;
  setPassword?: (password: string) => void;
  confirmPassword?: string;
  setConfirmPassword?: (pc: string) => void;
  promoCode?: string;
  setPromoCode?: (code: string) => void; 
}

export function SignUpSplit({ 
  onSignIn, 
  onSignUp, 
  onSocialAuth,
  loading = false,
  errors = {},
  name, setName,
  email, setEmail,
  password, setPassword,
  confirmPassword, setConfirmPassword,
  promoCode, setPromoCode
}: SignUpSplitProps) {
  const [localName, setLocalName] = useState('');
  const [localEmail, setLocalEmail] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [localConfirmPassword, setLocalConfirmPassword] = useState('');
  const [localPromoCode, setLocalPromoCode] = useState('');
  const [localErrors, setLocalErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const currentName = name !== undefined ? name : localName;
  const currentEmail = email !== undefined ? email : localEmail;
  const currentPassword = password !== undefined ? password : localPassword;
  const currentConfirmPassword = confirmPassword !== undefined ? confirmPassword : localConfirmPassword;
  const currentPromoCode = promoCode !== undefined ? promoCode : localPromoCode;

  const handleNameChange = setName || setLocalName;
  const handleEmailChange = setEmail || setLocalEmail;
  const handlePasswordChange = setPassword || setLocalPassword;
  const handleConfirmPasswordChange = setConfirmPassword || setLocalConfirmPassword;
  const handlePromoCodeChange = (code: string) => {
    const uppercaseCode = code.toUpperCase();
    if (setPromoCode) {
      setPromoCode(uppercaseCode);
    } else {
      setLocalPromoCode(uppercaseCode);
    }
  };

  useEffect(() => {
    setLocalErrors({});
  }, [currentName, currentEmail, currentPassword, currentConfirmPassword]);

  const validateForm = () => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!currentName) {
      newErrors.name = 'Name is required';
    }

    if (!currentEmail) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(currentEmail)) {
      newErrors.email = 'Email is invalid';
    }

    if (!currentPassword) {
      newErrors.password = 'Password is required';
    } else if (currentPassword.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!currentConfirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (currentPassword !== currentConfirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setLocalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSignUp?.(currentName, currentEmail, currentPassword);
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
          Create your account
        </h1>
        <p className="text-white/50 text-sm lg:text-base">
          Start building your second brain today
        </p>
      </div>

      {/* Social Auth */}
      <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
        <SocialButton
          provider="google"
          onClick={() => onSocialAuth?.('google')}
        />
        {/* Github removed */}
      </div>

      <div className="animate-in fade-in duration-500 delay-200">
        <AuthDivider />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
        <AuthInput
          type="text"
          placeholder="Full name"
          value={currentName}
          onChange={handleNameChange}
          error={getError('name')}
          icon={<User size={18} />}
        />

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

        <AuthInput
          type="password"
          placeholder="Confirm password"
          value={currentConfirmPassword}
          onChange={handleConfirmPasswordChange}
          error={getError('confirmPassword')}
          icon={<Lock size={18} />}
        />

        <AuthInput
          type="text"
          placeholder="Have a Promo Code? (Optional)"
          value={currentPromoCode}
          onChange={handlePromoCodeChange}
          icon={<Tag size={18} />}
        />

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

      {/* Terms */}
      <p className="mt-6 text-xs text-white/40 text-center leading-relaxed animate-in fade-in duration-500 delay-400">
        By creating an account, you agree to our{' '}
        <button className="text-purple-400 hover:text-purple-300 transition-colors hover:underline decoration-purple-400/30">
          Terms of Service
        </button>{' '}
        and{' '}
        <button className="text-purple-400 hover:text-purple-300 transition-colors hover:underline decoration-purple-400/30">
          Privacy Policy
        </button>
      </p>

      {/* Sign In Link */}
      <div className="mt-6 text-center animate-in fade-in duration-500 delay-500">
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
    </div>
  );
}