import React from "react";
import { articleSentences } from "./articles.js";
import { verifyIdiom } from "./dictionary.js";
import { useDragHandle, useDropTarget } from "./dnd.jsx";

// 全部游戏都从「用户收集的字词 + 当前文章 + 词典实时数据」动态生成，
// 不依赖任何针对单篇文章手写的题库。字词本为空时自动用文章内容练习。

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

// 可拖 + 可点选的筹码：手机上「点筹码再点空格」比拖拽更好按，两种都支持。
function GameChip({ kind, value, selected, onSelect }) {
  const dragProps = useDragHandle({ kind, value, onTap: () => onSelect?.(value) });
  return (
    <span className={`game-chip ${selected ? "chip-selected" : ""}`} {...dragProps}>
      {value}
    </span>
  );
}

function GameBlank({ kind, onFill, className = "", selectedChip, onConsumeChip, children }) {
  const { dropProps, isOver, canDrop } = useDropTarget(
    React.useMemo(() => [kind], [kind]),
    onFill
  );
  return (
    <div
      {...dropProps}
      className={`${className} ${isOver ? "drop-over" : ""} ${canDrop ? "drop-can" : ""}`}
      onClick={() => {
        if (selectedChip) {
          onFill(selectedChip, kind);
          onConsumeChip?.();
        }
      }}
    >
      {children}
    </div>
  );
}

function FallbackNote({ usingFallback, label }) {
  if (!usingFallback) return null;
  return <p className="game-feedback">你的{label}还是空的，先用这篇文章里的内容练习。往里面拖一些，题目就会换成你收集的。</p>;
}

export function StudyGames({ notebookKey, items, article, usingFallback, getDictionaryEntry, loadDictionaryEntry }) {
  const shared = { items, article, usingFallback, getDictionaryEntry, loadDictionaryEntry };
  if (notebookKey === "characters") return <CharacterGames {...shared} />;
  if (notebookKey === "words") return <WordGames {...shared} />;
  if (notebookKey === "idioms") return <IdiomGames {...shared} />;
  return <ProverbGames {...shared} />;
}

/* ---------------- 生字本：读音连线 + 看意思选字 ---------------- */

function CharacterGames({ items, usingFallback, getDictionaryEntry, loadDictionaryEntry }) {
  const playable = React.useMemo(() => unique(items).slice(0, 6), [items.join("")]);

  React.useEffect(() => {
    playable.forEach((char) => loadDictionaryEntry("characters", char));
  }, [playable, loadDictionaryEntry]);

  const entries = playable.map((char) => ({ char, entry: getDictionaryEntry("characters", char) }));
  const ready = entries.filter(({ entry }) => entry.status === "ready");

  return (
    <div className="game-card">
      <FallbackNote usingFallback={usingFallback} label="生字本" />
      <PinyinMatchGame ready={ready} pendingCount={playable.length - ready.length} />
      <MeaningPickGame ready={ready} />
    </div>
  );
}

function PinyinMatchGame({ ready, pendingCount }) {
  const pairs = ready.filter(({ entry }) => entry.pinyin).slice(0, 6);
  const [leftOrder, setLeftOrder] = React.useState([]);
  const [rightOrder, setRightOrder] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [matches, setMatches] = React.useState([]);

  const pairsKey = pairs.map((pair) => pair.char).join("");
  React.useEffect(() => {
    setLeftOrder(shuffle(pairs));
    setRightOrder(shuffle(pairs.map((pair) => pair.char)));
    setSelected(null);
    setMatches([]);
  }, [pairsKey]);

  if (pairs.length < 2) {
    return (
      <>
        <h3>小游戏：读音-字连线</h3>
        <p className="game-feedback">
          {pendingCount > 0 ? "正在查询字的读音…" : "至少需要 2 个能查到读音的字才能开始连线。"}
        </p>
      </>
    );
  }

  const pinyinOf = (char) => pairs.find((pair) => pair.char === char)?.entry.pinyin;
  const allCorrect = matches.length === pairs.length && matches.every((match) => match.correct);

  function connect(char) {
    if (!selected) return;
    // 同音字互相连也算对（按词典读音判断）。
    const correct = selected.char === char || (pinyinOf(char) && pinyinOf(char) === selected.entry.pinyin);
    setMatches((current) => [
      ...current.filter((match) => match.sourceChar !== selected.char && match.char !== char),
      { sourceChar: selected.char, char, correct }
    ]);
    setSelected(null);
  }

  return (
    <>
      <h3>小游戏：读音-字连线</h3>
      <p className="game-feedback">先点左边的拼音，再点右边对应的字。</p>
      <div className="matching-board" style={{ "--match-count": pairs.length }}>
        <svg className="match-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          {matches.map((match) => {
            const leftIndex = leftOrder.findIndex((pair) => pair.char === match.sourceChar);
            const rightIndex = rightOrder.indexOf(match.char);
            if (leftIndex < 0 || rightIndex < 0) return null;
            return (
              <line
                key={`${match.sourceChar}-${match.char}`}
                x1="30"
                y1={((leftIndex + 0.5) / pairs.length) * 100}
                x2="70"
                y2={((rightIndex + 0.5) / pairs.length) * 100}
                className={match.correct ? "line-correct" : "line-wrong"}
              />
            );
          })}
        </svg>
        <div className="match-column">
          {leftOrder.map((pair) => (
            <button
              key={pair.char}
              className={selected?.char === pair.char ? "selected-game" : "light-button"}
              onClick={() => setSelected(pair)}
            >
              {pair.entry.pinyin}
            </button>
          ))}
        </div>
        <div className="match-column">
          {rightOrder.map((char) => {
            const match = matches.find((item) => item.char === char);
            return (
              <button
                key={char}
                className={match?.correct ? "correct-game" : match ? "wrong-game" : "light-button"}
                onClick={() => connect(char)}
              >
                {char}
              </button>
            );
          })}
        </div>
      </div>
      <div className="game-toolbar">
        <span className="game-feedback">
          {allCorrect ? "全部连对了，太棒了！" : `已连 ${matches.length} / ${pairs.length}`}
        </span>
        <button className="light-button" onClick={() => { setMatches([]); setSelected(null); }}>
          重新连
        </button>
      </div>
    </>
  );
}

function MeaningPickGame({ ready }) {
  const questions = React.useMemo(
    () =>
      shuffle(ready.filter(({ entry }) => entry.meaning && entry.status === "ready"))
        .slice(0, 4)
        .map(({ char, entry }) => ({
          char,
          meaning: entry.meaning,
          options: shuffle(unique([char, ...shuffle(ready.map((item) => item.char))]).slice(0, 4))
        })),
    [ready.map((item) => item.char).join("")]
  );
  const [answers, setAnswers] = React.useState({});

  if (questions.length < 2) return null;

  return (
    <>
      <h3>小游戏：看意思选字</h3>
      <div className="quiz-list">
        {questions.map((question) => {
          const answer = answers[question.char];
          return (
            <div
              key={question.char}
              className={`drop-blank ${answer === question.char ? "correct-drop" : answer ? "wrong-drop" : ""}`}
            >
              <span className="meaning-clue">{question.meaning}</span>
              <div className="game-options">
                {question.options.map((option) => (
                  <button
                    key={option}
                    className={answer === option ? (option === question.char ? "correct-game" : "wrong-game") : "light-button"}
                    onClick={() => setAnswers((current) => ({ ...current, [question.char]: option }))}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <small>{answer ? (answer === question.char ? "答对了" : `不对，是“${question.char}”`) : "选出意思对应的字"}</small>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- 生词本：文章句子挖空 + 近义词辨析 ---------------- */

function WordGames({ items, article, usingFallback }) {
  const [selectedChip, setSelectedChip] = React.useState(null);
  const [fills, setFills] = React.useState({});
  const [checked, setChecked] = React.useState(false);

  // 从当前文章里找包含收集词语的句子挖空——换任何文章都能自动出题。
  const quiz = React.useMemo(() => {
    const sentences = articleSentences(article);
    const usedSentences = new Set();
    const questions = [];
    for (const word of shuffle(unique(items))) {
      const sentence = sentences.find(
        (candidate) => candidate.includes(word) && !usedSentences.has(candidate)
      );
      if (!sentence) continue;
      usedSentences.add(sentence);
      questions.push({ id: word, sentence: sentence.replace(word, "___") + "。", answer: word });
      if (questions.length >= 4) break;
    }
    const distractors = shuffle(article.words.filter((word) => !questions.some((q) => q.answer === word))).slice(0, 2);
    return { questions, chips: shuffle([...questions.map((q) => q.answer), ...distractors]) };
  }, [items.join(","), article.id]);

  const synonymGroups = article.synonymContrast || [];
  const [synonymFills, setSynonymFills] = React.useState({});
  const [synonymChecked, setSynonymChecked] = React.useState(false);

  return (
    <div className="game-card">
      <FallbackNote usingFallback={usingFallback} label="生词本" />
      <h3>小游戏：拖动填空</h3>
      {quiz.questions.length === 0 ? (
        <p className="game-feedback">文章里找不到包含这些词的句子，先多收集几个文章里的词吧。</p>
      ) : (
        <>
          <p className="game-feedback">把词拖进句子空格（也可以先点词、再点空格）。</p>
          <div className="game-options">
            {quiz.chips.map((word) => (
              <GameChip
                key={word}
                kind="game-word"
                value={word}
                selected={selectedChip === word}
                onSelect={(value) => setSelectedChip((current) => (current === value ? null : value))}
              />
            ))}
          </div>
          <div className="quiz-list">
            {quiz.questions.map((question) => {
              const fill = fills[question.id];
              const stateClass = checked && fill
                ? fill === question.answer ? "correct-drop" : "wrong-drop"
                : "";
              return (
                <GameBlank
                  key={question.id}
                  kind="game-word"
                  className={`drop-blank ${stateClass}`}
                  selectedChip={selectedChip}
                  onConsumeChip={() => setSelectedChip(null)}
                  onFill={(value) => {
                    setFills((current) => ({ ...current, [question.id]: value }));
                    setChecked(false);
                  }}
                >
                  <span>{question.sentence.replace("___", fill ? `【${fill}】` : "______")}</span>
                  <small>
                    {!checked
                      ? "填完后点检查"
                      : fill === question.answer
                        ? "答对了"
                        : `正确答案：${question.answer}`}
                  </small>
                </GameBlank>
              );
            })}
          </div>
          <button className="light-button check-button" onClick={() => setChecked(true)}>
            检查填空答案
          </button>
        </>
      )}

      {synonymGroups.length > 0 ? (
        <>
          <h3>小游戏：近义词对比填空</h3>
          <div className="quiz-list">
            {synonymGroups.map((group) => (
              <div key={group.pair.join("-")} className="synonym-group">
                <div className="game-options">
                  {group.pair.map((word) => (
                    <GameChip
                      key={word}
                      kind="game-synonym"
                      value={word}
                      selected={selectedChip === word}
                      onSelect={(value) => setSelectedChip((current) => (current === value ? null : value))}
                    />
                  ))}
                </div>
                {group.contexts.map((context) => {
                  const key = `${group.pair.join("-")}-${context.sentence}`;
                  const fill = synonymFills[key];
                  const stateClass = synonymChecked && fill
                    ? fill === context.answer ? "correct-drop" : "wrong-drop"
                    : "";
                  return (
                    <GameBlank
                      key={key}
                      kind="game-synonym"
                      className={`drop-blank ${stateClass}`}
                      selectedChip={selectedChip}
                      onConsumeChip={() => setSelectedChip(null)}
                      onFill={(value) => {
                        setSynonymFills((current) => ({ ...current, [key]: value }));
                        setSynonymChecked(false);
                      }}
                    >
                      <span>{context.sentence.replace("___", fill ? `【${fill}】` : "______")}</span>
                      <small>
                        {!synonymChecked
                          ? "选更合适的词"
                          : fill === context.answer
                            ? "语境合适"
                            : `应选：${context.answer}`}
                      </small>
                    </GameBlank>
                  );
                })}
                <p className="game-feedback">{group.note}</p>
              </div>
            ))}
          </div>
          <button className="light-button check-button" onClick={() => setSynonymChecked(true)}>
            检查近义词答案
          </button>
        </>
      ) : null}
    </div>
  );
}

/* ---------------- 成语本：接龙 + 挖空填字 ---------------- */

// NPC 的成语储备来自公共成语库（articles.js 也用它扫描文章）。
// 玩家的输入用词典实时验证，不限于这个池子。
import { KNOWN_IDIOMS as NPC_IDIOM_POOL } from "./articles.js";

const TURN_SECONDS = 30;

function IdiomGames({ items, article, usingFallback }) {
  const collectedPool = React.useMemo(
    () => unique([...items, ...article.idioms]),
    [items.join(","), article.id]
  );
  const npcPool = React.useMemo(() => unique([...NPC_IDIOM_POOL, ...collectedPool]), [collectedPool]);
  const starters = collectedPool.length ? collectedPool : NPC_IDIOM_POOL.slice(0, 8);

  const [turns, setTurns] = React.useState([]);
  const [prompt, setPrompt] = React.useState("");
  const [input, setInput] = React.useState("");
  const [timeLeft, setTimeLeft] = React.useState(TURN_SECONDS);
  const [turnCounter, setTurnCounter] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [message, setMessage] = React.useState("");
  const [roundOver, setRoundOver] = React.useState(false);
  const [checking, setChecking] = React.useState(false);

  const neededChar = prompt.slice(-1);
  const usedIdioms = React.useMemo(() => new Set(turns.map((turn) => turn.idiom)), [turns]);

  const findFromPool = React.useCallback(
    (char, used) => npcPool.find((idiom) => idiom[0] === char && !used.has(idiom)),
    [npcPool]
  );

  const startRound = React.useCallback(() => {
    const starter = shuffle(starters)[0];
    setTurns([{ speaker: "NPC", idiom: starter }]);
    setPrompt(starter);
    setInput("");
    setScore(0);
    setRoundOver(false);
    setMessage(`NPC 出题：${starter}，请接“${starter.slice(-1)}”开头的成语。`);
    setTurnCounter((counter) => counter + 1);
  }, [starters]);

  React.useEffect(() => {
    startRound();
    // 只在打开游戏时开一局。
  }, []);

  // 计时器：每个回合重置一次，回合结束就停，不会出现负数倒计时。
  React.useEffect(() => {
    if (roundOver || turnCounter === 0) return undefined;
    setTimeLeft(TURN_SECONDS);
    const interval = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [turnCounter, roundOver]);

  function npcRespond(afterTurns, userIdiom) {
    const used = new Set([...afterTurns.map((turn) => turn.idiom)]);
    const reply = findFromPool(userIdiom.slice(-1), used);
    if (reply) {
      setTurns([...afterTurns, { speaker: "NPC", idiom: reply }]);
      setPrompt(reply);
      setMessage(`接上了！NPC 接：${reply}，请接“${reply.slice(-1)}”。`);
      setTurnCounter((counter) => counter + 1);
    } else {
      setTurns(afterTurns);
      setRoundOver(true);
      setScore((current) => current + 3);
      setMessage(`NPC 认输！它接不出“${userIdiom.slice(-1)}”开头的成语，你赢了这一局（+3分）。`);
    }
  }

  async function submitIdiom() {
    if (roundOver || checking) return;
    const value = input.trim();
    if (!value) return;
    if (value.length !== 4) {
      setMessage("接龙要用四字成语。");
      return;
    }
    if (value[0] !== neededChar) {
      setMessage(`要用“${neededChar}”开头，“${value}”不行。`);
      return;
    }
    if (usedIdioms.has(value)) {
      setMessage(`“${value}”已经用过了，换一个。`);
      return;
    }
    let valid = npcPool.includes(value);
    if (!valid) {
      setChecking(true);
      setMessage(`正在查词典验证“${value}”…`);
      valid = await verifyIdiom(value);
      setChecking(false);
    }
    if (!valid) {
      setMessage(`词典里没查到“${value}”，再想想？（也可以点“提示”）`);
      return;
    }
    setScore((current) => current + 1);
    setInput("");
    npcRespond([...turns, { speaker: "你", idiom: value }], value);
  }

  function hint() {
    if (roundOver) return;
    const answer = findFromPool(neededChar, usedIdioms);
    if (answer) {
      setInput(answer);
      setMessage(`提示：可以接“${answer}”，点提交试试。`);
    } else {
      setMessage(`我也想不出“${neededChar}”开头的了……点“换一题”重新开始吧。`);
    }
  }

  function handleTimeout() {
    if (roundOver) return;
    const answer = findFromPool(neededChar, usedIdioms);
    if (answer) {
      setMessage(`时间到！系统代答：${answer}（本回合不计分）。`);
      setInput("");
      npcRespond([...turns, { speaker: "系统代答", idiom: answer }], answer);
    } else {
      setRoundOver(true);
      setMessage(`时间到，而且“${neededChar}”确实很难接。这局平手，点“再来一局”。`);
    }
  }

  const timeoutRef = React.useRef(handleTimeout);
  timeoutRef.current = handleTimeout;
  React.useEffect(() => {
    if (timeLeft === 0 && !roundOver && turnCounter > 0) timeoutRef.current();
  }, [timeLeft, roundOver, turnCounter]);

  return (
    <div className="game-card">
      <FallbackNote usingFallback={usingFallback} label="成语本" />
      <h3>小游戏：成语接龙</h3>
      <div className="chain-status">
        <strong>NPC：{prompt}</strong>
        <span>接“{neededChar}”开头 · 得分 {score}</span>
        <b className={timeLeft <= 5 && !roundOver ? "time-low" : ""}>{roundOver ? "—" : `${timeLeft}s`}</b>
      </div>
      <div className="chain-line">
        {turns.map((turn, index) => (
          <span key={`${turn.idiom}-${index}`} className={turn.speaker === "你" ? "chain-you" : ""}>
            {turn.speaker}:{turn.idiom}
          </span>
        ))}
      </div>
      {roundOver ? (
        <button onClick={startRound}>再来一局</button>
      ) : (
        <div className="idiom-submit">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitIdiom();
            }}
            placeholder={`输入“${neededChar}”开头的成语`}
            disabled={checking}
          />
          <button onClick={submitIdiom} disabled={checking}>{checking ? "验证中…" : "提交"}</button>
          <button className="light-button" onClick={hint}>提示</button>
          <button className="light-button" onClick={startRound}>换一题</button>
        </div>
      )}
      <p className="game-feedback">{message}</p>
      <p className="game-feedback">规则：任何词典里能查到的成语都算，不限题库；接不上可用提示，超时系统代答（不计分）。</p>

      <IdiomBlanksGame pool={collectedPool} />
    </div>
  );
}

function IdiomBlanksGame({ pool }) {
  const quiz = React.useMemo(
    () =>
      shuffle(pool)
        .slice(0, 4)
        .map((idiom) => {
          const blankIndex = Math.floor(Math.random() * idiom.length);
          return {
            idiom,
            blankIndex,
            clue: [...idiom].map((char, index) => (index === blankIndex ? "◻" : char)).join(""),
            answer: idiom[blankIndex]
          };
        }),
    [pool.join(",")]
  );
  const [answers, setAnswers] = React.useState({});
  const [checked, setChecked] = React.useState(false);

  if (quiz.length === 0) return null;

  return (
    <>
      <h3>小游戏：成语挖空填字</h3>
      <div className="quiz-list">
        {quiz.map((question) => {
          const answer = answers[question.idiom] || "";
          const stateClass = checked && answer
            ? answer === question.answer ? "correct-drop" : "wrong-drop"
            : "";
          return (
            <label key={question.idiom} className={`quiz-row ${stateClass}`}>
              <span>{question.clue}</span>
              <input
                maxLength="1"
                value={answer}
                onChange={(event) => {
                  setAnswers((current) => ({ ...current, [question.idiom]: event.target.value.trim() }));
                  setChecked(false);
                }}
              />
              <small>
                {!checked
                  ? "填缺的字"
                  : answer === question.answer
                    ? `答对：${question.idiom}`
                    : `正确答案：${question.answer}`}
              </small>
            </label>
          );
        })}
      </div>
      <button className="light-button check-button" onClick={() => setChecked(true)}>
        检查填字
      </button>
    </>
  );
}

/* ---------------- 谚语本：情境对话闯关 ---------------- */

function ProverbGames({ items, article, usingFallback }) {
  const scenes = React.useMemo(() => shuffle(article.proverbDialogue || []), [article.id]);
  const options = React.useMemo(
    () => shuffle(unique([...scenes.map((scene) => scene.answer), ...items])).slice(0, 6),
    [scenes, items.join(",")]
  );

  const [started, setStarted] = React.useState(false);
  const [sceneIndex, setSceneIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [selectedChip, setSelectedChip] = React.useState(null);

  if (scenes.length === 0) {
    return (
      <div className="game-card dialogue-game">
        <h3>小游戏：谚语对话闯关</h3>
        <p className="game-feedback">这篇文章没有配套的对话题，换一篇文章试试。</p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="game-card dialogue-game">
        <FallbackNote usingFallback={usingFallback} label="谚语本" />
        <h3>小游戏：谚语对话闯关</h3>
        <div className="npc-box start-box">
          <p>每一关把最贴切的谚语拖（或点选后点空格）到对话里，答对才能进入下一句。</p>
          <p>本篇共 {scenes.length} 个情境。</p>
          <button onClick={() => setStarted(true)}>开始做题</button>
        </div>
      </div>
    );
  }

  const finished = sceneIndex >= scenes.length;
  if (finished) {
    return (
      <div className="game-card dialogue-game">
        <h3>小游戏：谚语对话闯关</h3>
        <div className="npc-box start-box">
          <p>🎉 全部 {scenes.length} 关通过！</p>
          <button
            onClick={() => {
              setAnswers({});
              setSceneIndex(0);
              setStarted(false);
            }}
          >
            再玩一遍
          </button>
        </div>
      </div>
    );
  }

  const scene = scenes[sceneIndex];
  const currentAnswer = answers[sceneIndex];
  const isCorrect = currentAnswer === scene.answer;

  return (
    <div className="game-card dialogue-game">
      <h3>小游戏：谚语对话闯关</h3>
      <p className="game-feedback">第 {sceneIndex + 1} / {scenes.length} 关</p>
      <div className="npc-box">
        <p>{scene.npc}</p>
        <GameBlank
          kind="game-proverb"
          className={`dialogue-drop ${isCorrect ? "correct-drop" : currentAnswer ? "wrong-drop" : ""}`}
          selectedChip={selectedChip}
          onConsumeChip={() => setSelectedChip(null)}
          onFill={(value) => setAnswers((current) => ({ ...current, [sceneIndex]: value }))}
        >
          {currentAnswer || "把合适的谚语放到这里"}
        </GameBlank>
        {currentAnswer && !isCorrect ? (
          <p className="game-feedback">“{currentAnswer}”不太贴切，再试试别的。</p>
        ) : null}
      </div>
      <div className="game-options">
        {options.map((proverb) => (
          <GameChip
            key={proverb}
            kind="game-proverb"
            value={proverb}
            selected={selectedChip === proverb}
            onSelect={(value) => setSelectedChip((current) => (current === value ? null : value))}
          />
        ))}
      </div>
      <button
        className="light-button"
        disabled={!isCorrect}
        onClick={() => setSceneIndex((current) => current + 1)}
      >
        {isCorrect ? "答对了，进入下一关" : "答对后才能继续"}
      </button>
    </div>
  );
}
