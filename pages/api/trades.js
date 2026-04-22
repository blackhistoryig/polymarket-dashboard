export default async function handler(req, res) {
  const apiKey = process.env.FALCON_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing Falcon API Key' });

  const { slug, condition_id } = req.query;
  if (!slug && !condition_id) return res.status(400).json({ error: 'Missing slug or condition_id' });

  try {
    const fRes = await fetch(
      'https://narrative.agent.heisenberg.so/api/v2/semantic/retrieve/parameterized',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer \${apiKey}` },
        body: JSON.stringify({
          agent_id: 556,
          params: {
            market_slug: slug || 'ALL',
            condition_id: condition_id || 'ALL'
          },
          pagination: { limit: 20 },
          formatter_config: { format_type: 'raw' },
        }),
      }
    );
    const data = await fRes.json();
    const trades = data.data?.results || data.results || [];
    return res.status(200).json({ results: trades });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
