"use client"

import React from "react"
import Image from "next/image"
import { FileText, ExternalLink } from "lucide-react"
import { InstagramEmbed } from "@/components/InstagramEmbed"
import { TwitterEmbed } from "@/components/TwitterEmbed"
import { LinkedInEmbed } from "@/components/LinkedInEmbed"
import { RedditEmbed } from "@/components/RedditEmbed"
import { cn } from "@/lib/utils"

interface ContentPreviewProps {
    url: string
    fileName?: string
    className?: string
    title?: string
    description?: string
    thumbnailUrl?: string
}

export function ContentPreview({ url, fileName = "Content", className, title, description, thumbnailUrl }: ContentPreviewProps) {
    const fileExt = fileName.split('.').pop()?.toLowerCase() || ''

    // Helper to ensure hostname extraction doesn't crash
    const getHostname = (link: string) => {
        try {
            return new URL(link).hostname.replace('www.', '')
        } catch {
            return 'Link'
        }
    }

    // 1. Interactive Content Check: Image files
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt) ||
        url.match(/\.(jpeg|jpg|gif|png|webp)$/i)

    if (isImage) {
        return (
            <div className={cn("flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4", className)}>
                <div className="relative w-full h-[400px]">
                    <Image
                        src={url}
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

    // 2. Interactive Content Check: PDFs
    if (fileExt === 'pdf' || url.toLowerCase().endsWith('.pdf')) {
        return (
            <iframe
                src={`${url}#toolbar=0`}
                className={cn("w-full h-[400px] rounded-lg border border-gray-200 dark:border-gray-700", className)}
                title={fileName}
                onError={(e) => {
                    console.error('PDF load error:', e)
                }}
            />
        )
    }

    // 3. Interactive Content Check: Office Files
    if (['ppt', 'pptx'].includes(fileExt) || url.match(/\.(ppt|pptx)$/i)) {
        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
        return (
            <iframe
                src={officeViewerUrl}
                className={cn("w-full h-[400px] rounded-lg border border-gray-200 dark:border-gray-700", className)}
                title={fileName}
                onError={(e) => {
                    console.error('PPT preview load error:', e)
                }}
            />
        )
    }

    // 4. Interactive Content Check: Videos
    if (['mp4', 'webm', 'ogg'].includes(fileExt) || url.match(/\.(mp4|webm|ogg)$/i)) {
        return (
            <video
                src={url}
                controls
                className={cn("max-w-full max-h-[400px] mx-auto rounded-lg", className)}
                onError={(e) => {
                    console.error('Video load error:', e)
                }}
            />
        )
    }

    // 5. Interactive Content Check: YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const extractYouTubeId = (inputUrl: string) => {
            try {
                const parsed = new URL(inputUrl)
                if (parsed.hostname.includes('youtu.be')) {
                    return parsed.pathname.slice(1)
                }
                const v = parsed.searchParams.get('v')
                if (v) return v
                const pathMatch = parsed.pathname.match(/(?:\/embed\/|\/v\/)([A-Za-z0-9_-]{6,})/)
                if (pathMatch) return pathMatch[1]
            } catch {
                const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
                const m = inputUrl.match(regex)
                return m ? m[1] : null
            }
            return null
        }

        const videoId = extractYouTubeId(url)
        if (videoId) {
            const embedUrl = `https://www.youtube.com/embed/${videoId}`
            return (
                <div className={cn("flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-4", className)}>
                    <iframe
                        src={embedUrl}
                        title={fileName}
                        className="w-full h-[400px] rounded-lg border border-gray-200 dark:border-gray-700"
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

    // 6. Interactive Content Check: Social Media Embeds
    if (url.includes('instagram.com')) return <InstagramEmbed fileUrl={url} fileName={fileName} />
    if (url.includes('twitter.com') || url.includes('x.com')) return <TwitterEmbed fileUrl={url} fileName={fileName} />
    if (url.includes('linkedin.com')) return <LinkedInEmbed fileUrl={url} fileName={fileName} />
    if (url.includes('reddit.com')) return <RedditEmbed fileUrl={url} fileName={fileName} />

    // 7. Fallback: Link Preview Card (WhatsApp style)
    // If we have a thumbnail, OR if we have a title/description (even without thumbnail, show card with placeholder)
    if (thumbnailUrl || title || description) {
        return (
            <div className={cn("flex justify-center my-4", className)}>
                <div
                    className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all cursor-pointer group"
                    onClick={() => window.open(url, '_blank')}
                >
                    {/* Card Image Area */}
                    <div className="relative h-56 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {thumbnailUrl ? (
                            <Image
                                src={thumbnailUrl}
                                alt={title || fileName}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                sizes="(max-width: 768px) 100vw, 400px"
                                onError={(e) => {
                                    // If thumb fails, hide image element to show background
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            // Stylish Default Placeholder if no thumbnail
                            <div className="flex items-center justify-center h-full text-gray-300 dark:text-gray-600">
                                <FileText className="w-16 h-16" />
                            </div>
                        )}
                    </div>

                    {/* Card Content Area */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1 line-clamp-2 leading-tight">
                            {title || fileName}
                        </h3>
                        {description && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3 leading-relaxed">
                                {description.replace(/[#*`_]/g, '')}
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium uppercase tracking-wider">
                            <ExternalLink className="h-3 w-3" />
                            {getHostname(url)}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // 8. Ultimate Fallback: Default Image / Generic Link display
    return (
        <div className={cn("flex flex-col items-center justify-center h-[200px] bg-gray-50 dark:bg-gray-800 rounded-lg", className)}>
            <FileText className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-300 mb-4">Preview not available</p>
            <a
                href={url}
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
