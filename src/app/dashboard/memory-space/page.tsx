"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { ClientMeta } from "@/components/client-meta"
import { InstagramEmbed } from "@/components/InstagramEmbed"
import { TwitterEmbed } from "@/components/TwitterEmbed"
import { LinkedInEmbed } from "@/components/LinkedInEmbed"
import { RedditEmbed } from "@/components/RedditEmbed"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/utils/supabase/client"

import {
  Search,
  List,
  FileText,
  Video,
  LinkIcon,
  ImageIcon,
  MessageSquare,
  RefreshCw,
  Plus,
  AlertCircle,
  ExternalLink,
  Grid3X3,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react"
import Image from "next/image";
import { useRouter } from "next/navigation"
import { marked } from 'marked'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Configure marked for safe HTML output
marked.setOptions({
  breaks: true,
  gfm: true,
})

interface ContentItem {
  id: string;
  title: string;
  description: string;
  link: string;
  contentType: string;
  tagsId: string[];
  personalNotes: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
}

interface TagItem {
  id: string;
  tagName: string;
  tagColor: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get type icon component
const getTypeIconComponent = (contentType: string) => {
  switch (contentType.toLowerCase()) {
    case "article":
      return <FileText className="w-4 h-4" />;
    case "video":
      return <Video className="w-4 h-4" />;
    case "pdf":
      return <FileText className="w-4 h-4" />;
    case "image":
      return <ImageIcon className="w-4 h-4" />;
    case "tweet":
      return <MessageSquare className="w-4 h-4" />;
    case "link":
      return <LinkIcon className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

// Helper function to get dummy image based on content type
const getDummyImage = (_contentType: string, _id: string): string => {
  return `https://www.contentviewspro.com/wp-content/uploads/2017/07/default_image.png`;
};

// Helper function to get preview image
const getPreviewImage = (item: ContentItem): string => {
  // If thumbnail exists, use it
  if (item.thumbnailUrl) {
    return item.thumbnailUrl;
  }
  
  // For links, try to extract image or use dummy
  if (item.link) {
    return getDummyImage(item.contentType, item.id);
  }
  
  // Default dummy image
  return getDummyImage(item.contentType, item.id);
};

// Preview Dialog Component
function ContentPreviewDialog({ 
  isOpen, 
  onClose, 
  fileUrl, 
  fileName,
  currentIndex,
  totalItems,
  onNext,
  onPrevious,
}: { 
  isOpen: boolean
  onClose: () => void
  fileUrl: string
  fileName: string
  contentType: string
  currentIndex: number
  totalItems: number
  onNext?: () => void
  onPrevious?: () => void
}) {
  const getPreviewContent = () => {
    const fileExt = fileName.split('.').pop()?.toLowerCase()
    
    // Handle image files
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt || '')) {
      return (
        <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="relative w-full h-[70vh]">
            <Image
              src={fileUrl}
              alt={fileName}
              fill
              unoptimized
              style={{ objectFit: 'contain' }}
              className="rounded-lg"
              onError={(e) => {
                console.error('Image load error:', e)
              }}
            />
          </div>
        </div>
      )
    }
    
    // Handle PDF files
    if (fileExt === 'pdf') {
      return (
        <iframe
          src={`${fileUrl}#toolbar=0`}
          className="w-full h-[70vh] rounded-lg border border-gray-200 dark:border-gray-700"
          title={fileName}
          onError={(e) => {
            console.error('PDF load error:', e)
          }}
        />
      )
    }

      // Use Microsoft Office viewer for PowerPoint files, keep direct iframe for PDFs
      if (['ppt', 'pptx'].includes(fileExt || '')) {
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
      return (
        <iframe
        src={officeViewerUrl}
        className="w-full h-[70vh] rounded-lg border border-gray-200 dark:border-gray-700"
        title={fileName}
        onError={(e) => {
          console.error('PPT preview load error:', e)
        }}
        />
      )
      }

    // Handle video files
    if (['mp4', 'webm', 'ogg'].includes(fileExt || '')) {
      return (
        <video
          src={fileUrl}
          controls
          className="max-w-full max-h-[70vh] mx-auto rounded-lg"
          onError={(e) => {
            console.error('Video load error:', e)
          }}
        />
      )
    }

    // Handle YouTube links and regular video files
    // First detect YouTube URLs (youtu.be or youtube.com)
    if (fileUrl.includes('youtube.com') || fileUrl.includes('youtu.be')) {
      const extractYouTubeId = (url: string) => {
        try {
          const parsed = new URL(url)
          // youtu.be/VIDEOID
          if (parsed.hostname.includes('youtu.be')) {
            return parsed.pathname.slice(1)
          }
          // youtube.com/watch?v=VIDEOID
          const v = parsed.searchParams.get('v')
          if (v) return v
          // youtube.com/embed/VIDEOID or youtube.com/v/VIDEOID
          const pathMatch = parsed.pathname.match(/(?:\/embed\/|\/v\/)([A-Za-z0-9_-]{6,})/)
          if (pathMatch) return pathMatch[1]
        } catch {
          // fallback to regex if URL constructor fails
          const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
          const m = url.match(regex)
          return m ? m[1] : null
        }
        return null
      }

      const videoId = extractYouTubeId(fileUrl)
      if (videoId) {
        const embedUrl = `https://www.youtube.com/embed/${videoId}`
        return (
          <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <iframe
              src={embedUrl}
              title={fileName}
              className="w-full h-[70vh] rounded-lg border border-gray-200 dark:border-gray-700"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onError={(e) => {
                console.error('YouTube embed load error:', e)
              }}
            />
          </div>
        )
      }
    }	

    // Handle Instagram embeds
    if (fileUrl.includes('instagram.com')) {
      return <InstagramEmbed fileUrl={fileUrl} fileName={fileName} />
    }

    // Handle Twitter/X embeds
    if (fileUrl.includes('twitter.com') || fileUrl.includes('x.com')) {
      return <TwitterEmbed fileUrl={fileUrl} fileName={fileName} />
    }

    // Handle LinkedIn embeds
    if (fileUrl.includes('linkedin.com')) {
      return <LinkedInEmbed fileUrl={fileUrl} fileName={fileName} />
    }

    // Handle Reddit embeds
    if (fileUrl.includes('reddit.com')) {
      return <RedditEmbed fileUrl={fileUrl} fileName={fileName} />
    }

    // Fallback for unsupported file types
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] bg-gray-50 dark:bg-gray-800 rounded-lg">
        <FileText className="h-12 w-12 text-gray-400 mb-3" />
        <p className="text-gray-600 dark:text-gray-300 mb-4">Preview not available for {fileExt || 'this file type'}</p>
        <a 
          href={fileUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Open in new tab
        </a>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-4 w-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              disabled={currentIndex === 0 || totalItems <= 1}
              className="h-8 w-8 flex-shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="flex items-center gap-2 truncate flex-1 text-center">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{fileName}</span>
              <span className="text-xs text-gray-500 ml-auto flex-shrink-0">
                {totalItems > 1 && `${currentIndex + 1} of ${totalItems}`}
              </span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              disabled={currentIndex === totalItems - 1 || totalItems <= 1}
              className="h-8 w-8 flex-shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {getPreviewContent()}
        </div>
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button variant="outline" className="bg-white dark:bg-gray-800">
            Reminder
          </Button>
          <Button variant="outline" className="bg-white dark:bg-gray-800">
            Flashcard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function LibraryPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState("newest")
  const [viewMode, setViewMode] = useState("grid")
  const [_embedding, setEmbedding] = useState<number[] | null>(null)
  const [searchResults, setSearchResults] = useState<Array<{ content_id: string; score: number; rank: number }> | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Data states
  const [content, setContent] = useState<ContentItem[]>([])
  const [tags, setTags] = useState<{ [key: string]: TagItem }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isNavigating, setIsNavigating] = useState(false)
  const [previewData, setPreviewData] = useState<{
    isOpen: boolean
    fileUrl: string
    fileName: string
    contentType: string
    currentIndex: number
    totalItems: number
  }>({
    isOpen: false,
    fileUrl: '',
    fileName: '',
    contentType: '',
    currentIndex: 0,
    totalItems: 0
  })

  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null)
  const clickCountRef = useRef(0)

  // Query Chroma when search query or tags change (1s debounce)
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Don't query if no search query
    if (!searchQuery.trim()) {
      setEmbedding(null)
      setSearchResults(null)
      setIsSearching(false)
      setSearchError(null)
      return
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Only set loading state AFTER debounce completes, right before API call
        setIsSearching(true)
        setSearchError(null)
        
        const response = await fetch("/api/search/semantic-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            query: searchQuery,
            tags: selectedTags,
          }),
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || "Search failed")
        }
        
        setEmbedding(data.results)
        setSearchResults(data.results || [])
        setSearchError(null)

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error occurred"
        setEmbedding(null)
        setSearchResults(null)
        setSearchError(errorMsg)
      } finally {
        setIsSearching(false)
      }
    }, 1000) 

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery, selectedTags])

  // Handle URL parameters
  useEffect(() => {
    // Get URL parameters from window.location when component mounts
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tagsParam = urlParams.get('tags')
      if (tagsParam) {
        const decodedTags = decodeURIComponent(tagsParam).split(',')
        setSelectedTags(decodedTags)
      }
    }
  }, [])

  // Update URL when tag selection changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      
      if (selectedTags.length === 0) {
        if (urlParams.has('tags')) {
          urlParams.delete('tags')
          const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '')
          window.history.replaceState({}, '', newUrl)
        }
      } else {
        const encodedTags = encodeURIComponent(selectedTags.join(','))
        const currentTagsParam = urlParams.get('tags')
        if (currentTagsParam !== encodedTags) {
          urlParams.set('tags', encodedTags)
          const newUrl = window.location.pathname + '?' + urlParams.toString()
          window.history.replaceState({}, '', newUrl)
        }
      }
    }
  }, [selectedTags])

  // Fetch content from API
  const fetchContent = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)
      
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      // Fetch content data
      const contentResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/content/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            sortBy: sortBy
          })
        })


      if (!contentResponse.ok) {
        const errorData = await contentResponse.json()
        throw new Error(errorData.error?.message || `HTTP ${contentResponse.status}`)
      }

      const contentData = await contentResponse.json()
      
      if (!contentData.success) {
        throw new Error(contentData.error?.message || 'Failed to fetch content')
      }

      // Fetch tags data for tag names and colors
      const tagsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/tags/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      })

        let tagsMap: { [key: string]: TagItem } = {}
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json()
          if (tagsData.success && tagsData.data) {
            tagsMap = tagsData.data.reduce((acc: { [key: string]: TagItem }, tag: TagItem & { id: string }) => {
              acc[tag.id] = tag
              return acc
            }, {})
          }
        }

      setTags(tagsMap)
      setContent(contentData.data || [])
      setRetryCount(0)
      
    } catch (error) {
      console.error('[LIBRARY] Error fetching content:', error)
      setError(error instanceof Error ? error.message : 'Failed to load content')
      
      // Exponential backoff for retries
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          fetchContent()
        }, delay)
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [sortBy, retryCount])

  // Load data on component mount and when sort changes
  useEffect(() => {
    fetchContent()
  }, [fetchContent, retryCount, sortBy])

  const handleRefresh = () => {
    fetchContent(true)
  }

  const handleContentDoubleClick = (item: ContentItem, e: React.MouseEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (item.link) {
      // Extract filename from URL to get the proper extension
      const urlParts = item.link.split('/')
      const filenameWithQuery = urlParts[urlParts.length - 1]
      const filename = filenameWithQuery.split('?')[0]
      
      // The link is already a complete Supabase URL
      setPreviewData({
        isOpen: true,
        fileUrl: item.link,
        fileName: filename, 
        contentType: item.contentType,
        currentIndex: index,
        totalItems: sortedItems.length
      })
    } else {
      console.warn('No link available for item:', item.id)
    }
  }

  const handleCardInteraction = (item: ContentItem, e: React.MouseEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()

    // Increment click count
    clickCountRef.current += 1

    if (clickCountRef.current === 1) {
      // First click - wait to see if there's a second click
      const timeout = setTimeout(() => {
        // Single click - navigate to detail page
        setIsNavigating(true)
        router.push(`/dashboard/content/${item.id}`)
        clickCountRef.current = 0
      }, 300)

      setClickTimeout(timeout)
    } else if (clickCountRef.current === 2) {
      // Double click - show preview
      clearTimeout(clickTimeout!)
      handleContentDoubleClick(item, e, index)
      clickCountRef.current = 0
    }
  }

  const handleNextPreview = () => {
    const nextIndex = previewData.currentIndex + 1
    if (nextIndex < sortedItems.length) {
      const nextItem = sortedItems[nextIndex]
      const urlParts = nextItem.link.split('/')
      const filenameWithQuery = urlParts[urlParts.length - 1]
      const filename = filenameWithQuery.split('?')[0]
      setPreviewData({
        isOpen: true,
        fileUrl: nextItem.link,
        fileName: filename,
        contentType: nextItem.contentType,
        currentIndex: nextIndex,
        totalItems: sortedItems.length
      })
    }
  }

  const handlePreviousPreview = () => {
    const prevIndex = previewData.currentIndex - 1
    if (prevIndex >= 0) {
      const prevItem = sortedItems[prevIndex]
      const urlParts = prevItem.link.split('/')
      const filenameWithQuery = urlParts[urlParts.length - 1]
      const filename = filenameWithQuery.split('?')[0]
      setPreviewData({
        isOpen: true,
        fileUrl: prevItem.link,
        fileName: filename,
        contentType: prevItem.contentType,
        currentIndex: prevIndex,
        totalItems: sortedItems.length
      })
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "article":
        return <FileText className="h-3.5 w-3.5" />
      case "video":
        return <Video className="h-3.5 w-3.5" />
      case "pdf":
        return <FileText className="h-3.5 w-3.5" />
      case "image":
        return <ImageIcon className="h-3.5 w-3.5" />
      case "tweet":
        return <MessageSquare className="h-3.5 w-3.5" />
      default:
        return <LinkIcon className="h-3.5 w-3.5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "article":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "video":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "pdf":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "image":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "tweet":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const getRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
      
      if (diffInHours < 1) return 'Just now'
      if (diffInHours < 24) return `${diffInHours}h ago`
      if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
      return formatDate(dateString)
    } catch {
      return 'Unknown'
    }
  }

  // Get all unique content types from actual data
  const allTypes = Array.from(new Set(content.map(item => item.contentType?.toLowerCase() || 'other')))
  
  // Get all available tag names from tags data
  const allTagNames = Object.values(tags)
    .map(tag => tag.tagName)
    .filter(Boolean)
    .sort()

  const filteredItems = content.filter((item) => {
    const itemTagNames = Array.isArray(item.tagsId)
      ? item.tagsId.map(tagId => tags[tagId]?.tagName).filter(Boolean)
      : []
    
    // If we have a search query
    if (searchQuery.trim()) {
      // If semantic search failed or returned no results, fallback to literal search
      const useLiteralSearch = searchError || (searchResults !== null && searchResults.length === 0)
      
      if (useLiteralSearch) {
        // Fallback: Use literal text search
        const matchesSearch =
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.personalNotes.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.link.toLowerCase().includes(searchQuery.toLowerCase()) ||
          itemTagNames.some(tagName => tagName.toLowerCase().includes(searchQuery.toLowerCase()))
        
        const matchesType = selectedType === "all" || item.contentType?.toLowerCase() === selectedType
        const matchesTags = selectedTags.length === 0 || 
          itemTagNames.some(tagName => selectedTags.includes(tagName))
        
        return matchesSearch && matchesType && matchesTags
      } else if (searchResults) {
        // Use semantic search results if available
        const inSearchResults = searchResults.some(r => r.content_id === item.id)
        const matchesType = selectedType === "all" || item.contentType?.toLowerCase() === selectedType
        const matchesTags = selectedTags.length === 0 || 
          itemTagNames.some(tagName => selectedTags.includes(tagName))
        
        return inSearchResults && matchesType && matchesTags
      } else {
        const matchesType = selectedType === "all" || item.contentType?.toLowerCase() === selectedType
        const matchesTags = selectedTags.length === 0 || 
          itemTagNames.some(tagName => selectedTags.includes(tagName))
        
        return matchesType && matchesTags
      }
    } else {
      // No search query, use regular filtering
      const matchesType = selectedType === "all" || item.contentType?.toLowerCase() === selectedType
      const matchesTags = selectedTags.length === 0 || 
        itemTagNames.some(tagName => selectedTags.includes(tagName))
      
      return matchesType && matchesTags
    }
  })

  const sortedItems = [...filteredItems].sort((a, b) => {
    // If we have search results, prioritize them by rank
    if (searchResults && searchResults.length > 0) {
      const aIndex = searchResults.findIndex(r => r.content_id === a.id)
      const bIndex = searchResults.findIndex(r => r.content_id === b.id)
      
      // If both are in search results, sort by search rank
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }
      
      // If only one is in search results, it comes first
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
    
    }
    
    // Regular sorting
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case "title":
        return a.title.localeCompare(b.title)
      case "updated":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      default:
        return 0
    }
  })

  const clearFilter = (filterType: "type" | "tag", tagValue?: string) => {
    if (filterType === "type") setSelectedType("all")
    if (filterType === "tag") {
      if (tagValue) {
        // Remove specific tag from selectedTags
        setSelectedTags(selectedTags.filter(tag => tag !== tagValue))
      } else {
        // Clear all tags
        setSelectedTags([])
      }
    }
  }

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(tag => tag !== tagName)
        : [...prev, tagName]
    )
  }

  const activeFilters = [
    ...(selectedType !== "all" ? [{ type: "type" as const, value: selectedType, label: selectedType.charAt(0).toUpperCase() + selectedType.slice(1) }] : []),
    ...selectedTags.map(tag => ({ type: "tag" as const, value: tag, label: tag })),
  ]

  // Loading overlay when navigating
  if (isNavigating) {
    return (
      <div className="fixed inset-0 bg-[#f6f3ff] z-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#7C3AED] animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-2">Loading Content...</h3>
          <p className="text-sm text-[#6B7280] dark:text-gray-300">Please wait while we fetch your content</p>
        </div>
      </div>
    )
  }

  // Loading states
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f3ff] px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <ClientMeta page="memory-space" personalized={true} />
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>

          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-2xl" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-32 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <Skeleton className="h-16 w-full mb-3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && content.length === 0) {
    return (
      <div className="min-h-screen bg-[#f6f3ff] px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <ClientMeta page="memory-space" personalized={true} />
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Memory Space</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Manage your saved content</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-10 text-center">
              <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Failed to load content</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{error}</p>
              <div className="flex justify-center gap-3">
                <Button onClick={handleRefresh} variant="outline" size="sm">
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => router.push('/dashboard/quick-capture')} size="sm">
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Add Content
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-[#f6f3ff] px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        <ClientMeta page="memory-space" personalized={true} />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1F2937] dark:text-white mb-1">Memory Space</h1>
            <p className="text-xs sm:text-sm text-[#6B7280] dark:text-gray-300">
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            
            {/* View Mode Toggles */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-1 bg-[#F5F3FF] dark:bg-gray-800 rounded-full p-1 border border-[#E6E6FA] dark:border-gray-700">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setViewMode("grid")}
                  className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full transition-colors ${viewMode === "grid" ? "bg-white dark:bg-gray-700 text-[#7C3AED] shadow-sm" : "text-[#A59CCF] hover:text-[#7C3AED]"}`}
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setViewMode("list")}
                  className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full transition-colors ${viewMode === "list" ? "bg-white dark:bg-gray-700 text-[#7C3AED] shadow-sm" : "text-[#A59CCF] hover:text-[#7C3AED]"}`}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
                </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 transition-all ${isSearching ? "hidden" : "text-[#6B7280]"}`} />
            
            {/* Loading spinner */}
            {isSearching && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 animate-spin">
                <Loader2 className="h-3.5 w-3.5 text-[#7C3AED]" />
              </div>
            )}
            
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-9 bg-white dark:bg-gray-800 border-[#E6E6FA] dark:border-gray-700 rounded-2xl shadow-sm h-10 text-sm transition-all ${
                searchError ? "border-red-300 dark:border-red-700" : ""
              }`}
            />
            
            {/* Error indicator */}
            {searchError && !isSearching && searchQuery && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2" title={searchError}>
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              </div>
            )}
            
            {/* Clear button */}
            {searchQuery && !isSearching && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937] dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          
          {/* Search error/info message */}
          {searchError && searchQuery && (
            <div className="text-xs text-red-600 dark:text-red-400 px-3 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Semantic search failed: {searchError}. Showing results from literal search.</span>
            </div>
          )}
          
          {/* Search loading message */}
          {isSearching && searchQuery && (
            <div className="text-xs text-[#7C3AED] dark:text-purple-400 px-3 flex items-center gap-2">
              <div className="animate-spin">
                <Loader2 className="h-3.5 w-3.5 flex-shrink-0" />
              </div>
              <span>Searching your content...</span>
            </div>
          )}
          
          {/* Search results info - only show after search completes */}
          {!isSearching && searchResults && searchResults.length > 0 && searchQuery && !searchError && (
            <div className="text-xs text-green-600 dark:text-green-400 px-3 flex items-center gap-2">
              <Check className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Found {searchResults.length} matching result{searchResults.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-8 w-28 bg-[#F5F3FF] dark:bg-gray-800 border-[#E6E6FA] dark:border-gray-700 rounded-full text-[#7C3AED] dark:text-purple-400 hover:bg-[#E6E6FA] dark:hover:bg-gray-700 text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {allTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      <span className="capitalize">{type}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value="" onValueChange={handleTagToggle}>
                <SelectTrigger className="h-8 w-28 bg-[#F5F3FF] dark:bg-gray-800 border-[#E6E6FA] dark:border-gray-700 rounded-full text-[#7C3AED] dark:text-purple-400 hover:bg-[#E6E6FA] dark:hover:bg-gray-700 text-sm">
                  <SelectValue placeholder="Add Tags" />
                </SelectTrigger>
                <SelectContent>
                  {allTagNames.map((tagName) => (
                    <SelectItem key={tagName} value={tagName}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tagName)}
                          onChange={() => {}}
                          className="h-4 w-4"
                        />
                        {tagName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 w-32 bg-[#F5F3FF] dark:bg-gray-800 border-[#E6E6FA] dark:border-gray-700 rounded-full text-[#7C3AED] dark:text-purple-400 hover:bg-[#E6E6FA] dark:hover:bg-gray-700 text-sm">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="title">Name A-Z</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {activeFilters.map((filter) => (
                  <Badge
                    key={`${filter.type}-${filter.value}`}
                    variant="secondary"
                    className="h-8 bg-[#F5F3FF] dark:bg-gray-800 text-[#7C3AED] dark:text-purple-400 border-[#E6E6FA] dark:border-gray-700 rounded-full px-3 hover:bg-[#E6E6FA] dark:hover:bg-gray-700 cursor-pointer flex items-center gap-1.5 text-sm font-medium"
                    onClick={() => clearFilter(filter.type, filter.value)}
                  >
                    {filter.label}
                    <X className="h-3.5 w-3.5" />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Grid/List */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
            {sortedItems.map((item, index) => {
              const itemTags = Array.isArray(item.tagsId)
                ? item.tagsId.map(tagId => tags[tagId]).filter(Boolean)
                : []
              return (
                <div 
                  key={item.id}
                  onClick={(e) => handleCardInteraction(item, e, index)}
                  className="cursor-pointer select-none"
                >
                  <Card className="overflow-hidden hover:shadow-lg hover:shadow-[#E8DBFF]/40 transition-all duration-300 border-[#E4D7FF]/30 bg-white group hover:scale-[1.02] h-full">
                    {/* Thumbnail Section */}
                    <div className="relative aspect-video bg-gradient-to-br from-[#F4F0FF] to-[#E4D7FF]/50 overflow-hidden">
                      <Image
                        src={getPreviewImage(item)}
                        alt={item.title}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          // Fallback if image fails to load
                          (e.currentTarget as HTMLImageElement).src = getDummyImage(item.contentType, item.id);
                        }}
                      />

                      {/* Type Badge */}
                      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg border bg-[#F4F0FF] text-[#7A70B6] border-[#E4D7FF]/40">
                        {getTypeIconComponent(item.contentType)}
                        <span className="hidden sm:inline">{item.contentType}</span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                      {/* Title */}
                      <h3 className="text-sm sm:text-base text-[#2B235A] line-clamp-2 leading-snug font-medium break-words">
                        {item.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs sm:text-sm text-[#6B6B7C] line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Tags */}
                      {itemTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {itemTags.slice(0, 2).map((tag, tagIndex) => {
                            const tagColors = [
                              "bg-[#E4D7FF] text-[#7A70B6] border-[#C9B6FF]/30",
                              "bg-[#FFD8F0]/40 text-[#C9469E] border-[#FFD8F0]",
                              "bg-[#D6FFE5]/60 text-[#4CAF84] border-[#D6FFE5]",
                            ];
                            return (
                              <span
                                key={tag.id}
                                className={`inline-flex items-center px-2 py-0.5 sm:py-1 rounded-full text-xs border ${tagColors[tagIndex % tagColors.length]}`}
                              >
                                {tag.tagName}
                              </span>
                            );
                          })}
                          {itemTags.length > 2 && (
                            <span className="inline-flex items-center px-2 py-0.5 sm:py-1 rounded-full text-xs bg-[#F4F0FF] text-[#A59CCF] border border-[#E4D7FF]/40">
                              +{itemTags.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-1 sm:pt-2 text-xs text-[#A59CCF]">
                        <span className="truncate">{getRelativeTime(item.createdAt)}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {sortedItems.map((item, index) => {
              const itemTags = Array.isArray(item.tagsId)
                ? item.tagsId.map(tagId => tags[tagId]).filter(Boolean)
                : []
              return (
                <div 
                  key={item.id}
                  onClick={(e) => handleCardInteraction(item, e, index)}
                  className="cursor-pointer select-none"
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="p-3 sm:p-4 md:p-6">
                      <div className="flex items-start justify-between gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.contentType)}`}>
                              {getTypeIcon(item.contentType)}
                              <span className="hidden sm:inline">{item.contentType}</span>
                            </span>
                          </div>
                          <CardTitle className="text-sm sm:text-base mb-1 sm:mb-2 truncate">{item.title}</CardTitle>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
                          {getRelativeTime(item.createdAt)}
                        </div>
                      </div>
                    </CardHeader>
                    {itemTags.length > 0 && (
                      <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                        <div className="flex flex-wrap gap-2">
                          {itemTags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-2 py-0.5 sm:py-1 rounded text-xs font-medium"
                              style={{
                                backgroundColor: tag.tagColor + '20',
                                color: tag.tagColor,
                                border: `1px solid ${tag.tagColor}40`
                              }}
                            >
                              {tag.tagName}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {sortedItems.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No content found</h3>
              <p className="text-gray-600 dark:text-gray-300">Try adjusting your filters or search query</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Preview Dialog */}
      <ContentPreviewDialog
        isOpen={previewData.isOpen}
        onClose={() => setPreviewData({ ...previewData, isOpen: false })}
        fileUrl={previewData.fileUrl}
        fileName={previewData.fileName}
        contentType={previewData.contentType}
        currentIndex={previewData.currentIndex}
        totalItems={previewData.totalItems}
        onNext={handleNextPreview}
        onPrevious={handlePreviousPreview}
      />
    </div>
    </>
  )
}
