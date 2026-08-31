import { Request, Response } from 'express';
import yahooFinance from 'yahoo-finance2';

export const getMarketOverview = async (req: Request, res: Response) => {
  try {
    const symbols = [
      { name: 'NIFTY 50', symbol: '^NSEI' },
      { name: 'BANKNIFTY', symbol: '^NSEBANK' },
      { name: 'SENSEX', symbol: '^BSESN' },
      { name: 'GOLD', symbol: 'GC=F' },
      { name: 'USDINR', symbol: 'INR=X' },
    ];

    const results = await Promise.all(
      symbols.map(async (item) => {
        try {
          const quote = await yahooFinance.quote(item.symbol) as any;
          const price = quote.regularMarketPrice || 0;
          const change = quote.regularMarketChange || 0;
          
          let formattedValue = price.toFixed(2);
          if (item.name === 'NIFTY 50' || item.name === 'BANKNIFTY' || item.name === 'SENSEX') {
            formattedValue = price.toLocaleString('en-IN', { maximumFractionDigits: 2 });
          } else if (item.name === 'GOLD') {
             formattedValue = price.toLocaleString('en-IN');
          }

          const sign = change >= 0 ? '+' : '';
          return {
            name: item.name,
            value: formattedValue,
            change: `${sign}${change.toFixed(2)}`,
            isUp: change >= 0,
          };
        } catch (error: any) {
          // Return fallback data instead of logging error to avoid spamming server logs
          return {
            name: item.name,
            value: 'N/A',
            change: '+0.00',
            isUp: true,
          };
        }
      })
    );

    const validResults = results.filter(r => r !== null);
    res.json({ success: true, data: validResults });
  } catch (error) {
    console.error('Error fetching market overview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch market data' });
  }
};
