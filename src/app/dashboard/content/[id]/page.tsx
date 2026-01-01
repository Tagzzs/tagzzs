"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ExternalLink, Edit, Save, X, Calendar, Clock, Tag, FileText, Video, LinkIcon, ImageIcon, MessageSquare, Trash2, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { marked } from 'marked'

import { ContentPreview } from "@/components/ContentPreview"
// Configure marked for safe HTML output
marked.setOptions({
  breaks: true, // Convert line breaks to <br>
  gfm: true,    // GitHub Flavored Markdown
})

// Function to convert markdown to HTML safely
function convertMarkdownToHtml(markdown: string): string {
  try {
    return marked(markdown) as string
  } catch (error) {
    console.error('Markdown conversion error:', error)
    return markdown.replace(/\n/g, '<br />')
  }
}

interface ContentItem {
  id: string;
  title: string;
  description: string;
  link: string;
  contentType: string;
  tagsId: string[]; // Updated to support multiple tags
  personalNotes: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string; // Optional thumbnail URL
}

interface TagItem {
  id: string;
  tagName: string;
  tagColor: string;
  createdAt: string;
  updatedAt: string;
}

interface ContentDetailPageProps {
  params: {
    id: string;
  };
}

export default function ContentDetailPage({ params }: ContentDetailPageProps) {
  const router = useRouter()
  const [contentItem, setContentItem] = useState<ContentItem | null>(null)
  const [allContent, setAllContent] = useState<ContentItem[]>([]) // Store all content for navigation
  const [tags, setTags] = useState<TagItem[]>([]) // Changed from single tag to array of tags
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedNotes, setEditedNotes] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch content data on component mount
  const fetchContentData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch content data
      const contentResponse = await fetch('/api/user-database/content/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      if (!contentResponse.ok) {
        throw new Error('Failed to fetch content')
      }

      const contentData = await contentResponse.json()
      if (!contentData.success) {
        throw new Error(contentData.error?.message || 'Failed to fetch content')
      }

      // Store all content for navigation
      setAllContent(contentData.data || [])

      // Find the specific content item
      const item = contentData.data.find((content: ContentItem) => content.id === params.id)
      if (!item) {
        throw new Error('Content not found')
      }

      setContentItem(item)
      setEditedNotes(item.personalNotes || '')

      // Fetch tag data if content has tags
      if (item.tagsId && item.tagsId.length > 0) {
        const tagsResponse = await fetch('/api/user-database/tags/get', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        })

        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json()
          if (tagsData.success && tagsData.data) {
            // Find all tags that match the tag IDs in the content item
            const itemTags = tagsData.data.filter((tag: TagItem) => item.tagsId.includes(tag.id))
            setTags(itemTags)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching content:', error)
      setError(error instanceof Error ? error.message : 'Failed to load content')
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchContentData()
  }, [fetchContentData])

  // Navigation functions
  const getCurrentIndex = () => {
    return allContent.findIndex(item => item.id === params.id)
  }

  const navigateToNext = () => {
    const currentIndex = getCurrentIndex()
    if (currentIndex < allContent.length - 1) {
      const nextItem = allContent[currentIndex + 1]
      router.push(`/dashboard/content/${nextItem.id}`)
    }
  }

  const navigateToPrevious = () => {
    const currentIndex = getCurrentIndex()
    if (currentIndex > 0) {
      const prevItem = allContent[currentIndex - 1]
      router.push(`/dashboard/content/${prevItem.id}`)
    }
  }

  const hasNext = () => {
    const currentIndex = getCurrentIndex()
    return currentIndex >= 0 && currentIndex < allContent.length - 1
  }

  const hasPrevious = () => {
    const currentIndex = getCurrentIndex()
    return currentIndex > 0
  }

  // Helper function to ensure URLs have proper protocol
  const ensureAbsoluteUrl = (url: string) => {
    if (!url) return '#'
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    if (url.startsWith('www.')) {
      return `https://${url}`
    }
    return `https://${url}`
  }

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "article":
        return <FileText className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "pdf":
        return <FileText className="h-4 w-4" />
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "tweet":
        return <MessageSquare className="h-4 w-4" />
      default:
        return <LinkIcon className="h-4 w-4" />
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
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const handleSave = async () => {
    if (!contentItem) return

    try {
      setIsSaving(true)

      // Make API call to update content notes
      const response = await fetch('/api/user-database/content/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId: contentItem.id,
          personalNotes: editedNotes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save notes')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to save notes')
      }

      // Update local state with the returned data
      setContentItem(result.data)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving notes:', error)
      // TODO: Add toast notification for error
      alert(`Failed to save notes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedNotes(contentItem?.personalNotes || '')
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!contentItem) return

    try {
      setIsDeleting(true)

      // Make API call to delete content
      const response = await fetch('/api/user-database/content/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId: contentItem.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete content')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete content')
      }

      // Redirect back to memory-space after successful deletion
      router.push('/dashboard/memory-space')
    } catch (error) {
      console.error('Error deleting content:', error)
      // TODO: Add toast notification for error
      alert(`Failed to delete content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to memory-space
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/memory-space')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to memory-space
          </Button>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to load content</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <div className="flex justify-center gap-4">
              <Button onClick={fetchContentData} variant="outline">
                Try Again
              </Button>
              <Button onClick={() => router.push('/dashboard/memory-space')}>
                Back to memory-space
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No content found
  if (!contentItem) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/memory-space')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to memory-space
          </Button>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Content not found</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              The content you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push('/dashboard/memory-space')}>
              Back to memory-space
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div style={{ backgroundColor: '#f6f3ff' }} className="min-h-screen pt-3 pb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back button with Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/memory-space')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to memory-space
            </Button>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={navigateToPrevious}
                disabled={!hasPrevious()}
                className="h-9 w-9 border-[#7C3AED] text-[#7C3AED] hover:bg-[#F5F3FF] disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous content"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-300 min-w-[60px] text-center">
                {getCurrentIndex() + 1} of {allContent.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={navigateToNext}
                disabled={!hasNext()}
                className="h-9 w-9 border-[#7C3AED] text-[#7C3AED] hover:bg-[#F5F3FF] disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next content"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className={getTypeColor(contentItem.contentType)}>
                  {getTypeIcon(contentItem.contentType)}
                  <span className="ml-1 capitalize">{contentItem.contentType}</span>
                </Badge>
                <span className="text-sm text-gray-500">Added {formatDate(contentItem.createdAt)}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{contentItem.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href={ensureAbsoluteUrl(contentItem.link)} target="_blank">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Original
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                disabled={isSaving}
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? "Cancel" : "Edit Notes"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Content</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this content? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="content" className="w-full">
                <TabsList>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="content">
                  <Card>
                    <CardHeader>
                      <CardTitle>Content</CardTitle>
                      <CardDescription>Formatted content with markdown support</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(contentItem.description) }}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="preview">
                  <Card>
                    <CardHeader>
                      <CardTitle>Preview</CardTitle>
                      <CardDescription>
                        {contentItem.contentType === 'link' ? 'Website Preview' : 'Content Preview'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ContentPreview
                        url={ensureAbsoluteUrl(contentItem.link)}
                        fileName={contentItem.title}
                        title={contentItem.title}
                        description={contentItem.description}
                        thumbnailUrl={contentItem.thumbnailUrl}
                        className="w-full"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Tags */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {tags.length > 0 ? (
                      tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          style={{ backgroundColor: `${tag.tagColor}20`, borderColor: tag.tagColor }}
                          className="cursor-pointer hover:opacity-80"
                          onClick={() => router.push(`/dashboard/memory-space?tag=${encodeURIComponent(tag.tagName)}`)}
                        >
                          {tag.tagName}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No tags assigned</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Notes</CardTitle>
                  <CardDescription>Your thoughts and key takeaways</CardDescription>
                </CardHeader>
                <CardContent>
                  {!isEditing ? (
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {contentItem.personalNotes ? (
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(contentItem.personalNotes) }}
                        />
                      ) : (
                        <p className="text-gray-500 italic">No notes added yet.</p>
                      )}
                    </div>
                  ) : (
                    <Textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      placeholder="Add your notes, thoughts, or key takeaways..."
                      rows={6}
                      disabled={isSaving}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Added {formatDate(contentItem.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>Updated {formatDate(contentItem.updatedAt)}</span>
                  </div>
                  <Separator />
                  <div className="text-xs text-gray-500">
                    <p>Source: {new URL(ensureAbsoluteUrl(contentItem.link)).hostname}</p>
                    <p className="mt-1">Content Type: {contentItem.contentType}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              {isEditing && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    className="flex-1"
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
