import { supabase } from "./supabaseClient";

function requireSupabase() {
  if (!supabase) throw new Error("Supabase is not configured yet — set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.");
  return supabase;
}

// ---------------------------------------------------------------------------
// Itinerary (public read)
// ---------------------------------------------------------------------------
export async function fetchItinerary() {
  const db = requireSupabase();
  const { data: days, error: daysError } = await db.from("itinerary_days").select("*").order("sort_order");
  if (daysError) throw daysError;

  const { data: activities, error: actError } = await db.from("itinerary_activities").select("*").order("sort_order");
  if (actError) throw actError;

  return days.map((day) => ({
    ...day,
    activities: activities.filter((a) => a.day_id === day.id),
  }));
}

// ---------------------------------------------------------------------------
// Dress codes (public read)
// ---------------------------------------------------------------------------
export async function fetchDressCodes() {
  const db = requireSupabase();
  const { data, error } = await db.from("dress_codes").select("*").order("sort_order");
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Announcements (public read; read-receipts + posting need a session)
// ---------------------------------------------------------------------------
export async function fetchAnnouncements() {
  const db = requireSupabase();
  const { data, error } = await db.from("announcements").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchReadAnnouncementIds(guestId) {
  if (!guestId) return new Set();
  const db = requireSupabase();
  const { data, error } = await db.from("announcement_reads").select("announcement_id").eq("guest_id", guestId);
  if (error) throw error;
  return new Set(data.map((r) => r.announcement_id));
}

export async function markAnnouncementRead(guestId, announcementId) {
  const db = requireSupabase();
  const { error } = await db.from("announcement_reads").upsert({ guest_id: guestId, announcement_id: announcementId });
  if (error) throw error;
}

export async function postAnnouncement({ category, priority, message }) {
  const db = requireSupabase();
  const { error } = await db.from("announcements").insert({ category, priority, message });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Guest profile / My Trip
// ---------------------------------------------------------------------------
export async function updateGuestProfile(guestId, fields) {
  const db = requireSupabase();
  const { error } = await db.from("guests").update(fields).eq("id", guestId);
  if (error) throw error;
}

// The gallery bucket only allows inserts (no overwrites), so each avatar
// upload gets a fresh path and the guest row points at the current one.
export async function uploadGuestAvatar(guestId, blob) {
  const db = requireSupabase();
  const path = `avatars/${guestId}-${Date.now()}.jpg`;
  const { error: uploadError } = await db.storage
    .from("gallery")
    .upload(path, blob, { contentType: "image/jpeg", cacheControl: "3600" });
  if (uploadError) throw uploadError;
  const { error } = await db.from("guests").update({ avatar_path: path }).eq("id", guestId);
  if (error) throw error;
  return path;
}

// ---------------------------------------------------------------------------
// Guest directory (opted-in, attending guests — requires a session)
// ---------------------------------------------------------------------------
export async function fetchDirectory() {
  const db = requireSupabase();
  const { data, error } = await db.from("guest_directory").select("*");
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------
export async function fetchApprovedGallery(category) {
  const db = requireSupabase();
  let query = db.from("gallery_uploads").select("*").eq("status", "approved").order("created_at", { ascending: false });
  if (category && category !== "All") query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((row) => ({ ...row, url: publicGalleryUrl(row.storage_path), isVideo: isVideoPath(row.storage_path) }));
}

// Guests can upload videos as well as photos; the file extension tells them apart.
export function isVideoPath(storagePath) {
  return /\.(mp4|mov|m4v|webm|3gp)$/i.test(storagePath || "");
}

export function publicGalleryUrl(storagePath) {
  const db = requireSupabase();
  return db.storage.from("gallery").getPublicUrl(storagePath).data.publicUrl;
}

export async function uploadGalleryPhoto({ guestId, file, category, caption }) {
  const db = requireSupabase();
  const ext = file.name.split(".").pop();
  const path = `${guestId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: uploadError } = await db.storage.from("gallery").upload(path, file);
  if (uploadError) throw uploadError;

  const { error: insertError } = await db.from("gallery_uploads").insert({
    guest_id: guestId,
    storage_path: path,
    category,
    caption,
    status: "pending",
  });
  if (insertError) throw insertError;
}

export async function fetchPendingGallery() {
  const db = requireSupabase();
  const { data, error } = await db.from("gallery_uploads").select("*").eq("status", "pending").order("created_at");
  if (error) throw error;
  return data.map((row) => ({ ...row, url: publicGalleryUrl(row.storage_path), isVideo: isVideoPath(row.storage_path) }));
}

export async function setGalleryStatus(id, status) {
  const db = requireSupabase();
  const { error } = await db.from("gallery_uploads").update({ status }).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Gallery comments + hearts (signed-in guests only)
// ---------------------------------------------------------------------------
export const COMMENT_MAX = 300;

// { [uploadId]: { comments, hearts, hearted } }
export async function fetchGalleryCounts() {
  const db = requireSupabase();
  const { data, error } = await db.from("gallery_counts").select("*");
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.upload_id, r]));
}

export async function fetchGalleryComments(uploadId) {
  const db = requireSupabase();
  const { data, error } = await db
    .from("gallery_comments")
    .select("id, guest_id, author_name, body, created_at")
    .eq("upload_id", uploadId)
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function postGalleryComment(uploadId, body) {
  const db = requireSupabase();
  const { data, error } = await db
    .from("gallery_comments")
    .insert({ upload_id: uploadId, body: body.trim() })
    .select("id, guest_id, author_name, body, created_at")
    .single();
  if (error) throw error;
  // Ping the uploader; a failed notification shouldn't fail the comment.
  db.functions.invoke("notify-comment", { body: { comment_id: data.id } }).catch(() => {});
  return data;
}

export async function deleteGalleryComment(id) {
  const db = requireSupabase();
  const { error } = await db.from("gallery_comments").delete().eq("id", id);
  if (error) throw error;
}

export async function setGalleryHeart(uploadId, guestId, hearted) {
  const db = requireSupabase();
  const { error } = hearted
    ? await db.from("gallery_likes").insert({ upload_id: uploadId, guest_id: guestId })
    : await db.from("gallery_likes").delete().eq("upload_id", uploadId).eq("guest_id", guestId);
  // A double tap can race; an existing heart is already the state we want.
  if (error && error.code !== "23505") throw error;
}

export async function fetchRecentGalleryComments(limit = 50) {
  const db = requireSupabase();
  const { data, error } = await db
    .from("gallery_comments")
    .select("id, author_name, body, created_at, upload_id, gallery_uploads(storage_path)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map((row) => ({
    ...row,
    thumbUrl: row.gallery_uploads ? publicGalleryUrl(row.gallery_uploads.storage_path) : null,
    isVideo: isVideoPath(row.gallery_uploads?.storage_path),
  }));
}

// ---------------------------------------------------------------------------
// Admin: guests + stats
// ---------------------------------------------------------------------------
export async function fetchAllGuests() {
  const db = requireSupabase();
  const { data, error } = await db.from("guests").select("*").order("created_at");
  if (error) throw error;
  return data;
}

export async function fetchAdminStats() {
  const db = requireSupabase();
  const [{ count: totalGuests }, { count: attending }, { count: pendingUploads }, guests] = await Promise.all([
    db.from("guests").select("id", { count: "exact", head: true }),
    db.from("guests").select("id", { count: "exact", head: true }).eq("rsvp_status", "attending"),
    db.from("gallery_uploads").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("guests").select("full_name, phone, email"),
  ]);
  const incompleteProfiles = (guests.data || []).filter((g) => !g.full_name || !g.phone).length;
  return {
    totalGuests: totalGuests ?? 0,
    attending: attending ?? 0,
    incompleteProfiles,
    pendingUploads: pendingUploads ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Site content (welcome note, etc.) — public read, organizer write
// ---------------------------------------------------------------------------
export async function fetchSiteContent(key) {
  const db = requireSupabase();
  const { data, error } = await db.from("site_content").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

export async function saveSiteContent(key, value) {
  const db = requireSupabase();
  const { error } = await db.from("site_content").upsert({ key, value });
  if (error) throw error;
}

// JSON-valued site content (lists like FAQs, contacts, travel sections).
// Falls back to the bundled defaults when the key hasn't been saved yet —
// or when Supabase isn't reachable — so pages always render.
export async function fetchJsonContent(key, fallback) {
  try {
    const raw = await fetchSiteContent(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export async function saveJsonContent(key, value) {
  return saveSiteContent(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Admin: itinerary editing
// ---------------------------------------------------------------------------
export async function saveItineraryDay({ id, date, label, weekday, theme, city }) {
  const db = requireSupabase();
  const row = { date, label, weekday, theme, city };
  const { error } = id
    ? await db.from("itinerary_days").update(row).eq("id", id)
    : await db.from("itinerary_days").insert(row);
  if (error) throw error;
  await renumberItineraryDays();
}

// Guests see days ordered by sort_order, so keep it aligned with the dates.
async function renumberItineraryDays() {
  const db = requireSupabase();
  const { data: days, error } = await db.from("itinerary_days").select("id, sort_order").order("date");
  if (error) throw error;
  await Promise.all(
    days
      .map((d, i) => ({ ...d, next: i + 1 }))
      .filter((d) => d.sort_order !== d.next)
      .map((d) => db.from("itinerary_days").update({ sort_order: d.next }).eq("id", d.id))
  );
}

export async function deleteItineraryDay(id) {
  const db = requireSupabase();
  const { error } = await db.from("itinerary_days").delete().eq("id", id);
  if (error) throw error;
  await renumberItineraryDays();
}

export async function saveItineraryActivity({ id, ...fields }) {
  const db = requireSupabase();
  const { error } = id
    ? await db.from("itinerary_activities").update(fields).eq("id", id)
    : await db.from("itinerary_activities").insert({ id: crypto.randomUUID(), ...fields });
  if (error) throw error;
}

export async function deleteItineraryActivity(id) {
  const db = requireSupabase();
  const { error } = await db.from("itinerary_activities").delete().eq("id", id);
  if (error) throw error;
}

export async function swapActivityOrder(a, b) {
  const db = requireSupabase();
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    db.from("itinerary_activities").update({ sort_order: b.sort_order }).eq("id", a.id),
    db.from("itinerary_activities").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);
  if (e1 || e2) throw e1 || e2;
}

// ---------------------------------------------------------------------------
// Admin: dress code editing
// ---------------------------------------------------------------------------
export async function saveDressCode({ id, ...fields }) {
  const db = requireSupabase();
  const { error } = id
    ? await db.from("dress_codes").update(fields).eq("id", id)
    : await db.from("dress_codes").insert({ id: crypto.randomUUID(), ...fields });
  if (error) throw error;
}

export async function deleteDressCode(id) {
  const db = requireSupabase();
  const { error } = await db.from("dress_codes").delete().eq("id", id);
  if (error) throw error;
}

export async function swapDressCodeOrder(a, b) {
  const db = requireSupabase();
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    db.from("dress_codes").update({ sort_order: b.sort_order }).eq("id", a.id),
    db.from("dress_codes").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);
  if (e1 || e2) throw e1 || e2;
}

export async function setGuestOrganizer(guestId, isOrganizer) {
  const db = requireSupabase();
  const { error } = await db.from("guests").update({ is_organizer: isOrganizer }).eq("id", guestId);
  if (error) throw error;
}
