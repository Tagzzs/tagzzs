import React, { useState } from 'react';
import { AuthFlow } from './AuthFlow';

export function AuthDemo() {
  const [showAuth, setShowAuth] = useState(true);
  const [authCompleted, setAuthCompleted] = useState(false);

  const handleAuthComplete = () => {
    setAuthCompleted(true);
    setTimeout(() => {
      setShowAuth(false);
    }, 1000);
  };

  if (!showAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">
            Welcome to TAGZZS! 🎉
          </h1>
          <p className="text-white/60">
            Authentication flow completed successfully.
          </p>
          <button
            onClick={() => {
              setShowAuth(true);
              setAuthCompleted(false);
            }}
            className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors"
          >
            Restart Demo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-opacity duration-1000 ${authCompleted ? 'opacity-0' : 'opacity-100'}`}>
      <AuthFlow onAuthComplete={handleAuthComplete} skipSplash={false} />
    </div>
  );
}
