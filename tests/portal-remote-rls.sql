-- Run by an administrator. All fixtures and checks are rolled back together.
begin;
insert into auth.users(id,email) values
 ('8833bb11-aaa1-4f01-bb01-000000000001','spatial-rls-owner@example.invalid'),
 ('8833bb11-aaa1-4f01-bb01-000000000002','spatial-rls-other@example.invalid');
insert into public.spatial_portal_members(email) values
 ('spatial-rls-owner@example.invalid'),('spatial-rls-other@example.invalid');
select set_config('request.jwt.claims','{"sub":"8833bb11-aaa1-4f01-bb01-000000000001","email":"spatial-rls-owner@example.invalid","role":"authenticated"}',true);
set local role authenticated;
do $$
declare saved jsonb;
begin
 saved := public.spatial_portal_save('studio','rls-check','{"name":"disposable RLS check"}',0,'8833bb11-aaa1-4f01-bb01-000000000001');
 if saved->>'version' <> '1' then raise exception 'FAILED_CREATE'; end if;
 saved := public.spatial_portal_save('studio','rls-check','{"name":"updated"}',1,'8833bb11-aaa1-4f01-bb01-000000000001');
 if saved->>'version' <> '2' then raise exception 'FAILED_UPDATE'; end if;
 begin
  perform public.spatial_portal_save('studio','rls-check','{}',1,'8833bb11-aaa1-4f01-bb01-000000000001');
  raise exception 'FAILED_STALE_CHECK';
 exception when raise_exception then if sqlerrm <> 'STALE_VERSION' then raise; end if;
 end;
 insert into storage.objects(bucket_id,name) values ('spatial-portal-media','8833bb11-aaa1-4f01-bb01-000000000001/rls-check/hash');
 if not exists(select 1 from storage.objects where bucket_id='spatial-portal-media') then raise exception 'FAILED_OWN_MEDIA'; end if;
 update storage.objects set name='changed' where bucket_id='spatial-portal-media';
 if found then raise exception 'FAILED_IMMUTABILITY'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"8833bb11-aaa1-4f01-bb01-000000000002","email":"spatial-rls-other@example.invalid","role":"authenticated"}',true);
set local role authenticated;
do $$
begin
 if exists(select 1 from public.spatial_portal_documents where document_id='rls-check') then raise exception 'FAILED_OTHER_DOCUMENT'; end if;
 if exists(select 1 from storage.objects where bucket_id='spatial-portal-media') then raise exception 'FAILED_OTHER_MEDIA'; end if;
 begin
  perform public.spatial_portal_save('studio','rls-check','{}',0,'8833bb11-aaa1-4f01-bb01-000000000001');
  raise exception 'FAILED_ACCOUNT_SWITCH';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into storage.objects(bucket_id,name) values ('spatial-portal-media','8833bb11-aaa1-4f01-bb01-000000000001/attack/hash');
  raise exception 'FAILED_OTHER_UPLOAD';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$
begin
 if exists(select 1 from storage.objects where bucket_id='spatial-portal-media') then raise exception 'FAILED_ANONYMOUS_MEDIA'; end if;
 if exists(select 1 from public.spatial_portal_members) then raise exception 'FAILED_ANONYMOUS_MEMBERS'; end if;
 begin
  perform 1 from public.spatial_portal_documents;
  raise exception 'FAILED_ANONYMOUS_DOCUMENTS';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
select 'PASS: ownership, revisions, account switch, immutable media, anonymous isolation; fixtures rolled back' as verification;
