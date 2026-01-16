import React, { useState, useEffect } from 'react';
import { SplashScreen } from './SplashScreen';
import { SignIn } from './SignIn';
import { SignUp } from './SignUp';
import { SignInMobile } from './SignInMobile';
import { SignUpMobile } from './SignUpMobile';
import { ForgotPassword } from './ForgotPassword';
import { ForgotPasswordMobile } from './ForgotPasswordMobile';
import { SplitScreenAuth } from './SplitScreenAuth';
import { SignInSplit } from './SignInSplit';
import { SignUpSplit } from './SignUpSplit';
import { ForgotPasswordSplit } from './ForgotPasswordSplit';

type AuthScreen = 'splash' | 'signIn' | 'signUp' | 'forgotPassword';

interface AuthFlowProps {
  onAuthComplete?: () => void;
  initialScreen?: AuthScreen;
  skipSplash?: boolean;
}

export function AuthFlow({ onAuthComplete, initialScreen = 'splash', skipSplash = false }: AuthFlowProps) {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>(
    skipSplash ? 'signIn' : initialScreen
  );
  const [isMobile, setIsMobile] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleScreenChange = (screen: AuthScreen) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentScreen(screen);
      setIsTransitioning(false);
    }, 300);
  };

  const handleSignIn = (email: string, password: string) => {
    console.log('Sign in:', { email, password });
    // Simulate successful sign-in
    setTimeout(() => {
      onAuthComplete?.();
    }, 500);
  };

  const handleSignUp = (name: string, email: string, password: string) => {
    console.log('Sign up:', { name, email, password });
    // Simulate successful sign-up
    setTimeout(() => {
      onAuthComplete?.();
    }, 500);
  };

  const handleSocialAuth = (provider: 'google' | 'github') => {
    console.log('Social auth:', provider);
    // Simulate successful social auth
    setTimeout(() => {
      onAuthComplete?.();
    }, 500);
  };

  const handleResetPassword = (email: string) => {
    console.log('Reset password for:', email);
    // Email sent, user can navigate back to sign in
  };

  // Render splash screen
  if (currentScreen === 'splash') {
    return <SplashScreen onComplete={() => handleScreenChange('signIn')} />;
  }

  // Background gradient for auth screens
  const AuthBackground = ({ children }: { children: React.ReactNode }) => (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{
        background: 'radial-gradient(circle at center, #1a0a2e 0%, #0a0a0f 50%, #000000 100%)',
      }}
    >
      {/* Animated gradient orbs */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%)',
          animationDuration: '4s',
        }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
          animationDuration: '5s',
          animationDelay: '1s',
        }}
      />
      
      {/* Content with smooth transition */}
      <div
        className={`transition-all duration-300 ease-out ${
          isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {children}
      </div>
    </div>
  );

  // Render sign-in screen
  if (currentScreen === 'signIn') {
    // Mobile: Use existing mobile layout with splash transition
    if (isMobile) {
      return (
        <AuthBackground>
          <SignInMobile
            onSignUp={() => handleScreenChange('signUp')}
            onSignIn={handleSignIn}
            onSocialAuth={handleSocialAuth}
            onForgotPassword={() => handleScreenChange('forgotPassword')}
          />
        </AuthBackground>
      );
    }
    
    // Desktop: Use split-screen layout
    return (
      <SplitScreenAuth>
        <div
          className={`transition-all duration-500 ease-out ${
            isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
          }`}
        >
          <SignInSplit
            onSignUp={() => handleScreenChange('signUp')}
            onSignIn={handleSignIn}
            onSocialAuth={handleSocialAuth}
            onForgotPassword={() => handleScreenChange('forgotPassword')}
          />
        </div>
      </SplitScreenAuth>
    );
  }

  // Render sign-up screen
  if (currentScreen === 'signUp') {
    // Mobile: Use existing mobile layout
    if (isMobile) {
      return (
        <AuthBackground>
          <SignUpMobile
            onSignIn={() => handleScreenChange('signIn')}
            onSignUp={handleSignUp}
            onSocialAuth={handleSocialAuth}
          />
        </AuthBackground>
      );
    }
    
    // Desktop: Use split-screen layout
    return (
      <SplitScreenAuth>
        <div
          className={`transition-all duration-500 ease-out ${
            isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
          }`}
        >
          <SignUpSplit
            onSignIn={() => handleScreenChange('signIn')}
            onSignUp={handleSignUp}
            onSocialAuth={handleSocialAuth}
          />
        </div>
      </SplitScreenAuth>
    );
  }

  // Render forgot password screen
  if (currentScreen === 'forgotPassword') {
    // Mobile: Use existing mobile layout
    if (isMobile) {
      return (
        <AuthBackground>
          <ForgotPasswordMobile
            onBack={() => handleScreenChange('signIn')}
            onResetPassword={handleResetPassword}
          />
        </AuthBackground>
      );
    }
    
    // Desktop: Use split-screen layout
    return (
      <SplitScreenAuth>
        <div
          className={`transition-all duration-500 ease-out ${
            isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
          }`}
        >
          <ForgotPasswordSplit
            onBack={() => handleScreenChange('signIn')}
            onResetPassword={handleResetPassword}
          />
        </div>
      </SplitScreenAuth>
    );
  }

  return null;
}