"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ClientMeta } from "@/components/client-meta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Youtube, Clock, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

interface DraftItem {
    id: string;
    videoUrl: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    thumbnailUrl: string | null;
    title: string | null;
}

export default function DraftsPage() {
    const [drafts, setDrafts] = useState<DraftItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const fetchDrafts = useCallback(async (showRefreshIndicator = false) => {
        if (showRefreshIndicator) {
            setIsRefreshing(true);
        }

        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) throw new Error("Authentication required");

            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const response = await fetch(`${backendUrl}/youtube/list`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch drafts');
            }

            const data = await response.json();

            if (data.success) {
                setDrafts(data.drafts || []);
                setError(null);
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load drafts');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    // Initial fetch only on mount
    useEffect(() => {
        fetchDrafts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-refresh every 10 seconds ONLY when there are pending items
    const hasPendingItems = drafts.some(d => d.status === 'pending' || d.status === 'processing');

    useEffect(() => {
        if (!hasPendingItems) return;

        const interval = setInterval(() => {
            fetchDrafts();
        }, 100000);

        return () => clearInterval(interval);
    }, [hasPendingItems, fetchDrafts]);

    const handleCardClick = (draft: DraftItem) => {
        if (draft.status === 'completed') {
            router.push(`/dashboard/quick-capture?requestId=${draft.id}`);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
            case 'processing':
                return (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                        <Clock className="w-3 h-3 mr-1" />
                        Processing
                    </Badge>
                );
            case 'completed':
                return (
                    <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Completed
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Failed
                    </Badge>
                );
            default:
                return null;
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const extractVideoId = (url: string) => {
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname.includes('youtu.be')) {
                return urlObj.pathname.slice(1);
            }
            return urlObj.searchParams.get('v') || '';
        } catch {
            return '';
        }
    };

    const getVideoThumbnail = (url: string, providedThumbnail: string | null) => {
        if (providedThumbnail) return providedThumbnail;
        const videoId = extractVideoId(url);
        if (videoId) {
            return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        }
        return null;
    };

    if (isLoading) {
        return (
            <div style={{ backgroundColor: '#f6f3ff', minHeight: '100vh' }}>
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <ClientMeta page="quick-capture" personalized={true} />
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: '#f6f3ff', minHeight: '100vh' }}>
            <div className="max-w-6xl mx-auto px-4 py-6">
                <ClientMeta page="quick-capture" personalized={true} />

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                            YouTube Drafts
                        </h1>
                        <p className="text-sm text-slate-600 mt-1">
                            Your pending and completed YouTube extractions
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchDrafts(true)}
                        disabled={isRefreshing}
                        className="border-violet-200 text-violet-700 hover:bg-violet-50"
                    >
                        {isRefreshing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Refresh
                    </Button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                        {error}
                    </div>
                )}

                {drafts.length === 0 ? (
                    <Card className="border border-violet-200/60 shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mb-4">
                                <Youtube className="w-8 h-8 text-violet-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Drafts Yet</h3>
                            <p className="text-sm text-slate-500 text-center max-w-md mb-4">
                                When you analyze YouTube videos, they'll appear here while processing.
                                Drafts are automatically removed after 7 days.
                            </p>
                            <Button
                                onClick={() => router.push('/dashboard/quick-capture')}
                                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
                            >
                                Quick Capture
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {drafts.map((draft) => {
                            const thumbnailUrl = getVideoThumbnail(draft.videoUrl, draft.thumbnailUrl);
                            const isClickable = draft.status === 'completed';

                            return (
                                <Card
                                    key={draft.id}
                                    className={`border border-violet-200/60 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden transition-all duration-300 ${isClickable
                                        ? 'cursor-pointer hover:shadow-xl hover:border-violet-300 hover:-translate-y-1'
                                        : 'opacity-80'
                                        }`}
                                    onClick={() => handleCardClick(draft)}
                                >
                                    {/* Thumbnail */}
                                    <div className="relative w-full aspect-video bg-slate-100">
                                        {thumbnailUrl ? (
                                            <Image
                                                src={thumbnailUrl}
                                                alt={draft.title || 'Video thumbnail'}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Youtube className="w-12 h-12 text-slate-300" />
                                            </div>
                                        )}

                                        {/* Status overlay for processing */}
                                        {(draft.status === 'pending' || draft.status === 'processing') && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <div className="flex flex-col items-center">
                                                    <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                                                    <span className="text-white text-sm font-medium">Processing...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            {getStatusBadge(draft.status)}
                                            <span className="text-xs text-slate-400">
                                                {formatTimeAgo(draft.createdAt)}
                                            </span>
                                        </div>

                                        <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2">
                                            {draft.title || 'Processing video...'}
                                        </h3>

                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                            <ExternalLink className="w-3 h-3" />
                                            <span className="truncate">{draft.videoUrl}</span>
                                        </div>

                                        {isClickable && (
                                            <p className="text-xs text-violet-600 mt-3 font-medium">
                                                Click to view details →
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
