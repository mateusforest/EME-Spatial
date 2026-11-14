-- Isolated names: this migration does not alter EME Select tables or auth users.
create schema if not exists spatial_portal_private;
revoke all on schema spatial_portal_private from public, anon, authenticated;

create table public.spatial_portal_members (
  email text primary key check (email = lower(email) and char_length(email) <= 254),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.spatial_portal_members enable row level security;
revoke all on public.spatial_portal_members from public, anon, authenticated;
-- Anonymous SELECT returns no rows; the grant lets the scoped storage guards
-- evaluate without breaking existing anonymous access to unrelated buckets.
grant select on public.spatial_portal_members to anon, authenticated;
create policy spatial_member_self on public.spatial_portal_members for select to authenticated
  using (email = lower((select auth.jwt()->>'email')));
-- Access list is managed by the project administrator, never by the browser.
insert into public.spatial_portal_members(email) values ('hub@groupmf.com.br');

create table public.spatial_portal_documents (
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('studio','budget','operation','management','briefs','production-queue','media')),
  document_id text not null check (document_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  payload jsonb not null check (octet_length(payload::text) <= 2000000),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, kind, document_id),
  check (jsonb_typeof(payload) = case when kind in ('management','briefs','production-queue') then 'array' else 'object' end)
);
alter table public.spatial_portal_documents enable row level security;
revoke all on public.spatial_portal_documents from public, anon, authenticated;
grant select, insert, update on public.spatial_portal_documents to authenticated;
create policy spatial_document_read on public.spatial_portal_documents for select to authenticated
  using (owner_id = (select auth.uid()) and exists (select 1 from public.spatial_portal_members where enabled));
create policy spatial_document_create on public.spatial_portal_documents for insert to authenticated
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.spatial_portal_members where enabled));
create policy spatial_document_update on public.spatial_portal_documents for update to authenticated
  using (owner_id = (select auth.uid()) and exists (select 1 from public.spatial_portal_members where enabled))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.spatial_portal_members where enabled));

create function spatial_portal_private.document_revision() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    new.version := 1;
  else
    if new.owner_id <> old.owner_id or new.kind <> old.kind or new.document_id <> old.document_id then
      raise exception 'DOCUMENT_ID_IMMUTABLE' using errcode = '22023';
    end if;
    new.version := old.version + 1;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function spatial_portal_private.document_revision() from public, anon, authenticated;
create trigger spatial_document_revision before insert or update on public.spatial_portal_documents
  for each row execute function spatial_portal_private.document_revision();

-- Runs as the authenticated caller; RLS remains enforced, including revoked access.
create function public.spatial_portal_save(p_kind text, p_id text, p_payload jsonb, p_version integer, p_owner uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare saved public.spatial_portal_documents;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_owner is distinct from auth.uid() then raise exception 'ACCOUNT_CHANGED' using errcode = '42501'; end if;
  if p_version is null or p_version < 0 then raise exception 'INVALID_VERSION' using errcode = '22023'; end if;
  if p_version = 0 then
    begin
      insert into public.spatial_portal_documents(owner_id, kind, document_id, payload)
        values (auth.uid(), p_kind, p_id, p_payload) returning * into saved;
    exception when unique_violation then raise exception 'STALE_VERSION' using errcode = 'P0001';
    end;
  else
    update public.spatial_portal_documents set payload = p_payload
      where owner_id = auth.uid() and kind = p_kind and document_id = p_id and version = p_version
      returning * into saved;
    if not found then raise exception 'STALE_VERSION' using errcode = 'P0001'; end if;
  end if;
  return to_jsonb(saved) - 'owner_id';
end;
$$;
revoke all on function public.spatial_portal_save(text,text,jsonb,integer,uuid) from public, anon, authenticated;
grant execute on function public.spatial_portal_save(text,text,jsonb,integer,uuid) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('spatial-portal-media', 'spatial-portal-media', false, 52428800, array['image/png','image/jpeg','image/webp','video/mp4']);
create policy spatial_media_read on storage.objects for select to authenticated
  using (bucket_id = 'spatial-portal-media' and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.spatial_portal_members where enabled));
create policy spatial_media_create on storage.objects for insert to authenticated
  with check (bucket_id = 'spatial-portal-media' and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.spatial_portal_members where enabled));
-- Originals are immutable. Approval is saved as a versioned metadata document.
-- Restrictive guards are required in a shared project: existing permissive
-- policies may allow access to every bucket except their own. These predicates
-- leave all unrelated buckets unchanged and cannot be bypassed by an OR policy.
create policy spatial_media_read_guard on storage.objects as restrictive for select to anon, authenticated
  using (bucket_id <> 'spatial-portal-media' or ((storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.spatial_portal_members where enabled)));
create policy spatial_media_create_guard on storage.objects as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'spatial-portal-media' or ((storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.spatial_portal_members where enabled)));
create policy spatial_media_immutable_update on storage.objects as restrictive for update to anon, authenticated
  using (bucket_id <> 'spatial-portal-media') with check (bucket_id <> 'spatial-portal-media');
create policy spatial_media_immutable_delete on storage.objects as restrictive for delete to anon, authenticated
  using (bucket_id <> 'spatial-portal-media');
