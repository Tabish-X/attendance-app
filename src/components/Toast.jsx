import { useState, useCallback } from "react";

// ── Hook (was useToast.js) ──────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, addToast };
}

// ── Component ──────────────────────────────────────────────────────────────
const ICONS = { success: "✓", error: "✕", info: "i" };

export function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span style={{ fontWeight: 700, fontSize: 12 }}>{ICONS[t.type]}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}