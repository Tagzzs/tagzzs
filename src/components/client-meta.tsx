'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { metadataConfig, PageMetadata } from '@/lib/metadata'

interface ClientMetaProps {
  page: keyof typeof metadataConfig
  customData?: Partial<PageMetadata>
  personalized?: boolean
}

export function ClientMeta({ page, customData, personalized = false }: ClientMetaProps) {
  const { user } = useAuth()
  const config = { ...metadataConfig[page], ...customData }
  const siteName = 'TAGZZS'
  
  // Ensure config.title exists (fallback to page name if metadata not defined)
  const title = config.title || `${String(page).charAt(0).toUpperCase()}${String(page).slice(1)}`
  
  // Create personalized title if enabled and user exists
  let personalizedTitle = title
  if (personalized && user) {
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
    personalizedTitle = `${userName}'s ${title}`
  }
  
  const fullTitle = personalizedTitle && personalizedTitle.includes(siteName) ? personalizedTitle : `${personalizedTitle} | ${siteName}`

  useEffect(() => {
    // Update document title
    document.title = fullTitle
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', config.description)
    } else {
      const meta = document.createElement('meta')
      meta.name = 'description'
      meta.content = config.description
      document.head.appendChild(meta)
    }

    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]')
    const keywords = config.keywords?.join(', ') || ''
    if (metaKeywords) {
      metaKeywords.setAttribute('content', keywords)
    } else {
      const meta = document.createElement('meta')
      meta.name = 'keywords'
      meta.content = keywords
      document.head.appendChild(meta)
    }

    // Update Open Graph meta tags
    const updateOGMeta = (property: string, content: string) => {
      let metaTag = document.querySelector(`meta[property="${property}"]`)
      if (metaTag) {
        metaTag.setAttribute('content', content)
      } else {
        metaTag = document.createElement('meta')
        metaTag.setAttribute('property', property)
        metaTag.setAttribute('content', content)
        document.head.appendChild(metaTag)
      }
    }

    updateOGMeta('og:title', fullTitle)
    updateOGMeta('og:description', config.description)
    updateOGMeta('og:type', 'website')
    updateOGMeta('og:site_name', siteName)
    updateOGMeta('og:image', '/og-image.png')

    // Update Twitter meta tags
    const updateTwitterMeta = (name: string, content: string) => {
      let metaTag = document.querySelector(`meta[name="${name}"]`)
      if (metaTag) {
        metaTag.setAttribute('content', content)
      } else {
        metaTag = document.createElement('meta')
        metaTag.setAttribute('name', name)
        metaTag.setAttribute('content', content)
        document.head.appendChild(metaTag)
      }
    }

    updateTwitterMeta('twitter:card', 'summary_large_image')
    updateTwitterMeta('twitter:title', fullTitle)
    updateTwitterMeta('twitter:description', config.description)
    updateTwitterMeta('twitter:image', '/og-image.png')
    updateTwitterMeta('twitter:creator', '@tagzs')

  }, [fullTitle, config.description, config.keywords, user])

  return null
}
