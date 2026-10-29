import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS, F, CAPS, DISPLAY_LUXE } from "./theme";

// The `light`/`dark`/`tone` props on these components are kept for
// compatibility with existing call sites; the light theme renders one look.

export function LintelDivider() {
  return (
    <div className="flex items-center gap-3 my-10 select-none" aria-hidden="true">
      <div className="h-px flex-1" style={{ background: COLORS.line }} />
      <div className="w-[5px] h-[5px] rotate-45" style={{ background: COLORS.gold }} />
      <div className="h-px flex-1" style={{ background: COLORS.line }} />
    </div>
  );
}

export function Eyebrow({ children }) {
  return (
    <div className="text-[10px] font-semibold mb-3" style={{ color: COLORS.gold, fontFamily: F.body, ...CAPS, letterSpacing: "0.24em" }}>
      {children}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, sub }) {
  return (
    <div className="mb-6">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2
        className="text-[30px] sm:text-[32px] leading-[1.08]"
        style={{ ...DISPLAY_LUXE, letterSpacing: "-0.015em", color: COLORS.ivory, textWrap: "balance" }}
      >
        {title}
      </h2>
      {sub && (
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: COLORS.ivoryDim, fontFamily: F.body }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function GoldButton({ children, onClick, variant = "solid", icon: Icon, className = "", type = "button", disabled = false }) {
  const base =
    "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[2px] text-[11px] font-semibold transition-all active:scale-[0.98] min-h-[46px] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2";
  const styles =
    variant === "solid"
      ? { background: COLORS.ivory, color: COLORS.ink }
      : variant === "outline"
      ? { border: `1px solid ${COLORS.ivory}`, color: COLORS.ivory, background: "transparent" }
      : { background: COLORS.chip, color: COLORS.ivory };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${className}`} style={{ fontFamily: F.body, ...CAPS, letterSpacing: "0.18em", ...styles }}>
      {Icon && <Icon size={14} strokeWidth={1.75} />}
      {children}
    </button>
  );
}

export function Placeholder({ label, ratio = "aspect-[4/3]" }) {
  const hasWidth = /\bw-/.test(ratio);
  return (
    <div
      className={`${ratio} ${hasWidth ? "" : "w-full"} rounded-[3px] flex flex-col items-center justify-center gap-2 text-center px-4`}
      style={{ border: `1.5px dashed ${COLORS.line}`, background: COLORS.chip }}
    >
      <span className="text-[11px] leading-snug" style={{ color: COLORS.ivoryDim, fontFamily: F.body }}>
        {label}
      </span>
    </div>
  );
}

export function Badge({ children, tone = "gold" }) {
  const map = {
    gold: { bg: COLORS.accentSoft, fg: COLORS.gold },
    emerald: { bg: COLORS.accentSoft, fg: COLORS.gold },
    urgent: { bg: COLORS.dangerBg, fg: COLORS.danger },
    ivory: { bg: COLORS.chip, fg: COLORS.ivoryDim },
  };
  const s = map[tone] || map.gold;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-[2px] text-[9.5px] font-semibold"
      style={{ background: s.bg, color: s.fg, fontFamily: F.body, ...CAPS, letterSpacing: "0.14em" }}
    >
      {children}
    </span>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-[3px] p-5 ${className}`}
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.line}`,
        boxShadow: "var(--shadow)",
      }}
    >
      {children}
    </div>
  );
}

export function DetailRow({ icon: Icon, label, value }) {
  if (value == null || String(value).trim() === "") return null;
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <span
          className="w-[38px] h-[38px] shrink-0 flex items-center justify-center"
          style={{ background: COLORS.chip, borderRadius: 2, color: COLORS.gold }}
        >
          <Icon size={16} strokeWidth={2} />
        </span>
      )}
      <div className="leading-snug min-w-0">
        <div className="text-[11px]" style={{ color: COLORS.ivoryDim }}>{label}</div>
        <div className="text-[12.5px] font-medium" style={{ color: COLORS.ivory }}>{value}</div>
      </div>
    </div>
  );
}

export function FieldGroup({ title, children }) {
  return (
    <div>
      <div className="text-[10px] font-semibold mb-2.5" style={{ color: COLORS.gold, fontFamily: F.body, ...CAPS }}>
        {title}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

export function Field({ label, value, onChange, placeholder, multiline, type = "text" }) {
  const Comp = multiline ? "textarea" : "input";
  return (
    <label className="block">
      <span className="text-[11px] block mb-1" style={{ color: COLORS.ivoryDim }}>
        {label}
      </span>
      <Comp
        type={multiline ? undefined : type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        rows={multiline ? 3 : undefined}
        className="w-full rounded-[3px] px-3 py-2.5 text-[13px] outline-none min-h-[44px]"
        style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.ivory, fontFamily: F.body }}
      />
    </label>
  );
}

export function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-[11px] block mb-1" style={{ color: COLORS.ivoryDim }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[3px] px-3 py-2.5 text-[13px] outline-none min-h-[44px]"
        style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.ivory, fontFamily: F.body }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LoadingNote({ label = "Loading…" }) {
  return (
    <div className="py-10 text-center text-[13px]" style={{ color: COLORS.ivoryDim, fontFamily: F.body }}>
      {label}
    </div>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-[3px] p-3 mb-4 text-[12.5px]" style={{ background: COLORS.dangerBg, color: COLORS.danger, border: `1px solid ${COLORS.dangerLine}` }}>
      {message}
    </div>
  );
}

// Full-screen photo viewer. Rendered into <body> so it escapes any card or
// animated (transformed) ancestor. Tap the photo to zoom in where you tapped
// and pan by scrolling; tap outside it, swipe down, the close button or Escape
// to close.
// With `video`, it plays the clip with the browser's own controls instead.
// `children`, when given, replaces the caption block at the bottom (the
// gallery puts its hearts and comments there). Clicks inside it don't close.
// With `prev`/`next` ({ src, alt, video }) and `onPrev`/`onNext`, the photos
// either side sit just off screen: dragging sideways pulls them in, and on
// release the strip slides the rest of the way before the photo changes.
// Dragging the photo down lets the page show through; let go far enough
// (or flick) and it drops away and closes.
const SLIDE_MS = 280;
const CLOSE_MS = 220;
const PANEL_GAP = 16;

export function Lightbox({ src, alt, caption, video = false, onClose, prev, next, onPrev, onNext, children }) {
  // Zoom belongs to one photo, so moving to the next starts unzoomed.
  const [zoomedSrc, setZoomedSrc] = useState(null);
  const zoomed = zoomedSrc === src;
  const [firstSrc] = useState(src);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [closing, setClosing] = useState(false);
  // { dir, from, done }: the strip is sliding (or has slid) away from `from`.
  // It stays put until the new photo arrives, so there's never a jump back.
  const [slide, setSlide] = useState(null);
  const sliding = slide && slide.from === src ? slide : null;
  const scrollRef = useRef(null);
  const imgRef = useRef(null);
  const touch = useRef(null);
  const nav = useRef({});
  useEffect(() => {
    nav.current = { onPrev, onNext, canPrev: Boolean(prev && onPrev), canNext: Boolean(next && onNext), zoomed, src, sliding };
  });

  const go = (dir) => {
    const n = nav.current;
    if (n.zoomed || n.sliding || !(dir > 0 ? n.canNext : n.canPrev)) return;
    const from = n.src;
    setSlide({ dir, from, done: false });
    setTimeout(() => {
      setSlide({ dir, from, done: true });
      (dir > 0 ? n.onNext : n.onPrev)();
    }, SLIDE_MS);
  };

  // Turn the browser's own bars black while the viewer is open.
  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    const prevColor = meta?.getAttribute("content");
    root.classList.add("lightbox-open");
    meta?.setAttribute("content", "#0A0A0A");
    return () => {
      root.classList.remove("lightbox-open");
      if (meta && prevColor) meta.setAttribute("content", prevColor);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") return onClose();
      // Arrow keys move the caret while typing a comment.
      if (e.target.closest?.("input, textarea")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // The first few pixels decide whether a swipe is sideways (change photo) or
  // downwards (close). A second finger (pinch) or a zoomed photo cancels it.
  const canPrev = Boolean(prev && onPrev);
  const canNext = Boolean(next && onNext);
  const onTouchStart = (e) => {
    if (slide && !sliding) setSlide(null);
    touch.current = !zoomed && !sliding && !closing && e.touches.length === 1
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), axis: null, dx: 0 }
      : null;
  };
  const onTouchMove = (e) => {
    const t = touch.current;
    if (!t) return;
    if (e.touches.length > 1) {
      touch.current = null;
      setDragX(0);
      setDragY(0);
      return;
    }
    const dx = e.touches[0].clientX - t.x;
    const dy = e.touches[0].clientY - t.y;
    if (!t.axis && Math.hypot(dx, dy) > 10) t.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (t.axis === "y") {
      t.dy = dy;
      // Only down closes; pulling up barely moves.
      setDragY(dy > 0 ? dy : dy / 6);
      return;
    }
    if (t.axis !== "x") return;
    t.dx = dx;
    // Resist at the ends, where there's no photo to move to.
    const blocked = dx > 0 ? !canPrev : !canNext;
    setDragX(blocked ? dx / 4 : dx);
  };
  const onTouchEnd = () => {
    const t = touch.current;
    touch.current = null;
    if (t?.axis === "y") {
      const fast = t.dy > 40 && Date.now() - t.t < 250;
      if (t.dy > 120 || fast) {
        // Carry on down off the screen, then close.
        setClosing(true);
        setDragY(window.innerHeight);
        setTimeout(onClose, CLOSE_MS);
      } else {
        setDragY(0);
      }
      return;
    }
    if (!t || t.axis !== "x") return setDragX(0);
    const width = scrollRef.current?.clientWidth || window.innerWidth;
    const fast = Math.abs(t.dx) > 30 && Date.now() - t.t < 250;
    const dir = t.dx < 0 ? 1 : -1;
    // Hand the drag over to the slide: the strip carries on from the finger.
    if ((Math.abs(t.dx) > width / 4 || fast) && (dir > 0 ? canNext : canPrev)) go(dir);
    setDragX(0);
  };

  const toggleZoom = (e) => {
    e.stopPropagation();
    const rect = imgRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    setZoomedSrc(zoomed ? null : src);
    if (zoomed) return;
    // Once the larger image has laid out, centre the spot that was tapped.
    requestAnimationFrame(() => {
      const box = scrollRef.current;
      const img = imgRef.current;
      if (!box || !img) return;
      box.scrollLeft = img.offsetLeft + relX * img.offsetWidth - box.clientWidth / 2;
      box.scrollTop = img.offsetTop + relY * img.offsetHeight - box.clientHeight / 2;
    });
  };

  const step = `(100% + ${PANEL_GAP}px)`;
  // Once the new photo arrives the panels have shifted along by one, so the
  // strip jumps back to the middle at the same instant, with no transition.
  const trackStyle = sliding
    ? { transform: `translateX(calc(${-sliding.dir} * ${step}))`, transition: sliding.done ? "none" : `transform ${SLIDE_MS}ms cubic-bezier(0.2, 0.7, 0.3, 1)` }
    : slide
      ? { transform: "none", transition: "none" }
      : { transform: dragX ? `translateX(${dragX}px)` : "none", transition: dragX ? "none" : "transform 0.2s ease-out" };

  // Keyed by photo, so the one sliding in keeps its loaded image as it becomes
  // the current photo.
  const panels = [
    prev && onPrev && { ...prev, pos: -1 },
    { src, alt, video, pos: 0 },
    next && onNext && { ...next, pos: 1 },
  ].filter(Boolean);

  // Pulling down shrinks the photo a little and fades the backdrop; the
  // buttons and comments bar get out of the way until it settles. At rest the
  // backdrop is solid: iOS Safari tints its bars from a fixed overlay's
  // colour, but only when that colour is opaque.
  const pull = Math.max(0, Math.min(dragY / 400, 1));
  const dropStyle = {
    transform: dragY ? `translateY(${dragY}px) scale(${1 - pull * 0.15})` : "none",
    transition: dragY && !closing ? "none" : `transform ${closing ? CLOSE_MS : 200}ms ${closing ? "ease-in" : "ease-out"}`,
  };
  const pulling = dragY > 0 || closing;
  const chrome = { opacity: pulling ? 0 : 1, transition: "opacity 0.15s" };

  const arrow = "hidden sm:flex absolute top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full";
  const arrowStyle = { ...chrome, background: "rgba(10, 10, 10, 0.6)", color: "#F4F1EC" };

  const backdrop = {
    background: `rgba(10, 10, 10, ${closing ? 0 : dragY ? 0.96 * (1 - pull * 0.8) : 1})`,
    transition: dragY && !closing ? "none" : `background-color ${CLOSE_MS}ms`,
  };
  // iOS Safari colours its status bar and toolbar from fixed elements along the
  // screen edges, skipping anything still fading in. These strips stay solid
  // from the first frame so the bars turn black with the viewer.
  const edge = "fixed inset-x-0 h-3 z-[101] pointer-events-none";

  return createPortal(
    <>
      <div aria-hidden="true" className={`${edge} top-0`} style={backdrop} />
      <div aria-hidden="true" className={`${edge} bottom-0`} style={backdrop} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={alt}
        className="lightbox fixed inset-0 z-[100]"
        style={backdrop}
        onClick={onClose}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={dropStyle}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          <div className="absolute inset-0" style={trackStyle}>
            {panels.map((p) => {
              const current = p.pos === 0;
              const anim = p.src === firstSrc ? "lightbox-img " : "";
              return (
                <div
                  key={p.src}
                  ref={current ? scrollRef : undefined}
                  aria-hidden={current ? undefined : "true"}
                  className={`absolute inset-0 flex p-4 ${current ? "overflow-auto" : "overflow-hidden"}`}
                  style={{ transform: p.pos ? `translateX(calc(${p.pos} * ${step}))` : undefined }}
                >
                  {p.video ? (
                    current ? (
                      <video
                        key="playing"
                        src={p.src}
                        controls
                        autoPlay
                        playsInline
                        aria-label={p.alt}
                        onClick={(e) => e.stopPropagation()}
                        className={`${anim}m-auto`}
                        style={{ maxWidth: "100%", maxHeight: "100%" }}
                      />
                    ) : (
                      <video key="still" src={`${p.src}#t=0.1`} muted playsInline preload="metadata" className="m-auto" style={{ maxWidth: "100%", maxHeight: "100%" }} />
                    )
                  ) : (
                    <img
                      ref={current ? imgRef : undefined}
                      src={p.src}
                      alt={current ? p.alt : ""}
                      onClick={current ? toggleZoom : undefined}
                      draggable={false}
                      className={`${anim}m-auto select-none`}
                      style={
                        current && zoomed
                          ? { width: "250%", maxWidth: "none", cursor: "zoom-out" }
                          : { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", cursor: current ? "zoom-in" : undefined }
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo"
          className="absolute right-4 w-11 h-11 flex items-center justify-center rounded-full"
          style={{ ...chrome, top: "calc(env(safe-area-inset-top, 0px) + 16px)", background: "rgba(10, 10, 10, 0.6)", color: "#F4F1EC" }}
        >
          <X size={20} strokeWidth={1.75} />
        </button>
        {!zoomed && canPrev && (
          <button type="button" aria-label="Previous photo" className={`${arrow} left-4`} style={arrowStyle} onClick={(e) => { e.stopPropagation(); go(-1); }}>
            <ChevronLeft size={22} strokeWidth={1.75} />
          </button>
        )}
        {!zoomed && canNext && (
          <button type="button" aria-label="Next photo" className={`${arrow} right-4`} style={arrowStyle} onClick={(e) => { e.stopPropagation(); go(1); }}>
            <ChevronRight size={22} strokeWidth={1.75} />
          </button>
        )}
        {!zoomed && children && (
          <div
            className="absolute inset-x-0 bottom-0"
            style={{ ...chrome, fontFamily: F.body }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        )}
        {!zoomed && !children && (caption || !video) && (
          <div
            className="absolute inset-x-0 px-6 text-center pointer-events-none"
            style={{ ...chrome, bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)", fontFamily: F.body }}
          >
            {caption && <p className="text-[13px] mb-1.5" style={{ color: "#F4F1EC" }}>{caption}</p>}
            {!video && <p className="text-[11px]" style={{ color: "rgba(244, 241, 236, 0.6)" }}>Tap the photo to zoom</p>}
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
