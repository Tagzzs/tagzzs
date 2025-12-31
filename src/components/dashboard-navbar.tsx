"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { createClient } from "@/utils/supabase/client"

interface ContentItem {
  id: string;
  title: string;
}

export function DashboardNavbar() {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [contentTitle, setContentTitle] = useState<string | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Fetch content title when on a content detail page
  useEffect(() => {
    const fetchContentTitle = async () => {
      const contentMatch = pathname.match(/^\/dashboard\/content\/([^\/]+)$/)
      if (contentMatch) {
        const contentId = contentMatch[1]
        try {
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()
          const token = session?.access_token
    
          // Fetch content data
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/content/get`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({})
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
              const content = data.data.find((item: ContentItem) => item.id === contentId)
              if (content) {
                setContentTitle(content.title)
              }
            }
          }
        } catch (error) {
          console.error('Error fetching content title:', error)
        }
      } else {
        setContentTitle(null)
      }
    }

    fetchContentTitle()
  }, [pathname])

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    // Filter out 'dashboard' from segments to avoid duplication
    const filteredSegments = segments.filter(seg => seg !== "dashboard")
    
    // Check if we're on a content detail page
    const isContentDetailPage = filteredSegments.length === 2 && filteredSegments[0] === "content"
    
    return filteredSegments.map((segment, index) => {
      let label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
      
      // Check if this is a content ID segment
      if (index === 1 && isContentDetailPage) {
        if (contentTitle) {
          label = contentTitle
        } else {
          label = "" 
        }
      }
      
      return {
        label,
        href: "/dashboard/" + filteredSegments.slice(0, index + 1).join("/"),
        isLast: index === filteredSegments.length - 1,
      }
    }).filter(crumb => crumb.label !== "") 
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header
      className={`sticky top-0 z-40 flex h-16 sm:h-16 md:h-16 shrink-0 items-center gap-1 sm:gap-2 border-b px-3 sm:px-4 transition-all duration-300 ${
        isScrolled
          ? "h-12 sm:h-14 bg-background/70 backdrop-blur-md border-b border-border/50"
          : "h-16 sm:h-16 bg-background"
      }`}
    >
      <SidebarTrigger className="-ml-1 h-8 w-8 sm:h-10 sm:w-10" />
      <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4 sm:h-6" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden sm:block text-xs sm:text-sm">
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbs.length > 0 && (
            <>
              <BreadcrumbSeparator className="hidden sm:block mx-1 sm:mx-2" />
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-1 sm:gap-2">
                  <BreadcrumbItem className="hidden sm:block text-xs sm:text-sm">
                    <BreadcrumbLink 
                      href={crumb.href}
                      className={crumb.isLast ? "font-semibold" : ""}
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {!crumb.isLast && <BreadcrumbSeparator className="hidden sm:block mx-1 sm:mx-2" />}
                </div>
              ))}
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}