"use client"

import { useState, useEffect } from "react"
import { useMarketData } from "@/features/market/hooks/use-market-data"
import { binanceMarketDataService } from "@/lib/websocket/lib/market-data-service"
import type { Kline } from "@/lib/market/interfaces"
import { handleDataError } from "@/lib/error-handling"

interface UseKlineDataOptions {
  interval?: string
  limit?: number
}

interface UseKlineDataProps extends UseKlineDataOptions {
  symbol: string
}

export function useKlineData({ symbol, interval = "1m", limit = 30 }: UseKlineDataProps) {
  if (process.env.NODE_ENV === 'development' && !symbol) {
    console.warn(
      'useKlineData: Symbol is undefined or empty. ' +
      'This hook requires a valid symbol to fetch data.'
    );
  }
  const [klineData, setKlineData] = useState<Kline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Don't fetch if symbol is undefined or empty
    if (!symbol?.trim()) {
      setIsLoading(false)
      return
    }

    let isMounted = true
    const fetchKlineData = async () => {
      try {
        setIsLoading(true)
        const result = await binanceMarketDataService.getKlineData(symbol, interval, limit)
      
        if (isMounted && result) {
          // Transform KlineData[] to Kline[] by adding the missing properties
          const transformedData = result.map(kline => ({
            ...kline,
            quoteAssetVolume: kline.quoteVolume || 0,
            takerBuyBaseAssetVolume: kline.takerBuyBaseVolume || 0,
            takerBuyQuoteAssetVolume: kline.takerBuyQuoteVolume || 0,
            ignored: 0
          }));
          setKlineData(transformedData);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to fetch kline data"));
          handleDataError(err, "KlineDataHook", {
            severity: "medium",
            data: { symbol, interval, limit }
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchKlineData();

    return () => {
      isMounted = false;
    };
  }, [symbol, interval, limit]);

  return { klineData, isLoading, error };
}
