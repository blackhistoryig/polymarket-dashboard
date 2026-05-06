// Server-side proxy for market detail: orderbook + price history
// Called when a market card is flipped: /api/market-detail?tokenId=xxx
export default async function handler(req, res) {
  const { tokenId } = req.query;
  if (!tokenId) return res.status(400).json({ error: 'Missing tokenId' });

  try {
    // Fetch orderbook and price history in parallel
    const [bookRes, priceRes] = await Promise.all([
      fetch(`https://clob.polymarket.com/book?token_id=${tokenId}`),
      fetch(`https://clob.polymarket.com/prices-history?market=${tokenId}&interval=1w&fidelity=60`),
    ]);

    const book = bookRes.ok ? await bookRes.json() : null;
    const prices = priceRes.ok ? await priceRes.json() : null;

    // Top 3 bids (highest price buyers) and top 3 asks (lowest price sellers)
    const bids = (book?.bids || [])
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      .slice(0, 5)
      .map(o => ({ price: parseFloat(o.price), size: parseFloat(o.size) }));

    const asks = (book?.asks || [])
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
      .slice(0, 5)
      .map(o => ({ price: parseFloat(o.price), size: parseFloat(o.size) }));

    // Derive "recent trades" from price history (last 10 data points as proxy)
    const history = prices?.history || [];
    const recentMoves = history.slice(-10).reverse().map((pt, i, arr) => {
      const prev = arr[i + 1];
      const delta = prev ? pt.p - prev.p : 0;
      return {
        time: new Date(pt.t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: pt.p,
        side: delta >= 0 ? 'BUY' : 'SELL',
      };
    });

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=10');
    return res.status(200).json({ bids, asks, recentMoves });
  } catch (err) {
    console.error('market-detail error:', err);
    return res.status(500).json({ error: 'Failed to fetch market detail' });
  }
}
