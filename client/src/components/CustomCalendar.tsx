import React, { useState, useEffect } from "react";

interface CustomCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  className?: string;
  onClose?: () => void;
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function CustomCalendar({
  selectedDate,
  onSelectDate,
  className = "",
  onClose,
}: CustomCalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date(selectedDate));

  // Sync viewDate when selectedDate changes from outside if in different month
  useEffect(() => {
    if (
      selectedDate.getMonth() !== viewDate.getMonth() ||
      selectedDate.getFullYear() !== viewDate.getFullYear()
    ) {
      setViewDate(new Date(selectedDate));
    }
  }, [selectedDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevYear = () => setViewDate(new Date(year - 1, month, 1));
  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const nextYear = () => setViewDate(new Date(year + 1, month, 1));

  const monthName = viewDate.toLocaleDateString("en-US", { month: "long" });

  // First day of current month (0: Sun, 1: Mon, ... 6: Sat)
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays: Array<{
    dayNumber: number;
    date: Date;
    isCurrentMonth: boolean;
    dayOfWeek: number;
    isSelected: boolean;
  }> = [];

  // Prev month filler days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = new Date(year, month - 1, day);
    calendarDays.push({
      dayNumber: day,
      date,
      isCurrentMonth: false,
      dayOfWeek: date.getDay(),
      isSelected: isSameDay(date, selectedDate),
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    calendarDays.push({
      dayNumber: d,
      date,
      isCurrentMonth: true,
      dayOfWeek: date.getDay(),
      isSelected: isSameDay(date, selectedDate),
    });
  }

  // Next month filler days (fill up to 35 or 42 grid slots)
  const totalSlots = calendarDays.length > 35 ? 42 : 35;
  const remaining = totalSlots - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    calendarDays.push({
      dayNumber: d,
      date,
      isCurrentMonth: false,
      dayOfWeek: date.getDay(),
      isSelected: isSameDay(date, selectedDate),
    });
  }

  function isSameDay(d1: Date, d2: Date) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  return (
    <div className={`custom-calendar-card ${className}`}>
      {/* Calendar Header with navigation: «  ‹  Month Year  ›  » */}
      <div className="custom-calendar-header">
        <div className="custom-calendar-nav-left">
          <button
            type="button"
            className="custom-calendar-arrow-btn"
            onClick={prevYear}
            title="Previous Year"
            aria-label="Previous Year"
          >
            &laquo;
          </button>
          <button
            type="button"
            className="custom-calendar-arrow-btn"
            onClick={prevMonth}
            title="Previous Month"
            aria-label="Previous Month"
          >
            &lsaquo;
          </button>
        </div>

        <div className="custom-calendar-title">
          {monthName} {year}
        </div>

        <div className="custom-calendar-nav-right">
          <button
            type="button"
            className="custom-calendar-arrow-btn"
            onClick={nextMonth}
            title="Next Month"
            aria-label="Next Month"
          >
            &rsaquo;
          </button>
          <button
            type="button"
            className="custom-calendar-arrow-btn"
            onClick={nextYear}
            title="Next Year"
            aria-label="Next Year"
          >
            &raquo;
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="custom-calendar-weekdays">
        {WEEKDAYS.map((name) => (
          <span key={name} className="custom-calendar-weekday">
            {name}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="custom-calendar-grid">
        {calendarDays.map((item, idx) => {
          const isWeekend = item.dayOfWeek === 0 || item.dayOfWeek === 6;
          let cellClass = "custom-calendar-cell";

          if (item.isSelected) {
            cellClass += " is-selected";
          } else if (!item.isCurrentMonth) {
            cellClass += " is-other-month";
          } else if (isWeekend) {
            cellClass += " is-weekend";
          } else {
            cellClass += " is-weekday";
          }

          return (
            <button
              key={`${item.date.toISOString()}-${idx}`}
              type="button"
              className={cellClass}
              onClick={() => {
                onSelectDate(item.date);
                if (onClose) onClose();
              }}
              aria-label={item.date.toLocaleDateString()}
            >
              {item.dayNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
}
