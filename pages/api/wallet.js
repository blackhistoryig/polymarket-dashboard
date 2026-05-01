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
  const pnl = parseFloat(leaderData.pnl) || 0;
  const vol = parseFloat(leaderData.vol) || 0;

  // Derive stats from positions
  const closed = positions.filter(p => parseFloat(p.realizedPnl) !== 0 || p.size === 0);
  const totalPositions = positions.length;

  // Win rate: positions with positive realizedPnl
  const winners = positions.filter(p => parseFloat(p.realizedPnl) > 0).length;
  const winRate = totalPositions > 0 ? winners / totalPositions : 0;

  // Recency from activity timestamps (unix ms)
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

  // Active months (rough: spread of activity timestamps)
  let activeMonths = 1;
  if (activities.length > 1) {
    const oldest = Math.min(...activities.map(a => a.timestamp || now));
    activeMonths = Math.max(1, Math.round((now - oldest) / (86400 * 30)));
  }

  // --- Score components (each 0-10) ---
  // 1. PnL quality (log scale, capped at $500k for 10)
  const pnlScore = pnl <= 0 ? 0 : Math.min(10, (Math.log10(Math.max(1, pnl)) / Math.log10(500000)) * 10);

  // 2. Win rate adjusted for sample size
  const sampleFactor = Math.min(1, totalPositions / 50);
  const wrScore = winRate * 10 * sampleFactor;

  // 3. Volume per active month (normalized)
  const volPerMonth = vol / activeMonths;
  const volScore = Math.min(10, (Math.log10(Math.max(1, volPerMonth)) / Math.log10(100000)) * 10);

  // 4. Recency
  const recencyScore = daysSinceActive <= 7 ? 10
    : daysSinceActive <= 14 ? 8
    : daysSinceActive <= 30 ? 6
    : daysSinceActive <= 60 ? 4
    : daysSinceActive <= 90 ? 2 : 0;

  // 5. Position sizing discipline (inverse of coefficient of variation in size)
  const sizes = positions.map(p => parseFloat(p.totalBought) || 0).filter(v => v > 0);
  let disciplineScore = 5;
  if (sizes.length > 2) {
    const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const stdDev = Math.sqrt(sizes.reduce((a, b) => a + (b - mean) ** 2, 0) / sizes.length);
    const cv = mean > 0 ? stdDev / mean : 1;
    disciplineScore = Math.max(0, Math.min(10, 10 - cv * 5));
  }

  // 6. Diversification
  const diversityScore = topCatPct > 0.9 ? 1 : topCatPct > 0.7 ? 3 : topCatPct > 0.5 ? 6 : 9;

  // Weighted final score
  const raw = (
    pnlScore * 0.25 +
    wrScore * 0.20 +
    volScore * 0.15 +
    recencyScore * 0.20 +
    disciplineScore * 0.10 +
    diversityScore * 0.10
  );
  const score = Math.max(1, Math.min(10, parseFloat(raw.toFixed(1))));

  // Verdict
  let verdict, verdictColor;
  if (score >= 8.5) { verdict = 'Strong Copy Candidate'; verdictColor = '#10b981'; }
  else if (score >= 7.0) { verdict = 'Worth Tracking'; verdictColor = '#3b82f6'; }
  else if (score >= 5.0) { verdict = 'Monitor Only'; verdictColor = '#f59e0b'; }
  else { verdict = 'Avoid Copying'; verdictColor = '#ef4444'; }

  // Red flags
  const flags = [];
  if (totalPositions < 50) flags.push({ id: 'sample', label: 'Thin sample size', detail: `Only ${totalPositions} closed positions (need 50+)` });
  if (pnlSkew > 0.4) flags.push({ id: 'skew', label: 'One oversized win', detail: `Biggest win = ${(pnlSkew * 100).toFixed(0)}% of total P&L` });
  if (daysSinceActive > 30) flags.push({ id: 'stale', label: 'Inactive > 30 days', detail: `Last trade ~${Math.round(daysSinceActive)} days ago` });
  if (disciplineScore < 4) flags.push({ id: 'sizing', label: 'Erratic position sizing', detail: 'High variance in trade sizes' });
  if (topCatPct > 0.7) {
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    flags.push({ id: 'concentration', label: 'Category concentration', detail: `${(topCatPct * 100).toFixed(0)}% of trades in "${topCat}"` });
  }

  // Plain-English insights
  const insights = [];
  if (pnl > 0 && topCatPct > 0.7) insights.push('Profitable but overfit to one category — risky to copy across all markets.');
  if (winRate > 0.6 && totalPositions > 50) insights.push('Consistent across many trades — good signal quality.');
  if (pnl > 0 && daysSinceActive > 30) insights.push('Strong P&L but wallet has gone stale — verify before copying.');
  if (winRate > 0.65 && totalPositions < 20) insights.push('High win rate with too little sample size — may be luck.');
  if (pnlSkew > 0.4 && pnl > 0) insights.push('P&L driven by one big win — skill may be overstated.');
  if (disciplineScore >= 7 && winRate > 0.5) insights.push('Disciplined sizing with solid win rate — hallmarks of a skilled trader.');
  if (recencyScore >= 8 && pnl > 0) insights.push('Recently active with positive P&L — copy signal is current.');
  if (insights.length === 0) insights.push('Insufficient data to generate detailed insights.');

  // Category breakdown
  const categoryBreakdown = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => ({ cat, count, pct: totalPositions > 0 ? (count / totalPositions * 100).toFixed(1) : 0 }));

  return {
    score,
    verdict,
    verdictColor,
    flags,
    insights,
    stats: {
      pnl,
      vol,
      winRate: (winRate * 100).toFixed(1),
      totalPositions,
      activeMonths,
      daysSinceActive: Math.round(daysSinceActive),
      lastActiveTs: latestTs,
      pnlSkew: (pnlSkew * 100).toFixed(1),
      topCatPct: (topCatPct * 100).toFixed(1),
      disciplineScore: disciplineScore.toFixed(1),
    },
    categoryBreakdown,
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
      // Direct address lookup — find in leaderboard (scan up to 2000 entries)
      proxyWallet = q.trim().toLowerCase();
      // Try leaderboard scan for rank/username
      const lbRes = await fetch(`${DATA_API}/leaderboard?limit=2000`);
      const lbData = await lbRes.json();
      leaderEntry = Array.isArray(lbData)
        ? lbData.find(e => e.proxyWallet?.toLowerCase() === proxyWallet)
        : null;
    } else {
      // Username lookup — scan leaderboard
      const lbRes = await fetch(`${DATA_API}/leaderboard?limit=2000`);
      const lbData = await lbRes.json();
      leaderEntry = Array.isArray(lbData)
        ? lbData.find(e => e.userName?.toLowerCase() === q.trim().toLowerCase())
        : null;
      if (!leaderEntry) return res.status(404).json({ error: `Username "${q}" not found on leaderboard` });
      proxyWallet = leaderEntry.proxyWallet;
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
