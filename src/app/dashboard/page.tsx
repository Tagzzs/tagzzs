'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ContentItem, CalendarView } from '@/types';
import { useContent } from '@/hooks/useContent';
import { useTags } from '@/hooks/useTags';

// Header
import Header from '@/components/header/Header';
import SearchBar from '@/components/header/SearchBar';

// Cards
import RecentActivity from '@/components/cards/RecentActivity';

// Panels
import MonthlyBreakdown from '@/components/panels/MonthlyBreakdown';
import Calendar from '@/components/panels/Calendar';
import ProductivityChart from '@/components/panels/ProductivityChart';

// Modals
import ItemModal from '@/components/modals/ItemModal';
import { QuickCaptureModal } from '@/components/modals/QuickCaptureModal';
import BreakdownModal from '@/components/modals/BreakdownModal';
import TrendModal from '@/components/modals/TrendModal';

// Month names for calendar filtering
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Dashboard() {
    const router = useRouter();
    
    // Fetch content and tags from backend
    const { content, loading: contentLoading, error: contentError, refetch: refetchContent } = useContent();
    const { tags, tagsMap, loading: tagsLoading } = useTags();

    // Calendar state
    const [calendarView, setCalendarView] = useState<CalendarView>('D');
    // Initialize year and month to current date
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
    const [selectedMonthIdx, setSelectedMonthIdx] = useState(() => new Date().getMonth());
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);

    // Modal states
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [quickCaptureModalOpen, setQuickCaptureModalOpen] = useState(false);
    const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
    const [trendModalOpen, setTrendModalOpen] = useState(false);
    const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

    // Filter state
    const [filterLabel, setFilterLabel] = useState('Filter: All');

    // Handle search changes from SearchBar
    const handleSearchChange = useCallback((query: string, results: ContentItem[], searching: boolean, loading: boolean) => {
        setSearchQuery(query);
        setSearchResults(results);
        setIsSearching(searching);
        setSearchLoading(loading);
    }, []);

    // Filter content based on calendar selection (client-side filtering - no API calls)
    const displayedContent = useMemo(() => {
        // If searching, return search results
        if (isSearching) {
            return searchResults;
        }

        if (!content || content.length === 0) return [];

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // If "All" is selected (current month, current year, no specific day)
        if (selectedDay === null && selectedMonthIdx === currentMonth && selectedYear === currentYear) {
            return content;
        }

        // Filter by year, month and optionally by day
        return content.filter(item => {
            const itemDate = new Date(item.createdAt);
            const itemMonth = itemDate.getMonth();
            const itemYear = itemDate.getFullYear();
            const itemDay = itemDate.getDate();

            // Match year and month
            if (itemYear !== selectedYear || itemMonth !== selectedMonthIdx) {
                return false;
            }

            // If specific day is selected, match that too
            if (selectedDay !== null && itemDay !== selectedDay) {
                return false;
            }

            return true;
        });
    }, [content, selectedMonthIdx, selectedDay, selectedYear, isSearching, searchResults]);

    // Close all modals on ESC
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setItemModalOpen(false);
            setQuickCaptureModalOpen(false);
            setBreakdownModalOpen(false);
            setTrendModalOpen(false);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Calendar handlers
    const handleSwitchView = (view: CalendarView) => {
        setCalendarView(view);
    };

    const resetFilter = () => {
        setSelectedDay(null);
        setSelectedMonthIdx(new Date().getMonth());
        setSelectedYear(new Date().getFullYear());
        setFilterLabel('Filter: All');
    };

    const handleSelectMonth = (idx: number) => {
        setSelectedMonthIdx(idx);
        setSelectedDay(null);
        setCalendarView('D');

        const today = new Date();
        if (idx !== today.getMonth() || selectedYear !== today.getFullYear()) {
            setFilterLabel(`Filter: ${MONTH_NAMES[idx]} ${selectedYear !== today.getFullYear() ? selectedYear : ''}`);
        } else {
            resetFilter();
        }
    };

    const handleSelectYear = useCallback((year: number) => {
        setSelectedYear(year);
        setCalendarView('M');
    }, []);

    const handleSelectDay = (day: number) => {
        if (selectedDay === day) {
            setSelectedDay(null);
            if (selectedMonthIdx === new Date().getMonth() && selectedYear === new Date().getFullYear()) {
                resetFilter();
            } else {
                setFilterLabel(`Filter: ${MONTH_NAMES[selectedMonthIdx]}`);
            }
        } else {
            setSelectedDay(day);
            setFilterLabel(`Filter: ${MONTH_NAMES[selectedMonthIdx]} ${day}`);
        }
    };

    // Navigation Handler
    const handleNavigate = useCallback((direction: 'prev' | 'next') => {
        if (calendarView === 'D') {
            if (direction === 'prev') {
                if (selectedMonthIdx === 0) {
                    setSelectedMonthIdx(11);
                    setSelectedYear(y => y - 1);
                } else {
                    setSelectedMonthIdx(m => m - 1);
                }
            } else { // next
                if (selectedMonthIdx === 11) {
                    setSelectedMonthIdx(0);
                    setSelectedYear(y => y + 1);
                } else {
                    setSelectedMonthIdx(m => m + 1);
                }
            }
        } else if (calendarView === 'M') { // Month View (navigate years)
             if (direction === 'prev') {
                 setSelectedYear(y => y - 1);
             } else {
                 setSelectedYear(y => y + 1);
             }
        } else if (calendarView === 'Y') { // Year View (navigate range)
             // Navigate 12 years page? Or just 1 year? Let's do 12 years page logic later if needed.
             // For now just navigate 1 year to change the 'start' of the range or similar?
             // Actually currently Year view just shows months? No wait, new Year view will show Years.
             // Let's assume Year view shows a decade.
             if (direction === 'prev') {
                 setSelectedYear(y => y - 12);
             } else {
                 setSelectedYear(y => y + 12);
             }
        }
        setSelectedDay(null);
    }, [calendarView, selectedMonthIdx]);

    // Card click handler
    const handleCardClick = (id: string) => {
        if (isSearching) {
            // When searching, navigate to content page
            router.push(`/content/${id}`);
        } else {
            // When not searching, open the old popup (ItemModal)
            const item = content.find(c => c.id === id);
            if (item) {
                setSelectedContent(item);
                setItemModalOpen(true);
            }
        }
    };

    // Get tags for selected content
    const selectedContentTags = useMemo(() => {
        if (!selectedContent) return [];
        return selectedContent.tagsId
            .map(id => tagsMap.get(id))
            .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined);
    }, [selectedContent, tagsMap]);

    // Callback when content is added (refresh the list)
    const handleContentAdded = useCallback(() => {
        setQuickCaptureModalOpen(false);
        refetchContent();
    }, [refetchContent]);

    const isLoading = contentLoading || tagsLoading;

    // Determine the filter/search label
    const currentLabel = useMemo(() => {
        if (isSearching) {
            return `Search: ${searchQuery}`;
        }
        return filterLabel;
    }, [isSearching, searchQuery, filterLabel]);

    return (
        <div className="flex h-screen w-full selection:bg-[#9F55FF]/30 relative bg-[#0a0a0a] overflow-hidden">
            {/* Modals */}
            <ItemModal
                isOpen={itemModalOpen}
                content={selectedContent}
                tags={selectedContentTags}
                onClose={() => setItemModalOpen(false)}
            />
            <QuickCaptureModal
                isOpen={quickCaptureModalOpen}
                onClose={() => setQuickCaptureModalOpen(false)}
            />
            <BreakdownModal
                isOpen={breakdownModalOpen}
                onClose={() => setBreakdownModalOpen(false)}
                content={content}
                tags={tags}
                selectedMonthIdx={selectedMonthIdx}
                selectedYear={selectedYear}
            />
            <TrendModal
                isOpen={trendModalOpen}
                onClose={() => setTrendModalOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-black lg:rounded-l-3xl border border-white/5 border-r-0 lg:my-2 lg:ml-0 shadow-2xl relative">
                {/* Single Scroll Container */}
                <div className="flex-1 flex flex-col overflow-y-auto relative z-10 scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    <Header onResetFilter={resetFilter} />

                    <div className="flex flex-1 flex-col lg:flex-row relative">
                        {/* Main Column */}
                        <main className="flex-1 flex flex-col h-fit">
                            <SearchBar 
                                onOpenAddModal={() => setQuickCaptureModalOpen(true)} 
                                content={content}
                                tagsMap={tagsMap}
                                onSearchChange={handleSearchChange}
                            />

                            <div className="px-4 md:px-8 lg:px-10 pb-10 flex flex-col gap-6">
                                {/* Show Monthly Breakdown only when NOT searching */}
                                {!isSearching && (
                                    <MonthlyBreakdown 
                                        content={content}
                                        tags={tags}
                                        loading={isLoading}
                                        onClick={() => setBreakdownModalOpen(true)} 
                                        selectedMonthIdx={selectedMonthIdx}
                                        selectedYear={selectedYear}
                                    />
                                )}

                                {/* Show search header when searching */}
                                {isSearching && (
                                    <div className="mt-12 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-white mb-1">
                                                Search Results
                                            </h2>
                                            <p className="text-sm text-zinc-500">
                                                {searchLoading ? (
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-3 h-3 border border-purple-500 border-t-transparent rounded-full animate-spin" />
                                                        Searching...
                                                    </span>
                                                ) : (
                                                    `Found ${searchResults.length} results for "${searchQuery}"`
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {contentError ? (
                                    <div className="glass-panel bg-[#050505] p-5 mt-7 flex flex-col items-center justify-center h-64">
                                        <p className="text-red-400 text-sm mb-2">Failed to load content</p>
                                        <p className="text-zinc-600 text-xs mb-4">{contentError}</p>
                                        <button 
                                            onClick={() => refetchContent()}
                                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-white transition-colors"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                ) : (
                                    <RecentActivity
                                        content={displayedContent}
                                        tagsMap={tagsMap}
                                        filterLabel={currentLabel}
                                        title={isSearching ? "Search Results" : "Recent Activity"}
                                        loading={isLoading || searchLoading}
                                        onResetFilter={resetFilter}
                                        onCardClick={handleCardClick}
                                    />
                                )}

                                {/* Mobile Calendar & Productivity */}
                                {!isSearching && (
                                    <div className="flex lg:hidden flex-col gap-6">
                                        <Calendar
                                            view={calendarView}
                                            selectedYear={selectedYear}
                                            selectedMonthIdx={selectedMonthIdx}
                                            selectedDay={selectedDay}
                                            onSwitchView={handleSwitchView}
                                            onSelectMonth={handleSelectMonth}
                                            onSelectDay={handleSelectDay}
                                            onSelectYear={handleSelectYear}
                                            onNavigate={handleNavigate}
                                        />
                                        {/* <ProductivityChart onClick={() => setTrendModalOpen(true)} /> */}
                                    </div>
                                )}
                            </div>
                        </main>

                        {/* Right Sidebar (Desktop) - Sticky */}
                        <aside className="hidden lg:flex w-[420px] xl:w-[480px] shrink-0 flex-col gap-6 p-6 pl-0 sticky top-0 h-fit z-20">
                            <Calendar
                                view={calendarView}
                                selectedYear={selectedYear}
                                selectedMonthIdx={selectedMonthIdx}
                                selectedDay={selectedDay}
                                onSwitchView={handleSwitchView}
                                onSelectMonth={handleSelectMonth}
                                onSelectDay={handleSelectDay}
                                onSelectYear={handleSelectYear}
                                onNavigate={handleNavigate}
                            />
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}
