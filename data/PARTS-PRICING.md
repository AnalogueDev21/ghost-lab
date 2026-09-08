# Garage vehicle pricing

The production build still uses `recovered-production/`, not the older `src/` UI.
`data/parts-catalog.json` is a static extraction of the supplied `catalog_lite.html`.
Embedded HTML scripts are not executed. Regenerate with
`node scripts/extract-parts-catalog.mjs <path-to-html>`, review changes, then build.

## Pricing rules

- The Garage POS defaults to Standard. Switching vehicle class reprices every unit
  in the cart immediately. Chill prices and workflow are unchanged.
- Matching catalog entries use the explicit Standard / Super Car prices. Maintenance
  entries use **อู่** (garage), not **ใส่** (installation), consistent with existing tariffs.
- Three existing package names map to explicit catalog package prices. The tire
  informational sum is not imported as a package. Existing service IDs, stock
  recipes, service names and historical bill prices are not changed.
- Normalization ignores case, whitespace and an optional `Sport :` prefix. Explicit
  spelling aliases are documented in `vehicle-pricing.js`. There is no fuzzy matching.
  `Upgraded Cables` is NOT assumed to be `Short Shifter`; `Stiffer Sway Bars` is NOT
  automatically matched to `Heavy Duty Sway Bars`.
- Unmatched services keep their existing Standard prices. Their Super Car prices
  are unavailable, not zero or an inferred multiplier. The seven catalog entries
  marked not-for-sale are not newly priced or added; their existing Standard
  behavior is preserved and Super Car selection is blocked.
- The two repair kits are not in the supplied catalog. They retain the existing
  shared tariff. Active Regular/Silver/Gold members get both kits free in either
  vehicle class, with ordinary membership discounts calculated on the remainder.
  Expired or unselected membership gives no free-kit benefit.
- The existing optional reward-coupon and self-service rules are unchanged.
- Services admin displays effective Standard and Super Car prices. Prices governed
  by the imported catalog are read-only and labeled as catalog prices. Updating
  this tariff requires reviewing and deploying catalog data, not silently editing
  the legacy `services.price` field. Non-catalog prices remain editable as before.

## Persistence and deployment

No schema migration or database bulk update is required. New Garage bills store
`vehicle_class` and `pricing_catalog` in the existing `[ghost-lab-bill]` notes JSON.
Both notes items and `bill_items` retain final price snapshots. Old bills without
class metadata remain readable without being relabeled as Standard.

The build regenerates `assets/catalog-prices.js` from the reviewed JSON, checks
asset references, and publishes a content-versioned asset directory to avoid
mixed cached bundles. Unversioned assets are retained for already-open pages.

`npm test` uses the actual recovered POS handlers with an in-memory database stub.
It never creates real bills, spends funds, redeems real coupons, or alters stock.
