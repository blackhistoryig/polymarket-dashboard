// Falcon API proxy - backend keeps API key secure
export default async function handler(req, res) {
  const apiKey = process.env.FALCON_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'FALCON_API_KEY environment variable not set' });
  }

  try {
    const response = await fetch('https://narrative.agent.heisenberg.so/api/v2/semantic/retrieve/parameterized', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        agent_id: 574,
        params: {
          closed: "False",
          min_volume: "1000"
        },
        pagination: {
          limit: 50,
          offset: 0
        },
        formatter_config: {
          format_type: "raw"
        }
      })
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      return res.status(500).json({
        error: 'Invalid JSON from Falcon API',
        httpStatus: response.status,
        raw: rawText.slice(0, 2000)
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Falcon API returned error',
        httpStatus: response.status,
        details: data
      });
    }

    // Handle all possible response shapes
    let markets = [];
    if (Array.isArray(data)) {
      markets = data;
    } else if (data.results && Array.isArray(data.results)) {
      markets = data.results;
    } else if (data.data && Array.isArray(data.data)) {
      markets = data.data;
    } else if (data.markets && Array.isArray(data.markets)) {
      markets = data.markets;
    } else {
      // Return raw so we can debug
      return res.status(200).json({ results: [], raw: data, debug: 'unexpected shape' });
    }

    return res.status(200).json({
      results: markets,
      total: markets.length
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch from Falcon API',
      details: error.message
    });
  }
}
