/* OtokuMap — small, dependency-free HTTP helpers for the data jobs. */

const DEFAULT_UA = 'OtokuMapBot/1.0 (+https://github.com/otokumap/otokumap; supermarket flyer index)';
const DEFAULT_TIMEOUT_MS = 20000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchText(url, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    retries = 2,
    headers = {},
    userAgent = DEFAULT_UA
  } = options;

  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en;q=0.8',
          ...headers
        }
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      return await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < retries) await sleep(700 * (attempt + 1));
    }
  }
  throw lastError;
}

export async function fetchJson(url, options = {}) {
  const text = await fetchText(url, {
    ...options,
    headers: {
      Accept: 'application/json,text/plain,*/*',
      ...(options.headers || {})
    }
  });
  return JSON.parse(text);
}

/** Very small robots.txt check. Handles the common User-agent/Allow/Disallow layout. */
const robotsCache = new Map();

function robotsGroups(text) {
  const groups = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && current) {
      current.rules.push({ type: key, path: value });
    }
  }
  return groups;
}

function pathMatches(path, rule) {
  if (!rule) return false;
  const pattern = rule.replace(/\*/g, '.*').replace(/\$$/, '$');
  try {
    return new RegExp('^' + pattern).test(path);
  } catch {
    return path.startsWith(rule);
  }
}

export async function robotsAllowed(url, userAgent = DEFAULT_UA) {
  const u = new URL(url);
  const origin = u.origin;
  if (!robotsCache.has(origin)) {
    robotsCache.set(origin, (async () => {
      try {
        const text = await fetchText(origin + '/robots.txt', { retries: 0, timeout: 10000 });
        return robotsGroups(text);
      } catch {
        return [];
      }
    })());
  }
  const groups = await robotsCache.get(origin);
  const ua = userAgent.toLowerCase().split('/')[0];
  let group = groups.find((g) => g.agents.some((a) => a !== '*' && (ua.includes(a) || a.includes(ua))));
  if (!group) group = groups.find((g) => g.agents.includes('*'));
  if (!group) return true;
  const path = u.pathname + u.search;
  const matches = group.rules.filter((r) => pathMatches(path, r.path));
  if (!matches.length) return true;
  matches.sort((a, b) => b.path.length - a.path.length);
  return matches[0].type === 'allow';
}

export async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export { sleep };
