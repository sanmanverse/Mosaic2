export const CATEGORIES = [
  { key: 'technology', label: 'Technology', color: '#6684df' },
  { key: 'science', label: 'Science', color: '#36a889' },
  { key: 'business', label: 'Business', color: '#d69a42' },
  { key: 'society', label: 'Society', color: '#9874c8' },
  { key: 'arts_culture', label: 'Arts & Culture', color: '#d87891' }
];
export const EMPTY_VECTOR = Object.fromEntries(CATEGORIES.map(c => [c.key, 0]));
export function normalizeVector(input = {}) {
  const values = CATEGORIES.map(c => { const value=Number(input[c.key] ?? 0); return Number.isFinite(value)?Math.max(0,value):0; });
  const total = values.reduce((a,b) => a+b, 0);
  return total ? values.map(v => v / total) : values.map(() => .2);
}
function toPercentages(values) {
  const raw = values.map(value => value * 100);
  const whole = raw.map(Math.floor);
  let remainder = 100 - whole.reduce((sum, value) => sum + value, 0);
  const order = raw.map((value, index) => ({index, fraction:value-whole[index]})).sort((a,b)=>b.fraction-a.fraction);
  for (let i=0; i<remainder; i++) whole[order[i % order.length].index] += 1;
  return whole;
}
export function cosineSimilarity(a, b) {
  const x = normalizeVector(a), y = normalizeVector(b);
  const dot = x.reduce((s,v,i) => s + v*y[i], 0);
  const nx = Math.sqrt(x.reduce((s,v) => s+v*v,0));
  const ny = Math.sqrt(y.reduce((s,v) => s+v*v,0));
  return nx && ny ? Math.round(dot/(nx*ny)*100) : 0;
}
const freshness = date => { const timestamp=new Date(date || Date.now()).getTime(); return Number.isFinite(timestamp)?Math.max(0,1-Math.max(0,Date.now()-timestamp)/(30*86400000)):0; };
const topicSimilarity = (articleTopics=[], readerTopics=[]) => {
  const a = new Set(articleTopics.map(x=>String(x).toLowerCase()));
  const b = new Set(readerTopics.map(x=>String(x).toLowerCase()));
  if (!a.size || !b.size) return 0;
  return [...a].filter(x=>b.has(x)).length / new Set([...a,...b]).size;
};
export function scoreArticle(article, profile) {
  const similarity = cosineSimilarity(profile, article.composition || {});
  const topics = topicSimilarity(article.topics || [], profile.topics || []);
  const writer = (profile.followedWriters || []).includes(article.author_id) ? 1 : 0;
  const fresh = freshness(article.created_at);
  // Composition 70%, topic overlap 15%, followed writer 10%, freshness 5%.
  return { similarity, score: Math.round(similarity*.70 + topics*15 + writer*10 + fresh*5) };
}
export function rankArticles(articles, profile, readIds=[]) {
  return articles.map(article => ({...article, match:scoreArticle(article,profile)}))
    .filter(article => !readIds.includes(article.id) && article.match.similarity >= 58)
    .sort((a,b)=>b.match.score-a.match.score);
}
export function deriveTaste(articles, events, explicit = {}) {
  const sums = {...EMPTY_VECTOR}; let weightSum = 0;
  const byId = new Map(articles.map(a=>[a.id,a]));
  for (const event of events) {
    const article = byId.get(event.article_id); if (!article) continue;
    const weight = ({view: .35, read: 1, save: 1.6, like: 1.3, complete: 2})[event.event_type] || .2;
    for (const c of CATEGORIES) sums[c.key] += Number(article.composition?.[c.key] || 0) * weight;
    weightSum += weight;
  }
  const explicitVector = normalizeVector(explicit);
  if (!weightSum) return {...Object.fromEntries(CATEGORIES.map((c,i)=>[c.key,toPercentages(explicitVector)[i]])), topics:explicit.topics || []};
  const total = CATEGORIES.reduce((s,c)=>s+sums[c.key],0) || 1;
  const hasExplicit = CATEGORIES.some(c=>explicit[c.key] !== undefined);
  const blendedValues = CATEGORIES.map((c,i)=>{
    const behavioural = sums[c.key]/total;
    return hasExplicit ? explicitVector[i]*.65 + behavioural*.35 : behavioural;
  });
  const percentages = toPercentages(blendedValues);
  const vector = Object.fromEntries(CATEGORIES.map((c,i)=>[c.key,percentages[i]]));
  return {...vector, topics:explicit.topics || []};
}
