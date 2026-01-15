// Backend API response type for content items
export interface ContentItem {
  id: string;
  title: string;
  description: string;
  link: string;
  contentType: string;
  contentSource: string;
  thumbnailUrl: string | null;
  readTime: number;
  personalNotes: string;
  tagsId: string[];
  createdAt: string;
  updatedAt: string;
}

// Legacy type - kept for backwards compatibility during migration
export interface CardData {
  id: number;
  title: string;
  category: string;
  tags: string[];
  date: string;
  image: string;
  content: string;
}

export type CalendarView = 'Y' | 'M' | 'D';

export interface CalendarState {
  view: CalendarView;
  selectedMonthIdx: number;
  selectedDay: number | null;
}
