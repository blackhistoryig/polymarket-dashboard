// Proxy to Polymarket public CLOB API for current YES/NO prices (no auth needed)
export default async function handler(req, res) {
  const { tokens } = req.body || {};
  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    return res.status(400).json({ error: 'tokens array required' });
  }

  // Build request: fetch BUY price for each YES token (side_a)
  const payload = tokens.map((t) => ({ token_id: t, side: 'BUY' }));

  try {
    const response = await fetch('https://clob.polymarket.com/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const txt = await response.text();
      return res.status(response.status).json({ error: 'CLOB API error', raw: txt.slice(0, 500) });
    }

    const data = await response.json();
    // data shape: { "TOKEN_ID": { "BUY": 0.72 }, ... }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Fetch failed', details: err.message });
  }
}
