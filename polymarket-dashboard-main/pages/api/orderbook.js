// Use Polymarket CLOB API for real-time orderbook (no auth required)
export default async function handler(req, res) {
  const { token_id } = req.query;
  if (!token_id) return res.status(400).json({ error: 'Missing token_id' });

  try {
    const clobRes = await fetch(
      `https://clob.polymarket.com/book?token_id=${token_id}`
    );
    const data = await clobRes.json();
    
    if (!clobRes.ok) {
      return res.status(200).json({ asks: [], bids: [], timestamp: null });
    }

    // CLOB API returns { market, asset_id, timestamp, hash, bids: [{price, size}], asks: [{price, size}], ...}
    return res.status(200).json({
      asks: data.asks || [],
      bids: data.bids || [],
      timestamp: data.timestamp || null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
