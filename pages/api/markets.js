// API route to proxy Falcon API requests
// Your API key will be stored as environment variable

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agent_id, query } = req.body;

  // Validate required fields
  if (!agent_id) {
    return res.status(400).json({ error: 'agent_id is required' });
  }

  try {
    // Make request to Falcon API
    const response = await fetch('https://narrative.agent.heisenberg.so/v2/markets/retrieve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FALCON_API_KEY}`
      },
      body: JSON.stringify({
        agent_id,
        query: query || '',
        params: {},
        pagination: {
          page: 1,
          limit: 20
        },
        formatter_config: {}
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Falcon API error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch data from Falcon API',
      details: error.message 
    });
  }
}
