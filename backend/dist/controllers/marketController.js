"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarketOverview = void 0;
const yahoo_finance2_1 = __importDefault(require("yahoo-finance2"));
// Instantiate YahooFinance instance with notice suppression
const yf = new yahoo_finance2_1.default({ suppressNotices: ['yahooSurvey'] });
let marketCache = null;
const CACHE_TTL_MS = 10 * 1000; // 10 seconds cache
const getMarketOverview = async (req, res) => {
    try {
        const now = Date.now();
        if (marketCache && (now - marketCache.timestamp < CACHE_TTL_MS)) {
            return res.json({
                success: true,
                data: marketCache.data,
                cached: true,
                lastUpdated: new Date(marketCache.timestamp).toISOString()
            });
        }
        const symbols = [
            { name: 'NIFTY 50', symbol: '^NSEI', category: 'Index' },
            { name: 'SENSEX', symbol: '^BSESN', category: 'Index' },
            { name: 'BANK NIFTY', symbol: '^NSEBANK', category: 'Index' },
            { name: 'NIFTY IT', symbol: '^CNXIT', category: 'Index' },
            { name: 'USD / INR', symbol: 'INR=X', category: 'Currency' },
            { name: 'GOLD (USD)', symbol: 'GC=F', category: 'Commodity' },
        ];
        const results = await Promise.all(symbols.map(async (item) => {
            try {
                const quote = await yf.quote(item.symbol);
                const price = quote?.regularMarketPrice || 0;
                const change = quote?.regularMarketChange || 0;
                const percentChange = quote?.regularMarketChangePercent || 0;
                const dayHigh = quote?.regularMarketDayHigh || price;
                const dayLow = quote?.regularMarketDayLow || price;
                const previousClose = quote?.regularMarketPreviousClose || price;
                let formattedValue = price.toFixed(2);
                if (item.category === 'Index' || item.category === 'Commodity') {
                    formattedValue = price.toLocaleString('en-IN', { maximumFractionDigits: 2 });
                }
                else if (item.name === 'USD / INR') {
                    formattedValue = price.toFixed(2);
                }
                const sign = change >= 0 ? '+' : '';
                const pctSign = percentChange >= 0 ? '+' : '';
                return {
                    name: item.name,
                    symbol: item.symbol,
                    category: item.category,
                    value: formattedValue,
                    rawPrice: price,
                    change: `${sign}${change.toFixed(2)}`,
                    rawChange: change,
                    percentChange: `${pctSign}${percentChange.toFixed(2)}%`,
                    rawPercentChange: percentChange,
                    isUp: change >= 0,
                    dayHigh: dayHigh.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
                    dayLow: dayLow.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
                    previousClose: previousClose.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
                    marketState: quote?.marketState || 'REGULAR',
                    lastUpdated: new Date().toISOString()
                };
            }
            catch (error) {
                // If we have previous cache data for this item, keep it
                if (marketCache) {
                    const cachedItem = marketCache.data.find(d => d.symbol === item.symbol);
                    if (cachedItem)
                        return cachedItem;
                }
                return {
                    name: item.name,
                    symbol: item.symbol,
                    category: item.category,
                    value: '---',
                    rawPrice: 0,
                    change: '+0.00',
                    rawChange: 0,
                    percentChange: '+0.00%',
                    rawPercentChange: 0,
                    isUp: true,
                    dayHigh: '---',
                    dayLow: '---',
                    previousClose: '---',
                    marketState: 'CLOSED',
                    lastUpdated: new Date().toISOString()
                };
            }
        }));
        const validResults = results.filter(r => r !== null);
        marketCache = {
            timestamp: now,
            data: validResults
        };
        return res.json({
            success: true,
            data: validResults,
            cached: false,
            lastUpdated: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching market overview:', error);
        if (marketCache) {
            return res.json({
                success: true,
                data: marketCache.data,
                cached: true,
                lastUpdated: new Date(marketCache.timestamp).toISOString()
            });
        }
        return res.status(500).json({ success: false, message: 'Failed to fetch market data' });
    }
};
exports.getMarketOverview = getMarketOverview;
