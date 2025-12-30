"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { ClientMeta } from "@/components/client-meta"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, LinkIcon, Upload, Sparkles, Check, Loader2, Image as ImageIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { marked } from 'marked'
import { createClient } from '@/utils/supabase/client'

// Configure marked for safe HTML output
marked.setOptions({
  breaks: true,
  gfm: true,
})

interface ContentData {
  link: string;
  title: string;
  contentType: string;
  description: string;
  personalNotes: string;
  tagsId: string[];
  thumbnailUrl?: string;
  rawContent?: string;
}

// Function to convert markdown to HTML safely
function convertMarkdownToHtml(markdown: string): string {
  try {
    return marked(markdown) as string
  } catch (error) {
    console.error('Markdown conversion error:', error)
    return markdown.replace(/\n/g, '<br />')
  }
}

const suggestedTags = [
  "JavaScript",
  "React",
  "Web Development",
  "Tutorial",
  "Best Practices",
  "Performance",
  "UI/UX",
  "Design",
  "API",
  "Backend",
  "Frontend",
  "Mobile",
]

export default function AddContentPage() {
  const [activeTab, setActiveTab] = useState("url")
  const [formData, setFormData] = useState({
    url: "",
    title: "",
    description: "",
    notes: "",
    type: "",
    tags: [] as string[],
    thumbnailUrl: "", 
    rawContent: "",
  })
  const [newTag, setNewTag] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [showDescriptionPreview, setShowDescriptionPreview] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false) 
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState<string | null>(null)
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null)
  const router = useRouter()

  const handleAnalyzeUrl = async () => {
    if (!formData.url) return

    setIsAnalyzing(true)
    setExtractionError(null)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/content/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formData.url
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('[handleAnalyzeUrl] Full result:', result);

      // Check if result indicates an error
      if (result.result === 'error') {
        throw new Error(result.details || result.error || 'Failed to extract content')
      }

      // Check if we have success with content
      if (result.result === 'success' && result.content) {
        const data = result.content
        
        console.log('[handleAnalyzeUrl] Extracted content:', data);
        
        setFormData((prev) => ({
          ...prev,
          title: data.title && data.title !== 'Untitled' ? data.title : prev.title,
          description: data.summary || (data.content ? data.content.substring(0, 200) + '...' : prev.description),
          type: data.metadata?.contentType || 'article',
          tags: data.tags ? data.tags.slice(0, 10) : [],
          rawContent: data.rawContent || '',
        }))
        
        const description = data.summary || (data.content ? data.content.substring(0, 200) + '...' : '')
        const hasMarkdown = /(\*{1,2}|_{1,2}|`|#|\[|\]|\(|\)|>|-|\+|\d+\.)/g.test(description)
        if (hasMarkdown) {
          setShowDescriptionPreview(true)
        }
      } else {
        throw new Error('Failed to extract content from the provided URL - Invalid response structure')
      }
    } catch (error) {
      let errorMessage = 'Failed to analyze URL'
      
      if (error instanceof Error) {
        if (error.message.includes('not a valid PDF')) {
          errorMessage = 'PDF extraction failed. The downloaded content is not a valid PDF file. This usually means:\n• The URL requires login or authentication\n• The URL redirects to a preview/viewer page instead of the actual PDF\n• The server returned an error page or blocked the request\n• The URL points to a PDF viewer service rather than direct PDF file\n\nTry these working test URLs:\n• https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf\n• https://www.africau.edu/images/default/sample.pdf\n• https://file-examples.com/storage/fe68c1f7c66b447d2f7a8fa/2017/10/file_example_PDF_1MB.pdf'
        } else if (error.message.includes('PDF')) {
          errorMessage = 'PDF extraction failed. The file may be password-protected, behind authentication, or not accessible.'
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. The website may be slow or unresponsive.'
        } else if (error.message.includes('blocked')) {
          errorMessage = 'Access blocked. The website may be preventing automated access.'
        } else if (error.message.includes('currently unavailable') || error.message.includes('service')) {
          errorMessage = error.message
        } else {
          errorMessage = error.message || 'Failed to extract content from the provided URL'
        }
      }
      
      console.error('[handleAnalyzeUrl] Error:', errorMessage);
      setExtractionError(errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }))
    }
    setNewTag("")
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  /**
   * Get or create tags and return their IDs
   */
  const processTagsAndGetIds = async (tagNames: string[]): Promise<string[]> => {
    const tagIds: string[] = [];
    
    for (const tagName of tagNames) {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        // First, try to find existing tag
        const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/tags/get`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            tagName: tagName.trim()
          })
        });
        
        if (checkResponse.ok) {
          const existingTagResponse = await checkResponse.json();
          if (existingTagResponse.success && existingTagResponse.found && existingTagResponse.tagId) {
            tagIds.push(existingTagResponse.tagId);
            continue;
          }
        }
        
        // If tag doesn't exist, create it
        const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase()}`;
        
        const createResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/tags/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            tagName: tagName.trim(),
            colorCode: randomColor,
            description: `Auto-generated tag for ${tagName.trim()}`,
          })
        });
        
        if (createResponse.ok) {
          const newTagResponse = await createResponse.json();
          if (newTagResponse.success && newTagResponse.tagId) {
            tagIds.push(newTagResponse.tagId);
          }
        } else {
          console.error(`Failed to create tag: ${tagName}`, await createResponse.text());
        }
      } catch (error) {
        console.error(`Error processing tag ${tagName}:`, error);
      }
    }
    
    return tagIds;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      alert('Please enter a title for your content.');
      return;
    }
    
    if (!formData.url.trim()) {
      alert('Please provide a URL for your content.');
      return;
    }
    
    setIsSubmitting(true)

    try {
      let tagIds: string[] = [];
      if (formData.tags.length > 0) {
        tagIds = await processTagsAndGetIds(formData.tags);
      }

      const contentData: ContentData = {
        link: formData.url,
        title: formData.title,
        contentType: formData.type || 'article',
        description: formData.description,
        rawContent: formData.rawContent, 
        personalNotes: formData.notes,
        tagsId: tagIds,
      };

      // Only include thumbnailUrl if it has a value
      if (formData.thumbnailUrl.trim()) {
        contentData.thumbnailUrl = formData.thumbnailUrl;
      }

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const contentResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/content/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(contentData)
      });

      if (contentResponse.ok) {
        const result = await contentResponse.json();
        console.log('Content saved successfully:', result);
        
        if (formData.tags.length > 0) {
          alert(`Content "${formData.title}" saved successfully with ${formData.tags.length} tag(s)!`);
        } else {
          alert(`Content "${formData.title}" saved successfully!`);
        }
        
        setFormData({
          url: "",
          title: "",
          description: "",
          rawContent: "",
          notes: "",
          type: "",
          tags: [],
          thumbnailUrl: "",
        });
        
        setSelectedFile(null)
        setSelectedThumbnail(null)
        
        router.push("/dashboard/library");
      } else {
        const error = await contentResponse.json();
        console.error('Failed to save content:', error);
        alert(`Failed to save content: ${error.error?.message || error.error || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('Error saving content:', error);
      alert('An error occurred while saving content. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setIsUploading(true)
    setUploadProgress('Preparing upload...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileType', 'content') 

      setUploadProgress('Uploading file...')

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
        
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()

      setUploadProgress('Upload complete!')

      setFormData((prev) => ({
        ...prev,
        url: result.fileUrl,
        title: prev.title || result.originalName.replace(/\.[^/.]+$/, ''),
        type: prev.type || getFileType(result.fileType),
      }))

      console.log('Content uploaded to bucket:', result.bucket)

      setTimeout(() => {
        setUploadProgress(null)
      }, 2000)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadProgress(null)
      alert('Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle thumbnail upload with fileType parameter
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file for the thumbnail')
      return
    }

    setSelectedThumbnail(file)
    setIsThumbnailUploading(true)
    setThumbnailUploadProgress('Preparing upload...')

    try {
      const formDataPayload = new FormData()
      formDataPayload.append('file', file)
      formDataPayload.append('fileType', 'thumbnail')

      setThumbnailUploadProgress('Uploading thumbnail...')

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
        
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataPayload,
      })

      if (!response.ok) {
        throw new Error('Thumbnail upload failed')
      }

      const result = await response.json()

      setThumbnailUploadProgress('Thumbnail uploaded!')

      setFormData((prev) => ({
        ...prev,
        thumbnailUrl: result.fileUrl,
      }))

      console.log('Thumbnail uploaded to bucket:', result.bucket)

      setTimeout(() => {
        setThumbnailUploadProgress(null)
      }, 2000)

    } catch (error) {
      console.error('Thumbnail upload error:', error)
      setThumbnailUploadProgress(null)
      setSelectedThumbnail(null)
      alert('Failed to upload thumbnail. Please try again.')
    } finally {
      setIsThumbnailUploading(false)
    }
  }

  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType === 'application/pdf') return 'pdf'
    return 'other'
  }

  return (
    <>
    <div style={{ backgroundColor: '#f6f3ff', minHeight: '100vh' }}>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5 md:space-y-6 px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
        <ClientMeta page="quick-capture" personalized={true} />
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Quick Capture</h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-300 mt-1">
            Save and organize your digital content with smart tagging.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Main Content Details Card */}
          <Card className="border border-violet-200/60 shadow-lg shadow-violet-100/20 bg-white/80 backdrop-blur-sm hover:shadow-xl hover:shadow-violet-100/30 transition-all duration-300 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-violet-50/50 to-indigo-50/50 border-b border-violet-100/50">
              <CardHeader className="pb-4 pt-5 px-6">
                <CardTitle className="text-lg text-slate-900 flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></div>
                  Content Details
                </CardTitle>
                <CardDescription className="text-sm text-slate-600 ml-5 mt-1">
                  Add content by URL or upload files directly.
                </CardDescription>
              </CardHeader>
            </div>
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200/50 rounded-lg p-1.5 shadow-inner h-11">
                  <TabsTrigger 
                    value="url" 
                    className="flex items-center gap-2 text-sm data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-md data-[state=active]:border-violet-200/50 rounded-md transition-all duration-200 h-8"
                  >
                    <LinkIcon className="w-4 h-4" />
                    From URL
                  </TabsTrigger>
                  <TabsTrigger 
                    value="upload" 
                    className="flex items-center gap-2 text-sm data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-md data-[state=active]:border-violet-200/50 rounded-md transition-all duration-200 h-8"
                  >
                    <Upload className="w-4 h-4" />
                    Upload File
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="url" className="text-sm text-slate-900 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-violet-500" />
                      URL
                    </Label>
                    <div className="flex gap-3">
                      <Input
                        id="url"
                        placeholder="https://dev.to/article, https://wikipedia.org/wiki/topic, or public PDF"
                        value={formData.url}
                        onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                        className="flex-1 text-sm bg-white/80 border-violet-200/60 focus:border-violet-400 focus:ring-violet-400/20 focus:ring-2 rounded-lg shadow-sm transition-all duration-200 h-10"
                      />
                      <Button 
                        type="button" 
                        onClick={handleAnalyzeUrl} 
                        disabled={!formData.url || isAnalyzing}
                        className="text-sm bg-gradient-to-r from-violet-100 to-indigo-100 hover:from-violet-200 hover:to-indigo-200 text-violet-700 border-violet-200/50 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg px-4 h-10"
                      >
                        {isAnalyzing ? (
                          <>
                            <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Analyze
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* Error Display */}
                    {extractionError && (
                      <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                        <div className="text-xs text-red-600 dark:text-red-400">
                          <strong>Extraction failed:</strong>
                          <pre className="mt-1.5 whitespace-pre-wrap font-sans text-xs">{extractionError}</pre>
                        </div>
                        
                        {/* PDF-specific help */}
                        {extractionError.includes('PDF') && (
                          <div className="mt-1.5 text-xs text-red-500 dark:text-red-400">
                            <p><strong>PDF troubleshooting:</strong></p>
                            <ul className="list-disc list-inside mt-1 space-y-0.5">
                              <li>Ensure the PDF is publicly accessible</li>
                              <li>Try downloading the PDF manually first</li>
                              <li>Some PDFs may be password-protected</li>
                              <li>Academic papers might be behind paywalls</li>
                            </ul>
                          </div>
                        )}
                        
                        {/* General help for other errors */}
                        {!extractionError.includes('PDF') && (
                          <div className="mt-1.5 text-xs text-red-500 dark:text-red-400">
                            <p><strong>Try these URLs for testing:</strong></p>
                            <ul className="list-disc list-inside mt-1 space-y-0.5">
                              <li>https://dev.to/any-article</li>
                              <li>https://medium.com/any-article</li>
                              <li>https://wikipedia.org/wiki/topic</li>
                              <li>Public blog posts or news articles</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Success Display */}
                    {!isAnalyzing && !extractionError && formData.title && formData.url && (
                      <div className="mt-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center">
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          Content extracted successfully! Review the details below.
                        </p>
                      </div>
                    )}

                    {/* Thumbnail Upload Section for URL Tab */}
                    {formData.url && !selectedFile && (
                      <Card className="mt-4 border border-violet-200/60 bg-gradient-to-br from-violet-50/30 to-indigo-50/30">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <Label className="text-sm text-slate-900 flex items-center gap-2">
                              <ImageIcon className="w-4 h-4 text-violet-500" />
                              Upload Thumbnail
                              <span className="text-xs text-slate-500 font-normal ml-1">(Optional)</span>
                            </Label>
                            <p className="text-xs text-slate-600">Add a preview image for this content. This is optional and can be skipped.</p>
                            
                            {selectedThumbnail && formData.thumbnailUrl ? (
                              <div className="space-y-3">
                                <div className="relative w-full h-40 rounded-lg overflow-hidden bg-white border border-violet-200/60">
                                  <Image 
                                    src={formData.thumbnailUrl} 
                                    alt="Thumbnail preview"
                                    fill
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedThumbnail(null)
                                      setFormData((prev) => ({ ...prev, thumbnailUrl: '' }))
                                    }}
                                    className="flex-1 text-xs border-violet-300/60 text-violet-700 hover:bg-violet-50"
                                  >
                                    Change Thumbnail
                                  </Button>
                                </div>
                              </div>
                            ) : isThumbnailUploading ? (
                              <div className="border-2 border-dashed border-violet-300/60 rounded-lg p-6 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto mb-2" />
                                <p className="text-violet-700 text-xs">{thumbnailUploadProgress}</p>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-violet-300/60 rounded-lg p-6 text-center hover:border-violet-400/60 transition-all">
                                <input
                                  type="file"
                                  id="thumbnail-upload-url"
                                  className="hidden"
                                  onChange={handleThumbnailUpload}
                                  accept="image/*"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById('thumbnail-upload-url')?.click()}
                                  className="text-xs border-violet-300/60 text-violet-700 hover:bg-violet-50"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 mr-2" />
                                  Choose Thumbnail
                                </Button>
                                <p className="text-xs text-slate-500 mt-2">JPG, PNG, or WebP (Max 2MB)</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="border-2 border-dashed border-violet-300/60 rounded-xl p-10 text-center bg-gradient-to-br from-violet-50/30 to-indigo-50/30 hover:from-violet-50/50 hover:to-indigo-50/50 transition-all duration-300 hover:border-violet-400/60">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl mb-4 shadow-sm">
                      <Upload className="w-7 h-7 text-violet-500" />
                    </div>
                    
                    {isUploading ? (
                      <div className="space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" />
                        <p className="text-violet-700 text-sm">{uploadProgress}</p>
                      </div>
                    ) : selectedFile && formData.url ? (
                      <div className="space-y-3">
                        <Check className="w-8 h-8 text-green-500 mx-auto" />
                        <p className="text-green-700 text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-slate-600">File uploaded successfully!</p>
                        <div className="flex gap-3 justify-center mt-4">
                          <Button
                            type="button"
                            onClick={handleAnalyzeUrl}
                            disabled={isAnalyzing}
                            className="text-sm bg-gradient-to-r from-violet-100 to-indigo-100 hover:from-violet-200 hover:to-indigo-200 text-violet-700 border-violet-200/50 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg px-4"
                          >
                            {isAnalyzing ? (
                              <>
                                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Analyze
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedFile(null)
                              setFormData((prev) => ({ ...prev, url: '' }))
                            }}
                            className="text-xs border-violet-300/60 text-violet-700 hover:bg-violet-50 rounded-md"
                          >
                            Upload Different File
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-violet-700 mb-4 text-sm">Drop files here or click to browse</p>
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          onChange={handleFileUpload}
                          accept="*/*"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('file-upload')?.click()}
                          className="text-sm border-violet-300/60 text-violet-700 hover:bg-violet-50 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 px-6 py-2"
                        >
                          Choose Files
                        </Button>
                        <p className="text-xs text-slate-500 mt-3">Maximum file size: 10MB</p>
                      </>
                    )}
                  </div>
                  
                  {/* Error Display for Upload Tab */}
                  {activeTab === "upload" && extractionError && (
                    <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <div className="text-xs text-red-600 dark:text-red-400">
                        <strong>Extraction failed:</strong>
                        <pre className="mt-1.5 whitespace-pre-wrap font-sans text-xs">{extractionError}</pre>
                      </div>
                    </div>
                  )}
                  
                  {/* Success Display for Upload Tab */}
                  {activeTab === "upload" && !isAnalyzing && !extractionError && formData.title && formData.url && selectedFile && (
                    <div className="mt-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center">
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Content extracted successfully! Review the details below.
                      </p>
                    </div>
                  )}

                  {/* Thumbnail Upload Section */}
                  {selectedFile && formData.url && (
                    <Card className="border border-violet-200/60 bg-gradient-to-br from-violet-50/30 to-indigo-50/30">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <Label className="text-sm text-slate-900 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-violet-500" />
                            Upload Thumbnail
                            <span className="text-xs text-slate-500 font-normal ml-1">(Optional)</span>
                          </Label>
                          <p className="text-xs text-slate-600">Add a preview image for this content. This is optional and can be skipped.</p>
                          
                          {selectedThumbnail && formData.thumbnailUrl ? (
                            <div className="space-y-3">
                              <div className="relative w-full h-40 rounded-lg overflow-hidden bg-white border border-violet-200/60">
                                <Image 
                                  src={formData.thumbnailUrl} 
                                  alt="Thumbnail preview"
                                  fill
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedThumbnail(null)
                                    setFormData((prev) => ({ ...prev, thumbnailUrl: '' }))
                                  }}
                                  className="flex-1 text-xs border-violet-300/60 text-violet-700 hover:bg-violet-50"
                                >
                                  Change Thumbnail
                                </Button>
                              </div>
                            </div>
                          ) : isThumbnailUploading ? (
                            <div className="border-2 border-dashed border-violet-300/60 rounded-lg p-6 text-center">
                              <Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto mb-2" />
                              <p className="text-violet-700 text-xs">{thumbnailUploadProgress}</p>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-violet-300/60 rounded-lg p-6 text-center hover:border-violet-400/60 transition-all">
                              <input
                                type="file"
                                id="thumbnail-upload"
                                className="hidden"
                                onChange={handleThumbnailUpload}
                                accept="image/*"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('thumbnail-upload')?.click()}
                                className="text-xs border-violet-300/60 text-violet-700 hover:bg-violet-50"
                              >
                                <ImageIcon className="w-3.5 h-3.5 mr-2" />
                                Choose Thumbnail
                              </Button>
                              <p className="text-xs text-slate-500 mt-2">JPG, PNG, or WebP (Max 2MB)</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Title and Content Type Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Card className="border border-violet-200/60 shadow-md shadow-violet-100/20 bg-white/80 backdrop-blur-sm hover:shadow-lg hover:shadow-violet-100/30 transition-all duration-300 rounded-lg">
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="title" className="text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full flex-shrink-0"></div>
                    Title
                  </Label>
                  <Input
                    id="title"
                    placeholder="Content title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    required
                    className="text-xs sm:text-sm bg-white/80 border-violet-200/60 focus:border-violet-400 focus:ring-violet-400/20 focus:ring-2 rounded-lg shadow-sm transition-all duration-200 h-9 sm:h-10"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-violet-200/60 shadow-md shadow-violet-100/20 bg-white/80 backdrop-blur-sm hover:shadow-lg hover:shadow-violet-100/30 transition-all duration-300 rounded-lg">
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="type" className="text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full flex-shrink-0"></div>
                    Content Type
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger className="text-xs sm:text-sm bg-white/80 border-violet-200/60 focus:border-violet-400 focus:ring-violet-400/20 focus:ring-2 rounded-lg shadow-sm h-9 sm:h-10">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="border-violet-200/60 rounded-lg shadow-lg">
                      <SelectItem value="article" className="text-xs sm:text-sm hover:bg-violet-50 focus:bg-violet-50 rounded-md py-2">Article</SelectItem>
                      <SelectItem value="video" className="text-xs sm:text-sm hover:bg-violet-50 focus:bg-violet-50 rounded-md py-2">Video</SelectItem>
                      <SelectItem value="pdf" className="text-xs sm:text-sm hover:bg-violet-50 focus:bg-violet-50 rounded-md py-2">PDF</SelectItem>
                      <SelectItem value="image" className="text-xs sm:text-sm hover:bg-violet-50 focus:bg-violet-50 rounded-md py-2">Image</SelectItem>
                      <SelectItem value="tweet" className="text-xs sm:text-sm hover:bg-violet-50 focus:bg-violet-50 rounded-md py-2">Tweet</SelectItem>
                      <SelectItem value="other" className="text-xs sm:text-sm hover:bg-violet-50 focus:bg-violet-50 rounded-md py-2">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description Card */}
          <Card className="border border-violet-200/60 shadow-md shadow-violet-100/20 bg-white/80 backdrop-blur-sm hover:shadow-lg hover:shadow-violet-100/30 transition-all duration-300 rounded-lg">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-sm text-slate-900 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></div>
                    Description
                  </Label>
                  {formData.description && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDescriptionPreview(!showDescriptionPreview)}
                      className="text-xs border-violet-300/60 text-violet-700 hover:bg-violet-50 rounded-md shadow-sm transition-all duration-200 h-7 px-3"
                    >
                      {showDescriptionPreview ? 'Edit' : 'Preview'}
                    </Button>
                  )}
                </div>
                
                {showDescriptionPreview && formData.description ? (
                  <div className="min-h-[100px] p-2.5 border border-violet-200/60 rounded-lg bg-gradient-to-br from-violet-50/30 to-indigo-50/30">
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert text-xs leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: convertMarkdownToHtml(formData.description) 
                      }}
                    />
                  </div>
                ) : (
                  <Textarea
                    id="description"
                    placeholder="Brief description of the content"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="text-sm bg-white/80 border-violet-200/60 focus:border-violet-400 focus:ring-violet-400/20 focus:ring-2 rounded-lg shadow-sm transition-all duration-200 resize-none"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tags Card */}
          <Card className="border border-violet-200/60 shadow-lg shadow-violet-100/20 bg-white/80 backdrop-blur-sm hover:shadow-xl hover:shadow-violet-100/30 transition-all duration-300 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-violet-50/50 to-indigo-50/50 border-b border-violet-100/50">
              <CardHeader className="pb-4 pt-5 px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-slate-900 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></div>
                    Tags & Categories
                  </CardTitle>
                  <span className="text-xs text-slate-600 bg-violet-100/50 px-2.5 py-1 rounded-full">
                    {formData.tags.length}/10
                  </span>
                </div>
                <CardDescription className="text-sm text-slate-600 ml-5 mt-1">
                  Organize your content with relevant tags.
                </CardDescription>
              </CardHeader>
            </div>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-3">
                <Label className="text-sm text-slate-900">Add Tags</Label>
                <div className="flex gap-3">
                  <Input
                    placeholder={formData.tags.length >= 10 ? "Maximum 10 tags reached" : "Add a tag"}
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addTag(newTag)
                      }
                    }}
                    disabled={formData.tags.length >= 10}
                    className="flex-1 text-sm bg-white/80 border-violet-200/60 focus:border-violet-400 focus:ring-violet-400/20 focus:ring-2 rounded-lg shadow-sm transition-all duration-200 h-10"
                  />
                  <Button
                    type="button"
                    onClick={() => addTag(newTag)}
                    disabled={!newTag || formData.tags.length >= 10}
                    className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg px-4 h-10"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {formData.tags.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm text-slate-700">Your Tags:</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="text-xs bg-gradient-to-r from-violet-100 to-indigo-100 text-violet-800 hover:from-violet-200 hover:to-indigo-200 border-violet-200/50 shadow-sm hover:shadow-md transition-all duration-200 px-3 py-1.5 rounded-lg"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 hover:text-violet-900 transition-colors duration-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-sm text-slate-700">Suggested Tags:</Label>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags
                    .filter((tag) => !formData.tags.includes(tag))
                    .slice(0, 8)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        disabled={formData.tags.length >= 10}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-gradient-to-r from-violet-50 to-indigo-50 hover:from-violet-100 hover:to-indigo-100 text-violet-700 hover:text-violet-800 rounded-lg border border-violet-200/60 hover:border-violet-300/60 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3" />
                        {tag}
                      </button>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Notes Card */}
          <Card className="border border-violet-200/60 shadow-md shadow-violet-100/20 bg-white/80 backdrop-blur-sm hover:shadow-lg hover:shadow-violet-100/30 transition-all duration-300 rounded-lg">
            <CardContent className="p-6">
              <div className="space-y-3">
                <Label htmlFor="notes" className="text-sm text-slate-900 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></div>
                  Personal Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add your thoughts, key takeaways, or why you saved this..."
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="text-sm bg-white/80 border-violet-200/60 focus:border-violet-400 focus:ring-violet-400/20 focus:ring-2 rounded-lg shadow-sm transition-all duration-200 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.title.trim() || !formData.url.trim()}
              className="text-xs sm:text-sm bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Content"
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
              className="text-xs sm:text-sm border-violet-300/60 text-violet-700 hover:bg-violet-50 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
          
          {/* Validation hints */}
          {(!formData.title.trim() || !formData.url.trim()) && (
            <div className="text-xs text-slate-600 bg-violet-50/50 p-3 rounded-lg border border-violet-200/60">
              {!formData.title.trim() && !formData.url.trim() && "Please enter a title and URL to save content."}
              {!formData.title.trim() && formData.url.trim() && "Please enter a title to save content."}
              {formData.title.trim() && !formData.url.trim() && "Please enter a URL to save content."}
            </div>
          )}
        </form>
      </div>
    </div>
    </>
  )
}
