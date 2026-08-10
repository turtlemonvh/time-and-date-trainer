import { useState } from 'react';
import { MONTH_NAMES } from '../questionDisplay';

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface CalendarMonthProps {
  year: number;
  /** 0 = January, matching `Date.prototype.getMonth()`. */
  monthIndex: number;
  /** 1-based day of month to highlight. Only shown while the highlighted month is in view. */
  highlightDay?: number;
  /** Presence makes day cells clickable. */
  onDayClick?: (day: number, year: number, monthIndex: number) => void;
}

/**
 * A month grid (Sunday-first, per the design spec's US conventions) with
 * built-in prev/next month navigation. Navigation is uncontrolled — it
 * starts at `year`/`monthIndex` but manages its own view state, since
 * "flip through months while browsing for a date" doesn't need a parent
 * round-trip on every click. `highlightDay` only renders while its month is
 * the one in view; flipping away from it is expected (that's the point of
 * browsing), not an error.
 */
export default function CalendarMonth({
  year,
  monthIndex,
  highlightDay,
  onDayClick,
}: CalendarMonthProps) {
  const [view, setView] = useState({ year, monthIndex });

  function changeMonth(delta: number) {
    setView((current) => {
      let nextMonth = current.monthIndex + delta;
      let nextYear = current.year;
      if (nextMonth < 0) {
        nextMonth = 11;
        nextYear -= 1;
      } else if (nextMonth > 11) {
        nextMonth = 0;
        nextYear += 1;
      }
      return { year: nextYear, monthIndex: nextMonth };
    });
  }

  const daysInMonth = new Date(view.year, view.monthIndex + 1, 0).getDate();
  const firstWeekday = new Date(view.year, view.monthIndex, 1).getDay();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const highlightedMonthInView = view.year === year && view.monthIndex === monthIndex;

  return (
    <div data-testid="calendar-month">
      <div>
        <button
          type="button"
          data-testid="calendar-prev-month"
          aria-label="Previous month"
          onClick={() => changeMonth(-1)}
        >
          ‹
        </button>{' '}
        <span data-testid="calendar-month-label">
          {MONTH_NAMES[view.monthIndex]} {view.year}
        </span>{' '}
        <button
          type="button"
          data-testid="calendar-next-month"
          aria-label="Next month"
          onClick={() => changeMonth(1)}
        >
          ›
        </button>
      </div>
      <div
        role="grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(44px, 1fr))', gap: 2 }}
      >
        {WEEKDAY_HEADERS.map((label) => (
          <div key={label} data-testid="calendar-weekday-header">
            {label}
          </div>
        ))}
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={index} aria-hidden="true" />;
          }
          const highlighted = highlightedMonthInView && day === highlightDay;
          const cellProps = {
            'data-testid': highlighted ? 'calendar-day-highlighted' : 'calendar-day',
            style: {
              minWidth: 44,
              minHeight: 44,
              background: highlighted ? 'var(--accent)' : undefined,
              color: highlighted ? '#fff' : undefined,
              borderRadius: highlighted ? 8 : undefined,
              fontWeight: highlighted ? 700 : undefined,
            },
          };
          if (onDayClick) {
            return (
              <button
                type="button"
                key={index}
                {...cellProps}
                onClick={() => onDayClick(day, view.year, view.monthIndex)}
              >
                {day}
              </button>
            );
          }
          return (
            <div key={index} {...cellProps}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
