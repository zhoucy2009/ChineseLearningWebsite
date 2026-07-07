// 萌典是繁体词典：简体词条（如“地动山摇”）直接查会 404，
// 查询时转繁体，结果转回简体展示。
// opencc-js 词库较大，动态导入避免拖慢首屏。
let converterPromise = null;
function getConverters() {
  if (!converterPromise) {
    converterPromise = import("opencc-js").then((OpenCC) => ({
      toTraditional: OpenCC.Converter({ from: "cn", to: "tw" }),
      toSimplified: OpenCC.Converter({ from: "tw", to: "cn" })
    }));
  }
  return converterPromise;
}

// v3：v1 无繁简转换，v2 未过滤“异体字”类循环释义
const DICTIONARY_CACHE_PREFIX = "clw_dictionary_v3";

function getCacheKey(kind, value) {
  return `${DICTIONARY_CACHE_PREFIX}:${kind}:${value}`;
}

function normalizeList(items) {
  if (!items) return [];
  return Array.isArray(items) ? items.filter(Boolean) : [items].filter(Boolean);
}

function fallbackEntry(kind, value, status = "idle") {
  const labels = {
    characters: "单字",
    words: "词语",
    idioms: "成语",
    proverbs: "谚语"
  };

  return {
    value,
    source: "fallback",
    status,
    pinyin: "",
    meaning: `暂时没有查到“${value}”的词典解释，请结合文章语境理解这个${labels[kind] || "词条"}。`,
    synonyms: [],
    antonyms: [],
    example: `请用“${value}”造一个句子。`
  };
}

function getCachedEntry(kind, value) {
  try {
    return JSON.parse(localStorage.getItem(getCacheKey(kind, value)));
  } catch {
    return null;
  }
}

function setCachedEntry(kind, value, entry) {
  localStorage.setItem(getCacheKey(kind, value), JSON.stringify(entry));
}

function splitTermList(items) {
  // 萌典的同/反义词是逗号串，如 "半途而廢,一曝十寒"
  return normalizeList(items)
    .flatMap((item) => String(item).split(/[,，、]/))
    .map((item) => item.trim())
    .filter(Boolean);
}

// 跳过“「圆」的异体字”“(一)1.2.的语音”这类循环引用释义，挑第一条真正有内容的。
const JUNK_DEF_RE = /异体字|異體字|的语音|的語音|的又音|的本字|的俗字/;

function pickBestDefinition(data) {
  const candidates = [];
  for (const heteronym of data?.heteronyms || []) {
    for (const definition of heteronym.definitions || []) {
      if (definition?.def) candidates.push({ heteronym, definition });
    }
  }
  if (candidates.length === 0) return null;
  return candidates.find(({ definition }) => !JUNK_DEF_RE.test(definition.def)) || candidates[0];
}

function firstDefinitionFromMoedict(data, toSimplified) {
  const best = pickBestDefinition(data);
  if (!best) return null;
  const { heteronym, definition } = best;

  return {
    pinyin: heteronym.pinyin || heteronym.bopomofo || "",
    meaning: toSimplified(definition.def || ""),
    synonyms: splitTermList(definition.synonyms).map(toSimplified),
    antonyms: splitTermList(definition.antonyms).map(toSimplified),
    example: toSimplified(
      normalizeList(definition.example)[0] || normalizeList(definition.quote)[0] || ""
    )
  };
}

async function fetchMoedictJson(term) {
  const response = await fetch(`https://www.moedict.tw/uni/${encodeURIComponent(term)}.json`);
  return response.ok ? response.json() : null;
}

async function fetchMoedictEntry(value) {
  const { toTraditional, toSimplified } = await getConverters();
  let data = await fetchMoedictJson(value);
  let firstDefinition = data ? firstDefinitionFromMoedict(data, toSimplified) : null;

  // 简体页查不到，或只有“异体字”类指针释义时，改查繁体页（如 园→園）。
  const traditional = toTraditional(value);
  if (traditional !== value && (!firstDefinition?.meaning || JUNK_DEF_RE.test(firstDefinition.meaning))) {
    const traditionalData = await fetchMoedictJson(traditional);
    const traditionalDefinition = traditionalData
      ? firstDefinitionFromMoedict(traditionalData, toSimplified)
      : null;
    if (traditionalDefinition?.meaning) firstDefinition = traditionalDefinition;
  }

  if (!firstDefinition?.meaning) return null;

  return {
    value,
    source: "萌典",
    status: "ready",
    ...firstDefinition,
    example: firstDefinition.example || `请用“${value}”造一个句子。`
  };
}

function entryFromWiktionary(value, data) {
  const pages = data?.query?.pages || {};
  const page = Object.values(pages)[0];
  const extract = page?.extract?.trim();
  if (!extract) return null;

  const firstParagraph = extract
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("="));

  if (!firstParagraph) return null;

  return {
    value,
    source: "维基词典",
    status: "ready",
    pinyin: "",
    meaning: firstParagraph.slice(0, 180),
    synonyms: [],
    antonyms: [],
    example: `请用“${value}”造一个句子。`
  };
}

async function fetchWiktionaryEntry(value) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    prop: "extracts",
    explaintext: "1",
    redirects: "1",
    titles: value
  });
  const response = await fetch(`https://zh.wiktionary.org/w/api.php?${params}`);
  if (!response.ok) return null;

  return entryFromWiktionary(value, await response.json());
}

export function getFallbackDictionaryEntry(kind, value) {
  return fallbackEntry(kind, value);
}

// 成语接龙用：查词典验证是不是真实成语（萌典/维基词典里查得到即认可）。
export async function verifyIdiom(value) {
  if (typeof value !== "string" || value.length !== 4) return false;
  const entry = await lookupDictionaryEntry("idioms", value);
  return entry.source !== "fallback";
}

export async function lookupDictionaryEntry(kind, value) {
  const cachedEntry = getCachedEntry(kind, value);
  if (cachedEntry) return cachedEntry;

  try {
    const entry = await fetchMoedictEntry(value) || await fetchWiktionaryEntry(value);
    if (entry) {
      setCachedEntry(kind, value, entry);
      return entry;
    }
  } catch {
    // Network or CORS failures should not break the reading page.
  }

  const fallback = fallbackEntry(kind, value, "missing");
  setCachedEntry(kind, value, fallback);
  return fallback;
}
