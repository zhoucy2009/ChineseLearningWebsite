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
  if (!/[\u4e00-\u9fff]/.test(char)) {
    return <span className="character-text">{char}</span>;
  }

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

function TextWithCharacters({ text, getHandleProps }) {
  return (
    <span className="word-characters">
      {[...text].map((char, index) => (
        <Character
          key={`${text}-${char}-${index}`}
          char={char}
          getHandleProps={getHandleProps}
        />
      ))}
    </span>
  );
}

function Word({ text, getHandleProps }) {
  return (
    <span className="word-unit">
      <TextWithCharacters text={text} getHandleProps={getHandleProps} />
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

  if (segment.type === "word") {
    return <Word text={segment.text} getHandleProps={getHandleProps} />;
  }

  if (segment.type === "plain") {
    return (
      <span className="plain-segment">
        <TextWithCharacters text={segment.text} getHandleProps={getHandleProps} />
      </span>
    );
  }

  const isIdiom = segment.type === "idiom";
  const kind = isIdiom ? "idioms" : "proverbs";
  return (
    <span className={`special-segment ${isIdiom ? "idiom-segment" : "proverb-segment"}`}>
      {isIdiom ? (
        <span
          className="drag-handle phrase-handle idiom-handle"
          draggable
          tabIndex={0}
          aria-label={`拖动成语：${segment.text}`}
          onDragStart={(event) => startDrag(event, kind, segment.text)}
          {...getHandleProps(kind, segment.text)}
        />
      ) : null}
      <TextWithCharacters text={segment.text} getHandleProps={getHandleProps} />
      {!isIdiom ? (
        <span
          className="drag-handle phrase-handle proverb-handle"
          draggable
          tabIndex={0}
          aria-label={`拖动谚语：${segment.text}`}
          onDragStart={(event) => startDrag(event, kind, segment.text)}
          {...getHandleProps(kind, segment.text)}
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
  const leftItems = playable.map((char) => ({ char, pinyin: getEntry("characters", char).pinyin }));
  const rightItems = [...playable].reverse();
  const [selectedPinyin, setSelectedPinyin] = React.useState(null);
  const [matches, setMatches] = React.useState([]);
  const [shapeAnswers, setShapeAnswers] = React.useState({});

  function startShapeDrag(event, char) {
    event.dataTransfer.setData("text/shape-char", char);
  }

  function selectCharacter(char) {
    if (!selectedPinyin) return;
    const correct = getEntry("characters", char).pinyin === selectedPinyin.pinyin;
    setMatches((current) => [
      ...current.filter((match) => match.pinyin !== selectedPinyin.pinyin && match.char !== char),
      { pinyin: selectedPinyin.pinyin, char, correct }
    ]);
    setSelectedPinyin(null);
  }

  return (
    <div className="game-card">
      <h3>小游戏：读音-字连线</h3>
      <div className="matching-board" style={{ "--match-count": playable.length }}>
        <svg className="match-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          {matches.map((match) => {
            const leftIndex = leftItems.findIndex((item) => item.pinyin === match.pinyin);
            const rightIndex = rightItems.findIndex((char) => char === match.char);
            if (leftIndex < 0 || rightIndex < 0) return null;
            const leftY = ((leftIndex + 0.5) / playable.length) * 100;
            const rightY = ((rightIndex + 0.5) / playable.length) * 100;
            return (
              <line
                key={`${match.pinyin}-${match.char}`}
                x1="25"
                y1={leftY}
                x2="75"
                y2={rightY}
                className={match.correct ? "line-correct" : "line-wrong"}
              />
            );
          })}
        </svg>
        <div className="match-column">
          {leftItems.map((item) => (
            <button
              key={item.pinyin}
              className={selectedPinyin?.pinyin === item.pinyin ? "selected-game" : "light-button"}
              onClick={() => setSelectedPinyin(item)}
            >
              {item.pinyin}
            </button>
          ))}
        </div>
        <div className="match-column">
          {rightItems.map((char) => {
            const match = matches.find((item) => item.char === char);
            return (
            <button
              key={char}
              className={match?.correct ? "correct-game" : match ? "wrong-game" : "light-button"}
              onClick={() => selectCharacter(char)}
            >
              {char}
            </button>
            );
          })}
        </div>
      </div>

      <h3>小游戏：形近字拖动填空</h3>
      <div className="game-options">
        {Array.from(new Set(gameData.characters.shapeQuiz.flatMap((quiz) => quiz.options))).map((char) => (
          <span
            key={char}
            className="game-chip"
            draggable
            onDragStart={(event) => startShapeDrag(event, char)}
          >
            {char}
          </span>
        ))}
      </div>
      <div className="quiz-list">
        {gameData.characters.shapeQuiz.map((quiz) => (
          <div
            key={quiz.clue}
            className={`drop-blank ${shapeAnswers[quiz.clue] === quiz.answer ? "correct-drop" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              setShapeAnswers((current) => ({
                ...current,
                [quiz.clue]: event.dataTransfer.getData("text/shape-char")
              }));
            }}
          >
            <span>{quiz.clue}</span>
            <strong>{shapeAnswers[quiz.clue] || "拖字到这里"}</strong>
            <small>{shapeAnswers[quiz.clue] === quiz.answer ? "答对了" : `候选：${quiz.options.join(" / ")}`}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function WordGames({ items }) {
  const wordOptions = Array.from(new Set([...items, "采访", "改善", "积累", "阅读", "观察"]));
  const [fills, setFills] = React.useState({});
  const [fillChecked, setFillChecked] = React.useState(false);
  const [synonymAnswers, setSynonymAnswers] = React.useState({});
  const [synonymChecked, setSynonymChecked] = React.useState(false);

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
            className={`drop-blank ${
              fillChecked && fills[quiz.sentence] === quiz.answer ? "correct-drop" : ""
            } ${fillChecked && fills[quiz.sentence] && fills[quiz.sentence] !== quiz.answer ? "wrong-drop" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const word = event.dataTransfer.getData("text/game-word");
              setFills((current) => ({ ...current, [quiz.sentence]: word }));
              setFillChecked(false);
            }}
          >
            {quiz.sentence.replace("___", fills[quiz.sentence] || "______")}
            <small>
              {!fillChecked
                ? "先全部拖完，再检查"
                : fills[quiz.sentence] === quiz.answer
                  ? "答对了"
                  : `正确答案：${quiz.answer}`}
            </small>
          </div>
        ))}
      </div>
      <button className="light-button check-button" onClick={() => setFillChecked(true)}>
        检查填空答案
      </button>

      <h3>小游戏：近义词对比填空</h3>
      <div className="quiz-list">
        {gameData.words.synonymContrast.map((group) => (
          <div key={group.pair.join("-")} className="synonym-group">
            <div className="game-options">
              {group.pair.map((word) => (
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
            {group.contexts.map((context) => {
              const key = `${group.pair.join("-")}-${context.sentence}`;
              const answer = synonymAnswers[key];
              return (
                <div
                  key={key}
                  className={`drop-blank ${
                    synonymChecked && answer === context.answer ? "correct-drop" : ""
                  } ${synonymChecked && answer && answer !== context.answer ? "wrong-drop" : ""}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    setSynonymAnswers((current) => ({
                      ...current,
                      [key]: event.dataTransfer.getData("text/game-word")
                    }));
                    setSynonymChecked(false);
                  }}
                >
                  {context.sentence.replace("___", answer || "______")}
                  <small>
                    {!synonymChecked
                      ? "拖入更合适的词"
                      : answer === context.answer
                        ? "语境合适"
                        : `应选：${context.answer}`}
                  </small>
                </div>
              );
            })}
            <p className="game-feedback">{group.note}</p>
          </div>
        ))}
      </div>
      <button className="light-button check-button" onClick={() => setSynonymChecked(true)}>
        检查近义词答案
      </button>
    </div>
  );
}

function IdiomGames({ items }) {
  const pool = gameData.idioms.chainPool;
  const starters = items.length ? items.filter((item) => pool.includes(item)) : gameData.idioms.starters;
  const [chain, setChain] = React.useState([]);
  const [currentPrompt, setCurrentPrompt] = React.useState(starters[0] || gameData.idioms.starters[0]);
  const [userInput, setUserInput] = React.useState("");
  const [timeLeft, setTimeLeft] = React.useState(30);
  const [message, setMessage] = React.useState("NPC已经出题，请你接一个成语。");
  const [blankAnswers, setBlankAnswers] = React.useState({});
  const [blankChecked, setBlankChecked] = React.useState(false);
  const neededChar = currentPrompt.slice(-1);

  function findNextIdiom(char, used = []) {
    return pool.find((idiom) => idiom[0] === char && !used.includes(idiom));
  }

  function startRound(prompt = starters[0] || gameData.idioms.starters[0]) {
    setChain([{ speaker: "NPC", idiom: prompt }]);
    setCurrentPrompt(prompt);
    setUserInput("");
    setTimeLeft(30);
    setMessage("NPC已经出题，请你接一个成语。");
  }

  function continueAfterUser(userIdiom, wasAuto = false) {
    const used = [...chain.map((turn) => turn.idiom), currentPrompt, userIdiom];
    const npcReply = findNextIdiom(userIdiom.slice(-1), used);
    if (npcReply) {
      setChain((current) => [
        ...current,
        { speaker: wasAuto ? "系统代填" : "你", idiom: userIdiom },
        { speaker: "NPC", idiom: npcReply }
      ]);
      setCurrentPrompt(npcReply);
      setMessage(wasAuto ? `系统代填：${userIdiom}。NPC继续接：${npcReply}` : `接上了！NPC接：${npcReply}`);
    } else {
      const nextStarter = starters.find((item) => item !== currentPrompt) || gameData.idioms.starters[0];
      setChain((current) => [
        ...current,
        { speaker: wasAuto ? "系统代填" : "你", idiom: userIdiom },
        { speaker: "NPC", idiom: nextStarter }
      ]);
      setCurrentPrompt(nextStarter);
      setMessage("这条链暂时接不下去了，NPC换一个成语继续。");
    }
    setUserInput("");
    setTimeLeft(30);
  }

  function autoFill(reason) {
    const answer = findNextIdiom(neededChar, chain.map((turn) => turn.idiom));
    if (answer) {
      setMessage(`${reason}，系统帮你填：${answer}`);
      continueAfterUser(answer, true);
      return;
    }
    const nextStarter = gameData.idioms.starters.find((item) => item !== currentPrompt) || gameData.idioms.starters[0];
    setCurrentPrompt(nextStarter);
    setChain((current) => [...current, { speaker: "NPC", idiom: nextStarter }]);
    setUserInput("");
    setTimeLeft(30);
    setMessage(`${reason}，这一轮没有可接成语，NPC换题。`);
  }

  function submitIdiom() {
    const value = userInput.trim();
    if (!value || value[0] !== neededChar || !pool.includes(value)) {
      autoFill("没接上");
      return;
    }
    continueAfterUser(value);
  }

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((current) => current - 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [currentPrompt]);

  React.useEffect(() => {
    if (timeLeft <= 0) autoFill("时间到");
  }, [timeLeft]);

  React.useEffect(() => {
    if (chain.length === 0) startRound();
  }, []);

  return (
    <div className="game-card">
      <h3>小游戏：成语接龙</h3>
      <div className="chain-status">
        <strong>NPC：{currentPrompt}</strong>
        <span>请用“{neededChar}”开头接龙</span>
        <b>{timeLeft}s</b>
      </div>
      <div className="chain-line">
        {chain.map((turn, index) => (
          <span key={`${turn.speaker}-${turn.idiom}-${index}`}>
            {turn.speaker}：{turn.idiom}
          </span>
        ))}
      </div>
      <div className="idiom-submit">
        <input
          value={userInput}
          onChange={(event) => setUserInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitIdiom();
          }}
          placeholder={`输入“${neededChar}”开头的成语`}
        />
        <button onClick={submitIdiom}>提交</button>
        <button className="light-button" onClick={() => autoFill("跳过本轮")}>不会，系统帮我接</button>
      </div>
      <p className="game-feedback">{message}</p>

      <h3>小游戏：四字词语挖空填字</h3>
      <div className="quiz-list">
        {gameData.idioms.blanks.map((quiz) => (
          <label
            key={quiz.full}
            className={`quiz-row ${
              blankChecked && blankAnswers[quiz.full] === quiz.answer ? "correct-drop" : ""
            } ${blankChecked && blankAnswers[quiz.full] && blankAnswers[quiz.full] !== quiz.answer ? "wrong-drop" : ""}`}
          >
            <span>{quiz.clue}</span>
            <input
              maxLength="1"
              value={blankAnswers[quiz.full] || ""}
              onChange={(event) => {
                setBlankAnswers((current) => ({ ...current, [quiz.full]: event.target.value }));
                setBlankChecked(false);
              }}
            />
            <small>
              {!blankChecked
                ? "先全部填完，再检查"
                : blankAnswers[quiz.full] === quiz.answer
                  ? `答对：${quiz.full}`
                  : `正确答案：${quiz.answer}`}
            </small>
          </label>
        ))}
      </div>
      <button className="light-button check-button" onClick={() => setBlankChecked(true)}>
        检查成语填字
      </button>
    </div>
  );
}

function ProverbGames({ items }) {
  const options = Array.from(new Set([...items, ...Object.keys(learningEntries.proverbs)]));
  const [started, setStarted] = React.useState(false);
  const [sceneIndex, setSceneIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const scenes = gameData.proverbs.dialogue;
  const scene = scenes[sceneIndex];
  const currentAnswer = answers[sceneIndex];
  const isCorrect = currentAnswer === scene.answer;

  if (!started) {
    return (
      <div className="game-card dialogue-game">
        <h3>小游戏：谚语对话闯关</h3>
        <div className="npc-box start-box">
          <p>点击开始后，NPC才会说第一句话。每一关都要把合适的谚语拖到对话里，答对后才能进入下一句。</p>
          <p>当前题库：{scenes.length} 个真实对话场景。</p>
          <button onClick={() => setStarted(true)}>开始做题</button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-card dialogue-game">
      <h3>小游戏：谚语对话闯关</h3>
      <p className="game-feedback">第 {sceneIndex + 1} / {scenes.length} 句</p>
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
        onClick={() => setSceneIndex((current) => (current + 1) % scenes.length)}
      >
        {isCorrect ? "单击进入下一句" : "答对后才能继续"}
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
