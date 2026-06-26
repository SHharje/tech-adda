"use client";

import { useState, useRef, useEffect } from "react";

export default function NewsChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "model", content: "Hi! I'm your AI news assistant. Ask me anything about what's trending in tech today!" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeStory, setActiveStory] = useState(null);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Listen for 'Ask AI' clicks from the Activity Feed
  useEffect(() => {
    const handleOpenChat = (e) => {
      const { story } = e.detail;
      setIsOpen(true);
      setActiveStory(story);
      setMessages([
        { role: "model", content: `I see you're looking at **${story.title}**. What would you like to know about it?` }
      ]);
      // Adding a small delay to ensure the UI has opened before scrolling
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    window.addEventListener("open-news-chat", handleOpenChat);
    return () => window.removeEventListener("open-news-chat", handleOpenChat);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message to UI
    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          // Exclude the initial greeting from the history sent to the API
          history: newMessages.slice(1, -1),
          contextStory: activeStory,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        setMessages((prev) => [...prev, { role: "model", content: data.text }]);
      } else {
        setMessages((prev) => [...prev, { role: "model", content: "Sorry, I ran into an error. Please try again." }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { role: "model", content: "Sorry, I couldn't reach the server." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* ── Floating Toggle Button ──────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#00D4FF] flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.4)] hover:scale-105 transition-transform z-50 group"
        aria-label="Toggle chat"
      >
        {isOpen ? (
          <span className="text-black text-2xl font-bold">×</span>
        ) : (
          <span className="text-black text-2xl group-hover:animate-pulse">✨</span>
        )}
      </button>

      {/* ── Chat Window ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[380px] h-[500px] bg-[#0D1424] border border-[#1E293B] shadow-2xl rounded-xl flex flex-col z-50 overflow-hidden transform transition-all">
          
          {/* Header */}
          <div className="bg-[#111827] border-b border-[#1E293B] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse shadow-[0_0_8px_#00D4FF]" />
              <span className="font-[family-name:var(--font-display)] text-sm font-bold text-[#F8FAFC]">
                {activeStory ? "Article Chat" : "Chat with the News"}
              </span>
            </div>
            {activeStory && (
              <button 
                onClick={() => {
                  setActiveStory(null);
                  setMessages([{ role: "model", content: "Hi! I'm your AI news assistant. Ask me anything about what's trending in tech today!" }]);
                }}
                className="font-[family-name:var(--font-mono)] text-[10px] text-[#64748B] hover:text-[#F8FAFC] transition-colors"
              >
                [reset context]
              </button>
            )}
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#64748B] bg-[#1E293B] px-2 py-1 rounded">
              Gemini 2.5
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#0A0F1E] scrollbar-hide">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 text-sm font-[family-name:var(--font-body)] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#00D4FF] text-black rounded-br-sm"
                      : "bg-[#1E293B] text-[#CBD5E1] rounded-bl-sm border border-[#334155]"
                  }`}
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#1E293B] border border-[#334155] rounded-lg rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-[#64748B] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-[#64748B] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-[#64748B] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-[#111827] border-t border-[#1E293B]">
            <form onSubmit={handleSubmit} className="flex gap-2 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about today's news..."
                disabled={isLoading}
                className="w-full bg-[#0A0F1E] border border-[#334155] rounded-md pl-3 pr-10 py-2 text-sm text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#00D4FF] transition-colors disabled:opacity-50 font-[family-name:var(--font-body)]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#00D4FF] disabled:text-[#475569] p-1 transition-colors hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
