"use client";
import React from 'react';

export default function ChatWindow({ messages }: { messages: Array<{id?: number,text:string,role?:string}> }) {
  return (
    <div className="p-4 bg-card rounded-lg h-96 overflow-auto">
      {messages.map((m, i) => (
        <div key={m.id ?? i} className={`mb-3 ${m.role === 'assistant' ? 'text-emerald-500' : 'text-slate-200'}`}>
          <div className="text-sm">{m.text}</div>
        </div>
      ))}
    </div>
  );
}
