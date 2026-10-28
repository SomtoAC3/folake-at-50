-- Replies and emoji reactions on gallery comments (experiment).
-- Replies are one level deep: replying to a reply files it under the same
-- top-level comment, and remembers who was replied to so they get notified.

alter table public.gallery_comments
  add column if not exists parent_id uuid references public.gallery_comments (id) on delete cascade,
  add column if not exists reply_to_guest uuid references public.guests (id) on delete set null;

create index if not exists gallery_comments_parent_idx on public.gallery_comments (parent_id);

create or replace function public.set_gallery_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.gallery_comments;
begin
  select nullif(btrim(full_name), '') into new.author_name from public.guests where id = new.guest_id;
  if new.author_name is null then
    raise exception 'Add your name before commenting.';
  end if;
  new.reply_to_guest := null;
  if new.parent_id is not null then
    select * into target from public.gallery_comments where id = new.parent_id;
    if target.id is null or target.upload_id <> new.upload_id then
      raise exception 'That comment has been removed.';
    end if;
    new.parent_id := coalesce(target.parent_id, target.id);
    new.reply_to_guest := target.guest_id;
  end if;
  new.body := btrim(new.body);
  new.created_at := now();
  new.notified := false;
  return new;
end;
$$;

create table if not exists public.gallery_comment_reactions (
  comment_id uuid not null references public.gallery_comments (id) on delete cascade,
  guest_id uuid not null default auth.uid() references public.guests (id) on delete cascade,
  emoji text not null check (emoji in ('❤️', '😂', '😍', '🔥', '👏', '🎉')),
  created_at timestamptz not null default now(),
  primary key (comment_id, guest_id, emoji)
);

alter table public.gallery_comment_reactions enable row level security;

-- A comment is visible when the photo it's on is approved.
create or replace function public.is_visible_comment(comment uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.gallery_comments c
    join public.gallery_uploads u on u.id = c.upload_id
    where c.id = comment and u.status = 'approved'
  );
$$;

revoke all on function public.is_visible_comment(uuid) from public;
grant execute on function public.is_visible_comment(uuid) to authenticated;

drop policy if exists "signed-in guests read reactions" on public.gallery_comment_reactions;
create policy "signed-in guests read reactions" on public.gallery_comment_reactions
  for select to authenticated using (public.is_visible_comment(comment_id) or public.is_organizer());

drop policy if exists "guests add their own reactions" on public.gallery_comment_reactions;
create policy "guests add their own reactions" on public.gallery_comment_reactions
  for insert to authenticated with check (guest_id = auth.uid() and public.is_visible_comment(comment_id));

drop policy if exists "guests remove their own reactions" on public.gallery_comment_reactions;
create policy "guests remove their own reactions" on public.gallery_comment_reactions
  for delete to authenticated using (guest_id = auth.uid());

grant select, insert, delete on public.gallery_comment_reactions to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'gallery_comment_reactions') then
    alter publication supabase_realtime add table public.gallery_comment_reactions;
  end if;
end $$;
