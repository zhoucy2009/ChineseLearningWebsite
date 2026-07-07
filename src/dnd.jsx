import React from "react";

// 自定义指针拖拽系统：HTML5 drag-and-drop 在 iOS/Android 触屏上完全不工作，
// 这里用 Pointer Events 统一实现鼠标 + 触屏拖拽。
// 用法：
//   <DragProvider> 包住应用；
//   useDragHandle({kind, value, onTap}) 拿到 onPointerDown 挂到把手上；
//   useDropTarget(accepts, onDrop) 拿到 dropProps 挂到目标上。

const DragContext = React.createContext(null);

export const canHover =
  typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

export function DragProvider({ children }) {
  const [session, setSession] = React.useState(null);
  const [overId, setOverId] = React.useState(null);
  const targets = React.useRef(new Map());
  const ghostRef = React.useRef(null);
  const overIdRef = React.useRef(null);

  const registerTarget = React.useCallback((id, configRef) => {
    targets.current.set(id, configRef);
    return () => targets.current.delete(id);
  }, []);

  const hitTest = React.useCallback((x, y, kind) => {
    const element = document.elementFromPoint(x, y);
    const targetElement = element?.closest?.("[data-drop-id]");
    if (!targetElement) return null;
    const id = targetElement.getAttribute("data-drop-id");
    const config = targets.current.get(id)?.current;
    return config?.accepts?.includes(kind) ? id : null;
  }, []);

  const startDrag = React.useCallback((event, item) => {
    const pointerId = event.pointerId;
    setSession({ ...item, x: event.clientX, y: event.clientY });
    document.body.classList.add("is-dragging");

    function moveGhost(x, y) {
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }
    }

    function setOver(id) {
      if (overIdRef.current === id) return;
      overIdRef.current = id;
      setOverId(id);
    }

    function finish(event, shouldDrop) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      document.body.classList.remove("is-dragging");
      if (shouldDrop) {
        const id = hitTest(event.clientX, event.clientY, item.kind);
        if (id) targets.current.get(id)?.current?.onDrop(item.value, item.kind);
      }
      setOver(null);
      setSession(null);
    }

    function onMove(event) {
      if (event.pointerId !== pointerId) return;
      moveGhost(event.clientX, event.clientY);
      setOver(hitTest(event.clientX, event.clientY, item.kind));
    }

    const onUp = (event) => event.pointerId === pointerId && finish(event, true);
    const onCancel = (event) => event.pointerId === pointerId && finish(event, false);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  }, [hitTest]);

  const contextValue = React.useMemo(
    () => ({ session, overId, startDrag, registerTarget }),
    [session, overId, startDrag, registerTarget]
  );

  return (
    <DragContext.Provider value={contextValue}>
      {children}
      {session ? (
        <div
          ref={ghostRef}
          className={`drag-ghost ghost-${session.kind}`}
          style={{ transform: `translate(${session.x}px, ${session.y}px)` }}
        >
          {session.label}
        </div>
      ) : null}
    </DragContext.Provider>
  );
}

export function useDragSession() {
  return React.useContext(DragContext).session;
}

const DRAG_THRESHOLD = 6;

export function useDragHandle({ kind, value, label, onTap }) {
  const { startDrag } = React.useContext(DragContext);
  const latest = React.useRef(null);
  latest.current = { kind, value, label: label ?? value, onTap };

  const onPointerDown = React.useCallback((event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    let started = false;

    function cleanup() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", cleanup);
    }

    function onMove(event) {
      if (event.pointerId !== pointerId || started) return;
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > DRAG_THRESHOLD) {
        started = true;
        cleanup();
        const { kind, value, label } = latest.current;
        startDrag(event, { kind, value, label });
      }
    }

    function onUp(event) {
      if (event.pointerId !== pointerId) return;
      cleanup();
      if (!started) latest.current.onTap?.(event);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", cleanup);
  }, [startDrag]);

  return { onPointerDown };
}

export function useDropTarget(accepts, onDrop) {
  const id = React.useId();
  const { registerTarget, session, overId } = React.useContext(DragContext);
  const configRef = React.useRef(null);
  configRef.current = { accepts, onDrop };

  React.useEffect(() => registerTarget(id, configRef), [id, registerTarget]);

  return {
    dropProps: { "data-drop-id": id },
    isOver: overId === id,
    canDrop: Boolean(session && accepts.includes(session.kind))
  };
}
