"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNewsFeed = exports.getMarketOverview = void 0;
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
let newsCache = null;
const NEWS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
/**
 * GET /api/v1/client/news-feed
 * Open API RSS news feeds for Indian stock market and financial updates
 */
const getNewsFeed = async (req, res) => {
    try {
        const now = Date.now();
        if (newsCache && (now - newsCache.timestamp < NEWS_CACHE_TTL_MS)) {
            return res.json({
                success: true,
                data: newsCache.data,
                cached: true,
                lastUpdated: new Date(newsCache.timestamp).toISOString()
            });
        }
        const rssFeeds = [
            { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms' },
            { name: 'LiveMint', url: 'https://www.livemint.com/rss/markets' },
            { name: 'Google News', url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en' }
        ];
        let items = [];
        for (const feed of rssFeeds) {
            try {
                const response = await fetch(feed.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    signal: AbortSignal.timeout(5000)
                });
                if (!response.ok)
                    continue;
                const xmlText = await response.text();
                const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
                let match;
                const feedItems = [];
                while ((match = itemRegex.exec(xmlText)) !== null && feedItems.length < 8) {
                    const itemContent = match[1];
                    const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
                    const linkMatch = itemContent.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
                    const pubDateMatch = itemContent.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);
                    const sourceMatch = itemContent.match(/<source[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/source>/i);
                    const rawTitle = titleMatch ? titleMatch[1] : '';
                    const cleanTitle = rawTitle
                        .replace(/<!\[CDATA\[/g, '')
                        .replace(/\]\]>/g, '')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .trim();
                    const rawLink = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim() : '';
                    const rawPubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
                    const sourceName = sourceMatch ? sourceMatch[1].trim() : feed.name;
                    let timeAgo = '';
                    if (rawPubDate) {
                        const pubTime = new Date(rawPubDate).getTime();
                        if (!isNaN(pubTime)) {
                            const diffMin = Math.max(1, Math.floor((now - pubTime) / (1000 * 60)));
                            if (diffMin < 60) {
                                timeAgo = `${diffMin}m ago`;
                            }
                            else if (diffMin < 1440) {
                                timeAgo = `${Math.floor(diffMin / 60)}h ago`;
                            }
                            else {
                                timeAgo = `${Math.floor(diffMin / 1440)}d ago`;
                            }
                        }
                    }
                    if (cleanTitle && rawLink) {
                        feedItems.push({
                            title: cleanTitle,
                            link: rawLink,
                            pubDate: rawPubDate,
                            timeAgo: timeAgo || 'Recent',
                            source: sourceName
                        });
                    }
                }
                if (feedItems.length > 0) {
                    items = feedItems;
                    break; // Stop at first successful feed
                }
            }
            catch (feedErr) {
                console.warn(`[RSS] Failed to fetch ${feed.name}:`, feedErr.message);
            }
        }
        if (items.length > 0) {
            newsCache = {
                timestamp: now,
                data: items
            };
            return res.json({
                success: true,
                data: items,
                cached: false,
                lastUpdated: new Date().toISOString()
            });
        }
        // If fetch failed but previous cache exists, return stale cache
        if (newsCache) {
            return res.json({
                success: true,
                data: newsCache.data,
                cached: true,
                lastUpdated: new Date(newsCache.timestamp).toISOString()
            });
        }
        return res.json({
            success: true,
            data: [],
            message: 'No news feeds available'
        });
    }
    catch (error) {
        console.error('Error fetching news feed:', error);
        if (newsCache) {
            return res.json({
                success: true,
                data: newsCache.data,
                cached: true,
                lastUpdated: new Date(newsCache.timestamp).toISOString()
            });
        }
        return res.status(500).json({ success: false, message: 'Failed to fetch news feed' });
    }
};
exports.getNewsFeed = getNewsFeed;
