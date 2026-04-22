// Falcon API proxy - keeps API key secure server-side
export default async function handler(req, res) {
  const apiKey = process.env.FALCON_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'FALCON_API_KEY not set' });
  }

  try {
    const response = await fetch(
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
            min_volume: '1000',
          },
          pagination: { limit: 50, offset: 0 },
          formatter_config: { format_type: 'raw' },
        }),
      }
    );

    const text = await response.text();
    let json;
    try { json = JSON.parse(text); }
    catch (e) {
      return res.status(500).json({ error: 'Non-JSON from Falcon', raw: text.slice(0, 1000) });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Falcon API error', details: json });
    }

    // Falcon returns: { data: { results: [...markets...] } }
    const markets =
      (json.data && Array.isArray(json.data.results) ? json.data.results : null) ||
      (json.data && Array.isArray(json.data) ? json.data : null) ||
      (Array.isArray(json.results) ? json.results : null) ||
      (Array.isArray(json) ? json : null) ||
      [];

    return res.status(200).json({ results: markets, total: markets.length });
  } catch (err) {
    return res.status(500).json({ error: 'Fetch failed', details: err.message });
  }
}
