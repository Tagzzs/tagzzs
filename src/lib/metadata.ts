import { Metadata, Viewport } from 'next'

export interface PageMetadata {
  title: string
  description: string
  keywords?: string[]
  ogImage?: string
  userName?: string
}

export function generateMetadata({
  title,
  description,
  keywords = [],
  ogImage = '/og-image.png',
  userName
}: PageMetadata): Metadata {
  const siteName = 'Tagzzs'
  
  // Create personalized title if userName is provided
  let personalizedTitle = title
  if (userName && !title.includes(userName)) {
    personalizedTitle = `${userName}'s ${title}`
  }
  
  const fullTitle = personalizedTitle.includes(siteName) ? personalizedTitle : `${personalizedTitle} | ${siteName}`
  
  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    authors: [{ name: 'Tagzzs Team' }],
    creator: 'Tagzzs',
    publisher: 'Tagzzs',
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      siteName,
      title: fullTitle,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: personalizedTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
      creator: '@tagzzs',
    },
    alternates: {
      canonical: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
  }
}

export function generateViewport(): Viewport {
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    colorScheme: "light dark",
  }
}

// Common metadata configurations
export const metadataConfig = {
  home: {
    title: 'Tagzzs - Personal Knowledge Management System',
    description: 'Organize, tag, and discover your digital content with AI-powered insights. Tagzzs helps you build your personal knowledge base efficiently.',
    keywords: ['knowledge management', 'content organization', 'AI tagging', 'personal productivity', 'digital library']
  },
  
  signIn: {
    title: 'Sign In to Tagzzs',
    description: 'Access your personal knowledge management dashboard. Sign in to organize and discover your content with AI-powered tagging.',
    keywords: ['sign in', 'login', 'authentication', 'knowledge management', 'Tagzzs']
  },
  
  signUp: {
    title: 'Create Your Tagzzs Account',
    description: 'Join Tagzzs to start organizing your digital content with AI-powered tagging. Create your personal knowledge management system today.',
    keywords: ['sign up', 'register', 'create account', 'knowledge management', 'AI tagging']
  },
  
  dashboard: {
    title: 'Dashboard',
    description: 'Your personal knowledge management dashboard. View recent content, trending tags, and manage your digital library with Tagzzs.',
    keywords: ['dashboard', 'knowledge management', 'content overview', 'personal library', 'AI insights']
  },
  
  // Route names
  'memory-space': {
    title: 'Memory Space',
    description: 'Browse and manage your entire content collection. Search, filter, and organize your knowledge base with advanced tagging.',
    keywords: ['memory space', 'digital collection', 'search content', 'knowledge base', 'content management']
  },
  
  'quick-capture': {
    title: 'Quick Capture',
    description: 'Add new content to your knowledge base. Upload documents, save web pages, and let AI automatically generate relevant tags.',
    keywords: ['quick capture', 'upload document', 'save webpage', 'AI tagging', 'content creation']
  },
  
  'neural-tags': {
    title: 'Neural Tags',
    description: 'Explore and manage your content tags. Discover patterns in your knowledge base and optimize your content organization.',
    keywords: ['neural tags', 'content organization', 'tag explorer', 'knowledge patterns', 'content categorization']
  },
  
  settings: {
    title: 'Account Settings',
    description: 'Manage your Tagzzs account settings, preferences, and privacy options. Customize your knowledge management experience.',
    keywords: ['account settings', 'user preferences', 'privacy settings', 'profile management', 'Tagzzs configuration']
  },
  
  content: {
    title: 'Content Details',
    description: 'View detailed information about your saved content. Explore AI-generated tags, insights, and related materials.',
    keywords: ['content details', 'content view', 'AI insights', 'tag analysis', 'knowledge exploration']
  },
  
  'kai-ai': {
    title: 'Kai AI',
    description: 'Chat with your intelligent AI assistant. Get instant answers, analyze your knowledge base, and extract insights powered by Kai AI.',
    keywords: ['AI assistant', 'chat', 'AI insights', 'knowledge analysis', 'intelligent search', 'Kai AI']
  },

}