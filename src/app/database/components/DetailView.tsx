'use client';

import React, { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    CaretLeft,
    CaretRight,
    FileText,
    Cards,
    Bell,
    Lightning,
    X,
    PencilSimple,
    Check,
    Trash
} from '@phosphor-icons/react';
import { useToast } from '@/hooks/use-toast';

interface DetailViewProps {
    currentDetailItem: any;
    allItems: any[];
    isEditing: boolean;
    aiSummaryVisible: boolean;
    aiSummaryText: string;
    onBack: () => void;
    onNavigate: (direction: number) => void;
    onToggleEditing: () => void;
    onToggleSummary: () => void;
    onDelete?: () => void;
    onSave?: (updates: { personalNotes?: string; description?: string }) => void;
    onRemoveTag?: (tagId: string) => void;
}

export default function DetailView({
    currentDetailItem,
    allItems,
    isEditing,
    aiSummaryVisible,
    aiSummaryText,
    onBack,
    onNavigate,
    onToggleEditing,
    onToggleSummary,
    onDelete,
    onSave,
    onRemoveTag
}: DetailViewProps) {
    const { toast } = useToast();
    const siblings = allItems.filter(i => i.category === currentDetailItem.category && i.subCategory === currentDetailItem.subCategory);
    const currentIndex = siblings.findIndex(i => i.id === currentDetailItem.id);

    // Preview modal state
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewSrc, setPreviewSrc] = useState('');
    const [previewType, setPreviewType] = useState<'image' | 'video' | 'file'>('image');

    // AI Summary edit state
    const [isSummaryEditing, setIsSummaryEditing] = useState(false);
    const [summaryContent, setSummaryContent] = useState('');

    // Notes state
    const [notesContent, setNotesContent] = useState('');
    
    // Notes toggle state
    const [isNotesOpen, setIsNotesOpen] = useState(false);

    // Delete confirmation state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    
    // Tag to delete state
    const [tagToDelete, setTagToDelete] = useState<{ id: string; name: string } | null>(null);

    // Handle opening preview
    const openPreview = (src: string) => {
        // Determine file type from extension
        const ext = src.split('.').pop()?.toLowerCase() || '';
        const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

        if (videoExts.includes(ext)) {
            setPreviewType('video');
        } else if (imageExts.includes(ext)) {
            setPreviewType('image');
        } else {
            setPreviewType('file');
        }

        setPreviewSrc(src);
        setPreviewOpen(true);
    };

    // Get default summary content
    const getDefaultSummary = () => {
        // Use description for summary instead of personal notes (content)
        return currentDetailItem.desc || "No summary available.";
    };

    // Initialize summary and notes content
    React.useEffect(() => {
        if (!summaryContent) {
            setSummaryContent(getDefaultSummary());
        }
        setNotesContent(currentDetailItem.content || '');
    }, [currentDetailItem]);

    return (
        <>
            <div className="flex flex-col h-full p-0 overflow-y-auto db-scroll fade-in">
                <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 pt-4 px-8 pb-32">
                    <div className="flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur py-4 z-20 border-b border-zinc-900">
                        <button onClick={onBack} className="text-zinc-500 hover:text-white flex items-center gap-2 transition-colors text-xs font-bold uppercase tracking-wider group">
                            <CaretLeft weight="bold" className="group-hover:-translate-x-1 transition-transform" /> Back
                        </button>

                        <div className="flex items-center gap-3 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800">
                            <button onClick={() => onNavigate(-1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                                <CaretLeft weight="bold" />
                            </button>
                            <span className="text-xs font-mono text-zinc-500 font-medium min-w-[40px] text-center select-none">
                                {currentIndex + 1} / {siblings.length}
                            </span>
                            <button onClick={() => onNavigate(1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                                <CaretRight weight="bold" />
                            </button>
                        </div>

                        {onDelete && (
                            <button 
                                onClick={() => setDeleteConfirmOpen(true)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-500 border border-transparent hover:border-red-500/20 transition-all"
                                title="Delete Content"
                            >
                                <Trash weight="bold" className="text-lg" />
                            </button>
                        )}
                    </div>

                    {/* Clickable Image with Preview */}
                    <div
                        className="w-full h-80 rounded-2xl overflow-hidden relative shadow-2xl border border-zinc-800 group cursor-pointer"
                        onClick={() => openPreview(currentDetailItem.image)}
                    >
                        <img src={currentDetailItem.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                        <div className="absolute bottom-6 left-8 right-8">
                             <div className="flex flex-wrap gap-2 mb-2">
                                {(currentDetailItem.tags || [{ id: 'gen', name: currentDetailItem.category }]).map((tag: any) => (
                                    <div 
                                        key={tag.id} 
                                        className="group/tag relative text-[9px] font-bold text-zinc-400 uppercase border border-zinc-800 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 inline-flex items-center gap-1 rounded-md hover:border-red-500/30 hover:bg-red-500/5 hover:text-zinc-300 transition-all duration-300 cursor-default"
                                    >
                                        {tag.name}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setTagToDelete(tag); }}
                                            className="opacity-0 group-hover/tag:opacity-100 ml-1 hover:text-red-400 transition-opacity"
                                        >
                                            <X weight="bold" className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <h1 className="text-5xl text-white font-bold tracking-tight shadow-black drop-shadow-lg">{currentDetailItem.title}</h1>
                        </div>
                        {/* Preview indicator */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur px-3 py-1.5 rounded-full text-xs text-white font-medium">
                            Click to preview
                        </div>
                    </div>

                    {/* Description */}
                    {/* <div>
                        <p className="text-zinc-400 text-lg border-l-2 border-zinc-800 pl-4 leading-relaxed">{currentDetailItem.desc}</p>
                    </div> */}

                    {/* AI Summary Section - Always Visible */}
                    <div className="text-zinc-400 text-lg border-l-2 border-zinc-800 pl-4 leading-relaxed">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full mb-2 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                                <h3 className="text-sm font-bold text-white tracking-wide mb-2">AI SUMMARY</h3>
                            </div>
                            <button
                                onClick={() => {
                                    if (isSummaryEditing) {
                                        setIsSummaryEditing(false);
                                        if (onSave) onSave({ description: summaryContent });
                                    } else {
                                        setIsSummaryEditing(true);
                                    }
                                }}
                                className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isSummaryEditing ? 'text-emerald-500 hover:text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
                            >
                                {isSummaryEditing ? (
                                    <>
                                        <Check weight="bold" className="text-sm" />
                                        Save
                                    </>
                                ) : (
                                    <>
                                        <PencilSimple weight="bold" className="text-sm" />
                                        Edit
                                    </>
                                )}
                            </button>
                        </div>
                        {isSummaryEditing ? (
                            <textarea
                                value={summaryContent}
                                onChange={(e) => setSummaryContent(e.target.value)}
                                className="text-zinc-400 text-sm leading-relaxed bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 min-h-[120px] outline-none focus:border-indigo-500/50 transition-colors resize-none"
                                placeholder="Enter AI summary..."
                            />
                        ) : (
                            <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
                                {summaryContent}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-4 gap-4 h-24">
                        <button 
                            onClick={() => setIsNotesOpen(!isNotesOpen)}
                            className={`bg-[#121212] hover:bg-zinc-800 border ${isNotesOpen ? 'border-zinc-500 bg-zinc-800' : 'border-zinc-800'} rounded-xl flex flex-col items-center justify-center gap-2 transition group hover:border-zinc-700`}
                        >
                            <FileText weight="bold" className={`text-2xl ${isNotesOpen ? 'text-white' : 'text-zinc-600'} group-hover:text-white transition-colors`} />
                            <span className={`text-xs font-bold ${isNotesOpen ? 'text-white' : 'text-zinc-500'} group-hover:text-white`}>Notes</span>
                        </button>
                        <button 
                            onClick={() => toast({ 
                                title: "Coming Soon", 
                                description: "Flashcards feature is coming soon!",
                                className: "bg-zinc-950 border-zinc-800 text-white"
                            })}
                            className="bg-[#121212] hover:bg-zinc-800 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-2 transition group hover:border-zinc-700"
                        >
                            <Cards weight="bold" className="text-2xl text-zinc-600 group-hover:text-white transition-colors" />
                            <span className="text-xs font-bold text-zinc-500 group-hover:text-white">Flashcards</span>
                        </button>
                        <button 
                            onClick={() => toast({ 
                                title: "Coming Soon", 
                                description: "Reminders feature is coming soon!",
                                className: "bg-zinc-950 border-zinc-800 text-white"
                            })}
                            className="bg-[#121212] hover:bg-zinc-800 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-2 transition group hover:border-zinc-700"
                        >
                            <Bell weight="bold" className="text-2xl text-zinc-600 group-hover:text-white transition-colors" />
                            <span className="text-xs font-bold text-zinc-500 group-hover:text-white">Reminders</span>
                        </button>
                        <button 
                            onClick={() => toast({ 
                                title: "Coming Soon", 
                                description: "CTA feature is coming soon!",
                                className: "bg-zinc-950 border-zinc-800 text-white"
                            })}
                            className="bg-white hover:bg-zinc-200 text-black border border-white rounded-xl flex flex-col items-center justify-center gap-2 transition shadow-lg shadow-white/5"
                        >
                            <Lightning weight="bold" className="text-2xl" />
                            <span className="text-xs font-bold">CTA</span>
                        </button>
                    </div>

                    {isNotesOpen && (
                        <div className="bg-[#0a0a0a] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl min-h-[400px] flex flex-col">
                            <div className="bg-[#0f0f0f] border-b border-zinc-800 px-6 py-3 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-zinc-500 tracking-widest flex items-center gap-2 uppercase">
                                    <FileText weight="fill" /> Notes
                                </span>
                                <button
                                    className={`text-xs font-bold transition-colors ${isEditing ? 'text-emerald-500' : 'text-zinc-400 hover:text-white'}`}
                                    onClick={() => {
                                        if (isEditing) {
                                           if (onSave) onSave({ personalNotes: notesContent });
                                        }
                                        onToggleEditing();
                                    }}
                                >
                                    {isEditing ? 'Save' : 'Edit'}
                                </button>
                            </div>
                            {!isEditing && !notesContent ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2 p-8">
                                    <FileText weight="duotone" className="text-4xl opacity-20" />
                                    <p className="text-sm">No notes yet. Click edit to add some.</p>
                                </div>
                            ) : (
                                <textarea
                                    className="p-8 text-base text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed outline-none flex-1 bg-transparent resize-none focus:bg-zinc-900/10 transition-colors placeholder:text-zinc-600"
                                    value={notesContent}
                                    onChange={(e) => setNotesContent(e.target.value)}
                                    readOnly={!isEditing}
                                    placeholder="Start typing your notes here..."
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Modal - Centered Popup */}
            {previewOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8 fade-in"
                    onClick={() => setPreviewOpen(false)}
                >
                    {/* Preview Popup Container */}
                    <div
                        className="relative bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl w-[80vw] max-w-4xl h-[70vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-zinc-800/50 border-b border-zinc-700 shrink-0">
                            <div className="flex items-center gap-3">
                                <FileText weight="fill" className="text-lg text-zinc-400" />
                                <span className="text-sm font-medium text-zinc-200 truncate max-w-[300px]">
                                    {currentDetailItem.title}
                                </span>
                                <span className="text-xs text-zinc-500 uppercase bg-zinc-800 px-2 py-0.5 rounded">
                                    {previewType}
                                </span>
                            </div>
                            <button
                                onClick={() => setPreviewOpen(false)}
                                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                            >
                                <X weight="bold" className="text-base" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 bg-black overflow-hidden">
                            {previewType === 'image' && (
                                <img
                                    src={previewSrc}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                            )}
                            {previewType === 'video' && (
                                <video
                                    src={previewSrc}
                                    controls
                                    autoPlay
                                    className="w-full h-full object-cover"
                                />
                            )}
                            {previewType === 'file' && (
                                <iframe
                                    src={previewSrc}
                                    className="w-full h-full bg-white"
                                    title="File Preview"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-8 fade-in"
                    onClick={() => setDeleteConfirmOpen(false)}
                >
                    <div
                        className="relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl w-full max-w-sm flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 flex flex-col gap-4 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                                <Trash weight="bold" className="text-2xl text-red-500" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-white">Delete Content?</h3>
                                <p className="text-sm text-zinc-400">
                                    Are you sure you want to delete this item? This action cannot be undone.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <button
                                    onClick={() => setDeleteConfirmOpen(false)}
                                    className="py-2.5 rounded-lg border border-zinc-700 text-zinc-300 font-medium text-sm hover:bg-zinc-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setDeleteConfirmOpen(false);
                                        if (onDelete) onDelete();
                                    }}
                                    className="py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tag Delete Confirmation Dialog */}
            <AlertDialog open={!!tagToDelete} onOpenChange={(open) => !open && setTagToDelete(null)}>
                <AlertDialogContent className="bg-zinc-950 border-zinc-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Tag</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove the tag "{tagToDelete?.name}" from this content?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (tagToDelete && onRemoveTag) {
                                    onRemoveTag(tagToDelete.id);
                                }
                                setTagToDelete(null);
                            }}
                            className="bg-red-900 text-red-100 hover:bg-red-800 border border-red-800"
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
