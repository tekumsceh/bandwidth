const FALLBACK_RATES_FROM_EUR: Record<string, number> = {
  EUR: 1,
  RSD: 116.5,
  USD: 1.09,
  GBP: 0.85,
  CHF: 0.96,
  CAD: 1.47,
  AUD: 1.66,
};

export async function getFxRatesFromBase(
  baseCurrency: string,
  symbols: string[],
): Promise<{ base: string; asOf: string; rates: Record<string, number>; source: string }> {
  const base = baseCurrency.toUpperCase();
  const uniqueSymbols = Array.from(new Set(symbols.map((s) => s.toUpperCase()))).filter(Boolean);

  if (!uniqueSymbols.includes(base)) {
    uniqueSymbols.push(base);
  }

  const symbolsParam = uniqueSymbols.join(',');
  try {
    const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(symbolsParam)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`FX provider failed (${res.status})`);
    }
    const json = (await res.json()) as { date?: string; rates?: Record<string, number> };
    const rates = json.rates || {};
    rates[base] = 1;
    return {
      base,
      asOf: json.date || new Date().toISOString().slice(0, 10),
      rates,
      source: 'frankfurter',
    };
  } catch {
    // Fallback path when provider is unavailable.
    const fallbackBaseRate = FALLBACK_RATES_FROM_EUR[base] || 1;
    const rates: Record<string, number> = {};
    for (const sym of uniqueSymbols) {
      const eurToSym = FALLBACK_RATES_FROM_EUR[sym] || 1;
      rates[sym] = eurToSym / fallbackBaseRate;
    }
    rates[base] = 1;
    return {
      base,
      asOf: new Date().toISOString().slice(0, 10),
      rates,
      source: 'fallback',
    };
  }
}

