alter policy spatial_member_self on public.spatial_portal_members
  using (email = lower((select auth.jwt()) ->> 'email'));
