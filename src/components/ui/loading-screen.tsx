import React from "react";

interface LoadingScreenProps {
  message?: string;
  variant?: "default" | "library" | "tags" | "settings" | "template" | "add" | "content";
  showSubtext?: boolean;
}

const variantConfig = {
  default: {
    icon: "spinner",
    color: "from-violet-600 to-purple-600",
    subtext: "Initializing...",
    description: "Setting up your workspace",
  },
  library: {
    icon: "library",
    color: "from-violet-600 to-purple-600",
    subtext: "Organizing",
    description: "Loading your content library",
  },
  tags: {
    icon: "tags",
    color: "from-violet-600 to-purple-600",
    subtext: "Cataloging",
    description: "Loading your tags",
  },
  settings: {
    icon: "settings",
    color: "from-violet-600 to-purple-600",
    subtext: "Configuring",
    description: "Loading your preferences",
  },
  template: {
    icon: "template",
    color: "from-violet-600 to-purple-600",
    subtext: "Creating",
    description: "Loading your templates",
  },
  add: {
    icon: "add",
    color: "from-violet-600 to-purple-600",
    subtext: "Preparing",
    description: "Initializing form",
  },
  content: {
    icon: "document",
    color: "from-violet-600 to-purple-600",
    subtext: "Fetching",
    description: "Loading content details",
  },
};

function SpinnerIcon() {
  return (
    <svg className="w-16 h-16 animate-smooth-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75 fill-current"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg className="w-16 h-16 animate-smooth-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747c5.5 0 10-4.998 10-10.747S17.5 6.253 12 6.253z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 6L8 4m4 2l4-2M4 12l-2-1m18 1l2-1"
      />
    </svg>
  );
}

function TagsIcon() {
  return (
    <svg className="w-16 h-16 animate-smooth-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-16 h-16 animate-smooth-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ animationDuration: "3s" }}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg className="w-16 h-16 animate-smooth-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ animationDuration: "2s" }}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="10" strokeWidth={1.5} className="animate-smooth-pulse" style={{ animationDuration: "2s" }} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" className="animate-smooth-pulse" style={{ animationDuration: "2s", animationDelay: "0.1s" }} />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="w-16 h-16 animate-smooth-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ animationDuration: "1.5s" }}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

const iconMap = {
  spinner: SpinnerIcon,
  library: LibraryIcon,
  tags: TagsIcon,
  settings: SettingsIcon,
  template: TemplateIcon,
  add: AddIcon,
  document: DocumentIcon,
};

export function LoadingScreen({
  message = "Loading...",
  variant = "default",
  showSubtext = true,
}: LoadingScreenProps) {
  const config = variantConfig[variant] || variantConfig.default;
  const IconComponent = iconMap[config.icon as keyof typeof iconMap];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-background/95 backdrop-blur-md">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r ${config.color} rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob`} />
        <div className={`absolute top-1/3 right-1/4 w-96 h-96 bg-gradient-to-r ${config.color} rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000`} />
        <div className={`absolute -bottom-8 left-1/2 w-96 h-96 bg-gradient-to-r ${config.color} rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000`} />
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center space-y-6 z-10">
        {/* Icon container with glow effect */}
        <div className="relative">
          <div
            className={`absolute inset-0 bg-gradient-to-r ${config.color} rounded-full animate-smooth-pulse opacity-40`}
            style={{ filter: "blur(40px)", animationDuration: "3s" }}
          />
          <div className={`relative text-transparent bg-clip-text bg-gradient-to-r ${config.color}`}>
            {IconComponent && <IconComponent />}
          </div>
        </div>

        {/* Loading message */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent animate-fade-in">
            {message}
          </h1>

          {showSubtext && (
            <>
              <p className="text-sm font-medium text-muted-foreground animate-fade-in-delayed">
                {config.subtext}
              </p>
              <p className="text-xs text-muted-foreground/60 animate-fade-in-delayed-2">
                {config.description}
              </p>
            </>
          )}
        </div>

        {/* Loading dots animation */}
        <div className="flex space-x-2 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.color} animate-smooth-pulse`}
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: "1.5s" }}
            />
          ))}
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fade-in-delayed {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes smooth-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes smooth-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes smooth-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .animate-blob {
          animation: blob 7s infinite cubic-bezier(0.4, 0.0, 0.6, 1.0);
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-fade-in {
          animation: fade-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-fade-in-delayed {
          animation: fade-in-delayed 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
        }

        .animate-fade-in-delayed-2 {
          animation: fade-in-delayed 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both;
        }

        .animate-smooth-spin {
          animation: smooth-spin 2s linear infinite;
          will-change: transform;
        }

        .animate-smooth-bounce {
          animation: smooth-bounce 1.5s cubic-bezier(0.4, 0.0, 0.6, 1.0) infinite;
          will-change: transform;
        }

        .animate-smooth-pulse {
          animation: smooth-pulse 2s cubic-bezier(0.4, 0.0, 0.6, 1.0) infinite;
          will-change: opacity;
        }
      `}</style>
    </div>
  );
}
