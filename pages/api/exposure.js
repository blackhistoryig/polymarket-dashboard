// /api/exposure — Aggregates data from multiple wallets to calculate portfolio-wide exposure.
// Input: ?wallets=addr1,addr2,...
const DATA_API = 'https://data-api.polymarket.com/v1';

const CATEGORY_KEYWORDS = {
  politics: ['election','president','congress','senate','democrat','republican','vote','political','biden','trump','harris','governor','ballot'],
  sports: ['nba','nfl','mlb','nhl','fifa','world-cup','championship','playoffs','super-bowl','tennis','golf','ufc','boxing','soccer','football','baseball','basketball','hockey'],
  crypto: ['bitcoin','ethereum','btc','eth','crypto','defi','nft','token','blockchain','solana','coinbase','binance'],
  culture: ['oscar','grammy','emmy','celebrity','movie','film','music','award','netflix','youtube','tiktok','viral'],
  weather: ['hurricane','earthquake','tornado','flood','storm','climate','temperature','snowfall'],
  economics: ['gdp','inflation','fed','interest-rate','unemployment','recession','market','s&p','nasdaq','dow'],
};

function inferCategory(slug) {
  const s = (slug || '').toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(k => s.includes(k))) return cat;
  }
  return 'other';
}

export default async function handler(req, res) {
  const { wallets } = req.query;
  if (!wallets) return res.status(200).json({ empty: true });

  const addresses = wallets.split(',').filter(a => /^0x[0-9a-fA-F]{40}$/.test(a));
  if (addresses.length === 0) return res.status(200).json({ empty: true });

  try {
    // Fetch positions for all wallets in parallel
    const allResponses = await Promise.all(
      addresses.map(addr => fetch(`${DATA_API}/positions?user=${addr}&limit=100`).then(r => r.json()))
    );

    const portfolioPositions = [];
    const walletStats = addresses.map((addr, i) => {
      const positions = Array.isArray(allResponses[i]) ? allResponses[i] : [];
      // Only keep open positions
      const open = positions.filter(p => parseFloat(p.size) > 0);
      open.forEach(p => portfolioPositions.push({ ...p, owner: addr }));
      return { address: addr, openCount: open.length };
    });

    // 1. Category Concentration
    const catCounts = {};
    portfolioPositions.forEach(p => {
      const cat = inferCategory(p.slug);
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    const totalPositions = portfolioPositions.length;
    const categories = Object.entries(catCounts).map(([cat, count]) => ({
      cat, count, pct: totalPositions > 0 ? Math.round((count / totalPositions) * 100) : 0
    })).sort((a,b) => b.count - a.count);

    // 2. YES vs NO Exposure
    const yesCount = portfolioPositions.filter(p => p.outcome?.toLowerCase() === 'yes').length;
    const noCount = portfolioPositions.filter(p => p.outcome?.toLowerCase() === 'no').length;
    const totalSentiment = yesCount + noCount;
    const yesPct = totalSentiment > 0 ? Math.round((yesCount / totalSentiment) * 100) : 50;

    // 3. Duplicate Bet Detector
    const marketMap = {}; // { slug: { side: { owners: [] } } }
    portfolioPositions.forEach(p => {
      const slug = p.slug;
      const side = p.outcome?.toLowerCase();
      if (!marketMap[slug]) marketMap[slug] = {};
      if (!marketMap[slug][side]) marketMap[slug][side] = { title: p.title, owners: [] };
      marketMap[slug][side].owners.push(p.owner);
    });
    const duplicates = Object.entries(marketMap).flatMap(([slug, sides]) => {
      return Object.entries(sides)
        .filter(([side, data]) => data.owners.length > 1)
        .map(([side, data]) => ({ slug, side, title: data.title, count: data.owners.length, owners: data.owners }));
    });

    // 4. Exposure Health Score & Warnings
    const warnings = [];
    let healthScore = 100;

    const topCat = categories[0];
    if (topCat && topCat.pct > 60) {
      warnings.push(`Extreme ${topCat.cat} concentration (${topCat.pct}%)`);
      healthScore -= 30;
    } else if (topCat && topCat.pct > 40) {
      warnings.push(`High ${topCat.cat} concentration (${topCat.pct}%)`);
      healthScore -= 15;
    }

    if (yesPct > 70 || yesPct < 30) {
      warnings.push(`Skewed sentiment bias (${yesPct}% YES)`);
      healthScore -= 20;
    }

    if (duplicates.length > 0) {
      warnings.push(`${duplicates.length} duplicate positions detected across wallets`);
      healthScore -= (duplicates.length * 5);
    }

    // 5. Crowding Warning
    // Fetch top leaderboard to see if these wallets are highly visible (and thus likely crowded)
    const lbRes = await fetch(`${DATA_API}/leaderboard?limit=100`);
    const lbData = await lbRes.json();
    const topAddresses = Array.isArray(lbData) ? lbData.map(e => e.proxyWallet?.toLowerCase()) : [];

    const crowding = addresses.filter(addr => {
        return topAddresses.includes(addr.toLowerCase());
    }).map(addr => ({ address: addr, label: 'High Copy Crowding' }));

    if (crowding.length > 0) {
        warnings.push(`${crowding.length} wallets are in the global top 100 (High Crowding)`);
        healthScore -= 10;
    }

    healthScore = Math.max(0, healthScore);
    const healthStatus = healthScore > 80 ? 'green' : healthScore > 50 ? 'yellow' : 'red';

    return res.status(200).json({
      healthScore,
      healthStatus,
      warnings,
      categories,
      sentiment: { yesPct, noPct: 100 - yesPct },
      duplicates,
      crowding,
      totalPositions,
      walletStats
    });

  } catch (err) {
    console.error('Exposure API Error:', err);
    return res.status(500).json({ error: 'Failed to analyze portfolio exposure' });
  }
}
