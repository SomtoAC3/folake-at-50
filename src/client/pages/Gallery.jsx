import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Upload, Play } from "lucide-react";
import { COLORS } from "../../shared/theme";
import { GoldButton, SectionTitle, LoadingNote, ErrorNote, Lightbox } from "../../shared/ui";
import { GALLERY_FILTERS } from "../data/staticContent";
import { useAuth } from "../../lib/auth";
import { fetchApprovedGallery, uploadGalleryPhoto, fetchGalleryCounts, setGalleryHeart } from "../../lib/queries";
import { supabase } from "../../lib/supabaseClient";
import { claimPushSubscription } from "../../lib/push";
import { PhotoSocialBar, ThumbCounts } from "../PhotoSocial";

export default function Gallery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");
  const [photos, setPhotos] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  // { [uploadId]: { comments, hearts, hearted } }, or null when signed out or
  // comments aren't set up in the database yet (the gallery works as before).
  const [countsState, setCounts] = useState(null);
  const counts = user ? countsState : null;
  // Bumped on every live comment/heart change so an open comments panel refetches.
  const [liveTick, setLiveTick] = useState(0);
  const fileInputRef = useRef(null);

  // The open photo lives in the URL (?photo=id) so notifications can link to it.
  const [params, setParams] = useSearchParams();
  const openId = params.get("photo");
  const openIndex = openId && photos ? photos.findIndex((p) => p.id === openId) : -1;
  const open = openIndex >= 0 ? photos[openIndex] : null;
  const prev = open ? photos[openIndex - 1] : null;
  const next = open ? photos[openIndex + 1] : null;
  const setOpen = (p) => setParams(p ? { photo: p.id } : {}, { replace: true });
  const asSlide = (p) => p && { src: p.url, alt: p.caption || (p.isVideo ? "Guest video" : "Guest photo"), video: p.isVideo };

  useEffect(() => {
    fetchApprovedGallery(filter)
      .then(setPhotos)
      .catch((e) => setError(e.message));
  }, [filter]);

  const loadCounts = useCallback(() => {
    if (!user) return;
    fetchGalleryCounts()
      .then(setCounts)
      .catch(() => setCounts(null));
  }, [user]);

  useEffect(loadCounts, [loadCounts]);

  useEffect(() => {
    if (user) claimPushSubscription(user.id).catch(() => {});
  }, [user]);

  // Live updates: any comment or heart change refreshes the counts.
  const social = Boolean(counts);
  useEffect(() => {
    if (!user || !social || !supabase) return;
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        loadCounts();
        setLiveTick((t) => t + 1);
      }, 250);
    };
    const channel = supabase
      .channel("gallery-social")
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery_comments" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery_likes" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery_comment_reactions" }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [user, social, loadCounts]);

  async function toggleHeart(photo) {
    const prev = counts[photo.id] || { upload_id: photo.id, comments: 0, hearts: 0, hearted: false };
    const next = { ...prev, hearted: !prev.hearted, hearts: prev.hearts + (prev.hearted ? -1 : 1) };
    setCounts((c) => ({ ...c, [photo.id]: next }));
    try {
      await setGalleryHeart(photo.id, user.id, next.hearted);
    } catch (e) {
      setCounts((c) => ({ ...c, [photo.id]: prev }));
      setError(e.message);
    }
  }

  const statsFor = (p) => (counts ? counts[p.id] || { upload_id: p.id, comments: 0, hearts: 0, hearted: false } : null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("");
    setError("");
    try {
      await uploadGalleryPhoto({ guestId: user.id, file, category: filter === "All" ? null : filter });
      setUploadMsg("Uploaded! It'll appear here once an organizer approves it.");
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="px-5 pt-6">
      <SectionTitle eyebrow="Shared Memories" title="Photo &amp; Memory Wall" light sub="Every upload is reviewed by the organizing team before it appears here." />
      <ErrorNote message={error} />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-5 px-5" style={{ scrollbarWidth: "none" }}>
        {GALLERY_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="shrink-0 rounded-[3px] px-3.5 py-1.5 text-[11.5px] font-medium min-h-[36px]"
            style={{
              background: filter === f ? COLORS.gold : COLORS.card,
              color: filter === f ? COLORS.ink : COLORS.ivoryDim,
              border: filter === f ? "none" : "1px solid var(--line)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {user ? (
        <>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
          <GoldButton icon={Upload} className="w-full mb-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload Photo or Video"}
          </GoldButton>
        </>
      ) : (
        <GoldButton icon={Upload} className="w-full mb-2" onClick={() => navigate("/login", { state: { from: "/gallery" } })}>
          Sign in to share a photo
        </GoldButton>
      )}
      {uploadMsg && <p className="text-[12px] mb-3" style={{ color: COLORS.gold }}>{uploadMsg}</p>}

      {!photos && !error && <LoadingNote label="Loading the gallery…" />}
      {photos && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {photos.length === 0 && (
            <p className="col-span-2 text-[12.5px]" style={{ color: COLORS.ivoryDim }}>
              No approved photos in this category yet — be the first to share one.
            </p>
          )}
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(p)}
              aria-label={`View ${p.caption || (p.isVideo ? "guest video" : "guest photo")} full screen`}
              className="relative aspect-square rounded-[3px] overflow-hidden"
              style={{ border: "1px solid var(--line)", cursor: "zoom-in" }}
            >
              <GalleryThumb item={p} />
              <ThumbCounts stats={counts?.[p.id]} />
            </button>
          ))}
        </div>
      )}
      {open && (
        <Lightbox
          src={open.url}
          alt={open.caption || (open.isVideo ? "Guest video" : "Guest photo")}
          caption={open.caption}
          video={open.isVideo}
          onClose={() => setOpen(null)}
          prev={asSlide(prev)}
          next={asSlide(next)}
          onPrev={prev ? () => setOpen(prev) : undefined}
          onNext={next ? () => setOpen(next) : undefined}
        >
          <PhotoSocialBar key={open.id} photo={open} stats={user ? statsFor(open) : null} onHeart={() => toggleHeart(open)} onCommentsChange={loadCounts} liveTick={liveTick} />
        </Lightbox>
      )}
    </div>
  );
}

// Square tile for a gallery upload. Videos show their first frame (the #t
// fragment makes iOS paint one) with a play badge.
function GalleryThumb({ item }) {
  if (!item.isVideo) {
    return <img src={item.url} alt={item.caption || "Guest upload"} className="w-full h-full object-cover" />;
  }
  return (
    <>
      <video src={`${item.url}#t=0.1`} muted playsInline preload="metadata" className="w-full h-full object-cover" />
      <span
        className="absolute inset-0 m-auto w-10 h-10 flex items-center justify-center rounded-full"
        style={{ background: "rgba(10, 10, 10, 0.55)", color: "#F4F1EC" }}
        aria-hidden="true"
      >
        <Play size={16} strokeWidth={1.75} fill="currentColor" />
      </span>
    </>
  );
}
