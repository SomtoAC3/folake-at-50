import { useEffect, useState } from "react";
import { Check, X, Trash2 } from "lucide-react";
import { COLORS } from "../../shared/theme";
import { Card, SectionTitle, GoldButton, LoadingNote, ErrorNote } from "../../shared/ui";
import { fetchPendingGallery, setGalleryStatus, fetchRecentGalleryComments, deleteGalleryComment } from "../../lib/queries";

export default function AdminGallery() {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");

  function load() {
    fetchPendingGallery().then(setPending).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function decide(id, status) {
    try {
      await setGalleryStatus(id, status);
      setPending((rows) => rows.filter((r) => r.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <SectionTitle eyebrow="Moderate" title="Gallery Uploads" light sub="Approve or reject guest photos before they appear in the shared gallery." />
      <ErrorNote message={error} />
      {!pending && !error && <LoadingNote label="Loading pending uploads…" />}
      {pending && (
        <div className="space-y-4">
          {pending.length === 0 && <p className="text-[12.5px]" style={{ color: COLORS.ivoryDim }}>Nothing pending review.</p>}
          {pending.map((p) => (
            <Card dark key={p.id} className="!p-3">
              <div className="aspect-video rounded-[3px] overflow-hidden mb-3" style={{ border: "1px solid var(--line)" }}>
                {p.isVideo ? (
                  <video src={p.url} controls playsInline preload="metadata" className="w-full h-full object-cover" />
                ) : (
                  <img src={p.url} alt={p.caption || "Pending upload"} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="text-[11.5px] mb-3" style={{ color: COLORS.ivoryDim }}>
                {p.category || "Uncategorized"} · {new Date(p.created_at).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                <GoldButton icon={Check} className="flex-1" onClick={() => decide(p.id, "approved")}>Approve</GoldButton>
                <GoldButton icon={X} variant="outline" className="flex-1" onClick={() => decide(p.id, "rejected")}>Reject</GoldButton>
              </div>
            </Card>
          ))}
        </div>
      )}
      <RecentComments />
    </div>
  );
}

// Comments go live straight away, so organizers moderate after the fact.
function RecentComments() {
  const [comments, setComments] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRecentGalleryComments()
      .then(setComments)
      .catch(() => setUnavailable(true));
  }, []);

  async function remove(id) {
    setError("");
    try {
      await deleteGalleryComment(id);
      setComments((rows) => rows.filter((r) => r.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  if (unavailable) return null;

  return (
    <div className="mt-10">
      <SectionTitle eyebrow="Moderate" title="Recent Comments" light sub="Comments appear as soon as guests post them. Remove anything that shouldn't be there." />
      <ErrorNote message={error} />
      {!comments && <LoadingNote label="Loading comments…" />}
      {comments?.length === 0 && <p className="text-[12.5px]" style={{ color: COLORS.ivoryDim }}>No comments yet.</p>}
      {comments && comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((c) => (
            <Card dark key={c.id} className="!p-3">
              <div className="flex gap-3 items-start">
                <div className="w-14 h-14 shrink-0 rounded-[3px] overflow-hidden" style={{ border: "1px solid var(--line)", background: COLORS.chip }}>
                  {c.thumbUrl &&
                    (c.isVideo ? (
                      <video src={`${c.thumbUrl}#t=0.1`} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                    ) : (
                      <img src={c.thumbUrl} alt="" className="w-full h-full object-cover" />
                    ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold truncate" style={{ color: COLORS.ivory }}>{c.author_name}</div>
                  <p className="text-[13px] leading-snug mt-0.5 break-words" style={{ color: COLORS.ivory }}>{c.body}</p>
                  <div className="text-[11px] mt-1" style={{ color: COLORS.ivoryDim }}>
                    {new Date(c.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  aria-label={`Remove ${c.author_name}'s comment`}
                  className="w-11 h-11 -mr-1 -mt-1 flex items-center justify-center shrink-0 rounded-[3px]"
                  style={{ color: COLORS.danger }}
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
