-- Ensure realtime publication includes all tables needed for live dashboard/admin updates.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table accounts';
    execute 'alter publication supabase_realtime add table transactions';
    execute 'alter publication supabase_realtime add table notifications';
  else
    execute 'create publication supabase_realtime for table accounts, transactions, notifications';
  end if;
exception
  when duplicate_object then null;
end;
$$;
