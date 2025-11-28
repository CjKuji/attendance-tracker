"use client";
import { useState, useRef, useEffect } from "react";
import { Bot, User, Send, Loader2 } from "lucide-react";

interface Props {
  teacherId?: string; // optional for teachers
  studentId?: string; // optional for students
}

interface Message {
  sender: "user" | "bot";
  text: string;
}

export default function AttendanceChatbot({ teacherId, studentId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleAsk = async () => {
    if (!question.trim() || loading) return;

    const userMessage: Message = { sender: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("/api/attendance-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, studentId, question: userMessage.text }),
      });

      const data = await res.json();
      const botMessage: Message = {
        sender: "bot",
        text: res.ok ? data.answer || "No response" : `Error: ${data.error || "Bad Request"}`,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { sender: "bot", text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 transition-all z-[999] ${isOpen ? "rotate-90" : ""}`}
      >
        💬
      </button>

      <div
        className={`fixed bottom-24 right-6 w-80 md:w-96 max-h-[550px] bg-white border border-blue-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col transition-all duration-300 z-[999] ${
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        }`}
      >
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow">
          <div className="flex items-center gap-2">
            <Bot size={20} />
            <h4 className="font-semibold">AI Attendance Assistant</h4>
          </div>
          <button onClick={() => setIsOpen(false)} className="hover:text-gray-100">✕</button>
        </div>

        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto bg-white space-y-3">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              {msg.sender === "bot" && <div className="p-2 bg-blue-600 text-white rounded-full shadow"><Bot size={16} /></div>}
              <div className={`px-4 py-2 rounded-2xl max-w-[75%] shadow ${msg.sender === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-blue-100 text-black rounded-bl-none"}`}>
                {msg.text}
              </div>
              {msg.sender === "user" && <div className="p-2 bg-blue-600 text-white rounded-full shadow"><User size={16} /></div>}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 text-white rounded-full shadow"><Bot size={16} /></div>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150"></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-300"></span>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-white border-t flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask anything about attendance..."
            className="flex-1 px-4 py-2 border border-blue-300 text-black rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-40"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            disabled={loading}
          />
          <button onClick={handleAsk} disabled={loading} className="bg-blue-600 text-white p-3 rounded-full shadow hover:bg-blue-700 disabled:opacity-40">
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </>
  );
}
