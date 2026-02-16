import { useEffect, useMemo, useState } from "react";

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDateKey(value) {
  if (typeof value !== "string") {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day };
}

function makeDateKey(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftMonth(baseYear, baseMonth, delta) {
  const value = baseYear * 12 + (baseMonth - 1) + delta;
  const year = Math.floor(value / 12);
  const month = (value % 12) + 1;
  return { year, month };
}

function buildMonthCells(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const rows = Math.ceil((firstDay + daysInMonth) / 7);
  const slotCount = rows * 7;
  const cells = [];

  for (let index = 0; index < slotCount; index += 1) {
    const day = index - firstDay + 1;
    if (day < 1 || day > daysInMonth) {
      cells.push(null);
      continue;
    }
    cells.push({
      day,
      dateKey: makeDateKey(year, month, day)
    });
  }

  return cells;
}

export default function SidebarCalendar({ rows, activeDate, onSelectRow }) {
  const rowByDate = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      if (typeof row?.date === "string" && parseDateKey(row.date)) {
        map.set(row.date, row);
      }
    }
    return map;
  }, [rows]);

  const latestDate = useMemo(() => {
    let latest = "";
    for (const key of rowByDate.keys()) {
      if (key > latest) {
        latest = key;
      }
    }
    return latest;
  }, [rowByDate]);

  const fallbackMonth = useMemo(() => {
    const active = parseDateKey(activeDate);
    if (active) {
      return { year: active.year, month: active.month };
    }
    const latest = parseDateKey(latestDate);
    if (latest) {
      return { year: latest.year, month: latest.month };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, [activeDate, latestDate]);

  const [viewMonth, setViewMonth] = useState(fallbackMonth);

  useEffect(() => {
    setViewMonth(fallbackMonth);
  }, [fallbackMonth]);

  const cells = useMemo(() => buildMonthCells(viewMonth.year, viewMonth.month), [viewMonth]);

  return (
    <section className="calendar-card" aria-label="更新カレンダー">
      <div className="calendar-head">
        <strong>更新カレンダー</strong>
        <div className="calendar-nav">
          <button
            type="button"
            className="calendar-nav-button"
            aria-label="前の月"
            onClick={() => {
              setViewMonth((month) => shiftMonth(month.year, month.month, -1));
            }}
          >
            {"<"}
          </button>
          <button
            type="button"
            className="calendar-nav-button"
            aria-label="次の月"
            onClick={() => {
              setViewMonth((month) => shiftMonth(month.year, month.month, 1));
            }}
          >
            {">"}
          </button>
        </div>
      </div>

      <p className="calendar-month">
        {viewMonth.year} / {String(viewMonth.month).padStart(2, "0")}
      </p>

      <div className="calendar-grid calendar-weekdays">
        {WEEK_DAYS.map((day) => (
          <span key={day} className="calendar-weekday">
            {day}
          </span>
        ))}
      </div>

      <div className="calendar-grid calendar-days">
        {cells.map((cell, index) => {
          if (!cell) {
            return <span key={`empty-${index}`} className="calendar-day empty" aria-hidden="true" />;
          }

          const row = rowByDate.get(cell.dateKey);
          const isActive = cell.dateKey === activeDate;
          const className = `calendar-day${row ? " has-update" : ""}${isActive ? " active" : ""}`;

          if (!row) {
            return (
              <span key={cell.dateKey} className={className}>
                {cell.day}
              </span>
            );
          }

          return (
            <button
              type="button"
              key={cell.dateKey}
              className={className}
              title={`更新日 ${cell.dateKey}`}
              onClick={() => {
                void onSelectRow(row);
              }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {latestDate ? <p className="calendar-latest">最新の更新日 {latestDate}</p> : null}
    </section>
  );
}
