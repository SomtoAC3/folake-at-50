-- Comments and hearts on approved gallery photos (experiment).
-- Signed-in guests can read and post; comments go live straight away.
-- Guests delete their own; organizers can delete any. The comment author's
-- name is copied from their guest profile, so it can't be made up, and a
-- guest without a name can't comment.

create table if not exists public.gallery_comments (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.gallery_uploads (id) on delete cascade,
  guest_id uuid not null default auth.uid() references public.guests (id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(btrim(body)) between 1 and 300),
  created_at timestamptz not null default now(),
  -- Set by the notify-comment function so each comment pings the uploader once.
  notified boolean not null default false
);

create index if not exists gallery_comments_upload_idx on public.gallery_comments (upload_id, created_at);

create or replace function public.set_gallery_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select nullif(btrim(full_name), '') into new.author_name from public.guests where id = new.guest_id;
  if new.author_name is null then
    raise exception 'Add your name before commenting.';
  end if;
  new.body := btrim(new.body);
  new.created_at := now();
  new.notified := false;
  return new;
end;
$$;

drop trigger if exists gallery_comments_author on public.gallery_comments;
create trigger gallery_comments_author
  before insert on public.gallery_comments
  for each row execute function public.set_gallery_comment_author();

create table if not exists public.gallery_likes (
  upload_id uuid not null references public.gallery_uploads (id) on delete cascade,
  guest_id uuid not null default auth.uid() references public.guests (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (upload_id, guest_id)
);

alter table public.gallery_comments enable row level security;
alter table public.gallery_likes enable row level security;

-- Only photos guests can already see take comments and hearts.
create or replace function public.is_approved_upload(upload uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.gallery_uploads where id = upload and status = 'approved');
$$;

revoke all on function public.is_approved_upload(uuid) from public;
grant execute on function public.is_approved_upload(uuid) to authenticated;

drop policy if exists "signed-in guests read comments" on public.gallery_comments;
create policy "signed-in guests read comments" on public.gallery_comments
  for select to authenticated using (public.is_approved_upload(upload_id) or public.is_organizer());

drop policy if exists "guests post their own comments" on public.gallery_comments;
create policy "guests post their own comments" on public.gallery_comments
  for insert to authenticated with check (guest_id = auth.uid() and public.is_approved_upload(upload_id));

drop policy if exists "guests delete their own comments" on public.gallery_comments;
create policy "guests delete their own comments" on public.gallery_comments
  for delete to authenticated using (guest_id = auth.uid() or public.is_organizer());

drop policy if exists "signed-in guests read hearts" on public.gallery_likes;
create policy "signed-in guests read hearts" on public.gallery_likes
  for select to authenticated using (public.is_approved_upload(upload_id));

drop policy if exists "guests add their own hearts" on public.gallery_likes;
create policy "guests add their own hearts" on public.gallery_likes
  for insert to authenticated with check (guest_id = auth.uid() and public.is_approved_upload(upload_id));

drop policy if exists "guests remove their own hearts" on public.gallery_likes;
create policy "guests remove their own hearts" on public.gallery_likes
  for delete to authenticated using (guest_id = auth.uid());

grant select, insert, delete on public.gallery_comments to authenticated;
grant select, insert, delete on public.gallery_likes to authenticated;

-- One row per approved photo with its comment and heart counts, and whether
-- the viewer has hearted it. Runs with the viewer's permissions.
create or replace view public.gallery_counts with (security_invoker = true) as
select
  u.id as upload_id,
  (select count(*) from public.gallery_comments c where c.upload_id = u.id)::int as comments,
  (select count(*) from public.gallery_likes l where l.upload_id = u.id)::int as hearts,
  exists (select 1 from public.gallery_likes l where l.upload_id = u.id and l.guest_id = auth.uid()) as hearted
from public.gallery_uploads u
where u.status = 'approved';

grant select on public.gallery_counts to authenticated;

-- New comments and hearts reach open pages without a reload.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'gallery_comments') then
    alter publication supabase_realtime add table public.gallery_comments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'gallery_likes') then
    alter publication supabase_realtime add table public.gallery_likes;
  end if;
end $$;
