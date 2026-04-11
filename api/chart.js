// Vercel Serverless Function — proxies Yahoo Finance chart API
// Deployed at: /api/chart?symbol=TCS.NS&range=1y&interval=1d
// This runs server-side so no CORS issues

export default async function handler(req, res) {
  const { symbol, range = '1d', interval = '1m' } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'symbol is required' });
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Yahoo Finance error', status: response.status });
    }

    const data = await response.json();

    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60'); // cache 60s on Vercel edge

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
