/**
 * /api/wallet  — Wallet Vetting Engine
 * Resolves a Polymarket username or 0x address, fetches leaderboard stats,
 * positions, and activity, then computes a copy-worthiness score 1-10.
 *
 * Data layer is designed so on-chain history from Dune / Goldsky / Allium
 * can be plugged into the enrichActivity() stub without changing the UI.
 */

const DATA_API = 'https://data-api.polymarket.com/v1';

// Category inference from market slug keywords
const CATEGORY_KEYWORDS = {
  politics: ['election','president','congress','senate','democrat','republican','vote','political','biden','trump','harris','governor','ballot'],
  sports: ['nba','nfl','mlb','nhl','fifa','world-cup','championship','playoffs','super-bowl','tennis','golf','ufc','boxing','soccer','football','baseball','basketball','hockey'],
  crypto: ['bitcoin','ethereum','btc','eth','crypto','defi','nft','token','blockchain','solana','coinbase','binance'],
  culture: ['oscar','grammy','emmy','celebrity','movie','film','music','award','netflix','youtube','tiktok','viral'],
  weather: ['hurricane','earthquake','tornado','flood','storm','climate','temperature','snowfall'],
  economics: ['gdp','inflation','fed','interest-rate','unemployment','recession','market','s&p','nasdaq','dow'],
  tech: ['ai','openai','gpt','apple','google','meta','microsoft','tesla','spacex','startup','ipo'],
  finance: ['stock','merger','acquisition','earnings','revenue','ipo','sec','bankruptcy'],
};

function inferCategory(slug) {
  const s = (slug || '').toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(k => s.includes(k))) return cat;
  }
  return 'other';
}

// ── Scoring engine ───────────────────────────────────────────────────────────
function computeScore(leaderData, positions, activities) {
  // Strip characters from leaderboard strings (e.g. "$1,234.50" -> 1234.5)
  const cleanNum = (s) => typeof s === 'string' ? parseFloat(s.replace(/[$,]/g, '')) : (parseFloat(s) || 0);
  
  const pnl = cleanNum(leaderData.pnl);
  const vol = cleanNum(leaderData.vol);

  // Derive stats from positions
  const totalPositions = positions.length;

  // Win rate: positions with positive realizedPnl
  const winners = positions.filter(p => (parseFloat(p.realizedPnl) || 0) > 0).length;
  const winRate = totalPositions > 0 ? winners / totalPositions : 0;

  // Recency from activity timestamps
  const now = Date.now() / 1000;
  const latestTs = activities.length > 0 ? Math.max(...activities.map(a => a.timestamp || 0)) : 0;
  const daysSinceActive = latestTs > 0 ? (now - latestTs) / 86400 : 999;

  // Category concentration
  const catCounts = {};
  positions.forEach(p => {
    const cat = inferCategory(p.slug);
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });
  const maxCatCount = totalPositions > 0 ? Math.max(...Object.values(catCounts)) : 0;
  const topCatPct = totalPositions > 0 ? maxCatCount / totalPositions : 0;

  // Largest single PnL vs total (skew)
  const pnlList = positions.map(p => parseFloat(p.realizedPnl) || 0).filter(v => v > 0);
  const biggestWin = pnlList.length > 0 ? Math.max(...pnlList) : 0;
  const pnlSkew = pnl > 0 && biggestWin > 0 ? biggestWin / pnl : 0;

  // Active months
  let activeMonths = 1;
  if (activities.length > 1) {
    const oldest = Math.min(...activities.map(a => a.timestamp || now));
    activeMonths = Math.max(1, Math.round((now - oldest) / (86400 * 30)));
  }

  // --- Score components (each 0-10) ---
  const pnlScore = pnl <= 0 ? 0 : Math.min(10, (Math.log10(Math.max(1, pnl)) / Math.log10(500000)) * 10);
  const sampleFactor = Math.min(1, totalPositions / 50);
  const wrScore = winRate * 10 * sampleFactor;
  const volPerMonth = vol / activeMonths;
  const volScore = Math.min(10, (Math.log10(Math.max(1, volPerMonth)) / Math.log10(100000)) * 10);
  const recencyScore = daysSinceActive <= 7 ? 10 : daysSinceActive <= 14 ? 8 : daysSinceActive <= 30 ? 6 : daysSinceActive <= 60 ? 4 : 2;

  const sizes = positions.map(p => parseFloat(p.size) * (parseFloat(p.avgPrice) || 0.5)).filter(v => v > 0);
  let disciplineScore = 5;
  if (sizes.length > 2) {
    const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const stdDev = Math.sqrt(sizes.reduce((a, b) => a + (b - mean) ** 2, 0) / sizes.length);
    const cv = mean > 0 ? stdDev / mean : 1;
    disciplineScore = Math.max(0, Math.min(10, 10 - cv * 5));
  }
  const diversityScore = topCatPct > 0.9 ? 1 : topCatPct > 0.7 ? 3 : topCatPct > 0.5 ? 6 : 9;

  let raw = (pnlScore * 0.25 + wrScore * 0.20 + volScore * 0.15 + recencyScore * 0.20 + disciplineScore * 0.10 + diversityScore * 0.10);
  if (pnlSkew > 0.5) raw *= 0.8;
  if (totalPositions < 20) raw *= 0.7;

  const score = Math.max(1, Math.min(10, parseFloat(raw.toFixed(1))));
  const copyabilityScore = Math.round(score * 10);

  // Verdict and Reasons
  let verdict, verdictColor;
  if (score >= 8.5) { verdict = 'Strong Copy Candidate'; verdictColor = '#10b981'; }
  else if (score >= 7.0) { verdict = 'Worth Tracking'; verdictColor = '#3b82f6'; }
  else if (score >= 5.0) { verdict = 'Monitor Only'; verdictColor = '#f59e0b'; }
  else { verdict = 'Avoid Copying'; verdictColor = '#ef4444'; }

  // Logic-backed insights for "Avoid Copying" or Low scores
  const insights = [];
  if (score < 5) {
    if (totalPositions < 20) insights.push('⚠️ High risk: Insufficient trade history to verify if P&L is skill or luck.');
    if (disciplineScore < 4) insights.push('⚠️ High risk: Inconsistent bet sizing suggests poor bankroll management.');
    if (pnlSkew > 0.6) insights.push('⚠️ High risk: Portfolio is carried by a single "lucky" win; regular trades are unprofitable.');
    if (winRate < 0.4) insights.push('⚠️ High risk: Low win rate indicates poor market prediction quality.');
  } else {
    if (winRate > 0.6 && totalPositions > 50) insights.push('✅ Signal quality: High win rate maintained over a large sample size.');
    if (disciplineScore > 8) insights.push('✅ Discipline: Extremely consistent position sizing suggests a professional approach.');
  }
  if (insights.length === 0) insights.push('Analyzing trading patterns for deeper insights...');

  // Extract Top 5 largest open positions
  const openPositions = positions
    .filter(p => parseFloat(p.size) > 0)
    .map(p => {
        const size = parseFloat(p.size) || 0;
        const price = parseFloat(p.avgPrice) || parseFloat(p.lastPrice) || 0.5;
        return {
            title: p.title,
            slug: p.slug,
            outcome: p.outcome,
            size: size.toFixed(0),
            value: (size * price).toFixed(2),
            pnl: (parseFloat(p.realizedPnl) || 0).toFixed(2),
        };
    })
    .sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
    .slice(0, 5);

  // Category breakdown
  const categoryBreakdown = Object.entries(catCounts)
    .map(([cat, count]) => ({ cat, count, pct: totalPositions > 0 ? (count / totalPositions * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.count - a.count);

  // Sentiment Bias (YES vs NO)
  const yesCount = positions.filter(p => p.outcome?.toLowerCase() === 'yes').length;
  const noCount = positions.filter(p => p.outcome?.toLowerCase() === 'no').length;
  const sentimentBias = totalPositions > 0 ? Math.round((yesCount / (yesCount + noCount || 1)) * 100) : 50;

  return {
    score,
    copyabilityScore,
    verdict,
    verdictColor,
    insights,
    openPositions,
    sentimentBias,
    categoryBreakdown,
    stats: {
      pnl,
      vol,
      winRate: (winRate * 100).toFixed(1),
      totalPositions,
      activeMonths,
      pnlSkew: (pnlSkew * 100).toFixed(1),
      topCatPct: (topCatPct * 100).toFixed(1),
      disciplineScore: disciplineScore.toFixed(1),
      daysSinceActive: Math.round(daysSinceActive),
    },
    scoreComponents: {
      pnlScore: pnlScore.toFixed(1),
      wrScore: wrScore.toFixed(1),
      volScore: volScore.toFixed(1),
      recencyScore: recencyScore.toFixed(1),
      disciplineScore: disciplineScore.toFixed(1),
      diversityScore: diversityScore.toFixed(1),
    },
  };
}

// ── Stub for on-chain enrichment (plug in Dune / Goldsky / Allium here) ─────
async function enrichActivity(proxyWallet, baseActivity) {
  // TODO: Replace with Dune Analytics / Goldsky / Allium query
  // Expected shape: [{ timestamp, side, price, size, usdcSize, title, slug, eventSlug }]
  return baseActivity;
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const { query: q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query parameter' });

  const isAddress = /^0x[0-9a-fA-F]{40}$/.test(q.trim());

  try {
    let proxyWallet = null;
    let leaderEntry = null;

    if (isAddress) {
      proxyWallet = q.trim().toLowerCase();
      // Try leaderboard scan for rank/username
      const lbRes = await fetch(`${DATA_API}/leaderboard?limit=2000`);
      const lbData = await lbRes.json();
      const lbArr = Array.isArray(lbData) ? lbData : (lbData?.data || []);
      
      // Look for match using BOTH proxyWallet (Data API) and address (Internal/Dune schema)
      const entry = lbArr.find(e => 
        (e.proxyWallet?.toLowerCase() === proxyWallet) || 
        (e.address?.toLowerCase() === proxyWallet) ||
        (e.wallet_address?.toLowerCase() === proxyWallet)
      );
      
      if (entry) {
        leaderEntry = {
          userName: entry.userName || entry.label || entry.wallet_label,
          proxyWallet: entry.proxyWallet || entry.address || entry.wallet_address,
          pnl: entry.pnl || entry.pnl_all || '0',
          vol: entry.vol || entry.volume || '0',
          rank: entry.rank || 'Unranked'
        };
      }
      
      // FALLBACK: If not in leaderboard, try profile API for username
      if (!leaderEntry) {
        try {
          const profRes = await fetch(`${DATA_API}/profile?address=${proxyWallet}`);
          if (profRes.ok) {
            const profData = await profRes.json();
            leaderEntry = {
              userName: profData.displayName || profData.username || profData.name,
              proxyWallet: proxyWallet,
              pnl: profData.pnl || profData.profit || '0',
              vol: profData.volume || profData.vol || '0',
              rank: 'Unranked'
            };
          }
        } catch (e) {
          console.warn('Profile fetch failed', e);
        }
      }
    } else {
      // Username lookup — scan leaderboard
      const lbRes = await fetch(`${DATA_API}/leaderboard?limit=2000`);
      const lbData = await lbRes.json();
      const lbArr = Array.isArray(lbData) ? lbData : (lbData?.data || []);
      
      const entry = lbArr.find(e => 
        (e.userName?.toLowerCase() === q.trim().toLowerCase()) ||
        (e.label?.toLowerCase() === q.trim().toLowerCase()) ||
        (e.wallet_label?.toLowerCase() === q.trim().toLowerCase())
      );
      
      if (!entry) {
        return res.status(404).json({ error: `Username "${q}" not found in Top 2000 leaderboard.` });
      }
      
      proxyWallet = entry.proxyWallet || entry.address || entry.wallet_address;
      leaderEntry = {
        userName: entry.userName || entry.label || entry.wallet_label,
        proxyWallet: proxyWallet,
        pnl: entry.pnl || entry.pnl_all || '0',
        vol: entry.vol || entry.volume || '0',
        rank: entry.rank || 'Unranked'
      };
    }

    if (!proxyWallet) return res.status(404).json({ error: 'Wallet not found' });

    // Fetch positions and activity in parallel
    const [posRes, actRes] = await Promise.all([
      fetch(`${DATA_API}/positions?user=${proxyWallet}&limit=500`),
      fetch(`${DATA_API}/activity?user=${proxyWallet}&limit=500`),
    ]);

    const [positions, rawActivity] = await Promise.all([posRes.json(), actRes.json()]);
    const posArr = Array.isArray(positions) ? positions : [];
    const actArr = Array.isArray(rawActivity) ? rawActivity : [];

    // Enrich (on-chain stub)
    const activity = await enrichActivity(proxyWallet, actArr);

    // Score
    const analysis = computeScore(leaderEntry || { pnl: 0, vol: 0 }, posArr, activity);

    // Build recent activity table (last 20 trades)
    const recentTrades = activity
      .filter(a => a.type === 'TRADE')
      .slice(0, 20)
      .map(a => ({
        timestamp: a.timestamp,
        side: a.side,
        title: a.title,
        slug: a.slug,
        outcome: a.outcome,
        price: parseFloat(a.price || 0).toFixed(3),
        usdcSize: parseFloat(a.usdcSize || 0).toFixed(2),
        category: inferCategory(a.slug),
      }));

    return res.status(200).json({
      proxyWallet,
      leaderboard: leaderEntry || null,
      analysis,
      positions: posArr.slice(0, 50),
      recentTrades,
      dataSource: {
        leaderboard: 'polymarket-data-api',
        positions: 'polymarket-data-api',
        activity: 'polymarket-data-api',
        onChain: null, // populate when Dune/Goldsky/Allium is connected
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
