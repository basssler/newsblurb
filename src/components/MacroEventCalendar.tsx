"use client";

import { useState, useEffect } from "react";
import {
  getUpcomingEvents,
  getEventTypeColor,
  getImportanceStyle,
  formatEventDate,
  getDaysUntilEvent,
  MacroEvent,
} from "@/lib/macro/macroEventCalendar";

interface MacroEventCalendarProps {
  daysAhead?: number;
  maxEvents?: number;
}

export default function MacroEventCalendar({
  daysAhead = 60,
  maxEvents = 8,
}: MacroEventCalendarProps) {
  const [events, setEvents] = useState<MacroEvent[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  useEffect(() => {
    const upcomingEvents = getUpcomingEvents(daysAhead);
    setEvents(upcomingEvents.slice(0, maxEvents));
  }, [daysAhead, maxEvents]);

  if (events.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center border border-slate-200 dark:border-slate-700">
        <p className="text-slate-600 dark:text-slate-400">No upcoming macro events in the next {daysAhead} days</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-slate-50 dark:from-slate-800/50 dark:to-slate-800 border border-blue-200 dark:border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Economic Calendar</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Upcoming macro events that can impact this stock
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {events.length}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">events</p>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {events.map((event) => {
          const daysUntil = getDaysUntilEvent(event.date);
          const isExpanded = expandedEventId === event.id;

          return (
            <div
              key={event.id}
              className={`border rounded-lg transition-all cursor-pointer ${
                isExpanded
                  ? "bg-white dark:bg-slate-700/50 border-blue-300 dark:border-blue-600 shadow-md"
                  : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600"
              }`}
              onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
            >
              {/* Event Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Importance Badge */}
                  <div className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${getImportanceStyle(event.importance)}`}>
                    {event.importance.toUpperCase()}
                  </div>

                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-bold border ${getEventTypeColor(event.type)}`}>
                        {event.type}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground truncate">{event.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {formatEventDate(event.date)}
                    </p>
                  </div>

                  {/* Days Until */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {daysUntil}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {daysUntil === 1 ? "day" : daysUntil === 0 ? "today" : daysUntil < 0 ? "past" : "days"}
                    </p>
                  </div>

                  {/* Chevron */}
                  <div className="ml-2 text-slate-400 flex-shrink-0">
                    <svg
                      className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Event Details (Expanded) */}
              {isExpanded && event.historicalImpact && (
                <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
                  {/* Estimate */}
                  {event.estimate && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                        Estimate
                      </p>
                      <p className="text-sm font-medium text-foreground">{event.estimate}</p>
                    </div>
                  )}

                  {/* Historical Impact */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Historical Impact
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Avg Move */}
                      <div className="bg-white dark:bg-slate-700 rounded p-2 border border-slate-200 dark:border-slate-600">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          Avg Stock Move
                        </p>
                        <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                          {event.historicalImpact.avgStockMove.toFixed(1)}%
                        </p>
                      </div>

                      {/* Direction */}
                      <div className="bg-white dark:bg-slate-700 rounded p-2 border border-slate-200 dark:border-slate-600">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          Typical Direction
                        </p>
                        <p className={`text-sm font-bold ${
                          event.historicalImpact.direction === "up"
                            ? "text-green-600 dark:text-green-400"
                            : event.historicalImpact.direction === "down"
                            ? "text-red-600 dark:text-red-400"
                            : "text-slate-600 dark:text-slate-400"
                        }`}>
                          {event.historicalImpact.direction === "up" ? "↑ Up" : event.historicalImpact.direction === "down" ? "↓ Down" : "⟷ Mixed"}
                        </p>
                      </div>

                      {/* Event Type Count */}
                      <div className="bg-white dark:bg-slate-700 rounded p-2 border border-slate-200 dark:border-slate-600">
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                          Event Frequency
                        </p>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {event.type === "NFP" ? "Monthly" : event.type === "FOMC" ? "8x/yr" : "Monthly"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2">
                      What It Means
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {event.historicalImpact.description}
                    </p>
                  </div>

                  {/* Education Tip */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      💡 Trading Tip
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      Market volatility often increases in the hours before and after major macro events. Consider your risk tolerance when sizing positions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
          <span className="font-semibold">📅 Next {maxEvents} events</span> • Importance levels: <span className="text-red-600 dark:text-red-400">High</span>, <span className="text-orange-600 dark:text-orange-400">Medium</span>, <span className="text-blue-600 dark:text-blue-400">Low</span>
        </p>
      </div>
    </div>
  );
}
