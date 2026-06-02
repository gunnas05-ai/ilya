'use client';

import { useState, useCallback } from 'react';
import { Mic, Send, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

export function AiCommandBar() {
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    try {
      await api.post('/voice/ai-dialog', { message: input.trim() });
      setInput('');
    } catch {
      // Sessizce hata yut — AI bar kritik değil
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  return (
    <div className="hidden md:block fixed bottom-5 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4">
      <div
        className="relative flex items-center gap-2.5 px-4 py-3 rounded-2xl
                   transition-all duration-300 animate-fade-in"
        style={{
          background: 'rgba(15, 29, 50, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          boxShadow: '0 0 30px rgba(99, 102, 241, 0.12)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.35)';
          e.currentTarget.style.boxShadow = '0 0 40px rgba(99, 102, 241, 0.18)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
          e.currentTarget.style.boxShadow = '0 0 30px rgba(99, 102, 241, 0.12)';
        }}
      >
        {/* Sparkle icon */}
        <Sparkles size={18} className="text-indigo-400 shrink-0" />

        {/* Input */}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Hey Kaptan'a bir şey sor…"
          className="flex-1 bg-transparent text-sm text-[var(--text)]
                     placeholder:text-slate-500 outline-none"
        />

        {/* Voice button */}
        <button
          type="button"
          onClick={() => setListening(!listening)}
          className={`p-2 rounded-xl transition-all shrink-0
            ${listening
              ? 'bg-red-500/20 text-red-400 animate-pulse'
              : 'text-slate-500 hover:text-indigo-400 hover:bg-white/[0.06]'
            }`}
        >
          <Mic size={16} />
        </button>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400
                     hover:bg-indigo-500/30 transition-all shrink-0
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
