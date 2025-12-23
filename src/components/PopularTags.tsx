'use client';

import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface PopularTagsProps {
  popularTags: {
    name: string;
    count: number;
    trend: 'up' | 'down';
    color: string;
  }[];
}

export function PopularTags({ popularTags }: PopularTagsProps) {
  const isMobile = useIsMobile();
  const sortedTags = [...popularTags].sort((a, b) => b.count - a.count);
  const topTags = sortedTags.slice(0, isMobile ? 8 : 10);
  
  return (
    <Card className="p-4 sm:p-6 bg-card shadow-sm border border-border select-none">
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-violet-600" />
        </div>
        <h3 className="text-base text-foreground">Popular Tags</h3>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {topTags.map((tag, index) => (
          <div key={tag.name} className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-6 h-6 bg-violet-100 rounded flex items-center justify-center text-xs text-violet-700 flex-shrink-0">
                {index + 1}
              </div>
              <Badge 
                className={`text-xs px-2 sm:px-3 py-1 ${tag.color} border-0 pointer-events-none truncate`}
              >
                {tag.name}
              </Badge>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {tag.count} uses
              </span>
            </div>

            <div className="flex items-center flex-shrink-0">
              {tag.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
