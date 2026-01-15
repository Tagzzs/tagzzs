import { CaretLeft, CaretRight } from '@phosphor-icons/react';
// ... 

import { CalendarView } from '@/types';

interface CalendarProps {
    view: CalendarView;
    selectedMonthIdx: number;
    selectedDay: number | null;
    selectedYear: number;
    onSwitchView: (view: CalendarView) => void;
    onSelectMonth: (idx: number) => void;
    onSelectDay: (day: number) => void;
    onSelectYear: (year: number) => void;
    onNavigate: (direction: 'prev' | 'next') => void;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Calendar({
    view,
    selectedMonthIdx,
    selectedDay,
    selectedYear,
    onSwitchView,
    onSelectMonth,
    onSelectDay,
    onSelectYear,
    onNavigate
}: CalendarProps) {
    const renderMonthView = () => { // "D" view
        const days = [];
        
        // Get number of days in the month
        const daysInMonth = new Date(selectedYear, selectedMonthIdx + 1, 0).getDate();
        
        // Get start day of the week (0 = Sunday, 1 = Monday, etc.)
        const firstDayOfMonth = new Date(selectedYear, selectedMonthIdx, 1).getDay();
        
        // Add empty cells for offset
        for (let i = 0; i < firstDayOfMonth; i++) {
             days.push(<div key={`empty-${i}`} />);
        }

        const todayDate = new Date();
        const isCurrentMonth = todayDate.getMonth() === selectedMonthIdx && todayDate.getFullYear() === selectedYear;

        for (let i = 1; i <= daysInMonth; i++) {
            let classes = "cal-item day";
            // Check for Today
            if (isCurrentMonth && i === todayDate.getDate()) {
                classes += " today";
            }
            // Check for Selected
            if (i === selectedDay) {
                classes += " active";
            }
            days.push(
                <div
                    key={i}
                    className={classes}
                    onClick={() => onSelectDay(i)}
                >
                    {i}
                </div>
            );
        }
        return days;
    };

    const renderYearView = () => { // "M" view (Select Month)
        return MONTH_NAMES.map((month, idx) => {
            let classes = "cal-item month";
            if (idx === selectedMonthIdx) {
                classes += " active";
            }
            return (
                <div
                    key={idx}
                    className={classes}
                    onClick={() => onSelectMonth(idx)}
                >
                    {month}
                </div>
            );
        });
    };

    const renderYearsView = () => { // "Y" view (Select Year)
        // Show range of 12 years centered? Or next 12?
        // Let's show selectedYear - 1 to selectedYear + 10
        const startYear = selectedYear - 1;
        const years = [];
        for (let i = 0; i < 12; i++) {
            const y = startYear + i;
            let classes = "cal-item year"; 
            if (y === selectedYear) {
                classes += " active";
            }
            years.push(
                <div
                    key={y}
                    className={classes}
                    onClick={() => onSelectYear(y)}
                >
                    {y}
                </div>
            );
        }
        return years;
    };

    return (
        <div className="glass-panel bg-[#050505] p-4 h-auto select-none">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => onNavigate('prev')} 
                        className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                        <CaretLeft size={16} weight="bold" />
                    </button>
                    
                    <div className="flex items-center justify-center gap-1 min-w-[120px]">
                        {view === 'D' && (
                            <>
                                <span 
                                    className="text-[15px] font-bold text-white hover:text-[#9F55FF] cursor-pointer transition-colors px-1"
                                    onClick={() => onSwitchView('M')}
                                >
                                    {MONTH_NAMES[selectedMonthIdx]}
                                </span>
                                <span 
                                    className="text-[15px] font-bold text-white hover:text-[#9F55FF] cursor-pointer transition-colors px-1"
                                    onClick={() => onSwitchView('Y')}
                                >
                                    {selectedYear}
                                </span>
                            </>
                        )}
                        {view === 'M' && (
                            <span 
                                className="text-[15px] font-bold text-white hover:text-[#9F55FF] cursor-pointer transition-colors px-2 py-1 rounded"
                                onClick={() => onSwitchView('Y')}
                            >
                                {selectedYear}
                            </span>
                        )}
                        {view === 'Y' && (
                            <span className="text-[15px] font-bold text-white px-2">
                                {selectedYear - 1} - {selectedYear + 10}
                            </span>
                        )}
                    </div>

                    <button 
                        onClick={() => onNavigate('next')} 
                        className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                        <CaretRight size={16} weight="bold" />
                    </button>
                </div>

                {/* View Indicators / Reset */}
                <div className="flex items-center gap-1">
                     <button
                        className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase transition-all ${view === 'D' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                        onClick={() => onSwitchView('D')}
                     >
                        Day
                     </button>
                </div>
            </div>

            {/* Day Headers (only for day view) */}
            {view === 'D' && (
                <div className="grid grid-cols-7 text-center mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <span key={idx} className="text-[15px] font-bold text-zinc-600">
                            {day}
                        </span>
                    ))}
                </div>
            )}

            {/* Calendar Grid */}
            <div
                className={`grid gap-1 justify-items-center ${view === 'D' ? 'grid-cols-7 gap-y-1' : 'grid-cols-3 gap-2 mt-2'
                    }`}
            >
                {view === 'D' && renderMonthView()}
                {view === 'M' && renderYearView()}
                {view === 'Y' && renderYearsView()}
            </div>
        </div>
    );
}
