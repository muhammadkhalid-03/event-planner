"use client";

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function AuthPopup() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter the special code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signIn(password);
    } catch (error: any) {
      console.error("Authentication error:", error);
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      
      {/* Popup */}
      <div className="relative bg-white rounded-lg shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Enter Special Code
          </h2>
          <p className="text-gray-600 mb-6">
            Please enter your access code to continue
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Special Code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg"
                disabled={loading}
                autoFocus
              />
            </div>
            
            {error && (
              <div className="text-red-600 text-sm">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                "Access App"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 