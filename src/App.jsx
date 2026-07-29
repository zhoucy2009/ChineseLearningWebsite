import React from "react";
import { notebooks, emptyCollections } from "./articles.js";
import AuthScreen from "./AuthScreen.jsx";
import { getSession, clearSession, getSavedCollections, saveCollections } from "./auth.js";
import {
  supabase,
  cloudEnabled,
  sessionToUser,
  fetchCloudCollections,
  saveCloudCollections
} from "./supabase.js";
import { getFallbackDictionaryEntry, lookupDictionaryEntry } from "./dictionary.js";
import { DragProvider, useDragHandle, useDropTarget, useDragSession, canHover } from "./dnd.jsx";
import { useArticleLibrary } from "./generator.js";
import { StudyGames } from "./games.jsx";

const notebookByKey = Object.fromEntries(notebooks.map((notebook) => [notebook.key, notebook]));
const notebookKinds = notebooks.map((notebook) => notebook.key);
const HAN_RE = /[一-鿿]/;

function joinList(items) {
  return items?.length ? items.join("、") : "暂无";
}

/* ---------------- 词典数据 ---------------- */

function getDictionaryCacheKey(kind, value) {
  return `${kind}:${value}`;
}

function useDictionaryEntries() {
  const [entries, setEntries] = React.useState({});

  const getDictionaryEntry = React.useCallback(
    (kind, value) => entries[getDictionaryCacheKey(kind, value)] || getFallbackDictionaryEntry(kind, value),
    [entries]
  );

  const loadDictionaryEntry = React.useCallback(async (kind, value) => {
    const key = getDictionaryCacheKey(kind, value);
    setEntries((current) => (
      current[key]
        ? current
        : {
            ...current,
            [key]: {
              ...getFallbackDictionaryEntry(kind, value),
              status: "loading",
              meaning: `正在查询“${value}”的词典解释...`
            }
          }
    ));

    const entry = await lookupDictionaryEntry(kind, value);
    setEntries((current) => ({ ...current, [key]: entry }));
    return entry;
  }, []);

  return { getDictionaryEntry, loadDictionaryEntry };
}

/* ---------------- 释义气泡 ---------------- */

function useMeaningTooltip(loadDictionaryEntry) {
  const [tooltip, setTooltip] = React.useState(null);
  const requestId = React.useRef(0);

  const show = React.useCallback(async (event, kind, value) => {
    const rect = event.currentTarget?.getBoundingClientRect?.() || {
      left: event.clientX,
      top: event.clientY,
      width: 0
    };
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    const width = Math.min(280, window.innerWidth - 28);
    const x = Math.min(Math.max(rect.left + rect.width / 2, width / 2 + 14), window.innerWidth - width / 2 - 14);
    setTooltip({ value, meaning: "正在查询词典解释...", x, y: rect.top });
    const entry = await loadDictionaryEntry(kind, value);
    if (requestId.current !== currentRequest) return;
    setTooltip((current) => (current && current.value === value ? { ...current, meaning: entry.meaning } : current));
  }, [loadDictionaryEntry]);

  const hide = React.useCallback(() => {
    requestId.current += 1;
    setTooltip(null);
  }, []);

  const toggle = React.useCallback((event, kind, value) => {
    setTooltip((current) => {
      if (current?.value === value) {
        requestId.current += 1;
        return null;
      }
      show(event, kind, value);
      return current;
    });
  }, [show]);

  // 点空白处关闭气泡（capture 阶段，不受 stopPropagation 影响）。
  React.useEffect(() => {
    function onPointerDown(event) {
      if (!event.target.closest?.(".drag-handle")) hide();
    }
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [hide]);

  return { tooltip, show, hide, toggle };
}

function MeaningTooltip({ tooltip }) {
  if (!tooltip) return null;
  return (
    <div className="meaning-tooltip" style={{ left: tooltip.x, top: tooltip.y }} role="status">
      <strong>{tooltip.value}</strong>
      <span>{tooltip.meaning}</span>
    </div>
  );
}

/* ---------------- 文章内的拖拽把手 ---------------- */

function DragHandle({ kind, value, className, ariaLabel, tooltip }) {
  const dragProps = useDragHandle({
    kind,
    value,
    onTap: (event) => tooltip.toggle(event, kind, value)
  });
  const hoverProps = canHover
    ? {
        onMouseEnter: (event) => tooltip.show(event, kind, value),
        onMouseLeave: tooltip.hide
      }
    : {};

  return (
    <span
      className={`drag-handle ${className}`}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      {...hoverProps}
      {...dragProps}
    />
  );
}

function Character({ char, tooltip }) {
  if (!HAN_RE.test(char)) {
    return <span className="character-text">{char}</span>;
  }
  return (
    <span className="character-cell">
      <DragHandle
        kind="characters"
        value={char}
        className="character-handle"
        ariaLabel={`拖动字：${char}`}
        tooltip={tooltip}
      />
      <span className="character-text">{char}</span>
    </span>
  );
}

function TextWithCharacters({ text, tooltip }) {
  return (
    <span className="word-characters">
      {[...text].map((char, index) => (
        <Character key={`${text}-${char}-${index}`} char={char} tooltip={tooltip} />
      ))}
    </span>
  );
}

function Segment({ segment, tooltip }) {
  if (!segment.type) {
    return <span className="punctuation">{segment.text}</span>;
  }

  if (segment.type === "word") {
    return (
      <span className="word-unit">
        <TextWithCharacters text={segment.text} tooltip={tooltip} />
        <DragHandle
          kind="words"
          value={segment.text}
          className="word-handle"
          ariaLabel={`拖动词：${segment.text}`}
          tooltip={tooltip}
        />
      </span>
    );
  }

  if (segment.type === "plain") {
    return (
      <span className="plain-segment">
        <TextWithCharacters text={segment.text} tooltip={tooltip} />
      </span>
    );
  }

  const isIdiom = segment.type === "idiom";
  const kind = isIdiom ? "idioms" : "proverbs";
  return (
    <span className={`special-segment ${isIdiom ? "idiom-segment" : "proverb-segment"}`}>
      <DragHandle
        kind={kind}
        value={segment.text}
        className={`phrase-handle ${isIdiom ? "idiom-handle" : "proverb-handle"}`}
        ariaLabel={`拖动${isIdiom ? "成语" : "谚语"}：${segment.text}`}
        tooltip={tooltip}
      />
      <TextWithCharacters text={segment.text} tooltip={tooltip} />
    </span>
  );
}

/* ---------------- 篮子（侧边 + 手机底部停靠栏） ---------------- */

function DropZone({ notebook, items, onDropItem, onOpen }) {
  const { dropProps, isOver, canDrop } = useDropTarget(
    React.useMemo(() => [notebook.key], [notebook.key]),
    (value) => onDropItem(notebook.key, value)
  );

  return (
    <section
      {...dropProps}
      className={`notebook ${notebook.className} ${isOver ? "drop-over" : ""} ${canDrop ? "drop-can" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`打开${notebook.title}`}
      onClick={() => onOpen(notebook.key)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen(notebook.key);
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

function DockTarget({ notebook, count, onDropItem, active }) {
  const { dropProps, isOver } = useDropTarget(
    React.useMemo(() => [notebook.key], [notebook.key]),
    (value) => onDropItem(notebook.key, value)
  );
  return (
    <div
      {...dropProps}
      className={`dock-target ${notebook.className} ${isOver ? "drop-over" : ""} ${active ? "" : "dock-muted"}`}
    >
      <b>{notebook.title}</b>
      <span>{count}</span>
    </div>
  );
}

// 手机上拖动时，从屏幕底部浮出的篮子停靠栏——不用把词拖出屏幕去找篮子。
function MobileDock({ collections, onDropItem }) {
  const session = useDragSession();
  const visible = Boolean(session && notebookKinds.includes(session.kind));
  return (
    <div className={`mobile-dock ${visible ? "dock-visible" : ""}`} aria-hidden={!visible}>
      {notebooks.map((notebook) => (
        <DockTarget
          key={notebook.key}
          notebook={notebook}
          count={collections[notebook.key].length}
          onDropItem={onDropItem}
          active={session?.kind === notebook.key}
        />
      ))}
    </div>
  );
}

/* ---------------- 记录本详情 + 游戏 ---------------- */

function fallbackItemsFor(notebook, article) {
  if (notebook.key === "characters") {
    return Array.from(new Set([...article.words.join("")].filter((char) => HAN_RE.test(char)))).slice(0, 6);
  }
  if (notebook.key === "words") return article.words.slice(0, 8);
  if (notebook.key === "idioms") return article.idioms;
  return article.proverbs;
}

function DetailsModal({ notebook, items, article, onClose, onRemove, getDictionaryEntry, loadDictionaryEntry }) {
  React.useEffect(() => {
    items.forEach((item) => loadDictionaryEntry(notebook.key, item));
  }, [items, loadDictionaryEntry, notebook.key]);

  const entries = items.map((item) => ({ item, entry: getDictionaryEntry(notebook.key, item) }));
  const usingFallback = items.length === 0;
  // 收集不足 4 个时用文章内容补齐，保证游戏总是玩得起来。
  const gameItems = React.useMemo(() => {
    if (items.length >= 4) return items;
    return Array.from(new Set([...items, ...fallbackItemsFor(notebook, article)]));
  }, [items, notebook, article]);

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
            <p>{notebook.colorName}学习区 · 释义来自词典实时查询</p>
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

        <StudyGames
          notebookKey={notebook.key}
          items={gameItems}
          article={article}
          usingFallback={usingFallback}
          getDictionaryEntry={getDictionaryEntry}
          loadDictionaryEntry={loadDictionaryEntry}
        />
      </section>
    </div>
  );
}

/* ---------------- 文章头部：难度星级 + 库存与生成状态 ---------------- */

function Stars({ value }) {
  return (
    <span className="stars" aria-label={`难度 ${value} / 5 星`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= value ? "star-on" : "star-off"}>★</span>
      ))}
    </span>
  );
}

function ArticleToolbar({ library }) {
  const [showList, setShowList] = React.useState(false);
  const {
    articles, current, readIds, unreadCount, status,
    targetStars, setTargetStars, retryGeneration, selectArticle, completeCurrent
  } = library;

  return (
    <div className="article-toolbar">
      <div className="toolbar-row">
        <label className="toolbar-field">
          生成难度
          <select value={targetStars} onChange={(event) => setTargetStars(Number(event.target.value))}>
            {[1, 2, 3, 4, 5].map((stars) => (
              <option key={stars} value={stars}>{"★".repeat(stars)}</option>
            ))}
          </select>
        </label>
        <button className="light-button" onClick={() => setShowList((value) => !value)}>
          文章库（未读 {unreadCount}）
        </button>
        <button onClick={completeCurrent}>完成这篇，换下一篇 →</button>
      </div>
      {status.state !== "idle" ? (
        <p className={`gen-status gen-${status.state}`}>
          {status.state === "generating" ? "⏳ " : "⚠️ "}
          {status.detail}
          {status.state === "offline" || status.state === "error" ? (
            <button className="light-button retry-button" onClick={retryGeneration}>立即重试</button>
          ) : null}
        </p>
      ) : null}
      {showList ? (
        <ul className="library-list">
          {articles.map((article) => (
            <li key={article.id}>
              <button
                className={article.id === current.id ? "selected-game" : "light-button"}
                onClick={() => {
                  selectArticle(article.id);
                  setShowList(false);
                }}
              >
                <Stars value={article.stars} /> {article.title}
                {article.source === "ollama" ? " · AI" : ""}
                {readIds.includes(article.id) ? " · 已读" : ""}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ---------------- 主页面 ---------------- */

// 云端合并：同一类目取并集（云端顺序在前，本地新增补在后）
function mergeCollections(local, cloud) {
  if (!cloud) return local;
  return Object.fromEntries(
    Object.keys(emptyCollections).map((kind) => [
      kind,
      Array.from(new Set([...(cloud[kind] || []), ...(local[kind] || [])]))
    ])
  );
}

// 字词本：localStorage 即时保存（离线兜底），云端账号再防抖同步到 Supabase
function useCollections(user) {
  const [collections, setCollections] = React.useState(() =>
    getSavedCollections(user.email, emptyCollections)
  );
  // local: 纯本地账号 / loading: 正在拉云端 / synced / error
  const [syncState, setSyncState] = React.useState(user.cloud ? "loading" : "local");
  const syncStateRef = React.useRef(syncState);
  syncStateRef.current = syncState;

  React.useEffect(() => {
    if (!user.cloud) return undefined;
    let cancelled = false;
    fetchCloudCollections(user.id)
      .then((cloudData) => {
        if (cancelled) return;
        setCollections((local) => mergeCollections(local, cloudData));
        setSyncState("synced");
      })
      .catch(() => {
        if (!cancelled) setSyncState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [user.cloud, user.id]);

  React.useEffect(() => {
    saveCollections(user.email, collections);
    // 云端数据还没拉回来之前不上传，避免用本地空数据覆盖云端
    if (!user.cloud || syncStateRef.current === "loading") return undefined;
    const timer = window.setTimeout(() => {
      setSyncState("syncing");
      saveCloudCollections(user.id, collections)
        .then(() => setSyncState("synced"))
        .catch(() => setSyncState("error"));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [user, collections]);

  return { collections, setCollections, syncState };
}

const SYNC_LABELS = {
  loading: "☁️ 拉取云端字词本…",
  syncing: "☁️ 同步中…",
  synced: "☁️ 已同步",
  error: "⚠️ 云端同步失败（本地已保存）"
};

function LearningApp({ user, onLogout }) {
  const { collections, setCollections, syncState } = useCollections(user);
  const [openNotebook, setOpenNotebook] = React.useState(null);
  const { getDictionaryEntry, loadDictionaryEntry } = useDictionaryEntries();
  const tooltip = useMeaningTooltip(loadDictionaryEntry);
  const library = useArticleLibrary(user.email);
  const article = library.current;

  const addItem = React.useCallback((kind, value) => {
    setCollections((current) => ({
      ...current,
      [kind]: current[kind].includes(value) ? current[kind] : [...current[kind], value]
    }));
  }, []);

  function removeItem(kind, value) {
    setCollections((current) => ({
      ...current,
      [kind]: current[kind].filter((item) => item !== value)
    }));
  }

  const activeNotebook = openNotebook ? notebookByKey[openNotebook] : null;

  return (
    <>
      <header className="app-bar">
        <span className="app-bar-title">中文学习网站</span>
        <div className="app-bar-user">
          {syncState !== "local" ? (
            <span className={`sync-badge ${syncState === "error" ? "sync-error" : ""}`}>
              {SYNC_LABELS[syncState]}
            </span>
          ) : null}
          <span className="app-bar-email">{user.email}</span>
          <button className="light-button" onClick={onLogout}>退出登录</button>
        </div>
      </header>
      <main className="learning-page">
        <MeaningTooltip tooltip={tooltip.tooltip} />
        <section className="article-card">
          <ArticleToolbar library={library} />
          <div className="article-heading">
            <p>IB中文阅读{article.source === "ollama" ? " · AI 生成" : ""}</p>
            <h1>{article.title}</h1>
            <div className="article-meta">
              <Stars value={article.stars} />
              <span>难度 {article.stars} / 5</span>
            </div>
          </div>

          <div className="legend">
            <span><b className="dot red-dot" />上方红色把手：字</span>
            <span><b className="dot yellow-dot" />下方黄色把手：词</span>
            <span><b className="dot green-dot" />左方绿色把手：成语</span>
            <span><b className="dot blue-dot" />右方蓝色把手：谚语</span>
          </div>

          <article className="reading-text" aria-label="IB中文阅读文章">
            {article.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={`${article.id}-${paragraphIndex}`}>
                {paragraph.map((segment, segmentIndex) => (
                  <Segment
                    key={`${paragraphIndex}-${segmentIndex}`}
                    segment={segment}
                    tooltip={tooltip}
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
              onDropItem={addItem}
              onOpen={setOpenNotebook}
            />
          ))}
        </aside>

        <MobileDock collections={collections} onDropItem={addItem} />

        {activeNotebook ? (
          <DetailsModal
            notebook={activeNotebook}
            items={collections[activeNotebook.key]}
            article={article}
            onClose={() => setOpenNotebook(null)}
            onRemove={removeItem}
            getDictionaryEntry={getDictionaryEntry}
            loadDictionaryEntry={loadDictionaryEntry}
          />
        ) : null}
      </main>
    </>
  );
}

export default function App() {
  // 云端模式：登录态由 Supabase 会话驱动；本地模式：沿用 localStorage 会话
  const [user, setUser] = React.useState(() => (cloudEnabled ? null : getSession()));
  const [authReady, setAuthReady] = React.useState(!cloudEnabled);

  React.useEffect(() => {
    if (!cloudEnabled) return undefined;
    supabase.auth.getSession().then(({ data }) => {
      setUser(sessionToUser(data.session));
      setAuthReady(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(sessionToUser(session));
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    if (cloudEnabled) {
      await supabase.auth.signOut();
    } else {
      clearSession();
    }
    setUser(null);
  }

  if (!authReady) {
    return <main className="auth-page"><p className="auth-hint">正在恢复登录状态…</p></main>;
  }

  if (!user) {
    return <AuthScreen onAuthed={setUser} />;
  }

  return (
    <DragProvider>
      <LearningApp key={user.email} user={user} onLogout={handleLogout} />
    </DragProvider>
  );
}
