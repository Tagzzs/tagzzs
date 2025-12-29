import React, { useState, useEffect } from "react";
import { SearchBar } from "@/components/SearchBar";
import { PopularTags } from "./PopularTags";
import { StatsCards } from "./StatsCards";
import RecentlyAdded from "./RecentlyAdded";
import { CalendarWidget } from "@/components/CalendarWidget";
import { Box, CssBaseline, Container } from "@mui/material";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface ContentItem {
  id: string;
  title: string;
  description: string;
  contentSource: string;
  contentType: string;
  tagsId: string[];
  createdAt: string;
  updatedAt: string;
}

interface TagItem {
  id: string;
  tagName: string;
  tagColor: string;
  contentCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  showRecentlyAdded?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  showRecentlyAdded = true,
}) => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      try {
        const [contentRes, tagsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user-database/content/get`, {
            method: "POST",
            headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({}), 
          }),
          fetch("/api/user-database/tags/get", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }),
        ]);
        if (!contentRes.ok || !tagsRes.ok) {
          throw new Error("Failed to fetch data");
        }
        const contentData = await contentRes.json();
        const tagsData = await tagsRes.json();
        setContent(contentData.data || []);
        setTags(tagsData.data || []);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (filters: string[]) => {
    setActiveFilters(filters);
  };

  // Get most used tags
  const getMostUsedTags = () => {
    return tags
      .filter(tag => tag.contentCount && tag.contentCount > 0)
      .sort((a, b) => (b.contentCount || 0) - (a.contentCount || 0))
      .slice(0, 5); 
  };

  // Apply filtering only when filters or search are active
  const getFilteredContent = () => {
    let filtered = [...content];
    
    // Apply search filter if search query exists 
    if(searchQuery.trim()){
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if(activeFilters.length > 0) {
      const currentFilter = activeFilters[0];
      
      filtered = filtered.filter(item => {
        const itemType = item.contentType.toLowerCase();
        
        switch (currentFilter) {
          case 'articles':
            return itemType === 'article';
          case 'videos':
            return itemType === 'video';
          case 'pdf':
            return itemType === 'pdf';
          case 'links':
            return itemType === 'link';
          case 'recent':
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const isRecent = new Date(Math.max(
              new Date(item.createdAt).getTime(),
              new Date(item.updatedAt).getTime()
            )) >= oneWeekAgo;
            return isRecent;
          case 'popular':
            const mostUsedTags = getMostUsedTags();
            const mostUsedTagIds = mostUsedTags.map(tag => tag.id);

            return item.tagsId.some(tagId => mostUsedTagIds.includes(tagId));
          default:
            return true;
        }
      });
    }
    
    return filtered;
  };

  const searchBarTags = tags.map(tag => ({
    id: tag.id,
    name: tag.tagName,
    createdAt: new Date(tag.createdAt),
    updatedAt: new Date(tag.updatedAt),
  }));

  // Stats logic
  const totalItems = content.length;
  const totalTags = tags.length;
  const filteredContent = getFilteredContent();
  
  // Calculate items added this week
  const thisWeekItems = content.filter(item => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const createdDate = new Date(item.createdAt);
    return createdDate >= oneWeekAgo;
  }).length;
  
  const topTag =
    tags.reduce(
      (prev, curr) =>
        curr.contentCount && (!prev || curr.contentCount > (prev.contentCount || 0))
          ? curr
          : prev,
      null as TagItem | null
    ) || { tagName: "", contentCount: 0 };

  const popularTags = tags.map((tag, index) => {
    const usesCount = tag.contentCount ?? 0;
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-yellow-100 text-yellow-700",
      "bg-indigo-100 text-indigo-700",
      "bg-pink-100 text-pink-700",
      "bg-green-100 text-green-700",
      "bg-orange-100 text-orange-700",
      "bg-purple-100 text-purple-700",
      "bg-red-100 text-red-700",
    ];
    const color = colors[index % colors.length];
    const trend: "up" | "down" = usesCount > 100 ? "up" : "down";

    return {
      name: tag.tagName,
      count: usesCount,
      trend,
      color,
    };
  });

  const currentFilterName = activeFilters.length > 0 ? 
    activeFilters[0].charAt(0).toUpperCase() + activeFilters[0].slice(1) : null;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f6f3ff" }}>
      <CssBaseline />
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Box>
          <SearchBar
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            tags={searchBarTags}
          />
        </Box>
        <Container
          maxWidth="xl"
          sx={{ 
            flex: 1, 
            my: { xs: 1.5, sm: 2, md: 3 }, 
            display: "flex", 
            gap: { xs: 2, sm: 2, md: 3 }, 
            flexWrap: "wrap",
            px: { xs: 1, sm: 2, md: 3 }
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              flexBasis: 0,
              minWidth: 0,
              maxWidth: { xs: "100%", md: "65%" },
            }}
          >
            {/* Dashboard Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1">Dashboard</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Welcome back! Here's what's happening in your Tagzs.
                  {(activeFilters.length > 0 || searchQuery.trim()) && (
                    <span className="block mt-1 text-xs">
                      {currentFilterName === 'Popular' && (
                        <span className="block text-xs text-muted-foreground/80 mt-0.5">
                          Content with most used tags: {getMostUsedTags().map(tag => tag.tagName).join(', ')}
                        </span>
                      )}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <StatsCards
              isLoading={isLoading}
              contentLength={totalItems}
              tagsLength={totalTags}
              thisWeekItems={thisWeekItems}
              topTagName={topTag.tagName}
              topTagCount={topTag.contentCount || 0}
            />

            {/* Calendar Widget */}
            <Box sx={{ mt: 3, sm: { mt: 4 } }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <CalendarDays className="h-5 w-5 flex-shrink-0" />
                    Activity Calendar
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Track your daily progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CalendarWidget />
                </CardContent>
              </Card>
            </Box>

            {showRecentlyAdded && (
              <Box sx={{ mt: 3, sm: { mt: 4 } }}>
                <RecentlyAdded
                  filteredContent={activeFilters.length > 0 || searchQuery.trim() ? filteredContent : undefined}
                  isFiltered={activeFilters.length > 0 || searchQuery.trim() !== ''}
                />
              </Box>
            )}
            <Box sx={{ mt: 3, sm: { mt: 4 } }}>{children}</Box>
          </Box>
          <Box sx={{ flexBasis: { xs: "100%", md: "30%" }, minWidth: 0 }}>
            <PopularTags popularTags={popularTags} />
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
