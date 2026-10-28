import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, X, Trash2, Send } from "lucide-react";
import { COLORS, F, DISPLAY_LUXE } from "../shared/theme";
import { GoldButton, Field } from "../shared/ui";
import { useAuth } from "../lib/auth";
import {
  COMMENT_MAX,
  fetchGalleryComments,
  postGalleryComment,
  deleteGalleryComment,
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
  const listRef = useRef(null);
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

  // Keep the newest comment in view as comments arrive.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments?.length]);

  async function post(e) {
    e.preventDefault();
    if (!draft.trim() || posting) return;
    setPosting(true);
    setError("");
    try {
      const row = await postGalleryComment(photo.id, draft);
      setComments((rows) => (rows?.some((r) => r.id === row.id) ? rows : [...(rows || []), row]));
      setDraft("");
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
      setComments((rows) => rows.filter((r) => r.id !== id));
      onChange?.();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex flex-col justify-end" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comments"
        className="sheet-up flex flex-col max-h-[75vh] rounded-t-[6px]"
        style={{ background: COLORS.ink, color: COLORS.ivory, borderTop: `1px solid ${COLORS.line}` }}
        onClick={(e) => e.stopPropagation()}
      >
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

        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-[120px]">
          {!comments && !error && <p className="text-[12.5px]" style={{ color: COLORS.ivoryDim }}>Loading comments…</p>}
          {comments?.length === 0 && (
            <p className="text-[12.5px]" style={{ color: COLORS.ivoryDim }}>No comments yet. Be the first to say something.</p>
          )}
          {comments?.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12.5px] font-semibold truncate">{c.author_name}</span>
                  <span className="text-[11px] shrink-0" style={{ color: COLORS.ivoryDim }}>{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-[13px] leading-snug mt-0.5 break-words whitespace-pre-wrap">{c.body}</p>
              </div>
              {(c.guest_id === user?.id || isOrganizer) && (
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  aria-label={c.guest_id === user?.id ? "Delete your comment" : `Remove ${c.author_name}'s comment`}
                  className="w-9 h-9 -mr-2 flex items-center justify-center shrink-0 rounded-full"
                  style={{ color: COLORS.ivoryDim }}
                >
                  <Trash2 size={15} strokeWidth={1.75} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div
          className="px-5 pt-3"
          style={{ borderTop: `1px solid ${COLORS.line}`, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}
        >
          {error && <p className="text-[12px] mb-2" style={{ color: COLORS.danger }}>{error}</p>}
          {hasName ? (
            <form onSubmit={post} className="flex items-end gap-2">
              <label className="flex-1">
                <span className="sr-only">Write a comment</span>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, COMMENT_MAX))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) post(e);
                  }}
                  rows={1}
                  maxLength={COMMENT_MAX}
                  placeholder={`Comment as ${profile.full_name.trim()}`}
                  className="w-full rounded-[3px] px-3 py-2.5 text-[13px] outline-none min-h-[44px] max-h-28 resize-none"
                  style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.ivory, fontFamily: F.body }}
                />
              </label>
              <button
                type="submit"
                disabled={!draft.trim() || posting}
                aria-label="Post comment"
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
