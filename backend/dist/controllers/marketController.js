"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarketOverview = void 0;
const yahoo_finance2_1 = __importDefault(require("yahoo-finance2"));
const yahooFinance = new yahoo_finance2_1.default();
const getMarketOverview = async (req, res) => {
    try {
        const symbols = [
            { name: 'NIFTY 50', symbol: '^NSEI' },
            { name: 'BANKNIFTY', symbol: '^NSEBANK' },
            { name: 'SENSEX', symbol: '^BSESN' },
            { name: 'GOLD', symbol: 'GC=F' },
            { name: 'USDINR', symbol: 'INR=X' },
        ];
        const results = await Promise.all(symbols.map(async (item) => {
            try {
                const quote = await yahooFinance.quote(item.symbol);
                const price = quote.regularMarketPrice || 0;
                const change = quote.regularMarketChange || 0;
                let formattedValue = price.toFixed(2);
                if (item.name === 'NIFTY 50' || item.name === 'BANKNIFTY' || item.name === 'SENSEX') {
                    formattedValue = price.toLocaleString('en-IN', { maximumFractionDigits: 2 });
                }
                else if (item.name === 'GOLD') {
                    formattedValue = price.toLocaleString('en-IN');
                }
                const sign = change >= 0 ? '+' : '';
                return {
                    name: item.name,
                    value: formattedValue,
                    change: `${sign}${change.toFixed(2)}`,
                    isUp: change >= 0,
                };
            }
            catch (error) {
                console.error(`Failed to fetch quote for ${item.symbol}:`, error);
                return null;
            }
        }));
        const validResults = results.filter(r => r !== null);
        res.json({ success: true, data: validResults });
    }
    catch (error) {
        console.error('Error fetching market overview:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch market data' });
    }
};
exports.getMarketOverview = getMarketOverview;
