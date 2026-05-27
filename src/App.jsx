import React from "react";
import {
  article,
  emptyCollections,
  gameData,
  getEntry,
  learningEntries,
  notebooks
} from "./learningData.js";

const notebookByKey = Object.fromEntries(notebooks.map((notebook) => [notebook.key, notebook]));

function startDrag(event, kind, value) {
  event.stopPropagation();
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("application/json", JSON.stringify({ kind, value }));
  event.dataTransfer.setData("text/plain", value);
}

function joinList(items) {
  return items?.join("、") || "暂无";
}

function useMeaningTooltip() {
  const [tooltip, setTooltip] = React.useState(null);
  const longPressTimer = React.useRef(null);

  function showTooltip(event, kind, value) {
    const rect = event.currentTarget.getBoundingClientRect();
    const entry = getEntry(kind, value);
    setTooltip({
      value,
      meaning: entry.meaning,
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  }

  function hideTooltip() {
    window.clearTimeout(longPressTimer.current);
    setTooltip(null);
  }

  function getHandleProps(kind, value) {
    return {
      onMouseEnter: (event) => showTooltip(event, kind, value),
      onMouseLeave: hideTooltip,
      onFocus: (event) => showTooltip(event, kind, value),
      onBlur: hideTooltip,
      onTouchStart: (event) => {
        window.clearTimeout(longPressTimer.current);
        longPressTimer.current = window.setTimeout(() => {
          showTooltip(event, kind, value);
        }, 520);
      },
      onTouchEnd: hideTooltip,
      onTouchCancel: hideTooltip
    };
  }

  return { tooltip, getHandleProps };
}

function MeaningTooltip({ tooltip }) {
  if (!tooltip) return null;

  return (
    <div
      className="meaning-tooltip"
      style={{ left: tooltip.x, top: tooltip.y }}
      role="status"
    >
      <strong>{tooltip.value}</strong>
      <span>{tooltip.meaning}</span>
    </div>
  );
}

function Character({ char, getHandleProps }) {
  return (
    <span className="character-cell">
      <span
        className="drag-handle character-handle"
        draggable
        tabIndex={0}
        aria-label={`拖动字：${char}`}
        onDragStart={(event) => startDrag(event, "characters", char)}
        {...getHandleProps("characters", char)}
      />
      <span className="character-text">{char}</span>
    </span>
  );
}

function Word({ text, getHandleProps }) {
  return (
    <span className="word-unit">
      <span className="word-characters">
        {[...text].map((char, index) => (
          <Character
            key={`${text}-${char}-${index}`}
            char={char}
            getHandleProps={getHandleProps}
          />
        ))}
      </span>
      <span
        className="drag-handle word-handle"
        draggable
        tabIndex={0}
        aria-label={`拖动词：${text}`}
        onDragStart={(event) => startDrag(event, "words", text)}
        {...getHandleProps("words", text)}
      />
    </span>
  );
}

function Segment({ segment, segmentIndex, getHandleProps }) {
  if (segment.text) {
    return <span className="punctuation">{segment.text}</span>;
  }

  const content = (
    <>
      {segment.words.map((word, wordIndex) => (
        <Word
          key={`${segmentIndex}-${word}-${wordIndex}`}
          text={word}
          getHandleProps={getHandleProps}
        />
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
          tabIndex={0}
          aria-label={`拖动成语：${segment.value}`}
          onDragStart={(event) => startDrag(event, "idioms", segment.value)}
          {...getHandleProps("idioms", segment.value)}
        />
      ) : null}
      {content}
      {!isIdiom ? (
        <span
          className="drag-handle phrase-handle proverb-handle"
          draggable
          tabIndex={0}
          aria-label={`拖动谚语：${segment.value}`}
          onDragStart={(event) => startDrag(event, "proverbs", segment.value)}
          {...getHandleProps("proverbs", segment.value)}
        />
      ) : null}
    </span>
  );
}

function DropZone({ notebook, items, onDropItem, onOpen }) {
  return (
    <section
      className={`notebook ${notebook.className}`}
      role="button"
      tabIndex={0}
      aria-label={`打开${notebook.title}`}
      onClick={() => onOpen(notebook.key)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen(notebook.key);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        event.stopPropagation();
        onDropItem(event, notebook.key);
      }}
    >
      <div>
        <h2>{notebook.title}</h2>
        <p>{notebook.colorName}区域，点击查看详情</p>
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

function DetailsModal({ notebook, items, onClose, onRemove }) {
  const entries = items.map((item) => ({ item, entry: getEntry(notebook.key, item) }));

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`detail-panel ${notebook.className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="detail-header">
          <div>
            <p>{notebook.colorName}学习区</p>
            <h2 id="detail-title">{notebook.title}</h2>
          </div>
          <button className="close-button" onClick={onClose}>关闭</button>
        </div>

        <div className="table-wrap">
          <table className="detail-table">
            <thead>
              <tr>
                <th>{notebook.itemLabel}</th>
                <th>意思</th>
                <th>同义词</th>
                <th>反义词</th>
                <th>例句</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-table">还没有添加内容，先从文章拖一些进来。</td>
                </tr>
              ) : (
                entries.map(({ item, entry }) => (
                  <tr key={item}>
                    <td className="detail-item">
                      {item}
                      {entry.pinyin ? <span>{entry.pinyin}</span> : null}
                    </td>
                    <td>{entry.meaning}</td>
                    <td>{joinList(entry.synonyms)}</td>
                    <td>{joinList(entry.antonyms)}</td>
                    <td>{entry.example}</td>
                    <td>
                      <button className="danger-button" onClick={() => onRemove(notebook.key, item)}>
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <StudyGames notebookKey={notebook.key} items={items} />
      </section>
    </div>
  );
}

function StudyGames({ notebookKey, items }) {
  if (notebookKey === "characters") return <CharacterGames items={items} />;
  if (notebookKey === "words") return <WordGames items={items} />;
  if (notebookKey === "idioms") return <IdiomGames items={items} />;
  return <ProverbGames items={items} />;
}

function CharacterGames({ items }) {
  const playable = items.length ? items.slice(0, 6) : ["清", "晨", "宜", "恒"];
  const [selectedPinyin, setSelectedPinyin] = React.useState("");
  const [matched, setMatched] = React.useState({});
  const [shapeAnswers, setShapeAnswers] = React.useState({});

  function selectCharacter(char) {
    if (!selectedPinyin) return;
    const correct = getEntry("characters", char).pinyin === selectedPinyin;
    if (correct) setMatched((current) => ({ ...current, [char]: true }));
    setSelectedPinyin("");
  }

  return (
    <div className="game-card">
      <h3>小游戏：读音-字连线</h3>
      <div className="match-grid">
        <div>
          {playable.map((char) => (
            <button
              key={char}
              className={selectedPinyin === getEntry("characters", char).pinyin ? "selected-game" : "light-button"}
              onClick={() => setSelectedPinyin(getEntry("characters", char).pinyin)}
            >
              {getEntry("characters", char).pinyin}
            </button>
          ))}
        </div>
        <div>
          {playable.map((char) => (
            <button
              key={char}
              className={matched[char] ? "correct-game" : "light-button"}
              onClick={() => selectCharacter(char)}
            >
              {char}
            </button>
          ))}
        </div>
      </div>

      <h3>小游戏：形近字填空组词</h3>
      <div className="quiz-list">
        {gameData.characters.shapeQuiz.map((quiz) => (
          <label key={quiz.clue} className="quiz-row">
            <span>{quiz.clue}</span>
            <input
              maxLength="1"
              value={shapeAnswers[quiz.clue] || ""}
              onChange={(event) => {
                setShapeAnswers((current) => ({ ...current, [quiz.clue]: event.target.value }));
              }}
            />
            <small>{shapeAnswers[quiz.clue] === quiz.answer ? "答对了" : quiz.hint}</small>
          </label>
        ))}
      </div>
    </div>
  );
}

function WordGames({ items }) {
  const wordOptions = Array.from(new Set([...items, "采访", "改善", "积累", "阅读", "观察"]));
  const [fills, setFills] = React.useState({});
  const [picked, setPicked] = React.useState([]);

  function startWordGameDrag(event, word) {
    event.dataTransfer.setData("text/game-word", word);
  }

  return (
    <div className="game-card">
      <h3>小游戏：拖动填空</h3>
      <div className="game-options">
        {wordOptions.map((word) => (
          <span
            key={word}
            className="game-chip"
            draggable
            onDragStart={(event) => startWordGameDrag(event, word)}
          >
            {word}
          </span>
        ))}
      </div>
      <div className="quiz-list">
        {gameData.words.fillBlank.map((quiz) => (
          <div
            key={quiz.sentence}
            className="drop-blank"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const word = event.dataTransfer.getData("text/game-word");
              setFills((current) => ({ ...current, [quiz.sentence]: word }));
            }}
          >
            {quiz.sentence.replace("___", fills[quiz.sentence] || "______")}
            <small>{fills[quiz.sentence] === quiz.answer ? "答对了" : "把词拖到这里"}</small>
          </div>
        ))}
      </div>

      <h3>小游戏：7选5</h3>
      <div className="game-options">
        {gameData.words.sevenPickFive.map((word) => (
          <button
            key={word}
            className={picked.includes(word) ? "selected-game" : "light-button"}
            onClick={() => {
              setPicked((current) =>
                current.includes(word)
                  ? current.filter((item) => item !== word)
                  : current.length < 5
                    ? [...current, word]
                    : current
              );
            }}
          >
            {word}
          </button>
        ))}
      </div>
      <p className="game-feedback">
        {picked.length === 5
          ? gameData.words.fiveAnswers.every((answer) => picked.includes(answer))
            ? "5个学习动作都选对了。"
            : "里面混入了不相关的词，再试一次。"
          : `已选 ${picked.length}/5`}
      </p>
    </div>
  );
}

function IdiomGames({ items }) {
  const [chain, setChain] = React.useState([items[0] || "因地制宜"]);
  const [blankAnswers, setBlankAnswers] = React.useState({});
  const lastChar = chain[chain.length - 1].slice(-1);
  const candidates = gameData.idioms.chainPool.filter(
    (idiom) => idiom[0] === lastChar && !chain.includes(idiom)
  );

  return (
    <div className="game-card">
      <h3>小游戏：成语接龙</h3>
      <div className="chain-line">{chain.join(" -> ")}</div>
      <div className="game-options">
        {(candidates.length ? candidates : gameData.idioms.chainPool.slice(0, 4)).map((idiom) => (
          <button
            key={idiom}
            className="light-button"
            onClick={() => {
              if (idiom[0] === lastChar && !chain.includes(idiom)) {
                setChain((current) => [...current, idiom]);
              }
            }}
          >
            {idiom}
          </button>
        ))}
      </div>

      <h3>小游戏：四字词语挖空填字</h3>
      <div className="quiz-list">
        {gameData.idioms.blanks.map((quiz) => (
          <label key={quiz.full} className="quiz-row">
            <span>{quiz.clue}</span>
            <input
              maxLength="1"
              value={blankAnswers[quiz.full] || ""}
              onChange={(event) => {
                setBlankAnswers((current) => ({ ...current, [quiz.full]: event.target.value }));
              }}
            />
            <small>{blankAnswers[quiz.full] === quiz.answer ? `答对：${quiz.full}` : "填入缺少的字"}</small>
          </label>
        ))}
      </div>
    </div>
  );
}

function ProverbGames({ items }) {
  const options = Array.from(new Set([...items, ...Object.keys(learningEntries.proverbs)]));
  const [sceneIndex, setSceneIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const scene = gameData.proverbs.dialogue[sceneIndex];
  const currentAnswer = answers[sceneIndex];
  const isCorrect = currentAnswer === scene.answer;

  return (
    <div className="game-card dialogue-game">
      <h3>小游戏：谚语对话闯关</h3>
      <div className="npc-box">
        <p>{scene.npc}</p>
        <div
          className={`dialogue-drop ${isCorrect ? "correct-drop" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            setAnswers((current) => ({
              ...current,
              [sceneIndex]: event.dataTransfer.getData("text/proverb")
            }));
          }}
        >
          {currentAnswer || "把合适的谚语拖到这里，未完成时不能跳过"}
        </div>
      </div>
      <div className="game-options">
        {options.map((proverb) => (
          <span
            key={proverb}
            className="game-chip proverb-chip"
            draggable
            onDragStart={(event) => event.dataTransfer.setData("text/proverb", proverb)}
          >
            {proverb}
          </span>
        ))}
      </div>
      <button
        className="light-button"
        disabled={!isCorrect}
        onClick={() => setSceneIndex((current) => (current + 1) % gameData.proverbs.dialogue.length)}
      >
        {isCorrect ? "单击进入下一句" : "答对后才能跳过"}
      </button>
    </div>
  );
}

export default function App() {
  const [collections, setCollections] = React.useState(emptyCollections);
  const [openNotebook, setOpenNotebook] = React.useState(null);
  const { tooltip, getHandleProps } = useMeaningTooltip();

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

  function removeItem(kind, value) {
    setCollections((current) => ({
      ...current,
      [kind]: current[kind].filter((item) => item !== value)
    }));
  }

  const activeNotebook = openNotebook ? notebookByKey[openNotebook] : null;

  return (
    <main className="learning-page">
      <MeaningTooltip tooltip={tooltip} />
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
                  getHandleProps={getHandleProps}
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
            onOpen={setOpenNotebook}
          />
        ))}
      </aside>

      {activeNotebook ? (
        <DetailsModal
          notebook={activeNotebook}
          items={collections[activeNotebook.key]}
          onClose={() => setOpenNotebook(null)}
          onRemove={removeItem}
        />
      ) : null}
    </main>
  );
}
