"use client";
import React, { useEffect, useState } from 'react';
import ChatWindow from '~/components/ui/ChatWindow';
import ChatComposer from '~/components/ui/ChatComposer';

export default function TradeChat({ params }: any) {
  const tradeId = Number(params.tradeId);
  const [messages, setMessages] = useState<Array<any>>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/messages/${tradeId}`);
      const data = await res.json();
      setMessages(data);
    }
    load();
  }, [tradeId]);

  async function onSend(text: string) {
    const res = await fetch(`/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tradeId, input: text }) });
    if (res.ok) {
      const json = await res.json();
      // Append assistant message
      setMessages((m) => [...m, { text, role: 'user' }, { text: json.message.text, role: 'assistant' }]);
    } else {
      console.error('send failed');
    }
  }

  return (
    <div className="p-4">
      <ChatWindow messages={messages} />
      <ChatComposer onSend={onSend} />
    </div>
  );
}
