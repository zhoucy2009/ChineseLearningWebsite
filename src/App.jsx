import React from "react";

const notebooks = [
  { key: "characters", title: "生字本", colorName: "红色", className: "red" },
  { key: "words", title: "生词本", colorName: "黄色", className: "yellow" },
  { key: "idioms", title: "成语本", colorName: "绿色", className: "green" },
  { key: "proverbs", title: "谚语本", colorName: "蓝色", className: "blue" }
];

const article = [
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

const emptyCollections = {
  characters: [],
  words: [],
  idioms: [],
  proverbs: []
};

function startDrag(event, kind, value) {
  event.stopPropagation();
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("application/json", JSON.stringify({ kind, value }));
  event.dataTransfer.setData("text/plain", value);
}

function Character({ char }) {
  return (
    <span className="character-cell">
      <span
        className="drag-handle character-handle"
        draggable
        aria-label={`拖动字：${char}`}
        title={`拖动字：${char}`}
        onDragStart={(event) => startDrag(event, "characters", char)}
      />
      <span className="character-text">{char}</span>
    </span>
  );
}

function Word({ text }) {
  return (
    <span className="word-unit">
      <span className="word-characters">
        {[...text].map((char, index) => (
          <Character key={`${text}-${char}-${index}`} char={char} />
        ))}
      </span>
      <span
        className="drag-handle word-handle"
        draggable
        aria-label={`拖动词：${text}`}
        title={`拖动词：${text}`}
        onDragStart={(event) => startDrag(event, "words", text)}
      />
    </span>
  );
}

function Segment({ segment, segmentIndex }) {
  if (segment.text) {
    return <span className="punctuation">{segment.text}</span>;
  }

  const content = (
    <>
      {segment.words.map((word, wordIndex) => (
        <Word key={`${segmentIndex}-${word}-${wordIndex}`} text={word} />
      ))}
    </>
  );

  if (!segment.type) {
    return <span className="plain-segment">{content}</span>;
  }

  const isIdiom = segment.type === "idioms";
  return (
    <span className={`special-segment ${isIdiom ? "idiom-segment" : "proverb-segment"}`}>
      {isIdiom ? (
        <span
          className="drag-handle phrase-handle idiom-handle"
          draggable
          aria-label={`拖动成语：${segment.value}`}
          title={`拖动成语：${segment.value}`}
          onDragStart={(event) => startDrag(event, "idioms", segment.value)}
        />
      ) : null}
      {content}
      {!isIdiom ? (
        <span
          className="drag-handle phrase-handle proverb-handle"
          draggable
          aria-label={`拖动谚语：${segment.value}`}
          title={`拖动谚语：${segment.value}`}
          onDragStart={(event) => startDrag(event, "proverbs", segment.value)}
        />
      ) : null}
    </span>
  );
}

function DropZone({ notebook, items, onDropItem }) {
  return (
    <section
      className={`notebook ${notebook.className}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => onDropItem(event, notebook.key)}
    >
      <div>
        <h2>{notebook.title}</h2>
        <p>{notebook.colorName}区域</p>
      </div>
      <div className="notebook-items">
        {items.length === 0 ? (
          <span className="empty-note">拖到这里</span>
        ) : (
          items.map((item) => (
            <span className="saved-item" key={item}>
              {item}
            </span>
          ))
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [collections, setCollections] = React.useState(emptyCollections);

  function handleDrop(event, targetKind) {
    event.preventDefault();
    const rawData = event.dataTransfer.getData("application/json");
    if (!rawData) return;

    const dragged = JSON.parse(rawData);
    if (dragged.kind !== targetKind) return;

    setCollections((current) => ({
      ...current,
      [targetKind]: current[targetKind].includes(dragged.value)
        ? current[targetKind]
        : [...current[targetKind], dragged.value]
    }));
  }

  return (
    <main className="learning-page">
      <section className="article-card">
        <div className="article-heading">
          <p>IB中文阅读</p>
          <h1>城市的记忆与未来</h1>
        </div>

        <div className="legend">
          <span><b className="dot red-dot" />上方红色把手：字</span>
          <span><b className="dot yellow-dot" />下方黄色把手：词</span>
          <span><b className="dot green-dot" />左方绿色把手：成语</span>
          <span><b className="dot blue-dot" />右方蓝色把手：谚语</span>
        </div>

        <article className="reading-text" aria-label="IB中文阅读文章">
          {article.map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex}>
              {paragraph.map((segment, segmentIndex) => (
                <Segment
                  key={`${paragraphIndex}-${segmentIndex}`}
                  segment={segment}
                  segmentIndex={`${paragraphIndex}-${segmentIndex}`}
                />
              ))}
            </p>
          ))}
        </article>
      </section>

      <aside className="notebook-panel" aria-label="右侧学习本">
        {notebooks.map((notebook) => (
          <DropZone
            key={notebook.key}
            notebook={notebook}
            items={collections[notebook.key]}
            onDropItem={handleDrop}
          />
        ))}
      </aside>
    </main>
  );
}
