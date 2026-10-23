"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons = {
    success: <CheckCircle2 size={16} className="text-green-400" />,
    error: <XCircle size={16} className="text-red-400" />,
    info: <Info size={16} className="text-blue-400" />,
  };

  const colors = {
    success: "bg-green-500/10 border-green-500/30 text-green-400",
    error: "bg-red-500/10 border-red-500/30 text-red-400",
    info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg animate-in slide-in-from-right duration-300 ${colors[t.type]}`}
            onClick={() => dismiss(t.id)}
          >
            <span className="toast-pop inline-flex">{icons[t.type]}</span>
            <span className="flex-1">{t.message}</span>
            <button onClick={(e) => { e.stopPropagation(); dismiss(t.id); }} aria-label="Fechar aviso" className="opacity-40 hover:opacity-100 transition-opacity p-0.5"><X size={14} /></button>
            <span className="toast-bar" aria-hidden="true" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
