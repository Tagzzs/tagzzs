"use client";

import type React from "react";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ClientMeta } from "@/components/client-meta";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  X,
  LinkIcon,
  Upload,
  Sparkles,
  Check,
  Loader2,
  ImageIcon, Youtube, ArrowLeft,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client"
import { marked } from "marked";

// Configure marked for safe HTML output
marked.setOptions({
  breaks: true,
  gfm: true,
});

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
    return marked(markdown) as string;
  } catch (error) {
    console.error("Markdown conversion error:", error);
    return markdown.replace(/\n/g, "<br />");
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

// YouTube domain validation
const YOUTUBE_DOMAINS = ["youtube.com", "youtu.be", "m.youtube.com", "www.youtube.com"];

function isYouTubeUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return YOUTUBE_DOMAINS.some(domain => parsedUrl.hostname.includes(domain));
  } catch {
    return false;
  }
}

// YouTube extraction result interface
interface YouTubeExtractionResult {
  success: boolean;
  status: string;
  videoUrl: string;
  createdAt: string;
  data: {
    metadata?: {
      thumbnailUrl?: string;
      videoId?: string;
      channelName?: string;
      durationSeconds?: number;
      detectedCategory?: string;
    };
    content?: {
      title?: string;
      summary?: string;
      description?: string;
      tags?: string[];
      rawContent?: string;
    };
  } | null;
  error?: string;
}

export default function AddContentPage() {
  const [activeTab, setActiveTab] = useState("url");
  const [formData, setFormData] = useState({
    url: "",
    title: "",
    description: "",
    notes: "",
    type: "",
    tags: [] as string[],
    thumbnailUrl: "", // NEW: Added thumbnail URL
    rawContent: "", // Store extracted raw content from API
  })
  const [newTag, setNewTag] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [showDescriptionPreview, setShowDescriptionPreview] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)
  const [thumbnailAttempted, setThumbnailAttempted] = useState(false)
  // Pending thumbnail state - stores blob/file for upload on save
  const [pendingThumbnailBlob, setPendingThumbnailBlob] = useState<Blob | null>(null)
  const [pendingThumbnailUrl, setPendingThumbnailUrl] = useState<string>("") // External URL to upload from
  const router = useRouter()
  const searchParams = useSearchParams()

  // YouTube requestId mode state
  const [requestId, setRequestId] = useState<string | null>(null)
  const [youtubeResult, setYoutubeResult] = useState<YouTubeExtractionResult | null>(null)
  const [isLoadingYoutubeResult, setIsLoadingYoutubeResult] = useState(false)
  const [youtubeResultError, setYoutubeResultError] = useState<string | null>(null)

  // Check for requestId in URL params and fetch YouTube result
  useEffect(() => {
    const reqId = searchParams.get('requestId')
    if (reqId) {
      setRequestId(reqId)
      setIsLoadingYoutubeResult(true)
      setYoutubeResultError(null)

      const fetchYoutubeResult = async () => {
        try {
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()
          const token = session?.access_token

          if (!token) throw new Error("Authentication required")

          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
          const response = await fetch(`${backendUrl}/youtube/result?id=${reqId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (!response.ok) {
            throw new Error('Failed to fetch extraction result')
          }

          const result = await response.json()

          if (result.error && !result.success) {
            throw new Error(result.error)
          }

          setYoutubeResult(result)

          // If result has data, populate form for saving
          if (result.data && result.status === 'completed') {
            const { content, metadata } = result.data
            setFormData(prev => ({
              ...prev,
              url: result.videoUrl,
              title: content?.title || '',
              description: content?.summary || content?.description || '',
              type: metadata?.detectedCategory || 'video',
              tags: content?.tags || [],
              thumbnailUrl: metadata?.thumbnailUrl || '',
              rawContent: content?.rawContent || ''
            }))
          }
        } catch (err) {
          setYoutubeResultError(err instanceof Error ? err.message : 'Failed to load result')
        } finally {
          setIsLoadingYoutubeResult(false)
        }
      }

      fetchYoutubeResult()
    }
  }, [searchParams])

  // Auto-analyze URL when it changes - fetch thumbnail but don't upload yet
  useEffect(() => {
    const fetchThumbnail = async () => {
      if (!formData.url) return;

      try {
        new URL(formData.url);

        // Reset states when URL changes
        setThumbnailAttempted(false);
        setIsGeneratingThumbnail(true);
        setPendingThumbnailBlob(null);
        setPendingThumbnailUrl("");
        setFormData(prev => ({ ...prev, thumbnailUrl: '' }));

        // Debounce
        const timer = setTimeout(async () => {
          try {
            // Use backend extract endpoint which returns metadata
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/extract/website`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include", // Important for HttpOnly cookies
                body: JSON.stringify({ url: formData.url }),
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.thumbnailUrl) {
                // Store the URL for upload on save - show preview using the external URL
                setPendingThumbnailUrl(data.thumbnailUrl);
                setFormData(prev => ({ ...prev, thumbnailUrl: data.thumbnailUrl }));
              }
            }
          } catch (e) {
            console.error("Failed to auto-fetch thumbnail", e);
          } finally {
            setIsGeneratingThumbnail(false);
            setThumbnailAttempted(true);
          }
        }, 1000);

        return () => clearTimeout(timer);
      } catch {
        // Invalid URL, do nothing but stop loading
        setIsGeneratingThumbnail(false);
      }
    };

    fetchThumbnail();
  }, [formData.url]);

  const handleAnalyzeUrl = async () => {
    if (!formData.url) return;

    setIsAnalyzing(true);
    setExtractionError(null);

    try {
      // Check if it's a YouTube URL - handle differently
      if (isYouTubeUrl(formData.url)) {
        // Queue the YouTube URL for extraction
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        if (!token) {
          console.error("No access token found for YouTube queueing")
          throw new Error("You must be logged in to use YouTube extraction")
        }

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
        const queueResponse = await fetch(`${backendUrl}/youtube/queue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            url: formData.url
          })
        })

        if (!queueResponse.ok) {
          const errorData = await queueResponse.json().catch(() => ({}));
          throw new Error(errorData.detail || errorData.error || `Failed to queue YouTube extraction`)
        }

        const queueResult = await queueResponse.json()

        if (queueResult.success && queueResult.requestId) {
          // Redirect to drafts page
          router.push('/dashboard/youtube-drafts')
          return
        } else {
          throw new Error(queueResult.error || 'Failed to queue YouTube extraction')
        }
      }

      // Non-YouTube URLs: use existing synchronous extraction
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/extract-refine/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            url: formData.url,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail ||
            errorData.error ||
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Backend returns the content data directly in structured format
      const data = await response.json();

      // Check if result indicates an error
      if (data.error) {
        throw new Error(data.error || "Failed to extract content");
      }

      setFormData((prev) => ({
        ...prev,
        title:
          data.title && data.title !== "Untitled" ? data.title : prev.title,
        description:
          data.summary ||
          (data.content
            ? data.content.substring(0, 200) + "..."
            : prev.description),
        type: data.content_type || "article",
        tags: data.tags ? data.tags.slice(0, 10) : [],
        rawContent: data.raw_content || "",
      }));

      // Handle Thumbnail Upload if present (optional, usually backend handles it or separate flow)
      // We will skip explicit thumbnail upload here as backend response includes metadata
      // and useEffect hook handles 'auto-fetch thumbnail' separately for the form state.
      // But if we want to ensure the thumbnail from refine is used:
      // data.metadata?.thumbnail_url might be present.

      const description =
        data.summary ||
        (data.content ? data.content.substring(0, 200) + "..." : "");
      const hasMarkdown = /(\*{1,2}|_{1,2}|`|#|\[|\]|\(|\)|>|-|\+|\d+\.)/g.test(
        description
      );
      if (hasMarkdown) {
        setShowDescriptionPreview(true);
      }
    } catch (error) {
      let errorMessage = "Failed to analyze URL";

      if (error instanceof Error) {
        if (error.message.includes("not a valid PDF")) {
          errorMessage =
            "PDF extraction failed. The downloaded content is not a valid PDF file. This usually means:\n• The URL requires login or authentication\n• The URL redirects to a preview/viewer page instead of the actual PDF\n• The server returned an error page or blocked the request\n• The URL points to a PDF viewer service rather than direct PDF file\n\nTry these working test URLs:\n• https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf\n• https://www.africau.edu/images/default/sample.pdf\n• https://file-examples.com/storage/fe68c1f7c66b447d2f7a8fa/2017/10/file_example_PDF_1MB.pdf";
        } else if (error.message.includes("PDF")) {
          errorMessage =
            "PDF extraction failed. The file may be password-protected, behind authentication, or not accessible.";
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "Request timed out. The website may be slow or unresponsive.";
        } else if (error.message.includes("blocked")) {
          errorMessage =
            "Access blocked. The website may be preventing automated access.";
        } else if (
          error.message.includes("currently unavailable") ||
          error.message.includes("service")
        ) {
          errorMessage = error.message;
        } else {
          errorMessage =
            error.message || "Failed to extract content from the provided URL";
        }
      }

      console.error("[handleAnalyzeUrl] Error:", errorMessage);
      setExtractionError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
    setNewTag("");
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  /**
   * Get or create tags and return their IDs
   */
  const processTagsAndGetIds = async (
    tagNames: string[]
  ): Promise<string[]> => {
    const tagIds: string[] = [];
    for (const tagName of tagNames) {
      try {
        // First, try to find existing tag
        const checkResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/tags/get`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include", // Important for HttpOnly cookies
            body: JSON.stringify({
              tagName: tagName.trim(),
            }),
          }
        );

        if (checkResponse.ok) {
          const existingTagResponse = await checkResponse.json();
          if (
            existingTagResponse.success &&
            existingTagResponse.found &&
            existingTagResponse.tagId
          ) {
            tagIds.push(existingTagResponse.tagId);
            continue;
          }
        }

        // If tag doesn't exist, create it
        const randomColor = `#${Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")
          .toUpperCase()}`;

        const createResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/tags/add`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              tagName: tagName.trim(),
              colorCode: randomColor,
              description: `Auto-generated tag for ${tagName.trim()}`,
            }),
          }
        );

        if (createResponse.ok) {
          const newTagResponse = await createResponse.json();
          if (newTagResponse.success && newTagResponse.tagId) {
            tagIds.push(newTagResponse.tagId);
          }
        } else {
          console.error(
            `Failed to create tag: ${tagName}`,
            await createResponse.text()
          );
        }
      } catch (error) {
        console.error(`Error processing tag ${tagName}:`, error);
      }
    }

    return tagIds;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Please enter a title for your content.");
      return;
    }

    if (!formData.url.trim()) {
      alert("Please provide a URL for your content.");
      return;
    }

    setIsSubmitting(true);

    try {
      let tagIds: string[] = [];
      if (formData.tags.length > 0) {
        tagIds = await processTagsAndGetIds(formData.tags);
      }

      // Upload pending thumbnail if exists (blob or URL)
      let finalThumbnailUrl = '';
      if (pendingThumbnailBlob) {
        // Upload blob directly
        const thumbFormData = new FormData();
        thumbFormData.append('file', pendingThumbnailBlob, 'thumbnail.jpg');
        thumbFormData.append('fileType', 'thumbnail');

        const thumbResponse = await fetch('/api/upload', {
          method: 'POST',
          body: thumbFormData
        });

        if (thumbResponse.ok) {
          const thumbResult = await thumbResponse.json();
          finalThumbnailUrl = thumbResult.fileUrl || '';
        }
      } else if (pendingThumbnailUrl) {
        // Upload from external URL
        const uploadResponse = await fetch('/api/upload/from-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: pendingThumbnailUrl })
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          if (uploadResult.success && uploadResult.fileUrl) {
            finalThumbnailUrl = uploadResult.fileUrl;
          }
        }
      }

      const contentData: ContentData = {
        link: formData.url,
        title: formData.title,
        contentType: formData.type || "article",
        description: formData.description,
        rawContent: formData.rawContent, // Include extracted raw content
        personalNotes: formData.notes,
        tagsId: tagIds,
      };

      // Only include thumbnailUrl if we have one
      if (finalThumbnailUrl) {
        contentData.thumbnailUrl = finalThumbnailUrl;
      }

      const contentResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/content/add`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(contentData),
        }
      );

      if (contentResponse.ok) {
        await contentResponse.json();

        if (formData.tags.length > 0) {
          alert(
            `Content "${formData.title}" saved successfully with ${formData.tags.length} tag(s)!`
          );
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

        // Reset pending thumbnail state
        setPendingThumbnailBlob(null);
        setPendingThumbnailUrl("");
        setSelectedFile(null);

        router.push("/dashboard/memory-space");
      } else {
        const error = await contentResponse.json();
        console.error("Failed to save content:", error);
        alert(
          `Failed to save content: ${
            error.error?.message || error.error || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error saving content:", error);
      alert("An error occurred while saving content. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateVideoThumbnail = (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        video.currentTime = 1;
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              (blob) => {
                resolve(blob);
              },
              "image/jpeg",
              0.8
            );
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error("Error capturing video frame:", e);
          resolve(null);
        } finally {
          // Cleanup
          URL.revokeObjectURL(video.src);
          video.remove();
        }
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const generatePdfThumbnail = async (file: File): Promise<Blob | null> => {
    try {
      // Dynamic import to avoid SSR issues
      const pdfjsLib = await import("pdfjs-dist");

      // Set worker source to CDN for stability without complex Next.js config
      // Using a version compatible with the installed package (approximated)
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 1.5 }); // Good quality scale
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) return null;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any).promise;

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.8
        );
      });
    } catch (error) {
      console.error("Error generating PDF thumbnail:", error);
      return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsUploading(true);
    setThumbnailAttempted(false); // Reset attempt state
    setUploadProgress("Preparing upload...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", "content");

      setUploadProgress("Uploading file...");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      setUploadProgress("Upload complete!");

      // Determine thumbnail - store locally instead of uploading immediately
      let localThumbnailPreview = "";
      let thumbBlob: Blob | null = null;

      // 1. If Image: Use the uploaded file URL directly (already uploaded as content)
      if (file.type.startsWith('image/')) {
        // For images, the content itself is the thumbnail - store the URL
        setPendingThumbnailUrl(result.fileUrl);
        localThumbnailPreview = result.fileUrl;
      }
      // 2. If Video: Generate thumbnail from file but don't upload yet
      else if (file.type.startsWith('video/')) {
        setUploadProgress('Generating thumbnail...');
        thumbBlob = await generateVideoThumbnail(file);
        if (thumbBlob) {
          localThumbnailPreview = URL.createObjectURL(thumbBlob);
          setPendingThumbnailBlob(thumbBlob);
          setPendingThumbnailUrl("");
        }
      }
      // 3. If PDF: Generate thumbnail from first page but don't upload yet
      else if (file.type === 'application/pdf') {
        setUploadProgress('Generating PDF preview...');
        thumbBlob = await generatePdfThumbnail(file);
        if (thumbBlob) {
          localThumbnailPreview = URL.createObjectURL(thumbBlob);
          setPendingThumbnailBlob(thumbBlob);
          setPendingThumbnailUrl("");
        }
      }

      setFormData((prev) => ({
        ...prev,
        url: result.fileUrl,
        title: prev.title || result.originalName.replace(/\.[^/.]+$/, ""),
        type: prev.type || getFileType(result.fileType),
        thumbnailUrl: localThumbnailPreview || prev.thumbnailUrl
      }))

      setTimeout(() => {
        setUploadProgress(null);
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress(null);
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
      setThumbnailAttempted(true); // Mark as attempted
    }
  };

  // Helper function to create local preview URL from blob (used for video/PDF thumbnails)
  // The actual upload happens in handleSubmit when the user saves

  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType === "application/pdf") return "pdf";
    return "other";
  };

  return (
    <>
      <div style={{ backgroundColor: "#f6f3ff", minHeight: "100vh" }}>
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5 md:space-y-6 px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
          <ClientMeta page="quick-capture" personalized={true} />

          {/* YouTube Result View - shown when requestId is present */}
          {requestId ? (
            <>
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard/youtube-drafts')}
                  className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Drafts
                </Button>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <Youtube className="w-8 h-8 text-red-500" />
                  YouTube Extraction
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-300 mt-1">
                  Review and save your extracted YouTube content.
                </p>
              </div>

              {/* Loading State */}
              {isLoadingYoutubeResult && (
                <Card className="border border-violet-200/60 shadow-lg bg-white/80">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-4" />
                    <p className="text-slate-600">Loading extraction result...</p>
                  </CardContent>
                </Card>
              )}

              {/* Error State */}
              {youtubeResultError && (
                <Card className="border border-red-200 shadow-lg bg-white/80">
                  <CardContent className="py-8">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-6 h-6 text-red-500" />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-2">Failed to Load</h3>
                      <p className="text-sm text-red-600 mb-4">{youtubeResultError}</p>
                      <Button
                        onClick={() => router.push('/dashboard/youtube-drafts')}
                        variant="outline"
                        className="border-violet-200 text-violet-700"
                      >
                        Back to Drafts
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pending/Processing State */}
              {youtubeResult && youtubeResult.status !== 'completed' && !isLoadingYoutubeResult && (
                <Card className="border border-amber-200/60 shadow-lg bg-white/80">
                  <CardContent className="py-8">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4" />
                      <h3 className="font-semibold text-slate-900 mb-2">Still Processing</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        Your video is still being analyzed. Please check back in a moment.
                      </p>
                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="border-violet-200 text-violet-700"
                      >
                        Refresh
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Completed Result View */}
              {youtubeResult && youtubeResult.status === 'completed' && youtubeResult.data && !isLoadingYoutubeResult && (
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
                  {/* Thumbnail and Title Card */}
                  <Card className="border border-violet-200/60 shadow-lg shadow-violet-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
                    <div className="relative w-full aspect-video bg-slate-100">
                      {formData.thumbnailUrl ? (
                        <Image
                          src={formData.thumbnailUrl}
                          alt={formData.title || 'Video thumbnail'}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Youtube className="w-16 h-16 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="yt-title" className="text-sm text-slate-900">Title</Label>
                          <Input
                            id="yt-title"
                            value={formData.title}
                            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                            className="bg-white/80 border-violet-200/60"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="yt-description" className="text-sm text-slate-900">Summary</Label>
                          <Textarea
                            id="yt-description"
                            value={formData.description}
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            rows={4}
                            className="bg-white/80 border-violet-200/60"
                          />
                        </div>

                        {/* Tags */}
                        {formData.tags.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-900">Tags</Label>
                            <div className="flex flex-wrap gap-2">
                              {formData.tags.map((tag, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="bg-violet-100 text-violet-700 border-violet-200 cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors"
                                  onClick={() => removeTag(tag)}
                                >
                                  {tag}
                                  <X className="w-3 h-3 ml-1" />
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="yt-notes" className="text-sm text-slate-900">Personal Notes (Optional)</Label>
                          <Textarea
                            id="yt-notes"
                            placeholder="Add your personal notes about this video..."
                            value={formData.notes}
                            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                            className="bg-white/80 border-violet-200/60"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Save Button */}
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/dashboard/youtube-drafts')}
                      className="border-violet-200 text-violet-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !formData.title}
                      className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Save to Memory Space
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </>
          ) : (
            /* Regular Quick Capture View */
            <>
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

                          {/* Thumbnail Preview & Upload Section */}
                          {(isGeneratingThumbnail || formData.thumbnailUrl || thumbnailAttempted) && (
                            <div className="mt-4 p-4 border border-violet-100 rounded-xl bg-violet-50/30">
                              <Label className="text-sm text-slate-900 mb-3 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-violet-500" />
                                Cover Image
                              </Label>

                              {isGeneratingThumbnail ? (
                                <div className="flex items-center gap-3 p-4 bg-white/50 rounded-lg border border-violet-100/50">
                                  <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                                  <span className="text-sm text-violet-600">Generating thumbnail...</span>
                                </div>
                              ) : (
                                <div className="flex items-start gap-4">
                                  {/* Preview Area */}
                                  <div className="relative w-32 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm flex-shrink-0 group">
                                    {formData.thumbnailUrl ? (
                                      <>
                                        <Image
                                          src={formData.thumbnailUrl}
                                          alt="Cover preview"
                                          fill
                                          className="object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setFormData(prev => ({ ...prev, thumbnailUrl: '' }))}
                                            className="text-white hover:text-red-400 hover:bg-transparent"
                                          >
                                            <X className="w-5 h-5" />
                                          </Button>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <ImageIcon className="w-8 h-8 opacity-50" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Upload Actions */}
                                  <div className="flex-1 space-y-2">
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => document.getElementById('thumbnail-upload')?.click()}
                                        disabled={isUploading}
                                        className="text-xs border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors"
                                      >
                                        {isUploading ? (
                                          <>
                                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                            Uploading...
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="w-3 h-3 mr-2" />
                                            {formData.thumbnailUrl ? 'Change Cover' : 'Upload Cover'}
                                          </>
                                        )}
                                      </Button>
                                      <input
                                        id="thumbnail-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;

                                          // Store blob for upload on save, show local preview
                                          const localPreviewUrl = URL.createObjectURL(file);
                                          setPendingThumbnailBlob(file);
                                          setPendingThumbnailUrl("");
                                          setFormData(prev => ({ ...prev, thumbnailUrl: localPreviewUrl }));
                                        }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-tight">
                                      {formData.thumbnailUrl
                                        ? "Thumbnail extracted successfully. You can replace it if needed."
                                        : "Thumbnail generation failed. Please upload a specific cover image."}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
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

                        {/* Thumbnail Preview & Upload Section for File Upload */}
                        {(formData.thumbnailUrl || thumbnailAttempted) && (
                          <div className="mt-4 p-4 border border-violet-100 rounded-xl bg-violet-50/30">
                            <Label className="text-sm text-slate-900 mb-3 flex items-center gap-2">
                              <ImageIcon className="w-4 h-4 text-violet-500" />
                              Cover Image
                            </Label>

                            <div className="flex items-start gap-4">
                              {/* Preview Area */}
                              <div className="relative w-32 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm flex-shrink-0 group">
                                {formData.thumbnailUrl ? (
                                  <>
                                    <Image
                                      src={formData.thumbnailUrl}
                                      alt="Cover preview"
                                      fill
                                      className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setFormData(prev => ({ ...prev, thumbnailUrl: '' }))}
                                        className="text-white hover:text-red-400 hover:bg-transparent"
                                      >
                                        <X className="w-5 h-5" />
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <ImageIcon className="w-8 h-8 opacity-50" />
                                  </div>
                                )}
                              </div>

                              {/* Upload Actions */}
                              <div className="flex-1 space-y-2">
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById('file-thumbnail-upload')?.click()}
                                    disabled={isUploading}
                                    className="text-xs border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors"
                                  >
                                    {isUploading ? (
                                      <>
                                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="w-3 h-3 mr-2" />
                                        {formData.thumbnailUrl ? 'Change Cover' : 'Upload Cover'}
                                      </>
                                    )}
                                  </Button>
                                  <input
                                    id="file-thumbnail-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;

                                      // Store blob for upload on save, show local preview
                                      const localPreviewUrl = URL.createObjectURL(file);
                                      setPendingThumbnailBlob(file);
                                      setPendingThumbnailUrl("");
                                      setFormData(prev => ({ ...prev, thumbnailUrl: localPreviewUrl }));
                                    }}
                                  />
                                </div>
                                <p className="text-[10px] text-slate-500 leading-tight">
                                  {selectedFile?.type.startsWith('image/')
                                    ? "Auto-set from uploaded image. You can change it if needed."
                                    : "Upload a cover image for your file."}
                                </p>
                              </div>
                            </div>
                          </div>
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
                              __html: convertMarkdownToHtml(formData.description),
                            }}
                          />
                        </div>
                      ) : (
                        <Textarea
                          id="description"
                          placeholder="Brief description of the content"
                          value={formData.description}
                          onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
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
                          placeholder={
                        formData.tags.length >= 10
                          ? "Maximum 10 tags reached"
                          : "Add a tag"
                      }
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addTag(newTag);
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
