// Falcon API proxy - backend keeps API key secure
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.FALCON_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'FALCON_API_KEY environment variable not set' });
  }

  try {
    // Correct Heisenberg endpoint (parameterized semantic retrieval)
    const response = await fetch('https://narrative.agent.heisenberg.so/api/v2/semantic/retrieve/parameterized', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        agent_id: 574,
        query: '',
        params: {},
        pagination: {
          page: 1,
          limit: 50
        },
        formatter_config: {}
      })
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      return res.status(500).json({
        error: 'Invalid JSON from Falcon API',
        status: response.status,
        raw: rawText.slice(0, 1000)
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Falcon API returned error',
        status: response.status,
        details: data
      });
    }

    // Normalize response - handle all possible Falcon response shapes
    const markets =
      data.results ||
      data.data ||
      data.markets ||
      (Array.isArray(data) ? data : []);

    return res.status(200).json({
      results: markets,
      total: markets.length,
      raw: data
    });

  } catch (error) {
    console.error('Falcon API error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch data from Falcon API',
      details: error.message
    });
  }
}
