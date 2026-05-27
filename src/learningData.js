export const notebooks = [
  { key: "characters", title: "生字本", itemLabel: "字", colorName: "红色", className: "red" },
  { key: "words", title: "生词本", itemLabel: "词", colorName: "黄色", className: "yellow" },
  { key: "idioms", title: "成语本", itemLabel: "成语", colorName: "绿色", className: "green" },
  { key: "proverbs", title: "谚语本", itemLabel: "谚语", colorName: "蓝色", className: "blue" }
];

export const article = [
  [
    { words: ["清晨"] },
    { text: "，" },
    { words: ["校园", "的", "操场", "还", "带着", "露水"] },
    { text: "。" },
    { words: ["IB", "中文", "班", "的", "学生", "围坐", "在", "树荫", "下"] },
    { text: "，" },
    { words: ["讨论", "城市", "更新", "如何", "改变", "普通人", "的", "生活"] },
    { text: "。" }
  ],
  [
    { words: ["老师", "先", "读", "出", "一句", "话"] },
    { text: "：" },
    { words: ["读万卷书", "行万里路"], type: "proverbs", value: "读万卷书，行万里路" },
    { text: "。" },
    { words: ["她", "说", "阅读", "让", "我们", "看见", "远方"] },
    { text: "，" },
    { words: ["而", "实地", "观察", "让", "知识", "变得", "具体"] },
    { text: "。" }
  ],
  [
    { words: ["小林", "采访", "了", "附近", "老街", "的", "居民"] },
    { text: "。" },
    { words: ["有些", "老人", "担心", "传统", "店铺", "消失"] },
    { text: "，" },
    { words: ["也", "有", "年轻人", "认为", "新的", "图书馆", "和", "步行道", "能", "改善", "社区", "环境"] },
    { text: "。" },
    { words: ["大家", "的", "观点", "不同"] },
    { text: "，" },
    { words: ["却", "都", "希望", "城市", "发展", "能够"] },
    { words: ["因地制宜"], type: "idioms", value: "因地制宜" },
    { text: "。" }
  ],
  [
    { words: ["在", "整理", "资料", "时"] },
    { text: "，" },
    { words: ["小组", "成员", "发现", "语言", "学习", "并", "不是", "一朝一夕", "的", "事情"] },
    { text: "。" },
    { words: ["正", "所谓"] },
    { text: "“" },
    { words: ["滴水穿石", "非一日之功"], type: "proverbs", value: "滴水穿石，非一日之功" },
    { text: "”" },
    { text: "，" },
    { words: ["只有"] },
    { words: ["持之以恒"], type: "idioms", value: "持之以恒" },
    { text: "，" },
    { words: ["才能", "在", "听说读写", "中", "慢慢", "积累", "信心"] },
    { text: "。" }
  ],
  [
    { words: ["最后", "展示", "那天"] },
    { text: "，" },
    { words: ["同学", "们", "把", "采访", "录音", "照片", "和", "文字", "材料", "组合", "成", "一份", "报告"] },
    { text: "。" },
    { words: ["他们", "明白", "了"] },
    { words: ["同舟共济"], type: "idioms", value: "同舟共济" },
    { words: ["的", "意义"] },
    { text: "：" },
    { words: ["众人拾柴火焰高"], type: "proverbs", value: "众人拾柴火焰高" },
    { text: "。" },
    { words: ["这", "篇", "阅读", "也", "提醒", "他们"] },
    { text: "，" },
    { words: ["学习", "中文", "要", "经常"] },
    { words: ["温故知新"], type: "idioms", value: "温故知新" },
    { text: "。" }
  ]
];

export const emptyCollections = {
  characters: [],
  words: [],
  idioms: [],
  proverbs: []
};

export const learningEntries = {
  characters: {
    清: { pinyin: "qing1", meaning: "清澈、清新，也可表示时间很早。", synonyms: ["澈", "净"], antonyms: ["浊"], example: "清晨的空气很清新。" },
    晨: { pinyin: "chen2", meaning: "早晨，太阳升起前后的时间。", synonyms: ["早"], antonyms: ["暮"], example: "晨光照进了教室。" },
    校: { pinyin: "xiao4", meaning: "学校，也可表示校正。", synonyms: ["学"], antonyms: ["无"], example: "校园里有很多树。" },
    园: { pinyin: "yuan2", meaning: "种植花木或供人活动的地方。", synonyms: ["苑"], antonyms: ["无"], example: "公园里很安静。" },
    城: { pinyin: "cheng2", meaning: "城市或城墙。", synonyms: ["市"], antonyms: ["乡"], example: "这座城市发展很快。" },
    市: { pinyin: "shi4", meaning: "人口集中、商业发达的地方。", synonyms: ["城"], antonyms: ["村"], example: "城市需要保留文化记忆。" },
    读: { pinyin: "du2", meaning: "看着文字念出声音或理解内容。", synonyms: ["阅"], antonyms: ["写"], example: "他每天读中文文章。" },
    书: { pinyin: "shu1", meaning: "装订成册的文字资料。", synonyms: ["册"], antonyms: ["无"], example: "读书能开阔眼界。" },
    路: { pinyin: "lu4", meaning: "道路，也比喻方法或经历。", synonyms: ["道"], antonyms: ["无"], example: "行万里路能增长见识。" },
    居: { pinyin: "ju1", meaning: "居住、停留。", synonyms: ["住"], antonyms: ["迁"], example: "居民关心社区变化。" },
    民: { pinyin: "min2", meaning: "人民、民众。", synonyms: ["众"], antonyms: ["官"], example: "居民提出了自己的意见。" },
    传: { pinyin: "chuan2", meaning: "传递、流传。", synonyms: ["递"], antonyms: ["断"], example: "传统文化需要传承。" },
    统: { pinyin: "tong3", meaning: "系统、一脉相承的关系。", synonyms: ["系"], antonyms: ["散"], example: "传统店铺保留老街特色。" },
    宜: { pinyin: "yi2", meaning: "适合、应当。", synonyms: ["适"], antonyms: ["忌"], example: "计划要因地制宜。" },
    恒: { pinyin: "heng2", meaning: "长久不变。", synonyms: ["常"], antonyms: ["变"], example: "学习贵在持之以恒。" },
    舟: { pinyin: "zhou1", meaning: "小船，也可比喻共同处境。", synonyms: ["船"], antonyms: ["岸"], example: "大家同舟共济完成报告。" },
    柴: { pinyin: "chai2", meaning: "可作燃料的木头。", synonyms: ["薪"], antonyms: ["无"], example: "众人拾柴火焰高。" },
    焰: { pinyin: "yan4", meaning: "火苗、火光。", synonyms: ["火"], antonyms: ["水"], example: "火焰越烧越旺。" },
    故: { pinyin: "gu4", meaning: "旧的、过去的，也表示原因。", synonyms: ["旧"], antonyms: ["新"], example: "温故知新是好习惯。" },
    新: { pinyin: "xin1", meaning: "刚出现的、没有用过的。", synonyms: ["鲜"], antonyms: ["旧"], example: "新的图书馆很受欢迎。" }
  },
  words: {
    清晨: { meaning: "早晨，通常指天刚亮的时候。", synonyms: ["早晨", "晨间"], antonyms: ["黄昏", "夜晚"], example: "清晨，校园的操场还带着露水。" },
    校园: { meaning: "学校内的区域和环境。", synonyms: ["学校", "校区"], antonyms: ["校外"], example: "校园里传来朗读声。" },
    操场: { meaning: "学校或公共场所里运动、集合的场地。", synonyms: ["运动场"], antonyms: ["教室"], example: "同学们在操场跑步。" },
    露水: { meaning: "夜间空气遇冷凝结在地面或植物上的小水珠。", synonyms: ["露珠"], antonyms: ["干燥"], example: "草叶上有晶莹的露水。" },
    中文: { meaning: "汉语及其文字，也指中文课程。", synonyms: ["汉语", "华文"], antonyms: ["外文"], example: "她正在学习IB中文。" },
    围坐: { meaning: "许多人围成一圈坐着。", synonyms: ["环坐"], antonyms: ["散坐"], example: "学生围坐在树荫下讨论。" },
    树荫: { meaning: "树木遮住阳光形成的阴凉处。", synonyms: ["树阴"], antonyms: ["烈日"], example: "树荫下很凉快。" },
    讨论: { meaning: "就某个问题交换意见。", synonyms: ["商量", "探讨"], antonyms: ["沉默"], example: "他们讨论城市更新的影响。" },
    城市: { meaning: "人口集中、经济文化活动丰富的地区。", synonyms: ["都市"], antonyms: ["乡村"], example: "城市需要兼顾发展与记忆。" },
    更新: { meaning: "使旧的事物变新或改善。", synonyms: ["改造", "升级"], antonyms: ["保守"], example: "城市更新改变了社区面貌。" },
    改变: { meaning: "使事物产生不同。", synonyms: ["变化", "改动"], antonyms: ["保持"], example: "阅读改变了他的看法。" },
    普通人: { meaning: "平凡的一般人。", synonyms: ["平民", "大众"], antonyms: ["名人"], example: "普通人的生活也值得关注。" },
    阅读: { meaning: "看书报文章并理解内容。", synonyms: ["读书", "阅览"], antonyms: ["书写"], example: "阅读让我们看见远方。" },
    实地: { meaning: "到事情发生或研究对象所在的地方。", synonyms: ["现场"], antonyms: ["远程"], example: "实地观察让知识更具体。" },
    观察: { meaning: "仔细看并分析。", synonyms: ["察看", "观测"], antonyms: ["忽视"], example: "小林观察了老街的变化。" },
    具体: { meaning: "明确、实在，不抽象。", synonyms: ["明确", "实际"], antonyms: ["抽象"], example: "他的例子很具体。" },
    采访: { meaning: "为了了解情况而访问他人。", synonyms: ["访问"], antonyms: ["回避"], example: "小林采访了老街居民。" },
    附近: { meaning: "离某处不远的地方。", synonyms: ["周边"], antonyms: ["远处"], example: "附近有一家老书店。" },
    居民: { meaning: "住在某个地方的人。", synonyms: ["住户"], antonyms: ["游客"], example: "居民关心社区环境。" },
    传统: { meaning: "长期流传下来的思想、习俗或方式。", synonyms: ["习俗", "旧有"], antonyms: ["现代"], example: "传统店铺有独特价值。" },
    消失: { meaning: "逐渐不见或不再存在。", synonyms: ["消散", "不见"], antonyms: ["出现"], example: "一些老店正在消失。" },
    图书馆: { meaning: "收藏和借阅书籍资料的公共场所。", synonyms: ["书馆"], antonyms: ["无"], example: "新的图书馆改善了社区环境。" },
    步行道: { meaning: "专供行人走路的道路。", synonyms: ["人行道"], antonyms: ["车道"], example: "步行道让居民出行更安全。" },
    改善: { meaning: "使情况变得更好。", synonyms: ["改进", "优化"], antonyms: ["恶化"], example: "新的设施改善了社区环境。" },
    社区: { meaning: "一定区域内共同生活的人群和环境。", synonyms: ["小区"], antonyms: ["个体"], example: "社区需要居民共同维护。" },
    观点: { meaning: "对事情的看法。", synonyms: ["看法", "意见"], antonyms: ["事实"], example: "大家的观点不完全相同。" },
    发展: { meaning: "事物由小到大、由简单到复杂地变化。", synonyms: ["进步", "成长"], antonyms: ["停滞"], example: "城市发展要照顾居民需要。" },
    整理: { meaning: "使资料或物品有条理。", synonyms: ["归纳", "收拾"], antonyms: ["打乱"], example: "他们正在整理采访资料。" },
    资料: { meaning: "可供参考的信息和材料。", synonyms: ["材料", "信息"], antonyms: ["无"], example: "资料越完整，报告越有说服力。" },
    语言: { meaning: "人类表达思想、交流信息的系统。", synonyms: ["话语"], antonyms: ["沉默"], example: "语言学习需要长期积累。" },
    学习: { meaning: "通过阅读、练习等获得知识技能。", synonyms: ["求学", "研习"], antonyms: ["荒废"], example: "学习中文要经常复习。" },
    积累: { meaning: "一点一点地增加。", synonyms: ["累积"], antonyms: ["消耗"], example: "词汇需要慢慢积累。" },
    信心: { meaning: "相信自己能做好某事的心理。", synonyms: ["自信"], antonyms: ["怀疑"], example: "练习让他更有信心。" },
    展示: { meaning: "清楚地表现或陈列出来。", synonyms: ["展现", "呈现"], antonyms: ["隐藏"], example: "最后展示那天，同学们很紧张。" },
    报告: { meaning: "对调查、研究或工作结果的说明。", synonyms: ["汇报"], antonyms: ["沉默"], example: "他们完成了一份报告。" },
    意义: { meaning: "价值、作用或含义。", synonyms: ["价值", "含义"], antonyms: ["无意义"], example: "合作的意义很重要。" },
    提醒: { meaning: "使别人注意或想起。", synonyms: ["提示"], antonyms: ["隐瞒"], example: "这篇阅读提醒他们坚持学习。" }
  },
  idioms: {
    因地制宜: { meaning: "根据不同地方的具体情况制定合适办法。", synonyms: ["因势利导"], antonyms: ["一概而论"], example: "城市发展要因地制宜，不能照搬别处经验。" },
    持之以恒: { meaning: "长久坚持下去，不中途放弃。", synonyms: ["坚持不懈"], antonyms: ["半途而废"], example: "学习中文需要持之以恒。" },
    同舟共济: { meaning: "比喻在困难中团结互助。", synonyms: ["风雨同舟"], antonyms: ["各自为政"], example: "小组成员同舟共济，完成了展示。" },
    温故知新: { meaning: "复习旧知识，从中获得新的理解。", synonyms: ["学而时习"], antonyms: ["喜新厌旧"], example: "考试前温故知新很有帮助。" }
  },
  proverbs: {
    "读万卷书，行万里路": { meaning: "既要多读书，也要多实践、见世面。", synonyms: ["知行合一"], antonyms: ["纸上谈兵"], example: "老师用“读万卷书，行万里路”鼓励学生实地观察。" },
    "滴水穿石，非一日之功": { meaning: "成功来自长期坚持，不是一两天能完成的。", synonyms: ["久久为功"], antonyms: ["急于求成"], example: "语言学习是滴水穿石，非一日之功。" },
    众人拾柴火焰高: { meaning: "人多力量大，大家合作效果更好。", synonyms: ["人多力量大"], antonyms: ["孤掌难鸣"], example: "众人拾柴火焰高，小组合作让报告更完整。" }
  }
};

export const fallbackEntry = {
  characters: (value) => ({
    pinyin: "见上下文",
    meaning: `“${value}”是本文中的一个单字，请结合所在词语理解。`,
    synonyms: ["见语境"],
    antonyms: ["见语境"],
    example: `请在文章中找到“${value}”并读一遍。`
  }),
  words: (value) => ({
    meaning: `“${value}”是本文中的词语，请结合句子理解。`,
    synonyms: ["近义词需查证"],
    antonyms: ["反义词需查证"],
    example: `请用“${value}”造一个句子。`
  }),
  idioms: (value) => ({
    meaning: `“${value}”是本文中的成语，请结合上下文理解。`,
    synonyms: ["近义成语需查证"],
    antonyms: ["反义表达需查证"],
    example: `请用“${value}”描述一个生活场景。`
  }),
  proverbs: (value) => ({
    meaning: `“${value}”是本文中的谚语，常用于说明生活经验或道理。`,
    synonyms: ["近义谚语需查证"],
    antonyms: ["反义表达需查证"],
    example: `老师用“${value}”鼓励同学。`
  })
};

export const gameData = {
  characters: {
    shapeQuiz: [
      { clue: "社区要因地制___。", answer: "宜", hint: "形近字：宜 / 宣 / 且" },
      { clue: "大家同___共济完成报告。", answer: "舟", hint: "形近字：舟 / 丹 / 船" },
      { clue: "温故知___。", answer: "新", hint: "形近字：新 / 亲 / 析" }
    ]
  },
  words: {
    fillBlank: [
      { sentence: "小林___了附近老街的居民。", answer: "采访" },
      { sentence: "新的图书馆能___社区环境。", answer: "改善" },
      { sentence: "语言学习需要慢慢___信心。", answer: "积累" }
    ],
    sevenPickFive: ["阅读", "观察", "采访", "整理", "展示", "咖啡", "篮球"],
    fiveAnswers: ["阅读", "观察", "采访", "整理", "展示"]
  },
  idioms: {
    chainPool: ["因地制宜", "宜室宜家", "家喻户晓", "晓行夜宿", "宿学旧儒", "温故知新", "新陈代谢"],
    blanks: [
      { clue: "持之以___", answer: "恒", full: "持之以恒" },
      { clue: "同舟共___", answer: "济", full: "同舟共济" },
      { clue: "温故知___", answer: "新", full: "温故知新" }
    ]
  },
  proverbs: {
    dialogue: [
      { npc: "老师：你们不能只读资料，还要去老街看看。", answer: "读万卷书，行万里路" },
      { npc: "小林：采访好多次才有结果，我差点想放弃。", answer: "滴水穿石，非一日之功" },
      { npc: "同学：我们每个人做一点，报告就完整了。", answer: "众人拾柴火焰高" }
    ]
  }
};

export function getEntry(kind, value) {
  return learningEntries[kind]?.[value] || fallbackEntry[kind](value);
}
