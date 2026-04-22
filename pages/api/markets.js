// Markets endpoint: Gamma API (primary) with full field mapping
export default async function handler(req, res) {
  const apiKey = process.env.FALCON_API_KEY;

  // Support pagination via query params
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;

  try {
    const gammaRes = await fetch(
      `https://gamma-api.polymarket.com/markets?active=true&closed=false&order=volume&ascending=false&limit=${limit}&offset=${offset}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!gammaRes.ok) throw new Error(`Gamma ${gammaRes.status}`);

    const raw = await gammaRes.json();

    const markets = raw.map((m) => {
      let outcomePrices = null;
      let outcomes = null;
      try {
        outcomePrices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
        outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes;
      } catch (_) {}

      // Build Polymarket URL from event slug or market slug
      const eventSlug = m.events?.[0]?.slug || m.events?.[0]?.series?.[0]?.slug;
      const polyUrl = eventSlug
        ? `https://polymarket.com/event/${eventSlug}`
        : `https://polymarket.com/market/${m.slug}`;

      return {
        condition_id: m.conditionId,
        question: m.question,
        slug: m.slug,
        poly_url: polyUrl,
        image: m.image || null,
        closed: m.closed,
        volume_total: m.volume,
        volume_24h: m.volume24hr,
        volume_1w: m.volume1wk,
        liquidity: m.liquidity,
        spread: m.spread,
        best_bid: m.bestBid,
        best_ask: m.bestAsk,
        last_trade_price: m.lastTradePrice,
        start_date: m.startDateIso || m.startDate,
        end_date: m.endDateIso || m.endDate,
        side_a_outcome: outcomes?.[0] || 'Yes',
        side_b_outcome: outcomes?.[1] || 'No',
        outcomePrices,
        neg_risk: m.negRisk || false,
        competitive: m.competitive,
      };
    });

    return res.status(200).json({ results: markets, total: markets.length, source: 'gamma' });
  } catch (err) {
    // Falcon fallback
    if (!apiKey) return res.status(500).json({ error: err.message });
    try {
      const nowSec = String(Math.floor(Date.now() / 1000));
      const fRes = await fetch(
        'https://narrative.agent.heisenberg.so/api/v2/semantic/retrieve/parameterized',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            agent_id: 574,
            params: { closed: 'False', end_date_min: nowSec },
            pagination: { limit, offset },
            formatter_config: { format_type: 'raw' },
          }),
        }
      );
      const j = await fRes.json();
      const markets = (j.data?.results) || j.results || [];
      return res.status(200).json({ results: markets, total: markets.length, source: 'falcon' });
    } catch (e2) {
      return res.status(500).json({ error: 'Both APIs failed', details: e2.message });
    }
  }
}
