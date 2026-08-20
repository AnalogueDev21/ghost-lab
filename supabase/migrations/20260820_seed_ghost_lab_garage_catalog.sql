-- Ghost Lab Garage: canonical service catalogue
--
-- This keeps historical bill rows intact.  Services not in this catalogue are
-- archived (active = false) instead of deleted, then the POS only shows active
-- services.  Re-running this migration is safe: it updates existing matching
-- services and inserts only missing ones.

begin;

create temporary table garage_catalog (
  name text not null,
  category text not null,
  price integer not null,
  primary key (name, category)
);

insert into garage_catalog (name, category, price) values
  ('Aerials', 'Body part', 5000),
  ('Air filter', 'Body part', 5000),
  ('Arch Cover', 'Body part', 5000),
  ('Brake Fluid', 'service', 4000),
  ('brake pads', 'service', 4500),
  ('Comfort Tires', 'Performance Tire', 1500),
  ('Coolant', 'service', 3500),
  ('Custom Dashboard', 'Interior', 5000),
  ('Custom Horn', 'Extras', 5000),
  -- "Custom plate" and "Custom Plate" were duplicates in the supplied list.
  ('Custom Plate', 'Extras', 5000),
  ('Dash board color', 'Paint & Colors', 5000),
  ('Dials', 'Interior', 5000),
  ('Door Speaker', 'Interior', 5000),
  ('Drag Tire', 'Performance Tire', 5000),
  ('Drift Tire', 'Performance Tire', 5500),
  ('Engine Oil', 'service', 4000),
  ('Engine Repair Kit', 'Tools & Repair', 800),
  ('Exhaust', 'Body part', 5000),
  ('Fitment', 'Fitment', 5000),
  ('Front Bumper', 'Body part', 5000),
  ('Full Repair Kit', 'Tools & Repair', 1500),
  ('Gearbox Oil', 'service', 4000),
  ('Grille', 'Body part', 5000),
  ('Hood', 'Body part', 5000),
  ('Hydraulics', 'Body part', 5000),
  ('Intake Filter', 'service', 4000),
  ('Interior color', 'Paint & Colors', 5000),
  ('Left fender', 'Body part', 5000),
  ('Livery Sticker', 'Body part', 5000),
  ('Neon Kit', 'Lighting', 5000),
  ('Neon Kit', 'Extras', 5000),
  ('Offroad Tire', 'Performance Tire', 5500),
  ('Ornaments', 'Body part', 5000),
  ('Pearlescent', 'Paint & Colors', 5000),
  ('Plate Holder', 'Extras', 5000),
  ('Primary', 'Paint & Colors', 5000),
  ('Rear Bumper', 'Body part', 5000),
  ('Respray Kit', 'Paint & Colors', 5000),
  ('Right fender', 'Body part', 5000),
  ('Roll Cage', 'Body part', 5000),
  ('Roof', 'Body part', 5000),
  ('Seats', 'Interior', 5000),
  ('Secondary Paint', 'Paint & Colors', 5000),
  ('Semi-Slick Tires', 'Performance Tire', 3500),
  ('Shifter Levers', 'Interior', 5000),
  ('Side Skirts', 'Body part', 5000),
  ('Slick Tire (H)', 'Performance Tire', 3500),
  ('Slick Tire (M)', 'Performance Tire', 4000),
  ('Slick Tire (S)', 'Performance Tire', 6000),
  ('Snow Tire', 'Performance Tire', 3500),
  ('Spark Plugs', 'service', 4500),
  ('Speakers', 'Interior', 5000),
  ('Spoiler', 'Body part', 5000),
  ('Sport : 1.5 Way LSD', 'Handing', 37500),
  ('Sport : 4-2-1 Header', 'N/A (Standard)', 35000),
  ('Sport : Balanced Crankshaft', 'N/A (Standard)', 35000),
  ('Sport : Cat-Back System', 'N/A (Standard)', 35000),
  ('Sport : Drop-In Filter', 'N/A (Standard)', 35000),
  ('Sport : Fast Road Cams', 'N/A (Standard)', 35000),
  ('Sport : Heavy Duty Clutch', 'Handing', 37500),
  ('Sport : High-Flow Fuel Pump', 'N/A (Standard)', 35000),
  ('Sport : Iridium Spark Plug', 'N/A (Standard)', 35000),
  ('Sport : Lightweight Battery', 'N/A (Standard)', 35000),
  ('Sport : Lowering Springs', 'Handing', 37500),
  ('Sport : Port Matched Manifold', 'N/A (Standard)', 35000),
  ('Sport : Reflashed ECU', 'N/A (Standard)', 35000),
  ('Sport : Slotted Rotors', 'Handing', 37500),
  ('Sport : Stiff Valve Springs', 'N/A (Standard)', 35000),
  ('Sport : Stiffer Sway Bars', 'Handing', 37500),
  ('Sport : Street Brake Pads', 'Handing', 37500),
  ('Sport : Street Camber Arms', 'Handing', 37500),
  ('Sport : Thick Radiator', 'N/A (Standard)', 35000),
  ('Sport : Upgraded Cables', 'Handing', 37500),
  ('Sport Tires', 'Performance Tire', 2000),
  ('Sport: 2.5-Inch Turbo-Back', 'turbo (Standard)', 47500),
  ('Sport: 550cc Injectors', 'turbo (Standard)', 47500),
  ('Sport: Bolt-On Upgrade Turbo (BPU)', 'turbo (Standard)', 47500),
  ('Sport: Boost Controller & Remap', 'turbo (Standard)', 47500),
  ('Sport: Cast Aluminum Plenum', 'turbo (Standard)', 47500),
  ('Sport: Cast Iron Turbo Manifold', 'turbo (Standard)', 47500),
  ('Sport: High-Flow Pod Filter', 'turbo (Standard)', 47500),
  ('Sport: MLS Head Gasket & Studs', 'turbo (Standard)', 47500),
  ('Sport: Turbo Spec Cams', 'turbo (Standard)', 47500),
  ('Sport: Upgraded Intercooler', 'turbo (Standard)', 47500),
  ('Sport: Upgraded Valve Springs', 'turbo (Standard)', 47500),
  ('Steering Wheel', 'Interior', 5000),
  ('Struts', 'Body part', 5000),
  ('Tank', 'Body part', 5000),
  ('Trim A', 'Body part', 5000),
  ('Trim B', 'Body part', 5000),
  ('Trim Design', 'Body part', 5000),
  ('Trunk', 'Body part', 5000),
  ('Vanity Plates', 'Extras', 5000),
  ('Wheel Paint', 'Paint & Colors', 5000),
  ('Wheels', 'Wheels', 5000),
  ('Wheels (Rear)', 'Wheels', 5000),
  ('Window Tint', 'Extras', 5000),
  ('Windows', 'Extras', 5000),
  ('Xenon Lights', 'Lighting', 5000),
  ('Xenon Lights', 'Extras', 5000),
  ('ทำความสะอาด', 'Maintenance', 5000),
  ('ทำความสะอาดรถ', 'Cleaning', 500),
  ('เหมา Handing', 'Handing', 300000),
  ('เหมา N/A (Standard)', 'N/A (Standard)', 420000),
  ('เหมา Turbo Set !!', 'turbo (Standard)', 522500);

-- Update every matching row first, including case-only duplicates.
update services as service
set name = catalog.name,
    category = catalog.category,
    price = catalog.price,
    active = true
from garage_catalog as catalog
where service.branch_id = (select id from branches where key = 'garage')
  and lower(btrim(service.name)) = lower(btrim(catalog.name))
  and lower(btrim(service.category)) = lower(btrim(catalog.category));

-- Add any catalogue entry that does not exist yet.
insert into services (branch_id, name, category, price, active)
select branch.id, catalog.name, catalog.category, catalog.price, true
from branches as branch
cross join garage_catalog as catalog
where branch.key = 'garage'
  and not exists (
    select 1
    from services as service
    where service.branch_id = branch.id
      and lower(btrim(service.name)) = lower(btrim(catalog.name))
      and lower(btrim(service.category)) = lower(btrim(catalog.category))
  );

-- Hide legacy services and keep one active copy of each catalogue service.
update services as service
set active = false
where service.branch_id = (select id from branches where key = 'garage')
  and not exists (
    select 1 from garage_catalog as catalog
    where lower(btrim(service.name)) = lower(btrim(catalog.name))
      and lower(btrim(service.category)) = lower(btrim(catalog.category))
  );

with ranked_duplicates as (
  select service.id,
         row_number() over (
           partition by lower(btrim(service.name)), lower(btrim(service.category))
           order by service.created_at, service.id
         ) as row_number
  from services as service
  where service.branch_id = (select id from branches where key = 'garage')
    and service.active = true
)
update services as service
set active = false
from ranked_duplicates
where service.id = ranked_duplicates.id
  and ranked_duplicates.row_number > 1;

drop table garage_catalog;

commit;
