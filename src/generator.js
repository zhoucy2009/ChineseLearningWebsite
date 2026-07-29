import React from "react";
import { buildArticle, seedArticle } from "./articles.js";

// 文章生成器：调用本地 Ollama（经 vite 的 /ollama 代理，手机访问也走同一入口），
// 用结构化输出（JSON schema）+ think:false 生成 IB 风格文章与配套语境题。
// 队列策略：保持 BUFFER_TARGET 篇未读缓冲，用户每完成一篇自动补货，不做大题库。

const MODEL = "qwen3.5:9b";
// 优先走 vite 代理（手机局域网访问必须走它）；页面不是由 vite 服务时（如直接打开 dist），
// 在电脑上浏览可退回直连本机 Ollama。
const OLLAMA_BASES = ["/ollama", "http://127.0.0.1:11434"];
let resolvedOllamaBase = null;
const LIBRARY_KEY = "clw_generated_articles_v1";
const PROGRESS_KEY_PREFIX = "clw_reading_progress_v1";
const TARGET_KEY = "clw_target_stars_v1";
const BUFFER_TARGET = 3;
const MAX_LIBRARY = 30;

const TOPICS = [
  "环境保护与可持续生活", "科技如何改变学习", "传统节日与家庭", "一次难忘的旅行",
  "美食与文化认同", "体育运动与团队精神", "人工智能与未来职业", "志愿服务的收获",
  "家乡的变化", "网络时代的友谊", "博物馆里的历史课", "语言学习的苦与乐",
  "城市与乡村的生活对比", "青少年与社交媒体", "一位令我敬佩的人", "音乐与情感表达"
];

const STAR_GUIDES = {
  1: "很简单：常用词为主，句子短（约10字），全文约150-220字，用1-2个常见成语、1条谚语",
  2: "较简单：日常话题，全文约220-300字，用2-3个成语、1-2条谚语",
  3: "中等（IB中文B SL水平）：全文约300-400字，用3-4个成语、2条谚语，包含一些抽象讨论",
  4: "较难（IB中文B HL水平）：全文约400-520字，句式复杂多样，用4-5个成语、2-3条谚语，含观点论证",
  5: "很难（接近IB中文A）：全文约520-650字，书面语丰富，用5个以上成语、3条谚语，有深度思辨"
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    paragraphs: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
    vocabWords: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 20 },
    idioms: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 8 },
    proverbs: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
    proverbDialogue: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        properties: { npc: { type: "string" }, answer: { type: "string" } },
        required: ["npc", "answer"]
      }
    },
    synonymContrast: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          pair: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 },
          contexts: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: {
              type: "object",
              properties: { sentence: { type: "string" }, answer: { type: "string" } },
              required: ["sentence", "answer"]
            }
          },
          note: { type: "string" }
        },
        required: ["pair", "contexts", "note"]
      }
    },
    selfStars: { type: "integer", minimum: 1, maximum: 5 }
  },
  required: ["title", "paragraphs", "vocabWords", "idioms", "proverbs", "proverbDialogue", "selfStars"]
};

const SYSTEM_PROMPT = `你是IB中文课程的教材编写老师。请写一篇适合中文学习者的短文，并配套出题。严格按JSON schema输出，规则：
1. paragraphs：字符串数组，每个元素恰好是一个段落，4-6个段落，不要把多段合进一个字符串，正文里禁止markdown记号（不要**加粗**）。
2. idioms：文中真实出现的四字成语（必须一字不差地出现在正文里），3-5个。
3. proverbs：文中真实出现的谚语/俗语（必须一字不差地出现在正文里，例如"读万卷书，行万里路"这类），2-3条。
4. vocabWords：文中出现的、值得学习者积累的2-4字词语（必须一字不差地出现在正文里，不要包含成语和谚语），至少10个。
5. proverbDialogue：数组，每项是{npc, answer}。npc是一段生活对话或情境描述，answer是最贴切的谚语（必须从proverbs里选）。至少4项。
6. synonymContrast：数组，每项是{pair, contexts, note}。pair是文中出现的一对近义词；contexts是两个{sentence, answer}，sentence各挖一个空用"___"表示，answer是该句更合适的那个词；note用一句话说明两词区别。
7. selfStars：你对这篇文章难度的自评（1-5）。
只输出JSON。`;

/* ---- 生成结果容错解析：本地小模型不一定严格守 schema ---- */

function cleanText(text) {
  return String(text ?? "").replace(/\*\*/g, "").trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value && typeof value === "object" ? [value] : [];
}

function normalizeParagraphs(paragraphs) {
  return toArray(paragraphs)
    .flatMap((paragraph) => String(paragraph ?? "").split(/\n+/))
    .map(cleanText)
    .filter(Boolean);
}

function normalizeDialogue(dialogue) {
  return toArray(dialogue)
    .map((scene) => ({ npc: cleanText(scene?.npc), answer: cleanText(scene?.answer) }))
    .filter((scene) => scene.npc && scene.answer);
}

function normalizeSynonymContrast(groups) {
  return toArray(groups)
    .map((group) => {
      const pair = toArray(group?.pair).map(cleanText).filter(Boolean);
      let contexts = toArray(group?.contexts);
      // 兼容 contexts 是字符串数组 + 平行 answer 数组的变体
      if (contexts.every((context) => typeof context === "string")) {
        const answers = toArray(group?.answer ?? group?.answers).map(cleanText);
        contexts = contexts.map((sentence, index) => ({ sentence, answer: answers[index] }));
      }
      return {
        pair,
        contexts: contexts
          .map((context) => ({ sentence: cleanText(context?.sentence), answer: cleanText(context?.answer) }))
          .filter((context) => context.sentence.includes("___") && pair.includes(context.answer)),
        note: cleanText(group?.note)
      };
    })
    .filter((group) => group.pair.length === 2 && group.contexts.length >= 1);
}

function readJson(key, fallbackValue) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function saveGeneratedArticles(sources) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(sources.slice(-MAX_LIBRARY)));
}

function progressKey(email) {
  return `${PROGRESS_KEY_PREFIX}:${email.trim().toLowerCase()}`;
}

// 不用 AbortSignal.timeout：旧版 Safari 没有它，会直接抛错导致误报“未运行”
async function probeOllamaBase(base) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(`${base}/api/version`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function checkOllama() {
  if (resolvedOllamaBase && (await probeOllamaBase(resolvedOllamaBase))) return true;
  for (const base of OLLAMA_BASES) {
    if (await probeOllamaBase(base)) {
      resolvedOllamaBase = base;
      return true;
    }
  }
  resolvedOllamaBase = null;
  return false;
}

async function requestArticle(targetStars) {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const response = await fetch(`${resolvedOllamaBase ?? OLLAMA_BASES[0]}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      think: false,
      format: RESPONSE_SCHEMA,
      options: { temperature: 0.85 },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `主题参考：「${topic}」（可以自由发挥相关角度）。目标难度：${targetStars}星 —— ${STAR_GUIDES[targetStars]}。`
        }
      ]
    })
  });
  if (!response.ok) throw new Error(`Ollama 返回 ${response.status}`);
  const data = await response.json();
  const rawContent = String(data.message?.content ?? "")
    .replace(/^\s*```(?:json)?/, "")
    .replace(/```\s*$/, "");
  const parsed = JSON.parse(rawContent);

  const source = {
    id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: cleanText(parsed.title || topic),
    source: "ollama",
    createdAt: Date.now(),
    paragraphTexts: normalizeParagraphs(parsed.paragraphs),
    words: toArray(parsed.vocabWords).map(cleanText).filter(Boolean),
    idioms: toArray(parsed.idioms).map(cleanText).filter(Boolean),
    proverbs: toArray(parsed.proverbs).map(cleanText).filter(Boolean),
    proverbDialogue: normalizeDialogue(parsed.proverbDialogue),
    synonymContrast: normalizeSynonymContrast(parsed.synonymContrast),
    selfStars: Number(parsed.selfStars) || targetStars
  };

  const article = buildArticle(source);
  const textLength = source.paragraphTexts.join("").length;
  if (textLength < 120 || article.words.length < 3) {
    throw new Error("生成的文章质量不达标，已丢弃");
  }
  return { article, source };
}

// 生成管理器：模块级单例，不挂在 React 生命周期上。
// StrictMode 双跑 effect、组件卸载/刷新都不会打断或吞掉进行中的生成，
// 状态变化通过订阅通知所有挂载中的组件。
const generationManager = {
  listeners: new Set(),
  status: { state: "idle", detail: "" },
  running: false,
  retryTimer: null,
  cooldownUntil: 0,

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },

  notify() {
    this.listeners.forEach((listener) => listener());
  },

  setStatus(status) {
    this.status = status;
    this.notify();
  },

  scheduleRetry() {
    if (this.retryTimer) return;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.notify(); // 触发订阅者重跑 ensureBuffer
    }, 30000);
  },

  // 手动重试：清掉冷却和定时器，立即触发一轮 ensureBuffer
  retryNow() {
    this.cooldownUntil = 0;
    if (this.retryTimer) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.notify();
  },

  async ensureBuffer(unreadCount, targetStars) {
    if (this.running) return;
    if (unreadCount >= BUFFER_TARGET) {
      // 缓冲已满就不再生成；顺便清掉过期的离线/失败提示
      if (this.status.state !== "idle") this.setStatus({ state: "idle", detail: "" });
      return;
    }
    // 失败后 30 秒冷却，防止 notify → effect → ensureBuffer 快速循环重试
    if (Date.now() < this.cooldownUntil) {
      this.scheduleRetry();
      return;
    }
    this.running = true;
    try {
      const alive = await checkOllama();
      if (!alive) {
        this.cooldownUntil = Date.now() + 30000;
        this.setStatus({
          state: "offline",
          detail: "连不上 Ollama（代理和 127.0.0.1:11434 都试过了）。请确认电脑上 Ollama 已启动；手机访问需电脑的 npm run dev 开着。30 秒后自动重试"
        });
        this.scheduleRetry();
        return;
      }
      this.setStatus({ state: "generating", detail: `正在生成新文章（目标 ${targetStars} 星）…` });
      const { source } = await requestArticle(targetStars);
      const savedSources = readJson(LIBRARY_KEY, []);
      saveGeneratedArticles([...savedSources, source].slice(-MAX_LIBRARY));
      this.setStatus({ state: "idle", detail: "" });
    } catch (error) {
      this.cooldownUntil = Date.now() + 30000;
      this.setStatus({ state: "error", detail: `生成失败：${error.message}（30 秒后自动重试）` });
      this.scheduleRetry();
    } finally {
      this.running = false;
      this.notify();
    }
  }
};

export function useArticleLibrary(email) {
  const [tick, setTick] = React.useState(0);
  const [progress, setProgress] = React.useState(() =>
    readJson(progressKey(email), { readIds: [], currentId: seedArticle.id })
  );
  const [targetStars, setTargetStarsState] = React.useState(() => readJson(TARGET_KEY, 3));

  React.useEffect(
    () => generationManager.subscribe(() => setTick((current) => current + 1)),
    []
  );

  const sources = React.useMemo(() => readJson(LIBRARY_KEY, []), [tick]);
  const status = generationManager.status;

  // 存的是生成参数而不是分好段的结果，加载时重建，保证分词/难度逻辑升级后旧文章也跟着更新。
  const articles = React.useMemo(() => {
    const generated = (Array.isArray(sources) ? sources : [])
      .map((item) => {
        try {
          return buildArticle(item);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return [seedArticle, ...generated];
  }, [sources]);

  const readIds = progress.readIds || [];
  const current =
    articles.find((article) => article.id === progress.currentId) ||
    articles.find((article) => !readIds.includes(article.id)) ||
    seedArticle;
  const unreadCount = articles.filter(
    (article) => !readIds.includes(article.id) && article.id !== current.id
  ).length;

  React.useEffect(() => {
    localStorage.setItem(progressKey(email), JSON.stringify(progress));
  }, [email, progress]);

  const setTargetStars = React.useCallback((stars) => {
    setTargetStarsState(stars);
    localStorage.setItem(TARGET_KEY, JSON.stringify(stars));
  }, []);

  // 后台补货：未读缓冲不足 BUFFER_TARGET 时串行生成；管理器自己处理重试与并发。
  React.useEffect(() => {
    generationManager.ensureBuffer(unreadCount, targetStars);
  }, [unreadCount, targetStars, tick]);

  const retryGeneration = React.useCallback(() => generationManager.retryNow(), []);

  const selectArticle = React.useCallback((id) => {
    setProgress((prev) => ({ ...prev, currentId: id }));
  }, []);

  const completeCurrent = React.useCallback(() => {
    setProgress((prev) => {
      const nextRead = prev.readIds.includes(current.id) ? prev.readIds : [...prev.readIds, current.id];
      const next = articles.find((article) => !nextRead.includes(article.id) && article.id !== current.id);
      return { readIds: nextRead, currentId: next ? next.id : current.id };
    });
  }, [articles, current.id]);

  return {
    articles,
    current,
    readIds,
    unreadCount,
    status,
    targetStars,
    setTargetStars,
    retryGeneration,
    selectArticle,
    completeCurrent
  };
}
