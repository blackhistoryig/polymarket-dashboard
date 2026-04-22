// Markets endpoint: Gamma API for live markets with prices + Falcon for volume data
export default async function handler(req, res) {
  const apiKey = process.env.FALCON_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'FALCON_API_KEY not set' });
  }

  try {
    // Fetch from Gamma API (free, public) - returns markets with outcomePrices already included
    // Sorted by volume, active only, minimum volume filter
    const gammaRes = await fetch(
      'https://gamma-api.polymarket.com/markets?active=true&closed=false&order=volume&ascending=false&limit=50',
      { headers: { 'Accept': 'application/json' } }
    );

    if (!gammaRes.ok) {
      throw new Error(`Gamma API error: ${gammaRes.status}`);
    }

    const gammaMarkets = await gammaRes.json();

    // Normalize Gamma fields to our dashboard format
    const markets = gammaMarkets.map((m) => {
      let outcomePrices = null;
      if (m.outcomePrices) {
        try {
          outcomePrices = typeof m.outcomePrices === 'string'
            ? JSON.parse(m.outcomePrices)
            : m.outcomePrices;
        } catch (_) {}
      }
      return {
        condition_id: m.conditionId,
        question: m.question,
        slug: m.slug,
        closed: m.closed,
        volume_total: m.volume,
        start_date: m.startDate || m.startDateIso,
        end_date: m.endDate || m.endDateIso,
        side_a_outcome: m.outcomes ? (Array.isArray(m.outcomes) ? m.outcomes[0] : JSON.parse(m.outcomes)[0]) : 'Yes',
        side_b_outcome: m.outcomes ? (Array.isArray(m.outcomes) ? m.outcomes[1] : JSON.parse(m.outcomes)[1]) : 'No',
        outcomePrices,
        // Also pass through useful Gamma fields
        liquidity: m.liquidity,
        lastTradePrice: m.lastTradePrice,
        bestBid: m.bestBid,
        bestAsk: m.bestAsk,
      };
    });

    return res.status(200).json({ results: markets, total: markets.length, source: 'gamma' });
  } catch (err) {
    // Fallback to Falcon if Gamma fails
    try {
      const nowSec = String(Math.floor(Date.now() / 1000));
      const falconRes = await fetch(
        'https://narrative.agent.heisenberg.so/api/v2/semantic/retrieve/parameterized',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            agent_id: 574,
            params: { closed: 'False', end_date_min: nowSec },
            pagination: { limit: 50, offset: 0 },
            formatter_config: { format_type: 'raw' },
          }),
        }
      );
      const text = await falconRes.text();
      const json = JSON.parse(text);
      const markets =
        (json.data && Array.isArray(json.data.results) ? json.data.results : null) ||
        (Array.isArray(json.results) ? json.results : null) ||
        [];
      return res.status(200).json({ results: markets, total: markets.length, source: 'falcon_fallback' });
    } catch (fallbackErr) {
      return res.status(500).json({ error: 'Both APIs failed', details: err.message });
    }
  }
}
