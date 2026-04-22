// Falcon API proxy + Gamma price enrichment
export default async function handler(req, res) {
  const apiKey = process.env.FALCON_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'FALCON_API_KEY not set' });
  }

  try {
    // Use current time as end_date_min to get only active/future markets
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
          params: {
            closed: 'False',
            end_date_min: nowSec,
          },
          pagination: { limit: 50, offset: 0 },
          formatter_config: { format_type: 'raw' },
        }),
      }
    );

    const text = await falconRes.text();
    let json;
    try { json = JSON.parse(text); }
    catch (e) {
      return res.status(500).json({ error: 'Non-JSON from Falcon', raw: text.slice(0, 500) });
    }

    if (!falconRes.ok) {
      return res.status(falconRes.status).json({ error: 'Falcon error', details: json });
    }

    let markets =
      (json.data && Array.isArray(json.data.results) ? json.data.results : null) ||
      (json.data && Array.isArray(json.data) ? json.data : null) ||
      (Array.isArray(json.results) ? json.results : null) ||
      (Array.isArray(json) ? json : null) ||
      [];

    if (markets.length === 0) {
      return res.status(200).json({ results: [], total: 0, debug: 'falcon_empty', raw: json });
    }

    // Enrich with outcomePrices from Polymarket Gamma API (free, no auth)
    const conditionIds = markets.map((m) => m.condition_id).filter(Boolean);
    if (conditionIds.length > 0) {
      try {
        const gammaRes = await fetch(
          `https://gamma-api.polymarket.com/markets?condition_ids=${conditionIds.join(',')}&limit=50`
        );
        if (gammaRes.ok) {
          const gammaMarkets = await gammaRes.json();
          const priceMap = {};
          for (const gm of gammaMarkets) {
            if (gm.conditionId && gm.outcomePrices) {
              try {
                const prices = typeof gm.outcomePrices === 'string'
                  ? JSON.parse(gm.outcomePrices)
                  : gm.outcomePrices;
                priceMap[gm.conditionId] = prices;
              } catch (_) {}
            }
          }
          // Merge prices into markets
          markets = markets.map((m) => ({
            ...m,
            outcomePrices: priceMap[m.condition_id] || null,
          }));
        }
      } catch (_) {
        // Price enrichment failed - return markets without prices
      }
    }

    return res.status(200).json({ results: markets, total: markets.length });
  } catch (err) {
    return res.status(500).json({ error: 'Fetch failed', details: err.message });
  }
}
