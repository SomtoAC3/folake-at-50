// Tells a photo's uploader that someone commented on it, and a guest that
// someone replied to their comment.
// Invoked from the gallery right after a guest posts a comment. Only the
// comment's author may call it, each comment notifies at most once, and
// guests are never notified about their own comments.
//
// Uses the same VAPID secrets as send-push.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Not signed in." }, 401);

    const { comment_id } = await req.json();
    if (!comment_id) return json({ error: "comment_id is required." }, 400);

    // Claim the comment: only its author, only once.
    const { data: comment, error: claimErr } = await admin
      .from("gallery_comments")
      .update({ notified: true })
      .eq("id", comment_id)
      .eq("guest_id", userData.user.id)
      .eq("notified", false)
      .select("upload_id, guest_id, reply_to_guest, author_name, body")
      .maybeSingle();
    if (claimErr) return json({ error: claimErr.message }, 500);
    if (!comment) return json({ sent: 0, skipped: "already notified or not yours" });

    // Who to tell: the photo's uploader, and for a reply, the guest replied
    // to (their message wins if they're the same person). Never the author.
    const titles = new Map<string, string>();
    const { data: upload } = await admin
      .from("gallery_uploads")
      .select("guest_id")
      .eq("id", comment.upload_id)
      .maybeSingle();
    if (upload?.guest_id) titles.set(upload.guest_id, `${comment.author_name} commented on your photo`);
    if (comment.reply_to_guest) titles.set(comment.reply_to_guest, `${comment.author_name} replied to your comment`);
    titles.delete(comment.guest_id);
    if (titles.size === 0) return json({ sent: 0, skipped: "no one to notify" });

    const { data: subs, error: subsErr } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id")
      .in("user_id", [...titles.keys()]);
    if (subsErr) return json({ error: subsErr.message }, 500);
    if (!subs?.length) return json({ sent: 0 });

    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT")!,
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!
    );

    const snippet = comment.body.length > 80 ? `${comment.body.slice(0, 79)}…` : comment.body;

    let sent = 0;
    const dead: string[] = [];
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({
              title: titles.get(sub.user_id),
              body: snippet,
              url: `/gallery?photo=${comment.upload_id}`,
            })
          );
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) dead.push(sub.endpoint);
        }
      })
    );

    if (dead.length > 0) {
      await admin.from("push_subscriptions").delete().in("endpoint", dead);
    }

    return json({ sent, removed: dead.length });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
