const CLOB = 'https://clob.polymarket.com';

export default async function handler(req, res) {
  try {
    // Fetch more than we need so we have enough after filtering
    const response = await fetch(`${CLOB}/markets?limit=500&active=true`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch from Polymarket' });
    }

    const payload = await response.json();
    // API wraps results in either payload.data or returns an array directly
    const raw = Array.isArray(payload) ? payload : (payload.data || []);

    // Filter: must be active AND not closed AND accepting orders
    const active = raw
      .filter(m => m.active === true && m.closed === false && m.accepting_orders === true)
      .sort((a, b) => (parseFloat(b.volume) || 0) - (parseFloat(a.volume) || 0))
      .slice(0, 24)
      .map(m => ({
        condition_id: m.condition_id,
        question: m.question,
        category: m.tags?.[0] || m.category || 'Market',
        volume: m.volume,
        liquidity: m.liquidity,
        end_date_iso: m.end_date_iso,
        tokens: (m.tokens || []).map(t => ({
          token_id: t.token_id,
          outcome: t.outcome,
          price: t.price,
        })),
      }));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(active);
  } catch (err) {
    console.error('markets API error:', err);
    return res.status(500).json({ error: 'Internal error fetching markets' });
  }
}
