'use client';

import { Search, X, Filter, ChevronDown } from 'lucide-react';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Tag {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SearchBarProps {
  onSearch?: (query: string) => void;
  onFilterChange?: (filters: string[]) => void;
  tags?: Tag[];
}

const filterOptions = [
  {id: 'articles', label: 'Articles', description: 'Article related content'},
  {id: 'videos', label: 'Videos', description: 'Video Content'},
  {id: 'pdf', label: 'PDF', description: 'PDF Files'},
  {id: 'links', label: 'Links', description: 'Added Links'},
  {id: 'popular', label: 'Popular', description: 'Content with most used tags'},
];

export function SearchBar({onSearch, onFilterChange }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleFilterSelect = (filterId: string) => {
    const newFilter = activeFilter === filterId ? null : filterId;
    
    setActiveFilter(newFilter);
    onFilterChange?.(newFilter ? [newFilter] : []);
    setIsFilterOpen(false);
  };

  const handleRemoveFilter = () => {
    setActiveFilter(null);
    onFilterChange?.([]);
  };

  const getFilterLabel = (filterId: string) => {
    return filterOptions.find(f => f.id === filterId)?.label || filterId;
  };

  return (
    <div className="bg-card border-b border-border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4">
        {/* Left side - Search Input */}
        <div className="flex-1 w-full sm:max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder={isMobile ? "Search..." : "Search your knowledge base..."}
              className="pl-10 h-10 bg-background border-border text-sm w-full shadow-sm"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Right side - Filters */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
          {!isMobile && (
            <div className="flex items-center gap-1 whitespace-nowrap">
              <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">Filter:</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Active Filter */}
            {activeFilter && (
              <Badge
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-2 sm:px-3 py-1.5 gap-1 shadow-sm"
              >
                {getFilterLabel(activeFilter)}
                <X
                  className="w-3 h-3 cursor-pointer flex-shrink-0"
                  onClick={handleRemoveFilter}
                />
              </Badge>
            )}

            {/* Filter Dropdown */}
            <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-muted-foreground hover:bg-primary hover:text-primary-foreground text-xs px-2 sm:px-3 py-1.5 gap-1 shadow-sm h-auto flex-shrink-0">
                  {isMobile ? (
                    <Filter className="w-4 h-4" />
                  ) : (
                    <>
                      {activeFilter ? 'Change filter' : 'Add filter'}
                      <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {filterOptions.map((filter) => (
                  <DropdownMenuItem 
                    key={filter.id} 
                    className="flex flex-col items-start cursor-pointer" 
                    onClick={() => handleFilterSelect(filter.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{filter.label}</div>
                        <div className="text-xs text-muted-foreground">{filter.description}</div>
                      </div>
                      {activeFilter === filter.id && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                {activeFilter && (
                  <>
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem className="text-sm text-muted-foreground cursor-pointer" onClick={handleRemoveFilter}>
                      Clear filter
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}