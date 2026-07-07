// 文章数据层：种子文章、文本工具、难度评估。
// 字词释义一律走 dictionary.js 实时查询，这里不存任何释义。
// 每篇文章自带专属的语境内容（谚语对话、近义词对比），生成的文章由模型一并产出。

export const notebooks = [
  { key: "characters", title: "生字本", itemLabel: "字", colorName: "红色", className: "red" },
  { key: "words", title: "生词本", itemLabel: "词", colorName: "黄色", className: "yellow" },
  { key: "idioms", title: "成语本", itemLabel: "成语", colorName: "绿色", className: "green" },
  { key: "proverbs", title: "谚语本", itemLabel: "谚语", colorName: "蓝色", className: "blue" }
];

export const emptyCollections = {
  characters: [],
  words: [],
  idioms: [],
  proverbs: []
};

const HAN_RE = /[一-鿿]/;

// 常见成语库：① 成语接龙 NPC 的储备词 ② 扫描文章正文自动识别成语
// （本地小模型常“声明了成语但没写进正文”，靠扫描兜底，不依赖模型自报）。
export const KNOWN_IDIOMS = [
  "因地制宜", "宜室宜家", "家喻户晓", "晓行夜宿", "温故知新", "新陈代谢", "谢天谢地", "地久天长",
  "长年累月", "月明星稀", "稀世之宝", "同舟共济", "济济一堂", "堂堂正正", "正大光明", "明知故问",
  "问心无愧", "持之以恒", "恒河沙数", "数一数二", "二话不说", "说一不二", "一心一意", "意气风发",
  "发愤图强", "强人所难", "难能可贵", "难以置信", "信口开河", "信手拈来", "来日方长",
  "长驱直入", "入木三分", "分秒必争", "争先恐后", "后来居上", "上行下效", "一鸣惊人", "人山人海",
  "海阔天空", "空前绝后", "后顾之忧", "天下无双", "双管齐下", "下笔成章", "马到成功", "功成名就",
  "就事论事", "事半功倍", "事在人为", "为所欲为", "心想事成", "成千上万", "万紫千红", "万无一失",
  "失而复得", "得心应手", "手忙脚乱", "乱七八糟", "手到擒来", "来龙去脉", "脉脉含情", "情同手足",
  "足智多谋", "谋事在人", "人定胜天", "天长地久", "久别重逢", "逢凶化吉", "吉祥如意", "意味深长",
  "长治久安", "安居乐业", "业精于勤", "勤能补拙", "自力更生", "生龙活虎", "虎头蛇尾", "微不足道",
  "道听途说", "说三道四", "四面八方", "四海为家", "家常便饭", "口是心非", "非同小可", "可想而知",
  "知难而进", "进退两难", "难分难解", "十全十美", "美中不足", "足不出户", "龙飞凤舞", "舞文弄墨",
  "墨守成规", "春暖花开", "开门见山", "山清水秀", "秀外慧中", "中流砥柱", "水滴石穿", "穿针引线",
  "眼高手低", "低声下气", "气壮山河", "百发百中", "自强不息", "息息相关", "关怀备至", "至理名言",
  "言而有信", "信以为真", "真心实意", "意在言外", "学以致用", "用武之地", "地大物博", "博古通今",
  "今非昔比", "比比皆是", "是非分明", "明察秋毫", "毫不犹豫", "千军万马", "马不停蹄", "一言为定",
  "古往今来", "天涯海角", "归心似箭", "张灯结彩", "喜气洋洋", "阖家团圆", "络绎不绝", "热闹非凡",
  "欢聚一堂", "其乐融融", "望而却步", "张冠李戴", "日积月累", "豁然开朗", "循序渐进", "全力以赴",
  "受益匪浅", "潜移默化", "耳濡目染", "身临其境", "记忆犹新", "恍然大悟", "聚精会神", "全神贯注"
];

// 把一段纯文本按「谚语 > 成语 > 词语」优先级切成可拖拽的分段。
export function segmentParagraph(text, { words = [], idioms = [], proverbs = [] }) {
  const phrases = [
    ...proverbs.map((value) => ({ value, type: "proverb" })),
    ...idioms.map((value) => ({ value, type: "idiom" })),
    ...words.map((value) => ({ value, type: "word" }))
  ]
    .filter((phrase) => phrase.value)
    .sort((a, b) => b.value.length - a.value.length);

  const segments = [];
  let plainRun = "";

  function flushPlain() {
    if (!plainRun) return;
    // 汉字连续段可拖单字，非汉字段按标点/原样展示。
    let hanRun = "";
    let otherRun = "";
    for (const char of plainRun) {
      if (HAN_RE.test(char)) {
        if (otherRun) segments.push({ text: otherRun });
        otherRun = "";
        hanRun += char;
      } else {
        if (hanRun) segments.push({ type: "plain", text: hanRun });
        hanRun = "";
        otherRun += char;
      }
    }
    if (hanRun) segments.push({ type: "plain", text: hanRun });
    if (otherRun) segments.push({ text: otherRun });
    plainRun = "";
  }

  let index = 0;
  while (index < text.length) {
    const match = phrases.find((phrase) => text.startsWith(phrase.value, index));
    if (match) {
      flushPlain();
      segments.push({ type: match.type, text: match.value });
      index += match.value.length;
    } else {
      plainRun += text[index];
      index += 1;
    }
  }
  flushPlain();
  return segments;
}

export function buildArticle({
  id,
  title,
  source,
  paragraphTexts,
  words = [],
  idioms = [],
  proverbs = [],
  proverbDialogue = [],
  synonymContrast = [],
  selfStars = null,
  createdAt = Date.now()
}) {
  // 只保留真的出现在正文里的短语，防止模型「说了但没写」；
  // 同时用成语库扫描正文，补上模型没申报但实际用了的成语。
  const fullText = paragraphTexts.join("");
  const presentProverbs = proverbs.filter((item) => fullText.includes(item));
  const presentIdioms = Array.from(
    new Set([
      ...idioms.filter((item) => fullText.includes(item)),
      ...KNOWN_IDIOMS.filter((item) => fullText.includes(item))
    ])
  ).filter((item) => !presentProverbs.includes(item));
  const presentWords = words.filter((item) => fullText.includes(item));

  const article = {
    id,
    title,
    source,
    createdAt,
    words: presentWords,
    idioms: presentIdioms,
    proverbs: presentProverbs,
    paragraphs: paragraphTexts.map((text) =>
      segmentParagraph(text, { words: presentWords, idioms: presentIdioms, proverbs: presentProverbs })
    ),
    proverbDialogue: proverbDialogue.filter((scene) => scene?.npc && presentProverbs.includes(scene.answer)),
    synonymContrast: synonymContrast.filter(
      (group) =>
        Array.isArray(group?.pair) &&
        group.pair.length === 2 &&
        Array.isArray(group?.contexts) &&
        group.contexts.every((context) => context?.sentence?.includes("___") && group.pair.includes(context.answer))
    ),
    selfStars
  };
  article.stars = rateDifficulty(article);
  return article;
}

export function articlePlainText(article) {
  return article.paragraphs
    .map((segments) => segments.map((segment) => segment.text).join(""))
    .join("\n");
}

export function articleSentences(article) {
  return articlePlainText(article)
    .split(/[。！？\n]+/)
    .map((sentence) => sentence.trim().replace(/^[，、；：""'']+/, ""))
    .filter((sentence) => sentence.length >= 6);
}

// 难度启发式（1-5 星）：句长、篇幅、成语谚语密度、用字丰富度。
// 文章加载时实时计算；若模型给了自评分，则各占一半。
export function rateDifficulty(article) {
  const text = articlePlainText(article).replace(/\s/g, "");
  const hanChars = [...text].filter((char) => HAN_RE.test(char));
  const length = hanChars.length || 1;

  const sentences = text.split(/[。！？]/).filter((sentence) => sentence.length > 2);
  const avgSentence = sentences.length ? length / sentences.length : length;

  const phraseCount = (article.idioms?.length || 0) + (article.proverbs?.length || 0);
  const phraseDensity = phraseCount / (length / 100);
  const uniqueRatio = new Set(hanChars).size / length;

  let score = 1;
  score += Math.min(1.4, Math.max(0, (length - 150) / 400));        // 篇幅 150→550+ 字
  score += Math.min(1.3, Math.max(0, (avgSentence - 12) / 18));     // 平均句长 12→30 字
  score += Math.min(0.8, phraseDensity / 2.5);                      // 每百字成语谚语数
  score += Math.min(0.5, Math.max(0, (uniqueRatio - 0.42) * 3));    // 用字丰富度

  const heuristic = Math.min(5, Math.max(1, score));
  const combined = article.selfStars
    ? (heuristic + Math.min(5, Math.max(1, article.selfStars))) / 2
    : heuristic;
  return Math.min(5, Math.max(1, Math.round(combined)));
}

export const seedArticle = buildArticle({
  id: "seed-city-memory",
  title: "城市的记忆与未来",
  source: "seed",
  createdAt: 0,
  paragraphTexts: [
    "清晨，校园的操场还带着露水。IB中文班的学生围坐在树荫下，讨论城市更新如何改变普通人的生活。",
    "老师先读出一句话：读万卷书，行万里路。她说阅读让我们看见远方，而实地观察让知识变得具体。",
    "小林采访了附近老街的居民。有些老人担心传统店铺消失，也有年轻人认为新的图书馆和步行道能改善社区环境。大家的观点不同，却都希望城市发展能够因地制宜。",
    "在整理资料时，小组成员发现语言学习并不是一朝一夕的事情。正所谓“滴水穿石，非一日之功”，只有持之以恒，才能在听说读写中慢慢积累信心。",
    "最后展示那天，同学们把采访录音、照片和文字材料组合成一份报告。他们明白了同舟共济的意义：众人拾柴火焰高。这篇阅读也提醒他们，学习中文要经常温故知新。"
  ],
  words: [
    "清晨", "校园", "操场", "带着", "露水", "中文", "学生", "围坐", "树荫", "讨论",
    "城市更新", "改变", "普通人", "生活", "老师", "阅读", "看见", "远方", "实地观察",
    "知识", "具体", "小林", "采访", "附近", "老街", "居民", "老人", "担心", "传统店铺",
    "消失", "年轻人", "认为", "图书馆", "步行道", "改善", "社区环境", "观点", "希望",
    "城市发展", "整理资料", "小组成员", "发现", "语言学习", "听说读写", "积累", "信心",
    "展示", "采访录音", "照片", "文字材料", "组合", "报告", "明白", "意义", "提醒", "学习中文"
  ],
  idioms: ["因地制宜", "持之以恒", "同舟共济", "温故知新"],
  proverbs: ["读万卷书，行万里路", "滴水穿石，非一日之功", "众人拾柴火焰高"],
  proverbDialogue: [
    { npc: "老师：这次研究不能只看网上资料，还要去社区采访。", answer: "读万卷书，行万里路" },
    { npc: "小林：采访好多次才有结果，我差点想放弃。", answer: "滴水穿石，非一日之功" },
    { npc: "同学A：报告内容太多，一个人做不完。同学B：我们分工合作吧。", answer: "众人拾柴火焰高" },
    { npc: "老师：不要怕一开始说得慢，只要每天练一点，最后会进步。", answer: "滴水穿石，非一日之功" },
    { npc: "小林：我读了资料，但还是不懂居民真正的想法。老师：那就去现场听听他们怎么说。", answer: "读万卷书，行万里路" },
    { npc: "组长：照片、录音、文字都有人负责，今天效率特别高。", answer: "众人拾柴火焰高" }
  ],
  synonymContrast: [
    {
      pair: ["改变", "改善"],
      contexts: [
        { sentence: "新的步行道能___社区环境。", answer: "改善" },
        { sentence: "这次采访___了他对老街的看法。", answer: "改变" }
      ],
      note: "“改善”强调变好；“改变”强调发生变化，不一定更好。"
    },
    {
      pair: ["整理", "组合"],
      contexts: [
        { sentence: "展示前，小组先___采访资料。", answer: "整理" },
        { sentence: "他们把照片、录音和文字___成报告。", answer: "组合" }
      ],
      note: "“整理”强调有条理；“组合”强调把不同部分合在一起。"
    }
  ],
  selfStars: 3
});
