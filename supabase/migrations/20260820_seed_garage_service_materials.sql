-- Garage service recipes. Each configured material is deducted automatically
-- when a bill item is created (via bill_item_deducts_materials trigger).

-- Add the two new materials needed by the tyre recipes without changing any
-- existing stock quantities.
insert into stock_items (branch_id, category, name, quantity, unit)
select branch.id, 'วัตถุดิบ', material.name, 0, 'ชิ้น'
from branches as branch
cross join (values ('Synthetic Rubber Compound'), ('Steel Rod')) as material(name)
where branch.key = 'garage'
  and not exists (
    select 1 from stock_items
    where stock_items.branch_id = branch.id
      and lower(stock_items.name) = lower(material.name)
  );

-- Replace recipes for the listed services with the approved quantities.
with target_services(name) as (
  values
    ('Offroad Tire'), ('Snow Tire'), ('Slick Tire (S)'), ('Sport Tires'),
    ('Slick Tire (M)'), ('Drift Tire'), ('Semi-Slick Tires'), ('Drag Tire'),
    ('Comfort Tires'), ('Slick Tire (H)'), ('Respray Kit'), ('Full Repair Kit'),
    ('Engine Repair Kit'), ('Wheels'), ('Wheels (Rear)'), ('Custom Dashboard'),
    ('Dials'), ('Seats'), ('Steering Wheel'), ('Custom Horn'), ('Xenon Lights'),
    ('Neon Kit'), ('Window Tint'), ('Custom Plate'), ('Spoiler'), ('Front Bumper'),
    ('Rear Bumper'), ('Side Skirts'), ('Exhaust'), ('Roll Cage'), ('Grille'),
    ('Hood'), ('Left fender'), ('Right fender'), ('Roof'), ('Livery Sticker')
)
delete from service_materials as service_material
using services as service, branches as branch, target_services
where service_material.service_id = service.id
  and service.branch_id = branch.id
  and branch.key = 'garage'
  and lower(service.name) = lower(target_services.name);

with recipes(service_name, material_key, qty) as (
  values
    ('Offroad Tire', 'plastic', 8), ('Offroad Tire', 'steel_alloy', 6), ('Offroad Tire', 'synthetic_rubber', 4),
    ('Snow Tire', 'plastic', 6), ('Snow Tire', 'steel_alloy', 4), ('Snow Tire', 'steel_rod', 2), ('Snow Tire', 'synthetic_rubber', 2),
    ('Slick Tire (S)', 'plastic', 10), ('Slick Tire (S)', 'steel_alloy', 6), ('Slick Tire (S)', 'synthetic_rubber', 4),
    ('Sport Tires', 'plastic', 6), ('Sport Tires', 'steel_alloy', 3), ('Sport Tires', 'synthetic_rubber', 1),
    ('Slick Tire (M)', 'plastic', 10), ('Slick Tire (M)', 'steel_alloy', 6), ('Slick Tire (M)', 'synthetic_rubber', 2),
    ('Drift Tire', 'plastic', 4), ('Drift Tire', 'steel_alloy', 2), ('Drift Tire', 'synthetic_rubber', 4),
    ('Semi-Slick Tires', 'plastic', 8), ('Semi-Slick Tires', 'steel_alloy', 5), ('Semi-Slick Tires', 'synthetic_rubber', 3),
    ('Drag Tire', 'plastic', 12), ('Drag Tire', 'steel_alloy', 8), ('Drag Tire', 'synthetic_rubber', 4),
    ('Comfort Tires', 'plastic', 4), ('Comfort Tires', 'steel_alloy', 1),
    ('Slick Tire (H)', 'plastic', 10), ('Slick Tire (H)', 'steel_alloy', 6), ('Slick Tire (H)', 'synthetic_rubber', 1),
    ('Respray Kit', 'chemical', 2), ('Respray Kit', 'plastic', 1),
    ('Full Repair Kit', 'steel_alloy', 2), ('Full Repair Kit', 'plastic', 1), ('Full Repair Kit', 'wire', 1),
    ('Engine Repair Kit', 'iron', 1), ('Engine Repair Kit', 'plastic', 1),
    ('Wheels', 'aluminum', 1), ('Wheels', 'plastic', 1),
    ('Wheels (Rear)', 'aluminum', 1), ('Wheels (Rear)', 'plastic', 1),
    ('Custom Dashboard', 'wire', 1), ('Custom Dashboard', 'circuit_board', 1),
    ('Dials', 'circuit_board', 1), ('Dials', 'wire', 1),
    ('Seats', 'leather', 1), ('Seats', 'steel_alloy', 1),
    ('Steering Wheel', 'leather', 1), ('Steering Wheel', 'steel_alloy', 1),
    ('Custom Horn', 'plastic', 1), ('Custom Horn', 'circuit_board', 1), ('Custom Horn', 'wire', 1),
    ('Xenon Lights', 'plastic', 1), ('Xenon Lights', 'circuit_board', 1),
    ('Neon Kit', 'plastic', 1), ('Neon Kit', 'circuit_board', 1), ('Neon Kit', 'wire', 1),
    ('Window Tint', 'plastic', 1), ('Window Tint', 'chemical', 1),
    ('Custom Plate', 'plastic', 1), ('Custom Plate', 'steel_alloy', 1),
    ('Spoiler', 'plastic', 1), ('Spoiler', 'steel_alloy', 1),
    ('Front Bumper', 'plastic', 1), ('Front Bumper', 'steel_alloy', 1),
    ('Rear Bumper', 'plastic', 1), ('Rear Bumper', 'steel_alloy', 1),
    ('Side Skirts', 'plastic', 1), ('Side Skirts', 'steel_alloy', 1),
    ('Exhaust', 'steel_alloy', 1), ('Exhaust', 'iron', 1),
    ('Roll Cage', 'steel_alloy', 1), ('Roll Cage', 'iron', 1),
    ('Grille', 'plastic', 1), ('Grille', 'aluminum', 1),
    ('Hood', 'plastic', 1), ('Hood', 'aluminum', 1),
    ('Left fender', 'plastic', 1), ('Left fender', 'aluminum', 1),
    ('Right fender', 'plastic', 1), ('Right fender', 'aluminum', 1),
    ('Roof', 'steel_alloy', 1), ('Roof', 'plastic', 1),
    ('Livery Sticker', 'plastic', 1), ('Livery Sticker', 'chemical', 1)
), material_names(material_key, name) as (
  values
    ('chemical', 'สารเคมี'), ('circuit_board', 'แพงวงจร'), ('steel_alloy', 'Steel Alloy'),
    ('wire', 'สายไฟ'), ('leather', 'แผ่นหนัง'), ('plastic', 'พลาสติก'),
    ('aluminum', 'Aluminum'), ('iron', 'Iron'), ('synthetic_rubber', 'Synthetic Rubber Compound'),
    ('steel_rod', 'Steel Rod')
)
insert into service_materials (service_id, stock_item_id, qty_per_unit)
select service.id, stock.id, recipes.qty
from recipes
join branches as branch on branch.key = 'garage'
join services as service on service.branch_id = branch.id and lower(service.name) = lower(recipes.service_name)
join material_names on material_names.material_key = recipes.material_key
join stock_items as stock on stock.branch_id = branch.id and lower(stock.name) = lower(material_names.name)
on conflict (service_id, stock_item_id) do update set qty_per_unit = excluded.qty_per_unit;

-- Rain Tires is intentionally not included: it does not yet exist in the
-- service catalogue, so no price or sale item is created implicitly here.
