"use client";
import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";

type Message = {
  id: number;
  text: string;
  isUser: boolean;
};

const QUICK_QUESTIONS = [
  "I forgot my password",
  "My email verification isn't arriving",
  "Phone OTP isn't coming through",
  "How do I create a listing?",
  "Can't sign out",
  "Wrong email on my account",
  "How do I change my email?",
  "My payment failed",
];

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      text: "👋 Hey! Ask me anything about NoZar — I can help with logins, listings, billing, and more.",
      isUser: false,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(1);

  // Listen for global toggle event (from composer icon, toast, etc.)
  useEffect(() => {
    function handleToggle() {
      setIsOpen(prev => !prev);
    }
    window.addEventListener("hermes:open-support-chat", handleToggle);
    return () => window.removeEventListener("hermes:open-support-chat", handleToggle);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  async function sendQuestion(question: string) {
    const userMsg: Message = {
      id: idCounter.current++,
      text: question,
      isUser: true,
    };
    setMessages((prev) => [...prev, userMsg]);
    setShowQuickQuestions(false);
    setIsLoading(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      const botMsg: Message = {
        id: idCounter.current++,
        text: data.error ?? data.answer ?? "Sorry, I couldn't process that. Try rephrasing your question.",
        isUser: false,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const botMsg: Message = {
        id: idCounter.current++,
        text: "Something went wrong — try again or contact support directly.",
        isUser: false,
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSend() {
    const q = input.trim();
    if (!q || isLoading) return;
    setInput("");
    void sendQuestion(q);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating trigger button — desktop only (2-col layout uses floating FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`hidden lg:flex fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full items-center justify-center shadow-lg transition-all duration-300 ${
          isOpen
            ? "bg-slate-700 rotate-90"
            : "bg-emerald-500 hover:bg-emerald-400 active:scale-95"
        }`}
        aria-label={isOpen ? "Close support chat" : "Open support chat"}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-[#030712]" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 sm:bottom-24 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[380px] h-[480px] max-h-[70vh] flex flex-col bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">NoZar Help</p>
                <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                  Support
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.isUser
                      ? "bg-emerald-500 text-[#030712] font-medium"
                      : "bg-[#1E293B] border border-white/10 text-slate-200"
                  }`}
                >
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#1E293B] border border-white/10 rounded-2xl px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Quick questions (shown at start) */}
            {showQuickQuestions && messages.length === 1 && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 pb-1">
                  Common questions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => void sendQuestion(q)}
                      disabled={isLoading}
                      className="text-xs px-3 py-1.5 rounded-full bg-[#1E293B] border border-white/10 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="flex gap-2 px-4 py-3 border-t border-white/5 shrink-0 bg-[#0F172A]">
            <input
              ref={inputRef}
              className="flex-1 min-h-[40px] bg-[#030712] border border-white/10 rounded-xl px-3.5 py-2 text-[14px] text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question..."
              disabled={isLoading}
            />
            <button
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-emerald-500 text-[#030712] hover:bg-emerald-400 active:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
