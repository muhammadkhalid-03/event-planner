// components/GeminiChat.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default function GeminiChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(
        process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
        { 
          apiEndpoint: "https://generativelanguage.googleapis.com/v1/models" 
        }
      );
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest"  
      });
      
      const result = await model.generateContent(input);
      const response = await result.response;
      const text = response.text();

      setMessages(prev => [...prev, { role: "model", text }]);
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setMessages(prev => [...prev, { 
        role: "model", 
        text: "Sorry, I couldn't process your request. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-4 mt-6">
      <h2 className="text-lg font-semibold mb-3">Gemini Assistant</h2>
      
      <div className="mb-4 h-60 overflow-y-auto bg-gray-50 rounded-lg p-3">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm">Ask me anything about locations or travel planning!</p>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`mb-3 ${msg.role === "user" ? "text-right" : ""}`}
            >
              <span className={`inline-block px-3 py-2 rounded-lg ${
                msg.role === "user" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-200 text-gray-800"
              }`}>
                {msg.text}
              </span>
            </div>
          ))
        )}
        {loading && (
          <div className="mb-3">
            <span className="inline-block px-3 py-2 rounded-lg bg-gray-200 text-gray-800">
              Thinking...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask about locations or travel..."
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}