"use client";
import React from 'react';

export default function ChatWindow({ messages }: { messages: Array<{id?: number,text:string,role?:string}> }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-contain bg-[#030712] p-4 gap-3">
      {messages.map((m, i) => {
        const isMe = m.role !== 'assistant';
        return (
          <div key={m.id ?? i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                isMe
                  ? 'bg-emerald-500 text-[#030712] font-medium'
                  : 'bg-[#1E293B] border border-white/15 text-white'
              }`}
            >
              <p className="text-[15px] leading-relaxed">{m.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
