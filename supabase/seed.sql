-- Run this AFTER schema.sql, in the Supabase SQL editor.
-- Creates the two branches. Staff rows are created by scripts/seed-staff.mjs
-- instead of here, because each staff member also needs a real Supabase Auth
-- user (for PIN login), which plain SQL can't create — see scripts/README.

insert into branches (key, name, commission_flat) values
  ('garage', 'Ghost Lab Garage', 3000),
  ('chill', 'Ghost Chill', 3000);

-- Example starter services — edit freely, or delete and add your own later
-- through the Services Catalog page once it's built.
insert into services (branch_id, category, name, price)
select id, 'Body Part', 'Body Kit', 5000 from branches where key = 'garage'
union all
select id, 'Performance', 'Brake Pads', 4500 from branches where key = 'garage'
union all
select id, 'Food', 'Ramen Ghost Special', 1800 from branches where key = 'chill'
union all
select id, 'Drinks', 'Iced Matcha', 700 from branches where key = 'chill';
