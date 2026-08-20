-- CONFIRMED FINANCIAL RESET FOR GO-LIVE
-- Keeps staff, members, services, stock items and their current quantities.
-- Removes sales, expenses, membership payment history and every cash ledger entry.

begin;

-- Remove ledger first because it references bills, expenses and memberships.
delete from cash_ledger;

-- Remove rewards and repair progress tied to historical bills.
delete from member_rewards;
delete from member_repair_visits;

-- Keep current stock quantities, but detach historical stock movements from
-- deleted bills so the stock records themselves remain intact.
update stock_movements set bill_id = null where bill_id is not null;

delete from bill_items;
delete from bills;
delete from expenses;
delete from member_memberships;

-- Keep the customer directory, but clear monetary totals and active plans.
update members
set total_spent = 0,
    visits = 0,
    repair_visits = 0,
    tier = 'regular',
    membership_started_at = null,
    membership_expires_at = null,
    membership_fee = null;

commit;
