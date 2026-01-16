import React, { useState } from 'react';
import { SplashScreen } from './SplashScreen';
import { SignIn } from './SignIn';
import { SignUp } from './SignUp';
import { SignInMobile } from './SignInMobile';
import { SignUpMobile } from './SignUpMobile';
import { Monitor, Smartphone, Play, X } from 'lucide-react';

type DemoScreen = 'menu' | 'splash' | 'signIn' | 'signUp' | 'signInMobile' | 'signUpMobile';

interface AuthShowcaseProps {
  onAuthComplete?: () => void;
}

export function AuthShowcase({ onAuthComplete }: AuthShowcaseProps) {
  const [currentScreen, setCurrentScreen] = useState<DemoScreen>('menu');

  const handleBack = () => {
    setCurrentScreen('menu');
  };

  const MenuItem = ({ 
    title, 
    icon, 
    onClick 
  }: { 
    title: string; 
    icon: React.ReactNode; 
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="group relative w-full p-6 rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.98]"
      style={{
        background: 'rgba(9, 9, 11, 0.6)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, transparent 100%)',
        }}
      />
      <div className="relative flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
          {icon}
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-white font-medium mb-1">{title}</h3>
          <p className="text-white/40 text-sm">Click to preview</p>
        </div>
        <Play size={18} className="text-purple-400" />
      </div>
    </button>
  );

  if (currentScreen === 'menu') {
    return (
      <div
        className="min-h-screen w-full p-6 md:p-12"
        style={{
          background: 'radial-gradient(circle at center, #1a0a2e 0%, #0a0a0f 50%, #000000 100%)',
        }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1
              className="text-5xl md:text-6xl font-bold mb-4"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 30px rgba(168, 85, 247, 0.3))',
              }}
            >
              TAGZZS
            </h1>
            <p className="text-white/60 text-lg mb-2">
              Authentication Flow Showcase
            </p>
            <p className="text-white/40 text-sm">
              Premium dark-themed auth experience for knowledge management
            </p>
          </div>

          {/* Menu Grid */}
          <div className="grid gap-4 mb-8">
            <MenuItem
              title="Splash Screen"
              icon={<Play size={20} />}
              onClick={() => setCurrentScreen('splash')}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Monitor size={18} className="text-purple-400" />
                <h2 className="text-white/60 text-sm uppercase tracking-wider">Desktop View</h2>
              </div>
              <MenuItem
                title="Sign In (Desktop)"
                icon={<Monitor size={20} />}
                onClick={() => setCurrentScreen('signIn')}
              />
              <MenuItem
                title="Sign Up (Desktop)"
                icon={<Monitor size={20} />}
                onClick={() => setCurrentScreen('signUp')}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone size={18} className="text-purple-400" />
                <h2 className="text-white/60 text-sm uppercase tracking-wider">Mobile View</h2>
              </div>
              <MenuItem
                title="Sign In (Mobile)"
                icon={<Smartphone size={20} />}
                onClick={() => setCurrentScreen('signInMobile')}
              />
              <MenuItem
                title="Sign Up (Mobile)"
                icon={<Smartphone size={20} />}
                onClick={() => setCurrentScreen('signUpMobile')}
              />
            </div>
          </div>

          {/* Features */}
          <div
            className="rounded-2xl p-6 mt-8"
            style={{
              background: 'rgba(9, 9, 11, 0.4)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <h3 className="text-white/80 font-medium mb-4">Features</h3>
            <div className="grid md:grid-cols-2 gap-3 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Frosted glass morphism</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>3D neural sphere animation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Responsive layouts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Form validation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Social authentication</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Smooth transitions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Back button for all screens
  const BackButton = () => (
    <button
      onClick={handleBack}
      className="fixed top-6 left-6 z-50 p-3 rounded-xl bg-black/80 backdrop-blur-lg border border-white/10 text-white hover:bg-black/90 transition-all active:scale-95"
    >
      <X size={20} />
    </button>
  );

  if (currentScreen === 'splash') {
    return (
      <div className="relative">
        <BackButton />
        <SplashScreen onComplete={handleBack} />
      </div>
    );
  }

  if (currentScreen === 'signIn') {
    return (
      <div className="relative">
        <BackButton />
        <SignIn onSignUp={() => setCurrentScreen('signUp')} />
      </div>
    );
  }

  if (currentScreen === 'signUp') {
    return (
      <div className="relative">
        <BackButton />
        <SignUp onSignIn={() => setCurrentScreen('signIn')} />
      </div>
    );
  }

  if (currentScreen === 'signInMobile') {
    return (
      <div className="relative">
        <BackButton />
        <SignInMobile onSignUp={() => setCurrentScreen('signUpMobile')} />
      </div>
    );
  }

  if (currentScreen === 'signUpMobile') {
    return (
      <div className="relative">
        <BackButton />
        <SignUpMobile onSignIn={() => setCurrentScreen('signInMobile')} />
      </div>
    );
  }

  return null;
}