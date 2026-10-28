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
// and pan by scrolling; tap outside it, the close button or Escape to close.
// With `video`, it plays the clip with the browser's own controls instead.
// `children`, when given, replaces the caption block at the bottom (the
// gallery puts its hearts and comments there). Clicks inside it don't close.
// With `onPrev`/`onNext`, swiping sideways (or the arrow keys) moves between
// photos; the photo follows the finger and slides in from that side.
export function Lightbox({ src, alt, caption, video = false, onClose, onPrev, onNext, children }) {
  // Zoom belongs to one photo, so moving to the next starts unzoomed.
  const [zoomedSrc, setZoomedSrc] = useState(null);
  const zoomed = zoomedSrc === src;
  const [dragX, setDragX] = useState(0);
  const [enterFrom, setEnterFrom] = useState(null);
  const scrollRef = useRef(null);
  const imgRef = useRef(null);
  const touch = useRef(null);
  const nav = useRef({});
  useEffect(() => {
    nav.current = { onPrev, onNext, zoomed };
  });

  const go = (dir) => {
    const fn = dir > 0 ? nav.current.onNext : nav.current.onPrev;
    if (!fn || nav.current.zoomed) return;
    setEnterFrom(dir > 0 ? "right" : "left");
    fn();
  };

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

  // Sideways swipes only: the first few pixels decide whether the gesture is
  // horizontal. A second finger (pinch) or a zoomed photo cancels it.
  const onTouchStart = (e) => {
    touch.current = !zoomed && (onPrev || onNext) && e.touches.length === 1
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), axis: null }
      : null;
  };
  const onTouchMove = (e) => {
    const t = touch.current;
    if (!t) return;
    if (e.touches.length > 1) {
      touch.current = null;
      setDragX(0);
      return;
    }
    const dx = e.touches[0].clientX - t.x;
    const dy = e.touches[0].clientY - t.y;
    if (!t.axis && Math.hypot(dx, dy) > 10) t.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (t.axis !== "x") return;
    t.dx = dx;
    // Resist at the ends, where there's no photo to move to.
    const blocked = dx > 0 ? !onPrev : !onNext;
    setDragX(blocked ? dx / 4 : dx);
  };
  const onTouchEnd = () => {
    const t = touch.current;
    touch.current = null;
    setDragX(0);
    if (!t || t.axis !== "x") return;
    const fast = Math.abs(t.dx) > 30 && Date.now() - t.t < 250;
    if (Math.abs(t.dx) > 70 || fast) go(t.dx < 0 ? 1 : -1);
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

  const mediaAnim = enterFrom ? `lightbox-from-${enterFrom}` : "lightbox-img";
  const arrow = "hidden sm:flex absolute top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full";
  const arrowStyle = { background: "rgba(10, 10, 10, 0.6)", color: "#F4F1EC" };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="lightbox fixed inset-0 z-[100]"
      style={{ background: "rgba(10, 10, 10, 0.96)" }}
      onClick={onClose}
    >
      <div
        ref={scrollRef}
        className="w-full h-full overflow-auto flex p-4"
        style={{ transform: dragX ? `translateX(${dragX}px)` : undefined, transition: dragX ? "none" : "transform 0.2s ease-out" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {video ? (
          <video
            key={src}
            src={src}
            controls
            autoPlay
            playsInline
            aria-label={alt}
            onClick={(e) => e.stopPropagation()}
            className={`${mediaAnim} m-auto`}
            style={{ maxWidth: "100%", maxHeight: "100%" }}
          />
        ) : (
          <img
            key={src}
            ref={imgRef}
            src={src}
            alt={alt}
            onClick={toggleZoom}
            className={`${mediaAnim} m-auto select-none`}
            style={
              zoomed
                ? { width: "250%", maxWidth: "none", cursor: "zoom-out" }
                : { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", cursor: "zoom-in" }
            }
          />
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo"
        className="absolute right-4 w-11 h-11 flex items-center justify-center rounded-full"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)", background: "rgba(10, 10, 10, 0.6)", color: "#F4F1EC" }}
      >
        <X size={20} strokeWidth={1.75} />
      </button>
      {!zoomed && onPrev && (
        <button type="button" aria-label="Previous photo" className={`${arrow} left-4`} style={arrowStyle} onClick={(e) => { e.stopPropagation(); go(-1); }}>
          <ChevronLeft size={22} strokeWidth={1.75} />
        </button>
      )}
      {!zoomed && onNext && (
        <button type="button" aria-label="Next photo" className={`${arrow} right-4`} style={arrowStyle} onClick={(e) => { e.stopPropagation(); go(1); }}>
          <ChevronRight size={22} strokeWidth={1.75} />
        </button>
      )}
      {!zoomed && children && (
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ fontFamily: F.body }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
      {!zoomed && !children && (caption || !video) && (
        <div
          className="absolute inset-x-0 px-6 text-center pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)", fontFamily: F.body }}
        >
          {caption && <p className="text-[13px] mb-1.5" style={{ color: "#F4F1EC" }}>{caption}</p>}
          {!video && <p className="text-[11px]" style={{ color: "rgba(244, 241, 236, 0.6)" }}>Tap the photo to zoom</p>}
        </div>
      )}
    </div>,
    document.body
  );
}
