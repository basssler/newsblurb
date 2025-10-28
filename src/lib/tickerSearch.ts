/**
 * Ticker search and autocomplete utilities
 */

export interface TickerOption {
  symbol: string;
  name: string;
  exchange?: string;
}

/**
 * Popular stocks for quick access
 */
export const POPULAR_TICKERS: TickerOption[] = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'INTEL', name: 'Intel Corporation' },
  { symbol: 'CRM', name: 'Salesforce Inc.' },
  { symbol: 'ADBE', name: 'Adobe Inc.' },
  { symbol: 'IBM', name: 'International Business Machines' },
  { symbol: 'ORCL', name: 'Oracle Corporation' },
  { symbol: 'CSCO', name: 'Cisco Systems Inc.' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'GS', name: 'Goldman Sachs Group Inc.' },
  { symbol: 'MS', name: 'Morgan Stanley' },
  { symbol: 'BAC', name: 'Bank of America Corporation' },
  { symbol: 'WFC', name: 'Wells Fargo & Company' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'PFE', name: 'Pfizer Inc.' },
  { symbol: 'ABBV', name: 'AbbVie Inc.' },
  { symbol: 'MRK', name: 'Merck & Co. Inc.' },
  { symbol: 'UNH', name: 'UnitedHealth Group Incorporated' },
  { symbol: 'LLY', name: 'Eli Lilly and Company' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation' },
  { symbol: 'CVX', name: 'Chevron Corporation' },
  { symbol: 'COP', name: 'ConocoPhillips' },
  { symbol: 'MPC', name: 'Marathon Petroleum Corporation' },
  { symbol: 'PSX', name: 'Phillips 66' },
  { symbol: 'KO', name: 'The Coca-Cola Company' },
  { symbol: 'PEP', name: 'PepsiCo Inc.' },
  { symbol: 'MCD', name: 'McDonald\'s Corporation' },
  { symbol: 'NKE', name: 'Nike Inc.' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'TJX', name: 'The TJX Companies Inc.' },
  { symbol: 'HD', name: 'The Home Depot Inc.' },
  { symbol: 'LOW', name: 'Lowe\'s Companies Inc.' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust Series 1' },
  { symbol: 'IVV', name: 'iShares Core S&P 500 ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market Index' },
];

/**
 * Search for tickers by symbol or name
 */
export function searchTickers(query: string, limit: number = 10): TickerOption[] {
  if (!query.trim()) {
    return POPULAR_TICKERS.slice(0, 5);
  }

  const q = query.toUpperCase().trim();

  // Score matches by relevance
  const scored = POPULAR_TICKERS.map((ticker) => {
    let score = 0;

    // Exact symbol match - highest priority
    if (ticker.symbol === q) score = 1000;
    // Symbol starts with query
    else if (ticker.symbol.startsWith(q)) score = 100 + (q.length / ticker.symbol.length) * 50;
    // Symbol contains query
    else if (ticker.symbol.includes(q)) score = 50;
    // Name starts with query
    else if (ticker.name.toUpperCase().startsWith(q)) score = 50 + (q.length / ticker.name.length) * 30;
    // Name contains query
    else if (ticker.name.toUpperCase().includes(q)) score = 20;

    return { ticker, score };
  });

  // Filter and sort by score
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.ticker);
}

/**
 * Get display text for a ticker option
 */
export function formatTickerOption(option: TickerOption): string {
  return `${option.symbol} - ${option.name}`;
}

/**
 * Check if a ticker is valid (basic validation)
 */
export function isValidTicker(symbol: string): boolean {
  const s = symbol.trim().toUpperCase();
  // Ticker should be 1-5 characters, alphanumeric + dot
  return /^[A-Z0-9.]{1,5}$/.test(s);
}

/**
 * Format ticker for API requests
 */
export function formatTickerForApi(ticker: string): string {
  return ticker.trim().toUpperCase();
}
