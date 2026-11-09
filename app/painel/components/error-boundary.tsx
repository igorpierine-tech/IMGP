"use client";

import { useState, useEffect, useCallback } from "react";
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";

export function useOnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm rounded-xl shadow-lg animate-slide-up">
      <WifiOff size={16} />
      <span>Sem conexão — as alterações serão salvas quando voltar online</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
      <p className="text-sm text-red-700 mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          <RefreshCw size={14} /> Tentar novamente
        </button>
      )}
    </div>
  );
}

export function useFetchWithRetry() {
  const online = useOnlineStatus();

  const fetchWithRetry = useCallback(
    async (url: string, options?: RequestInit, maxRetries = 2): Promise<Response> => {
      if (!online) {
        throw new Error("Sem conexão com a internet");
      }
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(url, { credentials: "include", ...options });
          return response;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Erro de rede");
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
      throw lastError ?? new Error("Erro de rede");
    },
    [online],
  );

  return { fetchWithRetry, online };
}
