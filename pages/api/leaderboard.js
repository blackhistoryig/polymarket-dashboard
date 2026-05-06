export default async function handler(req, res) {
  const { timeframe = 'All' } = req.query;
  const DUNE_API_KEY = process.env.DUNE_API_KEY;
  const DUNE_QUERY_ID = process.env.DUNE_QUERY_ID; // The ID of your Dune query

  // MOCK DATA FALLBACK (if Dune is not configured yet)
  const BASE_LEADERBOARD = [
    { rank:1, address:'0x91eee6b7cea1916214daebec3b92b7513079c5b8', label:'everydaymortgage', score:94, verdict:'elite',    pnl:'+$472,838', winrate:'78%', trades:312 },
    { rank:2, address:'0xc2e7800b5af46e6093872b177b7a5e7f0563be51', label:'beachboy4',        score:88, verdict:'strong',   pnl:'+$446,056', winrate:'71%', trades:194 },
    { rank:3, address:'0xe48109602719f95c247fec255ffb71bab3f985a3', label:'trade-via-Gravia', score:81, verdict:'strong',   pnl:'+$394,019', winrate:'67%', trades:258 },
    { rank:4, address:'0x6ac5bb06a9eb05641fd5e82640268b92f3ab4b6e', label:'Lakersfan111',     score:74, verdict:'moderate', pnl:'+$338,714', winrate:'61%', trades:87  },
    { rank:5, address:'0x9f2fe025f84839ca81dd8e0338892605702d2ca8', label:'surfandturf',      score:67, verdict:'moderate', pnl:'+$304,135', winrate:'58%', trades:143 },
    { rank:6, address:'0xce5bec63b40392845a9a504915f607c8e03a047a', label:'Nexuus',           score:48, verdict:'risky',    pnl:'+$279,999', winrate:'44%', trades:201 },
    { rank:7, address:'0x84cfffc3f16dcc353094de30d4a45226eccd2f63', label:'mooseborzoi',      score:38, verdict:'poor',     pnl:'+$279,227', winrate:'36%', trades:388 },
  ];

  if (!DUNE_API_KEY || !DUNE_QUERY_ID) {
    console.log("No Dune API Key found, serving mock data for timeframe:", timeframe);
    let list = [...BASE_LEADERBOARD];
    if (timeframe === '1D') list = [list[3], list[0], list[1], list[6], list[2], list[4], list[5]];
    if (timeframe === '7D') list = [list[1], list[2], list[0], list[4], list[3], list[5], list[6]];
    if (timeframe === '1M') list = [list[2], list[0], list[4], list[1], list[3], list[6], list[5]];
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 400));
    return res.status(200).json(list.map((item, index) => ({ ...item, rank: index + 1 })));
  }

  try {
    // If DUNE_API_KEY is configured, fetch the real data from Dune Analytics!
    // We fetch the latest execution results of your specific query
    const response = await fetch(`https://api.dune.com/api/v1/query/${DUNE_QUERY_ID}/results`, {
      headers: { "x-dune-api-key": DUNE_API_KEY }
    });
    
    if (!response.ok) {
      throw new Error(`Dune API responded with status: ${response.status}`);
    }

    const data = await response.json();
    let rows = data.result?.rows || [];

    // Sort the Dune results dynamically based on the requested timeframe filter!
    if (timeframe === '1D') {
      rows.sort((a, b) => (b.pnl_1d || 0) - (a.pnl_1d || 0));
    } else if (timeframe === '7D') {
      rows.sort((a, b) => (b.pnl_7d || 0) - (a.pnl_7d || 0));
    } else if (timeframe === '1M') {
      rows.sort((a, b) => (b.pnl_1m || 0) - (a.pnl_1m || 0));
    } else {
      rows.sort((a, b) => (b.pnl_all || 0) - (a.pnl_all || 0));
    }
    
    // Map those columns to our Next.js frontend schema
    const formattedData = rows.map((row, index) => ({
      rank: index + 1,
      address: row.wallet_address,
      label: row.wallet_label || 'Unknown',
      score: row.score || 50,
      verdict: row.verdict || 'moderate',
      pnl: `+$${(row[`pnl_${timeframe.toLowerCase()}`] || row.pnl_all).toLocaleString()}`, 
      winrate: `${row.winrate || 0}%`,
      trades: row.total_trades || 0
    }));

    return res.status(200).json(formattedData);
  } catch (error) {
    console.error("Dune Fetch Error:", error);
    return res.status(500).json({ error: "Failed to fetch leaderboard from Dune" });
  }
}
