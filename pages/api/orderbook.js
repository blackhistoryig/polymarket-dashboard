export default async function handler(req, res) {
  const apiKey = process.env.FALCON_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing Falcon API Key' });

  const { token_id } = req.query;
  if (!token_id) return res.status(400).json({ error: 'Missing token_id' });

  try {
    const now = Date.now();
    const tenMinsAgo = now - (10 * 60 * 1000);

    const fRes = await fetch(
      'https://narrative.agent.heisenberg.so/api/v2/semantic/retrieve/parameterized',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          agent_id: 572,
          params: { 
            token_id,
            start_time: String(tenMinsAgo),
            end_time: String(now)
          },
          pagination: { limit: 1 },
          formatter_config: { format_type: 'raw' },
        }),
      }
    );
    const data = await fRes.json();
    const snapshots = data.data?.results || data.results || [];
    return res.status(200).json({ snapshot: snapshots[0] || null });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
