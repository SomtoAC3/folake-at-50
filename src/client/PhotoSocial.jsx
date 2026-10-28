import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, X, Trash2, Send, SmilePlus } from "lucide-react";
import { COLORS, F, DISPLAY_LUXE } from "../shared/theme";
import { GoldButton, Field } from "../shared/ui";
import { useAuth } from "../lib/auth";
import {
  COMMENT_MAX,
  COMMENT_REACTIONS,
  fetchGalleryComments,
  postGalleryComment,
  deleteGalleryComment,
  setCommentReaction,
  updateGuestProfile,
} from "../lib/queries";

const ON_PHOTO = "#F4F1EC";
const ON_PHOTO_DIM = "rgba(244, 241, 236, 0.6)";

// Bottom of the full-screen photo: caption, hearts and the comments button.
// `stats` is null when comments aren't available (signed out, or the
// feature isn't switched on in the database yet).
export function PhotoSocialBar({ photo, stats, onHeart, onCommentsChange, liveTick }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div
        className="px-5 pt-10"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)",
          background: "linear-gradient(to top, rgba(10, 10, 10, 0.85), rgba(10, 10, 10, 0))",
        }}
      >
        {photo.caption && <p className="text-[13px] mb-3" style={{ color: ON_PHOTO }}>{photo.caption}</p>}
        {!user ? (
          <button
            type="button"
            onClick={() => navigate("/login", { state: { from: `/gallery?photo=${photo.id}` } })}
            className="inline-flex items-center gap-2 rounded-[3px] px-3.5 min-h-[44px] text-[12px] font-medium"
            style={{ background: "rgba(244, 241, 236, 0.12)", color: ON_PHOTO }}
          >
            <MessageCircle size={16} strokeWidth={1.75} />
            Sign in to see comments and hearts
          </button>
        ) : stats ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onHeart}
              aria-pressed={stats.hearted}
              aria-label={stats.hearted ? "Remove your heart" : "Heart this photo"}
              className="inline-flex items-center gap-2 rounded-[3px] px-3.5 min-h-[44px] text-[13px] font-medium tabular-nums"
              style={{ background: "rgba(244, 241, 236, 0.12)", color: ON_PHOTO }}
            >
              <Heart
                size={18}
                strokeWidth={1.75}
                fill={stats.hearted ? "#E2574C" : "none"}
                color={stats.hearted ? "#E2574C" : "currentColor"}
              />
              {stats.hearts}
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label={`Open comments (${stats.comments})`}
              className="inline-flex items-center gap-2 rounded-[3px] px-3.5 min-h-[44px] text-[13px] font-medium tabular-nums"
              style={{ background: "rgba(244, 241, 236, 0.12)", color: ON_PHOTO }}
            >
              <MessageCircle size={18} strokeWidth={1.75} />
              {stats.comments === 0 ? "Comment" : stats.comments === 1 ? "1 comment" : `${stats.comments} comments`}
            </button>
            {!photo.isVideo && (
              <span className="ml-auto text-[11px]" style={{ color: ON_PHOTO_DIM }}>Tap to zoom</span>
            )}
          </div>
        ) : (
          !photo.isVideo && <p className="text-[11px] text-center" style={{ color: ON_PHOTO_DIM }}>Tap the photo to zoom</p>
        )}
      </div>
      {sheetOpen && stats && (
        <CommentsSheet photo={photo} liveTick={liveTick} onChange={onCommentsChange} onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
}

function CommentsSheet({ photo, liveTick, onChange, onClose }) {
  const { user, profile, isOrganizer, refreshProfile } = useAuth();
  const [comments, setComments] = useState(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, rootId, name }
  const [expanded, setExpanded] = useState(() => new Set());
  const [pickerFor, setPickerFor] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const scrollToEnd = useRef(true);
  const viewport = useVisualViewport();
  const hasName = Boolean(profile?.full_name?.trim());

  useEffect(() => {
    let cancelled = false;
    fetchGalleryComments(photo.id)
      .then((rows) => !cancelled && setComments(rows))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [photo.id, liveTick]);

  // Open on the newest comment, and follow new top-level comments you post.
  useEffect(() => {
    const el = listRef.current;
    if (el && comments && scrollToEnd.current) {
      el.scrollTop = el.scrollHeight;
      scrollToEnd.current = false;
    }
  }, [comments]);

  // Grow the composer with its text, up to about four lines.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + 2, 112)}px`;
  }, [draft]);

  const topLevel = (comments || []).filter((c) => !c.parent_id);
  const repliesTo = (id) => (comments || []).filter((c) => c.parent_id === id);

  function startReply(c) {
    const rootId = c.parent_id || c.id;
    setReplyTo({ id: c.id, rootId, name: c.author_name });
    setExpanded((s) => new Set(s).add(rootId));
    // In a thread, say who you're answering.
    if (c.parent_id && !draft.trim()) setDraft(`@${c.author_name.split(" ")[0]} `);
    inputRef.current?.focus();
  }

  async function post(e) {
    e.preventDefault();
    if (!draft.trim() || posting) return;
    setPosting(true);
    setError("");
    try {
      const row = await postGalleryComment(photo.id, draft, replyTo?.id);
      if (!row.parent_id) scrollToEnd.current = true;
      setComments((rows) => (rows?.some((r) => r.id === row.id) ? rows : [...(rows || []), row]));
      setDraft("");
      setReplyTo(null);
      onChange?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  }

  async function remove(id) {
    setError("");
    try {
      await deleteGalleryComment(id);
      // Removing a comment removes its replies too.
      setComments((rows) => rows.filter((r) => r.id !== id && r.parent_id !== id));
      if (replyTo && (replyTo.id === id || replyTo.rootId === id)) setReplyTo(null);
      onChange?.();
    } catch (e) {
      setError(e.message);
    }
  }

  async function react(c, emoji) {
    setPickerFor(null);
    const on = !c.reactions.some((r) => r.emoji === emoji && r.guest_id === user.id);
    const apply = (add) =>
      setComments((rows) =>
        rows.map((r) =>
          r.id !== c.id
            ? r
            : {
                ...r,
                reactions: add
                  ? [...r.reactions, { emoji, guest_id: user.id }]
                  : r.reactions.filter((x) => !(x.emoji === emoji && x.guest_id === user.id)),
              }
        )
      );
    apply(on);
    try {
      await setCommentReaction(c.id, user.id, emoji, on);
    } catch (e) {
      apply(!on);
      setError(e.message);
    }
  }

  const item = (c) => (
    <CommentItem
      key={c.id}
      comment={c}
      userId={user?.id}
      canDelete={c.guest_id === user?.id || isOrganizer}
      pickerOpen={pickerFor === c.id}
      onTogglePicker={() => setPickerFor((id) => (id === c.id ? null : c.id))}
      onReact={(emoji) => react(c, emoji)}
      onReply={() => startReply(c)}
      onDelete={() => remove(c.id)}
    />
  );

  return (
    <div
      className="fixed inset-x-0 z-[110] flex flex-col justify-end"
      // Track the part of the screen the keyboard leaves visible, so the
      // composer sits right above the keyboard instead of behind it.
      style={viewport ? { top: viewport.top, height: viewport.height } : { top: 0, bottom: 0 }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comments"
        className="comments-sheet sheet-up relative flex flex-col rounded-t-[6px]"
        style={{
          maxHeight: viewport ? Math.min(viewport.height - 56, viewport.layoutHeight * 0.75) : "75vh",
          background: COLORS.ink,
          color: COLORS.ivory,
          borderTop: `1px solid ${COLORS.line}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Solid fill below the sheet, so nothing shows through a translucent keyboard. */}
        <div aria-hidden="true" className="absolute inset-x-0 top-full h-screen" style={{ background: COLORS.ink }} />

        <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
          <h2 className="text-[20px]" style={DISPLAY_LUXE}>Comments</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full"
            style={{ color: COLORS.ivoryDim }}
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-[120px]">
          {!comments && !error && <p className="text-[12.5px]" style={{ color: COLORS.ivoryDim }}>Loading comments…</p>}
          {comments?.length === 0 && (
            <p className="text-[12.5px]" style={{ color: COLORS.ivoryDim }}>No comments yet. Be the first to say something.</p>
          )}
          {topLevel.map((c) => {
            const replies = repliesTo(c.id);
            const open = expanded.has(c.id);
            return (
              <div key={c.id}>
                {item(c)}
                {replies.length > 0 && (
                  <div className="pl-6 mt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((s) => {
                          const next = new Set(s);
                          if (open) next.delete(c.id);
                          else next.add(c.id);
                          return next;
                        })
                      }
                      aria-expanded={open}
                      className="inline-flex items-center gap-2 min-h-[32px] text-[11.5px] font-semibold"
                      style={{ color: COLORS.ivoryDim }}
                    >
                      <span className="w-6 h-px" style={{ background: COLORS.line }} />
                      {open ? "Hide replies" : replies.length === 1 ? "View 1 reply" : `View ${replies.length} replies`}
                    </button>
                    {open && <div className="space-y-4 mt-2">{replies.map(item)}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="px-5 pt-3"
          style={{ borderTop: `1px solid ${COLORS.line}`, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}
        >
          {error && <p className="text-[12px] mb-2" style={{ color: COLORS.danger }}>{error}</p>}
          {hasName && replyTo && (
            <div className="flex items-center justify-between mb-2 text-[12px]" style={{ color: COLORS.ivoryDim }}>
              <span className="truncate">
                Replying to <span className="font-semibold" style={{ color: COLORS.ivory }}>{replyTo.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                aria-label="Cancel reply"
                className="w-8 h-8 -mr-2 flex items-center justify-center shrink-0 rounded-full"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </div>
          )}
          {hasName ? (
            <form onSubmit={post} className="flex items-end gap-2">
              <label className="flex-1 flex">
                <span className="sr-only">{replyTo ? `Reply to ${replyTo.name}` : "Write a comment"}</span>
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) post(e);
                  }}
                  rows={1}
                  maxLength={COMMENT_MAX}
                  placeholder={replyTo ? `Reply to ${replyTo.name.split(" ")[0]}` : `Comment as ${profile.full_name.trim()}`}
                  className="block w-full rounded-[3px] px-3 py-[10px] leading-[22px] outline-none resize-none overflow-y-auto"
                  style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.ivory, fontFamily: F.body }}
                />
              </label>
              <button
                type="submit"
                disabled={!draft.trim() || posting}
                aria-label={replyTo ? "Post reply" : "Post comment"}
                className="w-11 h-11 shrink-0 flex items-center justify-center rounded-[3px] disabled:opacity-40"
                style={{ background: COLORS.ivory, color: COLORS.ink }}
              >
                <Send size={16} strokeWidth={1.75} />
              </button>
            </form>
          ) : (
            <NamePrompt userId={user.id} onSaved={refreshProfile} />
          )}
          {hasName && draft.length > COMMENT_MAX - 60 && (
            <p className="text-[11px] mt-1 text-right tabular-nums" style={{ color: COLORS.ivoryDim }}>
              {COMMENT_MAX - draft.length} characters left
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment: c, userId, canDelete, pickerOpen, onTogglePicker, onReact, onReply, onDelete }) {
  const reactions = COMMENT_REACTIONS.map((emoji) => {
    const rows = c.reactions.filter((r) => r.emoji === emoji);
    return { emoji, count: rows.length, mine: rows.some((r) => r.guest_id === userId) };
  }).filter((r) => r.count > 0);

  return (
    <div className="flex gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[12.5px] font-semibold truncate">{c.author_name}</span>
          <span className="text-[11px] shrink-0" style={{ color: COLORS.ivoryDim }}>{timeAgo(c.created_at)}</span>
        </div>
        <p className="text-[13px] leading-snug mt-0.5 break-words whitespace-pre-wrap">{c.body}</p>
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact(r.emoji)}
                aria-pressed={r.mine}
                aria-label={`${r.emoji} ${r.count}${r.mine ? ", including you" : ""}`}
                className="inline-flex items-center gap-1 h-7 px-2 rounded-full text-[12px] tabular-nums"
                style={{ background: COLORS.chip, border: `1px solid ${r.mine ? COLORS.gold : "transparent"}` }}
              >
                <span className="text-[13px]">{r.emoji}</span>
                {r.count}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 mt-1 -ml-2" style={{ color: COLORS.ivoryDim }}>
          <button type="button" onClick={onReply} className="min-h-[32px] px-2 text-[11.5px] font-semibold">
            Reply
          </button>
          <button
            type="button"
            onClick={onTogglePicker}
            aria-expanded={pickerOpen}
            aria-label="React to this comment"
            className="w-8 h-8 flex items-center justify-center rounded-full"
          >
            <SmilePlus size={15} strokeWidth={1.75} />
          </button>
        </div>
        {pickerOpen && (
          <div className="inline-flex gap-0.5 mt-1 p-1 rounded-full" style={{ background: COLORS.chip }} role="group" aria-label="Pick a reaction">
            {COMMENT_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                aria-label={`React with ${emoji}`}
                className="w-10 h-10 flex items-center justify-center rounded-full text-[20px] active:scale-110 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={c.guest_id === userId ? "Delete your comment" : `Remove ${c.author_name}'s comment`}
          className="w-9 h-9 -mr-2 flex items-center justify-center shrink-0 rounded-full"
          style={{ color: COLORS.ivoryDim }}
        >
          <Trash2 size={15} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

// The visible part of the screen. On phones the on-screen keyboard shrinks
// it without moving fixed elements, so a bottom sheet has to follow it.
function useVisualViewport() {
  const [viewport, setViewport] = useState(readViewport);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setViewport(readViewport());
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return viewport;
}

function readViewport() {
  const vv = window.visualViewport;
  return vv ? { top: vv.offsetTop, height: vv.height, layoutHeight: window.innerHeight } : null;
}

// Comments carry the guest's name, so ask for it before the first one.
function NamePrompt({ userId, onSaved }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await updateGuestProfile(userId, { full_name: name.trim() });
      await onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[12.5px]" style={{ color: COLORS.ivoryDim }}>Add your name so everyone knows who's commenting.</p>
      <Field label="Your name" value={name} onChange={setName} placeholder="e.g. Ada Okafor" />
      {error && <p className="text-[12px]" style={{ color: COLORS.danger }}>{error}</p>}
      <GoldButton className="w-full" onClick={save} disabled={!name.trim() || saving}>
        {saving ? "Saving…" : "Save name"}
      </GoldButton>
    </div>
  );
}

// Small heart and comment counts on a gallery tile.
export function ThumbCounts({ stats }) {
  if (!stats || (stats.hearts === 0 && stats.comments === 0)) return null;
  return (
    <span
      className="absolute left-1.5 bottom-1.5 inline-flex items-center gap-2 rounded-[3px] px-2 py-1 text-[11px] font-medium tabular-nums"
      style={{ background: "rgba(10, 10, 10, 0.6)", color: ON_PHOTO, fontFamily: F.body }}
      aria-label={`${stats.hearts} hearts, ${stats.comments} comments`}
    >
      {stats.hearts > 0 && (
        <span className="inline-flex items-center gap-1">
          <Heart size={12} strokeWidth={2} fill={stats.hearted ? "#E2574C" : "none"} color={stats.hearted ? "#E2574C" : "currentColor"} />
          {stats.hearts}
        </span>
      )}
      {stats.comments > 0 && (
        <span className="inline-flex items-center gap-1">
          <MessageCircle size={12} strokeWidth={2} />
          {stats.comments}
        </span>
      )}
    </span>
  );
}

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
