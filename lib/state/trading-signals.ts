import { createContext, useContext, useState, useCallback, ReactNode, useMemo, createElement } from 'react';
import type { TradingSignal } from '@/lib/types/market-types';
import { deepEqual } from '@/lib/utils';

interface TradingSignalsState {
  signals: Record<string, TradingSignal[]>;
  addSignal: (symbol: string, signal: TradingSignal) => void;
  getSignal: (symbol: string) => TradingSignal | null;
  getSignalHistory: (symbol: string, limit?: number) => TradingSignal[];
  clearOldSignals: (maxAgeMs: number) => void;
}

const defaultState: TradingSignalsState = {
  signals: {},
  addSignal: () => {},
  getSignal: () => null,
  getSignalHistory: () => [],
  clearOldSignals: () => {}
};

const TradingSignalsContext = createContext<TradingSignalsState>(defaultState);

export function TradingSignalsProvider({ children }: { children: ReactNode }) {
  const [signals, setSignals] = useState<Record<string, TradingSignal[]>>({});

  const addSignal = useCallback((symbol: string, signal: TradingSignal) => {
    setSignals(prev => {
      const currentSignals = prev[symbol] || [];
      const lastSignal = currentSignals[currentSignals.length - 1];
      if (lastSignal && deepEqual(lastSignal, signal)) return prev;
      
      return {
        ...prev,
        [symbol]: [...currentSignals, {
          ...signal,
          timestamp: Date.now()
        }]
      };
    });
  }, []);

  const getSignal = useCallback((symbol: string) => {
    const signalHistory = signals[symbol];
    return signalHistory ? signalHistory[signalHistory.length - 1] : null;
  }, [signals]);

  const getSignalHistory = useCallback((symbol: string, limit = 10) => {
    const signalHistory = signals[symbol] || [];
    return signalHistory.slice(-limit);
  }, [signals]);

  const clearOldSignals = useCallback((maxAgeMs: number) => {
    const cutoff = Date.now() - maxAgeMs;
    setSignals(prev => {
      const updated: Record<string, TradingSignal[]> = {};
      for (const [symbol, signalHistory] of Object.entries(prev)) {
        updated[symbol] = signalHistory.filter(s => s.timestamp >= cutoff);
      }
      return updated;
    });
  }, []);

  const contextValue = useMemo(() => ({
    signals,
    addSignal,
    getSignal,
    getSignalHistory,
    clearOldSignals
  }), [signals, addSignal, getSignal, getSignalHistory, clearOldSignals]);

  return createElement(
    TradingSignalsContext.Provider,
    { value: contextValue },
    children
  );
}

export function useTradingSignals() {
  const context = useContext(TradingSignalsContext);
  if (!context) {
    throw new Error('useTradingSignals must be used within a TradingSignalsProvider');
  }
  return context;
}
