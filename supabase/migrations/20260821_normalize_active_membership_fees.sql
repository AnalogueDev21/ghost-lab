-- Repair legacy membership records where the tier was changed but the
-- stored monthly fee was left at the previous plan's amount.
-- This does not add, remove, or alter any historical cash-ledger entries.
update public.members
set membership_fee = case lower(coalesce(tier, 'regular'))
  when 'gold' then 100000
  when 'silver' then 80000
  else 30000
end
where archived_at is null
  and membership_expires_at is not null
  and membership_expires_at >= now();
