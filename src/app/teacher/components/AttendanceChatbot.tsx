"use client";
import { useState, useRef, useEffect } from "react";

interface Props {
  teacherId: string;
}

interface Message {
  sender: "user" | "bot";
  text: string;
}

export default function AttendanceChatbot({ teacherId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleAsk = async () => {
    if (!question.trim()) return;

    const userMessage: Message = { sender: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("/api/attendance-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, question: userMessage.text }),
      });

      const data = await res.json();
      const botMessage: Message = {
        sender: "bot",
        text: res.ok ? data.answer || "No response" : `Error: ${data.error}`,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: `Fetch error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isOpen]);

  return (
    <>
      {/* Chat bubble button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 z-50 transition-transform ${
          isOpen ? "rotate-45" : ""
        }`}
        title="Open Chat"
      >
        💬
      </button>

      {/* Chat window */}
      <div
        className={`fixed bottom-20 right-6 w-80 max-h-[500px] bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden transition-transform z-50 ${
          isOpen ? "translate-y-0" : "translate-y-[200%]"
        }`}
      >
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-3 flex justify-between items-center">
          <h4 className="font-bold">AI Attendance Assistant</h4>
          <button onClick={() => setIsOpen(false)} className="text-white font-bold">
            ✕
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 p-4 overflow-y-auto space-y-2 bg-gray-50"
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-4 py-2 rounded-xl max-w-[70%] break-words ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-800 rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800 animate-pulse rounded-bl-none">
                Typing...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask something like: How many absents today?"
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAsk();
            }}
          />
          <button
            onClick={handleAsk}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
