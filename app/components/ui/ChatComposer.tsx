"use client";
import React, { useState } from 'react';

export default function ChatComposer({ onSend }: { onSend: (text: string) => Promise<void> }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await onSend(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 flex gap-2">
      <input className="flex-1 p-2 bg-card rounded" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message..." />
      <button className="btn" onClick={submit} disabled={sending}>{sending ? 'Sending...' : 'Send'}</button>
    </div>
  );
}
