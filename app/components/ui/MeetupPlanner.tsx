"use client";
import React from 'react';

export default function MeetupPlanner({ tradeId }: { tradeId: number }) {
  return (
    <div className="p-4 bg-card rounded">
      <div className="text-sm">Meetup planner for trade {tradeId} (AI suggestions will appear here).</div>
    </div>
  );
}
