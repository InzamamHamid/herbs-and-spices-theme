# Herbs & Spices: storefront sections (all page types)

These are drop-in Online Store 2.0 files for the approved design:
https://claude.ai/artifact/2qEpog8hnrznbjHD2v7qGU

Every file, CSS class, data attribute, JS event and section name starts with **`hsd-`**. Your theme already has its own `hs-` files (`hs-hero`, `hs-departments`, `hs-offers`…), so this prefix makes sure nothing overwrites or restyles them. No jQuery and no apps are required.

## 1. Copy the files

| Folder | Files |
|---|---|
| `assets/` | `hsd-base.css`, `hsd-theme.js`, `hsd-logo-bookman.woff2` |
| `snippets/` | `hsd-head`, `hsd-icon`, `hsd-logo`, `hsd-price`, `hsd-product-card`, `hsd-pagination`, `hsd-filters`, `hsd-toolbar` |
| `sections/` | 25 × `hsd-*.liquid` |
| `templates/` | 13 JSON templates (see §4) |

**Templates, the safe way:** copy each one as an *alternate* template: `index.json` → `index.hsd.json`, `collection.json` → `collection.hsd.json`, and so on. Nothing of yours is replaced, and you can preview any page with `?view=hsd`, e.g. `/collections/all?view=hsd`. When you're happy, either rename them over the originals or assign them in admin.

Then add **one line** inside `<head>` in `layout/theme.liquid`:

```liquid
{% render 'hsd-head' %}
```

That loads the fonts (Google Fonts), the stylesheet and the script (deferred).

## 2. Header and footer

Add these through **Customize → Header / Footer group → Add section**, then remove the old ones:
- `HSD Announcement bar`
- `HSD Header`
- `HSD Footer`

Menus used:
- **Main menu** (`main-menu`). Nested items become dropdowns on desktop and an indented list in the phone drawer.
- **Footer menu** (`footer`)

**Logo:** upload the redrawn SVG in *HSD Header → Logo image*. If it's left empty, the typed wordmark shows ("Herbs"/"Spices" in Bookman bold italic, with the looped turmeric "&").

## 3. Home page (`index`)

| # | Section | Needs |
|---|---|---|
| 1 | HSD Hero | Arch photo (portrait, 1000 px or wider), optional snapshot photo, popular-search chips |
| 2 | HSD Trust strip | – |
| 3 | HSD Departments | One collection per tile. Handles match the live store |
| 4 | HSD Product row, style "row" | Collection `new-arrivals` |
| 5 | HSD Video story | Upload the Facebook video to Shopify (Files), a cover image, and the owner's real quote |
| 6 | HSD Cook tonight | Up to 6 real products per basket. Price = live sum; "Add the basket" adds all in one request |
| 7 | HSD Product row, style "wellness" | Supplements collection, FDA disclaimer on |
| 8 | HSD Visit & delivery | Google Maps link |

## 4. Every other page

| Template | Sections | Notes |
|---|---|---|
| `product` | HSD Product — buy box → label → HSD Ask the shop → HSD Product — related → reviews | See metafields in §5 |
| `collection` | HSD Collection | Filters + sort + pagination. **Install the free Search & Discovery app** and turn on filters: Availability, Price, Brand (vendor), Product type (plus any metafield filters you want, e.g. `custom.country_of_origin`) |
| `list-collections` | HSD All collections | Every collection with image and product count, paginated |
| `search` | HSD Search results | Same filters + sort for products, then pages and recipes. Friendly "not found" with the shop phone number |
| `cart` | HSD Cart + HSD Product row | Quantity +/−, remove, order note, free-delivery progress bar (set *Free delivery over ($)*, or 0 to hide), supplement no-returns reminder |
| `page` | HSD Page content | Delivery, Returns, and any other text page. Text comes from the page body in admin |
| `page.about` | HSD Page content + Video story + Visit & delivery | Assign to the About page |
| `page.contact` | HSD Contact form | Shopify's built-in contact form (emails the store) |
| `page.faq` | HSD FAQ | One block per question, prefilled from the live FAQ. Adds FAQ structured data for Google |
| `blog` | HSD Blog | Recipes & Tips list with tag filter |
| `article` | HSD Article | "Shop the ingredients" box: create an **article** metafield `custom.products` (list of product references) and pick products per recipe |
| `404` | HSD 404 | Search box and a way back |

Not needed as theme pages: **checkout** (Shopify's own) and **customer accounts** (hosted by Shopify with the new customer accounts). Policies (Privacy, Shipping, Refund, **Terms of Service**, Contact information) are written in *Settings → Policies*. Terms of Service and Contact information currently return 404 on the live store and must be written before the payment application.

## 5. Product metafields (namespace `custom`, all optional)

| Key | Type | Used for |
|---|---|---|
| `alt_name` | Single line text | **New.** Second-language name under the title and on cards ("Besan", "Karela"). Also searchable |
| `net_content` + `net_content_unit` | Decimal + single line | "16 fl oz" chip |
| `country_of_origin` | Single line | "Product of …" chip |
| `ingredients` | Multi-line text | Ingredients tab |
| `directions` | Multi-line text | How to use tab |
| `warnings` | Multi-line text | Warnings tab |
| `prop65_warning` | Multi-line text | Added to the end of the Warnings tab |
| `allergens` | List of single line text | Allergens tab ("Contains: …") |
| `facts_text` | Multi-line text | **New.** Typed copy of the Supplement/Nutrition Facts panel |
| `label_photographed` | Date | **New.** "Photographed in our shop on …" under each tab |
| `dshea_disclaimer_required` | True/false | FDA disclaimer in the buy box. Renames the facts tab to "Supplement facts" |
| `ga_tax_class` | Single line: `food` / `supplement` | `supplement` shows the no-returns line on the product and in the cart |
| `state_restrictions` | Single line | "We can't ship this item to: …" notice |

- Tabs with an empty metafield are hidden automatically. No blank tabs.
- **Back-label photo:** give one product image the ALT text `Back label` and it appears next to the tabs.
- **Unit price / "BETTER VALUE":** fill in Shopify's *Unit price* fields on each variant. The size with the lowest unit price gets the badge.
- **Reviews:** add your review app's block inside *HSD Product — reviews*. The honest "No reviews yet" box shows until then. No fake reviews.
- **Supplements:** the copy never makes health claims. Keep titles and descriptions exactly as the maker's label says.

## 6. Why this handles 5,000+ products

- **Collection, search, blog and all-collections pages use `{% paginate %}`.** Shopify only sends one page (default 24) to Liquid, whatever the catalogue size.
- **Filtering and sorting are Shopify's native storefront filtering** via plain GET URLs (`?filter.p.vendor=…&sort_by=…`), so they're cacheable, shareable and SEO-safe. They work with JS off. With JS on, they apply as soon as you tick a box on desktop, or via "Show results" in the phone drawer.
- **Home and product rows are capped** (`limit`, max 16). Nothing loops over `collections.all.products`.
- **Product card:** one product object, no extra lookups. Responsive `srcset` and lazy loading; only above-the-fold images load eagerly.
- **Related products:** Shopify's Product Recommendations API, fetched after the page loads.
- **JavaScript:** about 13 KB, deferred, no dependencies. Add to cart fires `hsd:cart-updated` (cart JSON) on `document`, so a cart drawer can listen.

## 7. Try it locally first

`../local-preview/` renders these exact files on your machine with sample products:

```
cd local-preview && npm install && node server.js   # → http://localhost:9292
```

It uses sample data and can't do checkout. For a test with the real store, use `shopify theme dev`.

## 8. Before launch

- `shopify theme check`: currently 0 errors. The 3 warnings are the Google Fonts links; self-host the fonts in `assets/` to clear them.
- Check at 390 px and 1440 px wide against the canvas.
- Logo font: small Bookman subset (URW Bookman Demi Italic, AGPL-with-font-exception licence). The SVG logo replaces it.
- Confirm with the owner which products may be featured in the hero and story images before launch.
