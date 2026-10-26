/* OtokuMap — shared normalization and brand matching. */

const CHAIN_ALIASES = [
  { chain: 'seijoishii', names: ['成城石井', 'seijo ishii', 'seijoishii'] },
  { chain: 'kinokuniya', names: ['紀ノ国屋', '紀伊國屋', 'kinokuniya'] },
  { chain: 'itoyokado', names: ['イトーヨーカドー', 'イトーヨーカ堂', 'itoyokado', 'ito-yokado', 'york mart', 'ヨークマート'] },
  { chain: 'maxvalu', names: ['マックスバリュ', 'maxvalu', 'max valu'] },
  { chain: 'aeon', names: ['イオンスタイル', 'イオン', 'aeon', 'aeon style', 'イオンリテール'] },
  { chain: 'daiei', names: ['ダイエー', 'daiei'] },
  { chain: 'seiyu', names: ['西友', 'seiyu', 'livin', 'リヴィン'] },
  { chain: 'life', names: ['ライフコーポレーション', 'ライフ', 'life', 'biо-ral', 'bio-ral', 'ビオラル', 'セントラルスクエア'] },
  { chain: 'summit', names: ['サミットストア', 'サミット', 'summit store', 'summit'] },
  { chain: 'gyomu', names: ['業務スーパー', 'gyomu super', 'gyomusuper', '神戸物産'] },
  { chain: 'ok', names: ['オーケーストア', 'オーケー', 'ok store', 'ok-store', 'ok corporation'] },
  { chain: 'donki', names: ['ドン・キホーテ', 'ドンキホーテ', 'ドンキ', 'don quijote', 'donki', 'mega donki', 'megaドンキ'] },
  { chain: 'costco', names: ['コストコ', 'costco'] },
  { chain: 'maruetsu', names: ['マルエツ', 'maruetsu'] },
  { chain: 'yaoko', names: ['ヤオコー', 'yaoko'] },
  { chain: 'belc', names: ['ベルク', 'belc'] },
  { chain: 'valor', names: ['バロー', 'valor'] },
  { chain: 'trial', names: ['トライアル', 'trial'] },
  { chain: 'inageya', names: ['いなげや', 'inageya'] },
  { chain: 'ropia', names: ['ロピア', 'ropia'] },
  { chain: 'maibasket', names: ['まいばすけっと', 'maibasket'] },
  { chain: 'acore', names: ['アコレ', 'acore'] },
  { chain: 'tokyustore', names: ['東急ストア', 'tokyu store', 'tokyustore'] },
  { chain: 'keiostore', names: ['京王ストア', 'keio store', 'keiostore'] },
  { chain: 'odakyuox', names: ['小田急ｏｘ', '小田急ox', 'odakyu ox', 'odakyuox'] },
  { chain: 'santoku', names: ['三徳', 'santoku'] },
  { chain: 'marusho', names: ['マルショク', 'marusho'] },
  { chain: 'fresco', names: ['フレスコ', 'fresco'] },
  { chain: 'harvest', names: ['ハーベスト', 'harvest'] },
  { chain: 'otoku', names: ['オトクマップ', 'otokumap'] }
];

export function normalizeText(value) {
  return String(value == null ? '' : value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[・･.,，、。'"“”‘’()（）【】\[\]「」『』<>＜＞/\\|_\-—–]/g, '');
}

export function chainFor(...values) {
  const hay = normalizeText(values.filter(Boolean).join(' '));
  if (!hay) return 'other';
  for (const entry of CHAIN_ALIASES) {
    for (const name of entry.names) {
      if (hay.includes(normalizeText(name))) return entry.chain;
    }
  }
  return 'other';
}

export function brandForChain(chain) {
  const brands = {
    life: 'ライフ',
    summit: 'サミットストア',
    itoyokado: 'イトーヨーカドー',
    gyomu: '業務スーパー',
    ok: 'オーケーストア',
    aeon: 'イオン',
    maxvalu: 'マックスバリュ',
    seiyu: '西友',
    donki: 'ドン・キホーテ',
    costco: 'コストコ',
    maruetsu: 'マルエツ',
    yaoko: 'ヤオコー',
    belc: 'ベルク',
    valor: 'バロー',
    trial: 'トライアル',
    inageya: 'いなげや',
    ropia: 'ロピア',
    seijoishii: '成城石井',
    kinokuniya: '紀ノ国屋',
    daiei: 'ダイエー',
    maibasket: 'まいばすけっと',
    acore: 'アコレ',
    tokyustore: '東急ストア',
    keiostore: '京王ストア',
    odakyuox: '小田急OX',
    santoku: '三徳',
    marusho: 'マルショク',
    fresco: 'フレスコ',
    harvest: 'ハーベスト'
  };
  return brands[chain] || '';
}

export function branchFromName(name, chain) {
  let out = String(name || '').trim();
  const brands = [brandForChain(chain)].filter(Boolean);
  for (const brand of brands) {
    const re = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
    out = out.replace(re, '');
  }
  out = out.replace(/^[\s\-–—・･:：]+|[\s\-–—・･:：]+$/g, '');
  return out || String(name || '').trim();
}

export function cleanStoreName(name) {
  return String(name || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*[（(]\s*(?:閉店|臨時休業|移転)\s*[)）]\s*$/g, '')
    .trim();
}

export function addressFromTags(tags = {}) {
  const full = tags['addr:full'] || tags['address'] || '';
  if (full) return String(full).replace(/\s+/g, ' ').trim();

  const parts = [
    tags['addr:province'],
    tags['addr:state'],
    tags['addr:city'],
    tags['addr:suburb'],
    tags['addr:quarter'],
    tags['addr:street'],
    tags['addr:housenumber']
  ].filter(Boolean);

  if (!parts.length) {
    return [tags['addr:place'], tags['addr:postcode']].filter(Boolean).join(' ');
  }
  return parts.join('').replace(/\s+/g, ' ').trim();
}

export function addressKey(address) {
  return normalizeText(address)
    .replace(/[0-9０-９]+/g, '#')
    .replace(/#+/g, '#');
}

export function storeNameKey(name) {
  return normalizeText(cleanStoreName(name))
    .replace(/店$/g, '')
    .replace(/[0-9０-９]+/g, '#')
    .replace(/#+/g, '#');
}

export function dateOnly(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function isValidHttpUrl(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export { CHAIN_ALIASES };
