"use client"

import { useState, useEffect } from "react"
import { ClientMeta } from "@/components/client-meta"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, Tag, Search, MoreHorizontal, AlertCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

interface TagItem {
  id: string;
  tagName: string;
  tagColor: string;
  description?: string;
  contentCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function TagsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagItem | null>(null)
  const [newTag, setNewTag] = useState({
    tagName: "",
    tagColor: "#A855F7",
    description: "",
  })

  // Data states
  const [tags, setTags] = useState<TagItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Fetch tags from API
  const fetchTags = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      const response = await fetch('/api/user-database/tags/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to fetch tags')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch tags')
      }

      setTags(data.data || [])
    } catch (error) {
      console.error('Error fetching tags:', error)
      setError(error instanceof Error ? error.message : 'Failed to load tags')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Fetch tags on component mount
  useEffect(() => {
    fetchTags()
  }, [])

  const filteredTags = tags.filter(
    (tag) =>
      tag.tagName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tag.description && tag.description.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleCreateTag = async () => {
    if (!newTag.tagName.trim()) return

    try {
      setIsCreating(true)

      const response = await fetch('/api/user-database/tags/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagName: newTag.tagName.trim(),
          tagColor: newTag.tagColor,
          description: newTag.description.trim() || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to create tag')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create tag')
      }

      setIsCreateDialogOpen(false)
      setNewTag({ tagName: "", tagColor: "#A855F7", description: "" })
      
      // Refresh tags list
      await fetchTags()
    } catch (error) {
      console.error('Error creating tag:', error)
      alert(`Failed to create tag: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditTag = (tag: TagItem) => {
    setEditingTag(tag)
    setNewTag({
      tagName: tag.tagName,
      tagColor: tag.tagColor,
      description: tag.description || "",
    })
  }

  const handleUpdateTag = async () => {
    if (!editingTag || !newTag.tagName.trim()) return

    try {
      setIsUpdating(true)

      const response = await fetch('/api/user-database/tags/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagId: editingTag.id,
          tagName: newTag.tagName.trim(),
          tagColor: newTag.tagColor,
          description: newTag.description.trim() || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to update tag')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update tag')
      }

      setEditingTag(null)
      setNewTag({ tagName: "", tagColor: "#A855F7", description: "" })
      
      // Refresh tags list
      await fetchTags()
    } catch (error) {
      console.error('Error updating tag:', error)
      alert(`Failed to update tag: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteTag = async (tag: TagItem) => {
    try {
      setIsDeleting(tag.id)
      
      const response = await fetch('/api/user-database/tags/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagId: tag.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to delete tag')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete tag')
      }

      await fetchTags()
    } catch (error) {
      console.error('Error deleting tag:', error)
      alert(`Failed to delete tag: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeleting(null)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const handleViewItems = (tag: TagItem) => {
    // Navigate to memory-space page with tag filter
    router.push(`/dashboard/memory-space?tags=${encodeURIComponent(tag.tagName)}`)
  }

  return (
    <>
    <div style={{ backgroundColor: '#f6f3ff' }} className="min-h-screen">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
        <ClientMeta page="neural-tags" personalized={true} />
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-5 md:mb-6">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1F2937]">Neural Tags</h1>
            <p className="text-[#6B7280] text-xs sm:text-sm">Organize and manage your content tags</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-[#A855F7] to-[#7C3AED] text-white hover:opacity-90 transition-opacity duration-300 rounded-xl px-3 sm:px-4 py-2 shadow-md text-xs sm:text-sm w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-1" />
                  Create Tag
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-gray-900 rounded-2xl border-[#E6E6FA] max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg text-[#1F2937] dark:text-white">Create New Tag</DialogTitle>
                  <DialogDescription className="text-sm text-[#6B7280]">Add a new tag to organize your content better.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="tag-name" className="text-sm text-[#1F2937] dark:text-white">Tag Name</Label>
                    <Input
                      id="tag-name"
                      placeholder="e.g., JavaScript"
                      value={newTag.tagName}
                      onChange={(e) => setNewTag((prev) => ({ ...prev, tagName: e.target.value }))}
                      disabled={isCreating}
                      className="rounded-xl border-[#E6E6FA] focus:border-[#7C3AED] focus:ring-[#7C3AED] h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tag-color" className="text-sm text-[#1F2937] dark:text-white">Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="tag-color"
                        type="color"
                        value={newTag.tagColor}
                        onChange={(e) => setNewTag((prev) => ({ ...prev, tagColor: e.target.value }))}
                        className="w-12 h-9 rounded-xl"
                        disabled={isCreating}
                      />
                      <Input
                        value={newTag.tagColor}
                        onChange={(e) => setNewTag((prev) => ({ ...prev, tagColor: e.target.value }))}
                        placeholder="#A855F7"
                        disabled={isCreating}
                        className="rounded-xl border-[#E6E6FA] focus:border-[#7C3AED] h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="tag-description" className="text-sm text-[#1F2937] dark:text-white">Description (Optional)</Label>
                    <Textarea
                      id="tag-description"
                      placeholder="Brief description of what this tag represents"
                      value={newTag.description}
                      onChange={(e) => setNewTag((prev) => ({ ...prev, description: e.target.value }))}
                      disabled={isCreating}
                      className="rounded-xl border-[#E6E6FA] focus:border-[#7C3AED] min-h-[80px] text-sm"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={isCreating}
                    className="rounded-xl border-[#E6E6FA] text-sm h-9"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateTag} 
                    disabled={!newTag.tagName.trim() || isCreating}
                    className="bg-gradient-to-r from-[#A855F7] to-[#7C3AED] text-white rounded-xl text-sm h-9"
                  >
                    {isCreating ? 'Creating...' : 'Create Tag'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4 sm:mb-5 md:mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <Input
            type="text"
            placeholder="Search tags…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full pl-10 pr-4 py-2 text-xs sm:text-sm border-0 shadow-sm bg-white focus:ring-2 focus:ring-[#7C3AED] h-10"
            disabled={isLoading}
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="rounded-2xl border-[#E6E6FA] shadow-sm">
                <CardHeader className="pb-2 p-3 sm:p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-2.5 h-2.5 rounded-full" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="w-7 h-7" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 p-3 sm:p-4 pt-0">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-8 w-full rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card className="rounded-2xl border-[#E6E6FA] shadow-lg">
            <CardContent className="p-6 sm:p-8 text-center">
              <div className="w-12 h-12 bg-[#FEE2E2] rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-[#1F2937] mb-1.5">Failed to load tags</h3>
              <p className="text-xs sm:text-sm text-[#6B7280] mb-4">{error}</p>
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
                <Button onClick={() => fetchTags()} variant="outline" className="rounded-xl border-[#E6E6FA] text-xs sm:text-sm h-9">
                  Try Again
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-to-r from-[#A855F7] to-[#7C3AED] text-white rounded-xl text-xs sm:text-sm h-9">
                  Create First Tag
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tags Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
            {filteredTags.map((tag) => (
              <Card key={tag.id} className="rounded-2xl p-3 sm:p-4 space-y-3 bg-white hover:shadow-lg transition-shadow duration-300 border-[#E6E6FA]">
                {/* Header with tag name and options */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: tag.tagColor }}
                    />
                    <h3 className="font-bold text-xs sm:text-sm text-[#1F2937] truncate">{tag.tagName}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#C8B8E8] hover:text-[#7C3AED] hover:bg-[#F5F3FF] flex-shrink-0" disabled={!!isDeleting}>
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-[#E6E6FA]">
                      <DropdownMenuItem onClick={() => handleEditTag(tag)} className="rounded-lg text-xs sm:text-sm">
                        <Edit className="h-3.5 w-3.5 mr-2" />
                        Edit tag
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleViewItems(tag)}
                        className="text-[#7C3AED] rounded-lg text-xs sm:text-sm"
                      >
                        <Tag className="h-3.5 w-3.5 mr-2" />
                        View Content
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem 
                            onSelect={(e) => e.preventDefault()}
                            className="text-red-600 rounded-lg text-xs sm:text-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl border-[#E6E6FA] max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-lg text-[#1F2937]">Delete Tag</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm text-[#6B7280]">
                              Are you sure you want to delete the tag "{tag.tagName}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl border-[#E6E6FA] text-sm h-9" disabled={isDeleting === tag.id}>Cancel</AlertDialogCancel>
                            <Button 
                              onClick={async () => {
                                await handleDeleteTag(tag)
                              }}
                              className="bg-red-600 hover:bg-red-700 rounded-xl text-sm h-9"
                              disabled={isDeleting === tag.id}
                            >
                              {isDeleting === tag.id ? "Deleting..." : "Delete"}
                            </Button>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Metadata row */}
                <div className="flex items-center justify-between text-xs sm:text-xs text-[#6B7280] flex-wrap gap-1">
                  <span className="font-medium whitespace-nowrap">{tag.contentCount} items</span>
                  <span className="text-right sm:text-left">Created {formatDate(tag.createdAt)}</span>
                </div>

                {/* Description */}
                {tag.description && (
                  <p className="text-xs text-[#6B7280] leading-relaxed line-clamp-2">{tag.description}</p>
                )}

                {/* CTA Button */}
                <Button 
                  variant="outline" 
                  className="w-full rounded-full border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white transition-all duration-300 h-8 text-xs sm:text-sm"
                  onClick={() => handleViewItems(tag)}
                >
                  View Items
                </Button>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Tag Dialog */}
        <Dialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
          <DialogContent className="bg-white dark:bg-gray-900 rounded-2xl border-[#E6E6FA] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg text-[#1F2937] dark:text-white">Edit Tag</DialogTitle>
              <DialogDescription className="text-sm text-[#6B7280]">Update the tag details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="edit-tag-name" className="text-sm text-[#1F2937] dark:text-white">Tag Name</Label>
                <Input
                  id="edit-tag-name"
                  value={newTag.tagName}
                  onChange={(e) => setNewTag((prev) => ({ ...prev, tagName: e.target.value }))}
                  disabled={isUpdating}
                  className="rounded-xl border-[#E6E6FA] focus:border-[#7C3AED] h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="edit-tag-color" className="text-sm text-[#1F2937] dark:text-white">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-tag-color"
                    type="color"
                    value={newTag.tagColor}
                    onChange={(e) => setNewTag((prev) => ({ ...prev, tagColor: e.target.value }))}
                    className="w-12 h-9 rounded-xl"
                    disabled={isUpdating}
                  />
                  <Input
                    value={newTag.tagColor}
                    onChange={(e) => setNewTag((prev) => ({ ...prev, tagColor: e.target.value }))}
                    disabled={isUpdating}
                    className="rounded-xl border-[#E6E6FA] focus:border-[#7C3AED] h-9 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-tag-description" className="text-sm text-[#1F2937] dark:text-white">Description (Optional)</Label>
                <Textarea
                  id="edit-tag-description"
                  value={newTag.description}
                  onChange={(e) => setNewTag((prev) => ({ ...prev, description: e.target.value }))}
                  disabled={isUpdating}
                  className="rounded-xl border-[#E6E6FA] focus:border-[#7C3AED] min-h-[80px] text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEditingTag(null)}
                disabled={isUpdating}
                className="rounded-xl border-[#E6E6FA] text-sm h-9"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateTag}
                disabled={!newTag.tagName.trim() || isUpdating}
                className="bg-gradient-to-r from-[#A855F7] to-[#7C3AED] text-white rounded-xl text-sm h-9"
              >
                {isUpdating ? 'Updating...' : 'Update Tag'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Empty State */}
        {!isLoading && !error && filteredTags.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-[#F5F3FF] rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-[#7C3AED]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1F2937] mb-1.5">No tags found</h3>
            <p className="text-sm text-[#6B7280] mb-4">
              {searchQuery 
                ? `No tags match "${searchQuery}". Try adjusting your search terms.`
                : "Create your first tag to get started organizing your content."
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-to-r from-[#A855F7] to-[#7C3AED] text-white rounded-xl px-4 py-2 text-sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Create Tag
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
