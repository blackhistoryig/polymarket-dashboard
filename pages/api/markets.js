export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://gamma-api.polymarket.com/markets?limit=100&active=true&closed=false&order=volume24hr&ascending=false',
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch from Polymarket' });
    }

    const raw = await response.json();
    const arr = Array.isArray(raw) ? raw : [];

    // "Hot" = active, open, at least $1k in 24hr volume
    const MIN_VOLUME_24H = 1000;

    const markets = arr
      .filter(m => m.active && !m.closed && !m.archived && (m.volume24hr || 0) >= MIN_VOLUME_24H)
      .slice(0, 24)
      .map(m => {
        // outcomePrices is a JSON string like '["0.46","0.54"]'
        let prices = [];
        try { prices = JSON.parse(m.outcomePrices || '[]'); } catch (e) {}
        let outcomes = [];
        try { outcomes = JSON.parse(m.outcomes || '[]'); } catch (e) {}
        let tokenIds = [];
        try { tokenIds = JSON.parse(m.clobTokenIds || '[]'); } catch (e) {}

        return {
          condition_id: m.id || m.conditionId || m.questionID,
          question: m.question,
          category: m.events?.[0]?.title || 'Market',
          volume: m.volume24hr || 0,
          liquidity: m.liquidityNum || 0,
          end_date_iso: m.endDateIso,
          tokens: outcomes.map((outcome, i) => ({
            token_id: tokenIds[i] || '',
            outcome,
            price: parseFloat(prices[i] || 0),
          })),
        };
      });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(markets);
  } catch (err) {
    console.error('markets API error:', err);
    return res.status(500).json({ error: 'Internal error fetching markets' });
  }
}

