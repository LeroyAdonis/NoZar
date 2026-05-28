"use client";
import React, { useState } from 'react';
import { useHaptics } from "~/components/ui/haptic-provider";
import { Send } from 'lucide-react';

export default function ChatComposer({ onSend }: { onSend: (text: string) => Promise<void> }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const haptics = useHaptics();

  async function submit() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await onSend(text.trim());
      haptics.success();
      setText('');
    } catch (err) {
      haptics.error();
      throw err;
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div
      className="flex gap-2 pt-3 px-4 bg-[#030712] border-t border-white/5 shrink-0"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
    >
      <input
        className="flex-1 min-h-[44px] bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-[15px] text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors min-w-0"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a message..."
        disabled={sending}
      />
      <button
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-emerald-500 text-[#030712] hover:bg-emerald-400 active:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        onClick={() => void submit()}
        disabled={sending || !text.trim()}
        aria-label="Send message"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}
