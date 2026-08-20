-- Gold has unlimited free repairs while the membership is active.
-- Remove the previous per-month coupon trigger if it was already installed.
drop trigger if exists member_membership_awards_gold_repairs on member_memberships;
drop function if exists public.award_gold_membership_repairs();
