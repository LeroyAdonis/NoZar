"use client";
import React from 'react';

export default function HandshakeFlow({ tradeId }: { tradeId: number }) {
  return (
    <div className="p-4 bg-card rounded">
      <div className="text-sm">Handshake actions will appear here for trade {tradeId}.</div>
    </div>
  );
}
