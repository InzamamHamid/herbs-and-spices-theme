// Local preview for the Herbs & Spices `handoff/` theme sections — ALL page types.
// Renders the real Liquid files with liquidjs + a small Shopify shim and SAMPLE data.
// Run:  node server.js   →  http://localhost:9292
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Liquid } = require('liquidjs');

const ROOT = path.resolve(__dirname, '..');
const HANDOFF = path.join(ROOT, 'handoff');
const IMG_DIR = path.join(__dirname, 'img'); // sample photos used by the preview
const PORT = Number(process.env.PORT || 9292);

/* ================================================================ images */
const PHOTOS = {
  seamoss: 'seamoss.jpg',
  ashwagandha: 'ashwagandha.jpg',
  grind: 'grind.jpg',
  ryze: 'ryze.jpg',
  iron: 'iron.jpg',
  dimes: 'dimes.jpg',
  tampico: 'tampico.jpg',
  wonderbeet: 'wonderbeet.jpg',
  kvass: 'kvass.jpg',
  baklava: 'baklava.jpg',
  ricesnack: 'ricesnack.jpg',
  millet: 'millet.jpg',
  trufru: 'trufru.jpg',
  soursop: 'soursop.jpg',
  dates: 'dates.jpg',
  batana: 'batana.jpg',
  puff: 'puff.jpg',
  haldiram: 'haldiram.jpg',
  kofta: 'kofta.jpg',
  laxmi: 'laxmi.jpg',
};
let mediaId = 9000;
const img = (key, alt = '') => {
  const src = PHOTOS[key] ? `/img/${key}.jpg` : `/img/dept/${key}.jpg`;
  const o = { id: ++mediaId, src, alt, media_type: 'image', width: 1200, height: 1200, presentation: { focal_point: '50% 50%' } };
  o.preview_image = { ...o };
  return o;
};

/* =========================================================== sample data */
let variantId = 1000;
let productId = 100;
let createdAt = 1000;
function product({ handle, title, vendor, type, photos, sizes, tags = [], desc, mf = {}, cols = [] }) {
  const media = photos.map(([k, alt]) => img(k, alt));
  const single = sizes.length === 1 && !sizes[0].name;
  const variants = sizes.map((s) => ({
    id: ++variantId,
    title: single ? 'Default Title' : s.name,
    price: Math.round(s.price * 100),
    compare_at_price: s.compare ? Math.round(s.compare * 100) : null,
    available: s.available !== false,
    options: [single ? 'Default Title' : s.name],
    option1: single ? 'Default Title' : s.name,
    featured_media: null,
    unit_price: s.unit ? Math.round((s.price / s.unit.qty) * 100) : null,
    unit_price_measurement: s.unit ? { reference_value: 1, reference_unit: s.unit.ref } : null,
  }));
  const prices = variants.map((v) => v.price);
  const first = variants.find((v) => v.available) || variants[0];
  const metafields = { custom: {} };
  Object.entries(mf).forEach(([k, value]) => { metafields.custom[k] = { value, type: Array.isArray(value) ? 'list.single_line_text_field' : 'single_line_text_field' }; });
  return {
    object_type: 'product', id: ++productId, handle, title, vendor, type, tags, created: ++createdAt,
    url: `/products/${handle}`,
    description: `<p>${desc || `${title}, sold sealed exactly as it sits on our shelf in Cordele.`}</p>`,
    available: variants.some((v) => v.available),
    media, images: media, featured_media: media[0],
    variants, selected_or_first_available_variant: first,
    has_only_default_variant: single,
    price: Math.min(...prices), price_min: Math.min(...prices), price_max: Math.max(...prices), price_varies: new Set(prices).size > 1,
    options: [single ? 'Title' : 'Size'],
    options_with_values: [{ name: single ? 'Title' : 'Size', position: 1, values: variants.map((v) => v.option1), selected_value: first.option1 }],
    metafields, cols,
  };
}
const LABEL = {
  ingredients: '[Ingredients — typed word for word from the back label. Never summarised, never reworded.]',
  directions: '[Directions — exactly as printed on the label, including serving size.]',
  warnings: '[Warnings — every line from the label, e.g. pregnancy, children, medication.]',
  facts_text: '[A typed copy of the Supplement Facts panel, so it can be read on a phone and by screen readers.]',
  allergens: ['[allergen statement from the label]'],
  dshea_disclaimer_required: true,
  ga_tax_class: 'supplement',
};
const FOOD = { ga_tax_class: 'food' };
const W = 'vitamins-supplements', SP = 'herbs-spices', RG = 'rice-flour-grains', TB = 'herbal-teas', EO = 'essential-oils', SK = 'skin-hair-care', CO = 'cooking-oils-ghee', PA = 'pantry-packaged';

const P = [
  product({ handle: 'liquid-blenz-soursop-bitter-tonic', title: 'Soursop Bitter Tonic', vendor: 'Liquid Blenz', type: 'Herbal tonic',
    photos: [['soursop', 'Front of pack (stand-in photo)'], ['ashwagandha', 'Back label (stand-in photo)']],
    sizes: [{ name: '16 oz', price: 25.99, unit: { qty: 16, ref: 'fl oz' } }, { name: '32 oz', price: 39.99, unit: { qty: 32, ref: 'fl oz' } }],
    desc: 'A liquid herbal tonic from Liquid Blenz, sold sealed exactly as it sits on our shelf in Cordele.', mf: { ...LABEL, net_content: 16, net_content_unit: 'fl oz', state_restrictions: ['California', 'New York'] }, cols: [W] }),
  product({ handle: 'alchemists-kitchen-ashwagandha-30', title: 'Ashwagandha, 30 capsules', vendor: "The Alchemist's Kitchen", type: 'Supplement', photos: [['ashwagandha', 'Front of pack']], sizes: [{ price: 24.99 }], mf: { ...LABEL, net_content: 30, net_content_unit: 'capsules', state_restrictions: 'Hawaii' }, cols: [W] }),
  product({ handle: 'ryze-mushroom-coffee', title: 'Mushroom Coffee', vendor: 'RYZE', type: 'Supplement', photos: [['ryze', 'Front of pack']], sizes: [{ price: 44.99 }], mf: { ...LABEL }, cols: [W] }),
  product({ handle: 'iron-d3-k2-range', title: 'Iron & D3 + K2 Liquid Drops', vendor: 'Wellness shelf', type: 'Supplement', photos: [['iron', 'Front of pack']], sizes: [{ name: '1 fl oz', price: 16.99 }, { name: '2 fl oz', price: 27.99 }], mf: { ...LABEL }, cols: [W] }),
  product({ handle: 'kashmiri-chilli-powder-200-g', title: 'Kashmiri Chilli Powder, 200 g', vendor: 'Anand Foods', type: 'Ground spice', photos: [['spices', '']], sizes: [{ price: 6.49 }], mf: { ...FOOD, alt_name: 'Lal mirch' }, cols: [SP] }),
  product({ handle: 'black-peppercorns-200-g', title: 'Whole Black Peppercorns, 200 g', vendor: 'Anand Foods', type: 'Whole spice', photos: [['spices', '']], sizes: [{ price: 7.99 }], mf: { ...FOOD, alt_name: 'Kali mirch' }, cols: [SP] }),
  product({ handle: 'green-cardamom-pods-100-g', title: 'Green Cardamom Pods, 100 g', vendor: 'Khan Pantry', type: 'Whole spice', photos: [['herbs', '']], sizes: [{ price: 12.99 }], mf: { ...FOOD, alt_name: 'Elaichi' }, cols: [SP] }),
  product({ handle: 'dried-fenugreek-leaves-50-g', title: 'Dried Fenugreek Leaves, 50 g', vendor: 'Khan Pantry', type: 'Culinary herb', photos: [['herbs', '']], sizes: [{ price: 4.49 }], mf: { ...FOOD, alt_name: 'Kasuri methi' }, cols: [SP] }),
  product({ handle: 'ground-turmeric-200-g', title: 'Ground Turmeric, 200 g', vendor: 'Anand Foods', type: 'Ground spice', photos: [['spices', '']], sizes: [{ price: 5.99 }], mf: { ...FOOD, alt_name: 'Haldi' }, cols: [SP] }),
  product({ handle: 'basmati-rice', title: 'Aged Basmati Rice', vendor: 'Zafar Mills', type: 'Rice', photos: [['bowl', '']], sizes: [{ name: '5 lb', price: 11.99, unit: { qty: 5, ref: 'lb' } }, { name: '10 lb', price: 19.99, unit: { qty: 10, ref: 'lb' } }], mf: { ...FOOD, alt_name: 'Chawal' }, cols: [RG] }),
  product({ handle: 'chapati-atta-10-lb', title: 'Chapati Atta, 10 lb', vendor: 'Zafar Mills', type: 'Flour', photos: [['bowl', '']], sizes: [{ price: 14.99, compare: 17.99 }], mf: { ...FOOD }, cols: [RG] }),
  product({ handle: 'gram-flour-4-lb', title: 'Gram Flour, 4 lb', vendor: 'Zafar Mills', type: 'Flour', photos: [['bowl', '']], sizes: [{ price: 8.99 }], mf: { ...FOOD, alt_name: 'Besan' }, cols: [RG] }),
  product({ handle: 'bobs-red-mill-millet-flour', title: 'Millet Flour, 20 oz', vendor: "Bob's Red Mill", type: 'Flour', photos: [['millet', '']], sizes: [{ price: 6.99 }], mf: { ...FOOD, alt_name: 'Bajra atta' }, cols: [RG] }),
  product({ handle: 'masala-chai-blend-250-g', title: 'Masala Chai Blend, 250 g', vendor: 'Golden Leaf', type: 'Tea', photos: [['tea', '']], sizes: [{ price: 9.49 }], mf: FOOD, cols: [TB] }),
  product({ handle: 'kashmiri-kahwa-150-g', title: 'Kashmiri Kahwa Blend, 150 g', vendor: 'Golden Leaf', type: 'Tea', photos: [['tea', '']], sizes: [{ price: 9.99 }], mf: FOOD, cols: [TB] }),
  product({ handle: 'rose-petal-tea-80-g', title: 'Rose Petal Tea, 80 g', vendor: 'Golden Leaf', type: 'Tea', photos: [['tea', '']], sizes: [{ price: 8.99, available: false }], mf: FOOD, cols: [TB] }),
  product({ handle: 'grind-sea-moss-energy-water', title: 'Sea Moss Energy Water, 16.9 fl oz', vendor: 'Grind', type: 'Drink', photos: [['grind', '']], sizes: [{ price: 3.99 }], tags: ['new'], mf: FOOD, cols: [TB] }),
  product({ handle: 'dimes-mango-juice', title: '100% Mango Juice, 1 L', vendor: 'Dimes', type: 'Drink', photos: [['dimes', '']], sizes: [{ price: 3.49, compare: 3.99 }], mf: FOOD, cols: [TB] }),
  product({ handle: 'organic-beet-kvass-ginger-turmeric', title: 'Organic Beet Kvass, Ginger Turmeric', vendor: 'Beet Kvass', type: 'Drink', photos: [['kvass', '']], sizes: [{ price: 8.49 }], mf: FOOD, cols: [TB] }),
  product({ handle: 'wonder-beet-juice', title: 'Wonder Beet Juice', vendor: 'Wonder Beet', type: 'Drink', photos: [['wonderbeet', '']], sizes: [{ price: 8.99 }], mf: FOOD, cols: [TB] }),
  product({ handle: 'tampico-punch', title: 'Citrus Punch, 1 gal', vendor: 'Tampico', type: 'Drink', photos: [['tampico', '']], sizes: [{ price: 4.99 }], mf: FOOD, cols: [TB] }),
  product({ handle: 'black-seed-oil-100-ml', title: 'Black Seed Oil, 100 ml', vendor: 'Cordele Botanicals', type: 'Oil', photos: [['oils', '']], sizes: [{ price: 12.99 }], cols: [EO] }),
  product({ handle: 'argan-oil-50-ml', title: 'Argan Oil, 50 ml', vendor: 'Cordele Botanicals', type: 'Oil', photos: [['oils', '']], sizes: [{ price: 14.99 }], cols: [EO] }),
  product({ handle: 'tea-tree-oil-15-ml', title: 'Tea Tree Essential Oil, 15 ml', vendor: 'Cordele Botanicals', type: 'Essential oil', photos: [['oils', '']], sizes: [{ price: 7.99 }], cols: [EO] }),
  product({ handle: 'shea-butter-250-g', title: 'Shea Butter, Unrefined, 250 g', vendor: 'Cordele Botanicals', type: 'Skin care', photos: [['skincare', '']], sizes: [{ price: 11.99 }], cols: [SK] }),
  product({ handle: 'batana-hair-butter', title: 'Batana Hair Butter', vendor: 'Batana', type: 'Hair care', photos: [['batana', '']], sizes: [{ price: 19.99 }], cols: [SK] }),
  product({ handle: 'neem-soap-100-g', title: 'Neem Soap Bar, 100 g', vendor: 'Cordele Botanicals', type: 'Skin care', photos: [['skincare', '']], sizes: [{ price: 4.49, compare: 6.49 }], cols: [SK] }),
  product({ handle: 'extra-virgin-olive-oil-500-ml', title: 'Extra Virgin Olive Oil, 500 ml', vendor: 'Bay Harvest', type: 'Cooking oil', photos: [['ginger', '']], sizes: [{ price: 13.99 }], mf: FOOD, cols: [CO] }),
  product({ handle: 'pure-desi-ghee-500-g', title: 'Pure Desi Ghee, 500 g', vendor: 'Bay Harvest', type: 'Ghee', photos: [['ginger', '']], sizes: [{ price: 12.99 }], mf: FOOD, cols: [CO] }),
  product({ handle: 'mango-pickle-400-g', title: 'Mango Pickle, 400 g', vendor: 'Khan Pantry', type: 'Condiment', photos: [['ginger', '']], sizes: [{ price: 4.99 }], mf: { ...FOOD, alt_name: 'Aam ka achar' }, cols: [CO] }),
  product({ handle: 'tru-fru-strawberries-creme', title: 'Strawberries + Creme, freeze-dried, 3.4 oz', vendor: 'trü frü', type: 'Snack', photos: [['trufru', '']], sizes: [{ price: 9.99 }], tags: ['new'], mf: FOOD, cols: [PA] }),
  product({ handle: 'aghati-mixed-baklava', title: 'Mixed Baklava tin', vendor: 'Aghati', type: 'Sweets', photos: [['baklava', '']], sizes: [{ price: 14.99 }], tags: ['new'], mf: FOOD, cols: [PA] }),
  product({ handle: 'trenzy-milk-rice-snack', title: 'Milk Classic Rice Snack', vendor: 'Trenzy Gashi', type: 'Snack', photos: [['ricesnack', '']], sizes: [{ price: 5.99 }], mf: FOOD, cols: [PA] }),
  product({ handle: 'fresh-barhi-dates', title: 'Fresh Barhi Dates, per lb', vendor: 'Fresh', type: 'Fresh', photos: [['dates', '']], sizes: [{ price: 7.99 }], tags: ['new'], mf: { ...FOOD, alt_name: 'Khajoor' }, cols: [PA] }),
  product({ handle: 'vadilal-jumbo-puff', title: 'Jumbo Puff, Paneer Chilli', vendor: 'Vadilal', type: 'Frozen', photos: [['puff', '']], sizes: [{ price: 5.49 }], mf: FOOD, cols: [PA] }),
  product({ handle: 'haldirams-hara-bhara-kebab', title: 'Minute Khana Hara Bhara Kebab', vendor: "Haldiram's", type: 'Frozen', photos: [['haldiram', '']], sizes: [{ price: 6.99 }], mf: FOOD, cols: [PA] }),
  product({ handle: 'kaiser-lamb-kofta-kabab', title: 'Lamb Kofta Kabab, 8 pieces', vendor: 'Kaiser', type: 'Frozen', photos: [['kofta', '']], sizes: [{ price: 11.99 }], mf: FOOD, cols: [PA] }),
  product({ handle: 'laxmi-paneer-makhani', title: 'Paneer Makhani, ready meal', vendor: 'Laxmi', type: 'Ready meal', photos: [['laxmi', '']], sizes: [{ price: 4.99 }], mf: FOOD, cols: [PA] }),
];
const BY = Object.fromEntries(P.map((p) => [p.handle, p]));
const pick = (...h) => h.map((x) => BY[x]).filter(Boolean);

const COLLECTION_META = {
  all: { title: 'All products', image: 'spices', desc: 'Every shelf in the shop, in one place.' },
  'herbs-spices': { title: 'Herbs & Spices', image: 'spices', desc: 'Whole, ground and blended — the backbone of the shop.' },
  'rice-flour-grains': { title: 'Rice, Flour & Grains', image: 'bowl', desc: 'Every bag size, from a 2 lb try-out to a 10 lb family sack.' },
  'vitamins-supplements': { title: 'Wellness', image: 'vitamins', desc: 'Sealed exactly as the maker packed it. Labels copied word for word.' },
  'herbal-teas': { title: 'Teas & Beverages', image: 'tea', desc: 'Loose leaf, blends and the drinks in our fridge.' },
  'essential-oils': { title: 'Essential & Carrier Oils', image: 'oils', desc: '10 ml bottles upwards.' },
  'skin-hair-care': { title: 'Skin, Hair & Body', image: 'skincare', desc: 'Butters, soaps and oils.' },
  'cooking-oils-ghee': { title: 'Cooking Oils, Ghee & Condiments', image: 'ginger', desc: 'Kitchen staples.' },
  'pantry-packaged': { title: 'Pantry & Snacks', image: 'pantry', desc: 'Cupboard basics, sweets and the freezer.' },
  'new-arrivals': { title: 'New arrivals', image: 'pantry', desc: 'Just unpacked.' },
  'special-offers': { title: 'Special offers', image: 'spices', desc: 'Marked down right now.' },
};
const membersOf = (handle) => {
  if (handle === 'all') return P;
  if (handle === 'new-arrivals') return pick('tru-fru-strawberries-creme', 'grind-sea-moss-energy-water', 'aghati-mixed-baklava', 'fresh-barhi-dates', 'dimes-mango-juice', 'trenzy-milk-rice-snack', 'organic-beet-kvass-ginger-turmeric', 'wonder-beet-juice');
  if (handle === 'special-offers') return P.filter((p) => p.variants.some((v) => v.compare_at_price > v.price));
  return P.filter((p) => p.cols.includes(handle));
};

/* ---------------------------------------------------- filters + sorting */
const SORTS = [
  { name: 'Featured', value: 'manual' }, { name: 'Best selling', value: 'best-selling' },
  { name: 'Alphabetically, A-Z', value: 'title-ascending' }, { name: 'Alphabetically, Z-A', value: 'title-descending' },
  { name: 'Price, low to high', value: 'price-ascending' }, { name: 'Price, high to low', value: 'price-descending' },
  { name: 'Date, new to old', value: 'created-descending' },
];
function sortProducts(list, by) {
  const a = [...list];
  const cmp = {
    'title-ascending': (x, y) => x.title.localeCompare(y.title), 'title-descending': (x, y) => y.title.localeCompare(x.title),
    'price-ascending': (x, y) => x.price - y.price, 'price-descending': (x, y) => y.price - x.price,
    'created-descending': (x, y) => y.created - x.created,
  }[by];
  return cmp ? a.sort(cmp) : a;
}
function withParams(url, fn) { const u = new URL(url); fn(u.searchParams); u.searchParams.delete('page'); return u.pathname + (u.search || ''); }
function buildFilters(base, url) {
  const q = url.searchParams;
  const sel = { vendor: q.getAll('filter.p.vendor'), type: q.getAll('filter.p.product_type'), avail: q.getAll('filter.v.availability') };
  const gte = q.get('filter.v.price.gte'), lte = q.get('filter.v.price.lte');
  const inPrice = (p) => (!gte || p.price >= Number(gte) * 100) && (!lte || p.price <= Number(lte) * 100);
  const passes = (p, skip) =>
    (skip === 'vendor' || !sel.vendor.length || sel.vendor.includes(p.vendor)) &&
    (skip === 'type' || !sel.type.length || sel.type.includes(p.type)) &&
    (skip === 'avail' || !sel.avail.length || sel.avail.includes(p.available ? '1' : '0')) &&
    (skip === 'price' || inPrice(p));
  const listFilter = (label, key, param, getVal, labelOf = (v) => v) => {
    const vals = [...new Set(base.map(getVal))].sort(); if (key === 'avail') vals.reverse();
    const values = vals.map((v) => {
      const active = sel[key].includes(v);
      return {
        label: labelOf(v), value: v, param_name: param, active,
        count: base.filter((p) => passes(p, key) && getVal(p) === v).length,
        url_to_remove: withParams(url.href, (sp) => { const keep = sp.getAll(param).filter((x) => x !== v); sp.delete(param); keep.forEach((x) => sp.append(param, x)); }),
      };
    });
    return { label, type: 'list', param_name: param, values, active_values: values.filter((v) => v.active), url_to_remove: withParams(url.href, (sp) => sp.delete(param)) };
  };
  const maxPrice = Math.max(0, ...base.map((p) => p.price_max));
  const filters = [
    listFilter('Availability', 'avail', 'filter.v.availability', (p) => (p.available ? '1' : '0'), (v) => (v === '1' ? 'In stock' : 'Out of stock')),
    { label: 'Price', type: 'price_range', active_values: [], range_max: maxPrice,
      min_value: { param_name: 'filter.v.price.gte', value: gte ? Number(gte) * 100 : null },
      max_value: { param_name: 'filter.v.price.lte', value: lte ? Number(lte) * 100 : null },
      url_to_remove: withParams(url.href, (sp) => { sp.delete('filter.v.price.gte'); sp.delete('filter.v.price.lte'); }) },
    listFilter('Brand', 'vendor', 'filter.p.vendor', (p) => p.vendor),
    listFilter('Product type', 'type', 'filter.p.product_type', (p) => p.type),
  ];
  return { filters, filtered: base.filter((p) => passes(p)) };
}
function collectionFor(handle, url) {
  const meta = COLLECTION_META[handle];
  if (!meta) return null;
  const base = membersOf(handle);
  const sortBy = url?.searchParams.get('sort_by') || 'manual';
  const { filters, filtered } = url ? buildFilters(base, url) : { filters: [], filtered: base };
  const products = sortProducts(filtered, sortBy);
  return {
    handle, title: meta.title, url: `/collections/${handle}`, description: `<p>${meta.desc}</p>`, image: img(meta.image, meta.title),
    products, products_count: products.length, all_products_count: base.length,
    filters, sort_options: SORTS, sort_by: sortBy, default_sort_by: 'manual',
  };
}

/* ----------------------------------------------------------- menus + pages */
const MENUS = {
  'main-menu': { title: 'Shop', links: [
    { title: 'Shop all', url: '/collections/all', links: [] },
    { title: 'Spices', url: '/collections/herbs-spices', links: [
      { title: 'Herbs & Spices', url: '/collections/herbs-spices' }, { title: 'Rice, Flour & Grains', url: '/collections/rice-flour-grains' },
      { title: 'Cooking Oils & Ghee', url: '/collections/cooking-oils-ghee' }, { title: 'Pantry & Snacks', url: '/collections/pantry-packaged' } ] },
    { title: 'Teas', url: '/collections/herbal-teas', links: [] },
    { title: 'Wellness', url: '/collections/vitamins-supplements', links: [] },
    { title: 'Recipes', url: '/blogs/recipes-and-tips', links: [] },
    { title: 'About', url: '/pages/about', links: [] },
    { title: 'Offers', url: '/collections/special-offers', links: [] } ] },
  footer: { title: 'Help', links: [
    { title: 'Delivery', url: '/pages/delivery' }, { title: 'Returns', url: '/pages/returns' }, { title: 'FAQ', url: '/pages/faq' },
    { title: 'Contact us', url: '/pages/contact' }, { title: 'About us', url: '/pages/about' }, { title: 'Recipes & Tips', url: '/blogs/recipes-and-tips' } ] },
};
const PAGES = {
  about: { title: 'About us', template: 'page.about', content: `<p>Herbs &amp; Spices International Groceries is a family grocery and wellness shop in Cordele, Georgia. We have served our neighbours over the counter for years, and we ship across the United States.</p><h2>What we sell</h2><p>Eight departments, the same shelves you would walk past in the shop: herbs and spices, rice and flour in every bag size, sealed vitamins and supplements, teas, essential and carrier oils, skin and hair care, cooking oils and ghee, and pantry foods.</p><h2>How we sell it</h2><p>We sell products in the manufacturer's own sealed packaging. The ingredients, allergen information and warnings on each product page are copied from the label — word for word.</p>` },
  delivery: { title: 'Delivery', template: 'page', content: `<h2>Where we ship</h2><p>We ship across the United States from our shop in Cordele, Georgia.</p><h2>What it costs</h2><p>Standard delivery is $20. One price, whatever you buy and however much of it. Nothing is added afterwards.</p><h2>When it leaves us</h2><p>Orders are posted the next business day. How long it then takes to reach you depends on the carrier and how far you are from Georgia.</p><h2>Tracking</h2><p>You will get an email with tracking as soon as your parcel is handed to the carrier.</p>` },
  returns: { title: 'Returns', template: 'page', content: `<h2>Vitamins and supplements</h2><p>These cannot be returned. Once a supplement has left the shop we have no way of knowing how it has been stored, so we cannot put it back on the shelf or send it on to another customer. Please check your order carefully before you buy.</p><h2>If something is wrong with your order</h2><p>That is different, and we will always put it right. Tell us if:</p><ul><li>the item arrived damaged or leaking</li><li>you were sent the wrong item</li><li>your order has not arrived</li></ul><p>We pay the postage in those cases, and we replace the item or refund you.</p><h2>How to start</h2><p>Contact us with your order number, and a photo if something is damaged. We will reply with what to do next.</p>` },
  faq: { title: 'Frequently asked questions', template: 'page.faq', content: '' },
  contact: { title: 'Contact', template: 'page.contact', content: '' },
};
const POLICIES = {
  'privacy-policy': { title: 'Privacy policy', content: '<p>[Privacy policy — generated in Shopify admin → Settings → Policies. Shown here with the same page layout.]</p>' },
  'shipping-policy': { title: 'Shipping policy', content: PAGES.delivery.content },
  'refund-policy': { title: 'Refund policy', content: PAGES.returns.content },
  'terms-of-service': { title: 'Terms of service', content: '<p><strong>[Not written yet — the live store returns "page not found" here. The payment processor will look for it. Write it in Shopify admin → Settings → Policies.]</strong></p>' },
  'contact-information': { title: 'Contact information', content: '<p>Herbs &amp; Spices International Groceries<br>401 E 16th Ave, Suite H, Cordele, GA 31015<br>(229) 513-4377 · herbsandspicescordele@gmail.com</p><p>[Legal business name to be added.]</p>' },
};
const ARTICLES = [
  { handle: 'keep-your-spices-tasting-fresh', title: 'How to keep your spices tasting like they did on day one', author: 'The Herbs & Spices team', published_at: '2026-09-04T10:00:00Z', tags: ['Storage', 'Spices'], image: img('spices', ''),
    excerpt: "Ground spices don't go off — they go quiet. Four things kill the flavour, and all four are easy to avoid.",
    content: `<p>Ground spices don't go off — they go quiet. Four things kill the flavour, and all four are easy to avoid.</p><p>[The rest of this article lives on the store's Recipes &amp; Tips blog. The preview shows the layout: long-form text, the tags underneath, and "Shop the ingredients" beside it.]</p><h2>1. Light</h2><p>[…]</p><h2>2. Heat</h2><p>[…]</p><h2>3. Air</h2><p>[…]</p><h2>4. Time</h2><p>[…]</p>`,
    products: pick('ground-turmeric-200-g', 'black-peppercorns-200-g', 'green-cardamom-pods-100-g', 'kashmiri-chilli-powder-200-g') },
].map((a) => ({ ...a, object_type: 'article', url: `/blogs/recipes-and-tips/${a.handle}`, excerpt_or_content: a.excerpt, metafields: { custom: { products: { value: a.products } } } }));
const BLOG = { title: 'Recipes & Tips', handle: 'recipes-and-tips', url: '/blogs/recipes-and-tips', articles: ARTICLES, all_tags: [...new Set(ARTICLES.flatMap((a) => a.tags))] };

/* Preview-only overrides (photos + basket contents that match the sample products) */
const OVERRIDES = {
  hero: { settings: { image: img('seamoss', 'Herbs & Spices Sea Moss Gel jars on the shop fridge'), polaroid_image: img('ashwagandha', 'Wellness shelf') } },
  story: { settings: { poster: img('seamoss', '') } },
  kits: { blocks: {
    k1: { title: 'Biryani night', blurb: 'Long-grain rice, whole spices and ghee for a pot that feeds the whole table.', products: ['basmati-rice', 'green-cardamom-pods-100-g', 'pure-desi-ghee-500-g', 'kashmiri-chilli-powder-200-g', 'ground-turmeric-200-g'] },
    k2: { title: 'Morning tea ritual', blurb: 'Slow mornings, done properly. Loose leaf, spice and something sweet.', products: ['kashmiri-kahwa-150-g', 'masala-chai-blend-250-g', 'green-cardamom-pods-100-g', 'fresh-barhi-dates'] },
    k3: { title: 'Pantry starter', blurb: 'New kitchen, new city? The everyday basics from our own shelves.', products: ['chapati-atta-10-lb', 'gram-flour-4-lb', 'mango-pickle-400-g', 'ground-turmeric-200-g', 'extra-virgin-olive-oil-500-ml'] } } },
  'page-main-about': {},
};

/* =============================================================== the cart */
const cart = { items: [], note: '' };
const findVariant = (id) => { for (const p of P) for (const v of p.variants) if (String(v.id) === String(id)) return { p, v }; return null; };
function addItem(id, qty) {
  const hit = findVariant(id);
  if (!hit) throw new Error('That product is no longer available.');
  if (!hit.v.available) throw new Error(`${hit.p.title} is sold out.`);
  const line = cart.items.find((i) => i.variant.id === hit.v.id);
  if (line) line.quantity += qty; else cart.items.push({ product: hit.p, variant: hit.v, quantity: qty });
}
function cartObject() {
  const items = cart.items.map((i, idx) => ({
    key: `${i.variant.id}:${idx}`, quantity: i.quantity, url: `${i.product.url}?variant=${i.variant.id}`,
    image: i.product.featured_media, product: i.product, variant: i.variant, title: i.product.title,
    final_price: i.variant.price, final_line_price: i.variant.price * i.quantity,
    original_line_price: (i.variant.compare_at_price || i.variant.price) * i.quantity,
    url_to_remove: `/cart/change?line=${idx + 1}&quantity=0`,
  }));
  const total = items.reduce((n, i) => n + i.final_line_price, 0);
  return { items, item_count: items.reduce((n, i) => n + i.quantity, 0), total_price: total, items_subtotal_price: total, note: cart.note, cart_level_discount_applications: [] };
}
const cartJson = () => { const c = cartObject(); return { item_count: c.item_count, total_price: c.total_price, items: c.items.map((i) => ({ id: i.variant.id, quantity: i.quantity, title: i.title, price: i.final_price })) }; };

/* ============================================================ Liquid shim */
const shopifyify = (src) => src.replace(/posted_successfully\?/g, 'posted_successfully');
const liquidFs = {
  exists: async (f) => fs.existsSync(f), existsSync: (f) => fs.existsSync(f),
  readFile: async (f) => shopifyify(fs.readFileSync(f, 'utf8')), readFileSync: (f) => shopifyify(fs.readFileSync(f, 'utf8')),
  resolve: (dir, file, ext) => path.resolve(dir, path.extname(file) ? file : file + ext),
  contains: (root, file) => path.resolve(file).startsWith(path.resolve(root)),
  sep: path.sep, dirname: (f) => path.dirname(f), fallback: () => undefined,
};
const engine = new Liquid({ root: [path.join(HANDOFF, 'snippets'), path.join(HANDOFF, 'sections')], extname: '.liquid', cache: false, fs: liquidFs });
const kv = (args) => Object.fromEntries(args.filter(Array.isArray));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}="${esc(v)}"`).join(' ');

function blockTag(name, onRender) {
  engine.registerTag(name, {
    parse(token, remain) {
      this.args = token.args;
      this.tpls = [];
      const stream = this.liquid.parser.parseStream(remain)
        .on(`tag:end${name}`, () => stream.stop())
        .on('template', (tpl) => this.tpls.push(tpl))
        .on('end', () => { throw new Error(`${name} not closed`); });
      stream.start();
    },
    * render(ctx, emitter) { yield* onRender.call(this, ctx, emitter); },
  });
}
engine.registerTag('schema', {
  parse(_t, remain) { let t; while ((t = remain.shift())) { if (t.name === 'endschema') return; } throw new Error('schema not closed'); },
  render() { return ''; },
});
blockTag('form', function* (ctx, emitter) {
  const kind = (this.args.match(/^\s*'([^']+)'/) || [])[1];
  const a = {};
  for (const m of this.args.matchAll(/([a-zA-Z][\w-]*):\s*(?:'([^']*)'|"([^"]*)")/g)) a[m[1]] = m[2] ?? m[3];
  const action = kind === 'contact' ? '/contact' : '/cart/add';
  const bare = Object.keys(a).filter((k) => a[k] === '');
  emitter.write(`<form method="post" action="${action}" accept-charset="UTF-8"${kind === 'product' ? ' enctype="multipart/form-data"' : ''} ${attrs(a)} ${bare.join(' ')}><input type="hidden" name="form_type" value="${kind}">`);
  const state = (ctx.getAll().__form) || {};
  ctx.push({ form: state });
  yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
  ctx.pop();
  emitter.write('</form>');
});
blockTag('paginate', function* (ctx, emitter) {
  const m = this.args.match(/^\s*(.+?)\s+by\s+(.+?)\s*$/);
  const expr = m[1].trim();
  const size = Number(this.liquid.evalValueSync(m[2], ctx)) || 24;
  const dot = expr.lastIndexOf('.');
  const parentExpr = dot > -1 ? expr.slice(0, dot) : null;
  const prop = dot > -1 ? expr.slice(dot + 1) : expr;
  const parent = parentExpr ? this.liquid.evalValueSync(parentExpr, ctx) : null;
  const all = (parent ? parent[prop] : this.liquid.evalValueSync(expr, ctx)) || [];
  const reqUrl = new URL(ctx.getAll().__url);
  const pages = Math.max(1, Math.ceil(all.length / size));
  const current = Math.min(Math.max(1, Number(reqUrl.searchParams.get('page')) || 1), pages);
  const pageUrl = (n) => { const u = new URL(reqUrl); if (n === 1) u.searchParams.delete('page'); else u.searchParams.set('page', n); return u.pathname + u.search; };
  const paginate = {
    current_page: current, current_offset: (current - 1) * size, items: all.length, page_size: size, pages,
    previous: current > 1 ? { url: pageUrl(current - 1), title: 'Previous' } : null,
    next: current < pages ? { url: pageUrl(current + 1), title: 'Next' } : null,
    parts: Array.from({ length: pages }, (_, i) => ({ title: i + 1, url: pageUrl(i + 1), is_link: i + 1 !== current })),
  };
  const slice = all.slice((current - 1) * size, current * size);
  const scope = { paginate };
  if (parent) { parent.__orig = parent[prop]; parent[prop] = slice; } else scope[expr] = slice;
  ctx.push(scope);
  yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
  ctx.pop();
  if (parent) { parent[prop] = parent.__orig; delete parent.__orig; }
});

const money = (c) => `$${((Number(c) || 0) / 100).toFixed(2)}`;
const F = {
  money, money_without_currency: (c) => ((Number(c) || 0) / 100).toFixed(2),
  image_url: (i, ...a) => { const src = (i && (i.src || i)) || ''; const w = kv(a).width; return w ? `${src}?width=${w}` : src; },
  image_tag: (url, ...a) => { const o = kv(a); return `<img ${attrs({ src: url, alt: o.alt ?? '', loading: o.loading, sizes: o.sizes, style: o.style, width: o.width, fetchpriority: o.fetchpriority })}>`; },
  placeholder_svg_tag: (_n, cls) => `<svg class="${cls || ''}" viewBox="0 0 525 525" xmlns="http://www.w3.org/2000/svg"><rect width="525" height="525" fill="#EFE3C3"/><path d="M180 330l60-80 50 60 30-40 60 60z" fill="#D8C79E"/></svg>`,
  asset_url: (n) => `/assets/${n}`,
  stylesheet_tag: (u) => `<link rel="stylesheet" href="${u}">`,
  preload_tag: (u, ...a) => `<link rel="preload" href="${u}" ${attrs(kv(a))}>`,
  url_for_vendor: (v) => `/collections/all?filter.p.vendor=${encodeURIComponent(v)}`,
  structured_data: (p) => JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: p?.title }),
  handleize: (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  default_errors: (e) => (Array.isArray(e) ? e.join(', ') : String(e || '')),
  video_tag: () => '', external_video_tag: () => '', media_tag: () => '', payment_button: () => '', t: (k) => k,
};
Object.entries(F).forEach(([k, fn]) => engine.registerFilter(k, fn));

const GLOBALS = (url, extra = {}) => ({
  shop: {
    name: 'Herbs & Spices International Groceries', money_format: '${{amount}}', customer_accounts_enabled: true,
    policies: Object.entries(POLICIES).map(([h, p]) => ({ title: p.title, url: `/policies/${h}` })),
  },
  routes: {
    root_url: '/', search_url: '/search', cart_url: '/cart', account_url: '/account', account_login_url: '/account/login',
    collections_url: '/collections', all_products_collection_url: '/collections/all', product_recommendations_url: '/recommendations/products',
  },
  cart: cartObject(), customer: null, current_tags: null, additional_checkout_buttons: false, content_for_additional_checkout_buttons: '',
  __url: url.href, ...extra,
});

/* ===================================================== section rendering */
function schemaOf(file) {
  const m = fs.readFileSync(file, 'utf8').match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);
  return m ? JSON.parse(m[1]) : {};
}
function resolveSetting(def, value) {
  if (value === undefined) value = def.default;
  switch (def.type) {
    case 'collection': return typeof value === 'string' ? collectionFor(value) : value || null;
    case 'link_list': return typeof value === 'string' ? MENUS[value] || null : value || null;
    case 'product_list': return Array.isArray(value) ? value.map((h) => (typeof h === 'string' ? BY[h] : h)).filter(Boolean) : [];
    default: return value === undefined ? null : value;
  }
}
function resolveSettings(defs = [], values = {}, extra = {}) {
  const merged = { ...values, ...extra };
  const out = {};
  defs.filter((d) => d.id).forEach((d) => { out[d.id] = resolveSetting(d, merged[d.id]); });
  return out;
}
async function renderSection(key, conf, locals) {
  const file = path.join(HANDOFF, 'sections', `${conf.type}.liquid`);
  const schema = schemaOf(file);
  const ov = OVERRIDES[key] || {};
  const blocks = (conf.block_order || Object.keys(conf.blocks || {})).map((id) => {
    const b = conf.blocks[id];
    const bSchema = (schema.blocks || []).find((x) => x.type === b.type) || {};
    return { id, type: b.type, settings: resolveSettings(bSchema.settings, b.settings, ov.blocks?.[id]), shopify_attributes: `data-block-id="${id}"` };
  });
  const section = { id: `template--${key}`, settings: resolveSettings(schema.settings, conf.settings, ov.settings), blocks };
  const html = await engine.renderFile(conf.type, { ...locals, section });
  return `<div id="shopify-section-${section.id}" class="shopify-section">${html}</div>`;
}
async function renderTemplate(tplName, locals) {
  const tpl = JSON.parse(fs.readFileSync(path.join(HANDOFF, 'templates', `${tplName}.json`), 'utf8'));
  const parts = [];
  for (const key of tpl.order) if (!tpl.sections[key].disabled) parts.push(await renderSection(key, tpl.sections[key], locals));
  return parts.join('\n');
}
async function layout(title, tplName, locals) {
  const body = await renderTemplate(tplName, locals);
  const head = await engine.renderFile('hsd-head', locals);
  const header = (await renderSection('announce', { type: 'hsd-announcement', blocks: {
    m1: { type: 'message', settings: { text: 'Ships next business day from Cordele, GA' } },
    m2: { type: 'message', settings: { text: "Sealed in the maker's own packaging" } },
    m3: { type: 'message', settings: { text: 'Questions? Call (229) 513-4377' } } }, block_order: ['m1', 'm2', 'm3'] }, locals))
    + (await renderSection('header', { type: 'hsd-header', settings: {} }, locals));
  const footer = await renderSection('footer', { type: 'hsd-footer', settings: {} }, locals);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Local preview</title>${head}
<style>body{margin:0;background:#FBF4E2}.preview-flag{position:fixed;left:12px;bottom:12px;z-index:99;background:#2B1D14;color:#FBF4E2;font:600 12px system-ui;padding:8px 12px;border-radius:999px;opacity:.85;pointer-events:none}</style>
</head><body>${header}<main id="MainContent">${body}</main>${footer}
<div class="preview-flag">Local preview · sample products &amp; prices</div></body></html>`;
}

/* Placeholder artwork used when a photo isn't in local-preview/img/ (the public repo ships without photos).
   Drop your own JPGs into img/<name>.jpg or img/dept/<name>.jpg to replace them. */
function placeholderImage(key, isDept) {
  const tints = ['#F4D9D2', '#F6E3B0', '#DCE8D2', '#F3E6C4'];
  const tint = tints[[...key].reduce((n, c) => n + c.charCodeAt(0), 0) % tints.length];
  const label = key.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const icon = isDept
    ? '<path d="M470 420h260l-32 110a48 48 0 0 1-46 34H548a48 48 0 0 1-46-34z M630 420l80-112" fill="none" stroke="#2B1D14" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'
    : '<rect x="560" y="250" width="80" height="54" rx="8" fill="#2B1D14"/><path d="M572 304h56v36c0 12 44 28 44 68v250a24 24 0 0 1-24 24H552a24 24 0 0 1-24-24V408c0-40 44-56 44-68z" fill="#7A3E12"/><rect x="528" y="460" width="144" height="150" fill="#FFFDF7"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200">
<rect width="1200" height="1200" fill="${tint}"/>
<rect x="60" y="60" width="1080" height="1080" rx="40" fill="none" stroke="#2B1D14" stroke-opacity=".18" stroke-width="4" stroke-dasharray="18 14"/>
${icon}
<text x="600" y="820" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-weight="700" font-size="64" fill="#2B1D14">${esc(label)}</text>
<text x="600" y="890" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="30" letter-spacing="6" fill="#7A6553">PHOTO PLACEHOLDER</text>
</svg>`;
}

/* ================================================================ server */
const TYPES = { '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const send = (res, code, body, type = 'text/html; charset=utf-8') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body); };
const redirect = (res, to) => { res.writeHead(303, { Location: to }); res.end(); };
const readBody = (req) => new Promise((r) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => r(Buffer.concat(c).toString('utf8'))); });
const multipartField = (raw, n) => (raw.match(new RegExp(`name="${n.replace(/[[\]]/g, '\\$&')}"\\r?\\n\\r?\\n([^\\r\\n]*)`)) || [])[1];
const infoPage = (url, title, html) => layout(title, 'page', { ...GLOBALS(url), page: { title, content: html } });

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = decodeURIComponent(url.pathname).replace(/\/$/, '') || '/';
  const G = (extra) => GLOBALS(url, extra);
  try {
    /* static */
    if (p.startsWith('/assets/')) {
      const f = path.join(HANDOFF, 'assets', path.basename(p));
      return fs.existsSync(f) ? send(res, 200, fs.readFileSync(f), TYPES[path.extname(f)] || 'application/octet-stream') : send(res, 404, 'not found', 'text/plain');
    }
    if (p.startsWith('/img/')) {
      // Photos live in local-preview/img/ (products) and local-preview/img/dept/ (department images)
      const rel = p.slice('/img/'.length);
      const f = path.join(IMG_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
      if (f.startsWith(IMG_DIR) && fs.existsSync(f)) return send(res, 200, fs.readFileSync(f), 'image/jpeg');
      return send(res, 200, placeholderImage(path.basename(rel, '.jpg'), rel.startsWith('dept/')), 'image/svg+xml');
    }

    /* cart API + forms */
    if (p === '/cart.js') return send(res, 200, JSON.stringify(cartJson()), 'application/json');
    if (p === '/cart/add.js' && req.method === 'POST') {
      const raw = await readBody(req);
      try {
        if ((req.headers['content-type'] || '').includes('application/json')) {
          const j = JSON.parse(raw);
          (j.items || [{ id: j.id, quantity: j.quantity || 1 }]).forEach((i) => addItem(i.id, Number(i.quantity) || 1));
        } else addItem(multipartField(raw, 'id'), Number(multipartField(raw, 'quantity')) || 1);
        return send(res, 200, JSON.stringify(cartJson()), 'application/json');
      } catch (e) { return send(res, 422, JSON.stringify({ description: e.message }), 'application/json'); }
    }
    if (p === '/cart/add' && req.method === 'POST') {
      const raw = await readBody(req);
      try { addItem(multipartField(raw, 'id'), Number(multipartField(raw, 'quantity')) || 1); } catch (e) { /* ignore in preview */ }
      return redirect(res, '/cart');
    }
    if (p === '/cart/change') {
      const line = Number(url.searchParams.get('line')) - 1;
      const qty = Number(url.searchParams.get('quantity'));
      if (cart.items[line]) { if (qty <= 0) cart.items.splice(line, 1); else cart.items[line].quantity = qty; }
      return redirect(res, '/cart');
    }
    if (p === '/cart' && req.method === 'POST') {
      const form = new URLSearchParams(await readBody(req));
      const ups = form.getAll('updates[]').map(Number);
      ups.forEach((q, i) => { if (cart.items[i]) cart.items[i].quantity = q; });
      cart.items = cart.items.filter((i) => i.quantity > 0);
      if (form.has('note')) cart.note = form.get('note');
      return redirect(res, form.has('checkout') ? '/checkout' : '/cart');
    }
    if (p === '/contact' && req.method === 'POST') {
      const form = new URLSearchParams(await readBody(req));
      const ok = form.get('contact[email]') && form.get('contact[body]');
      return redirect(res, `/pages/contact?contact_posted=${ok ? 'true' : 'false'}`);
    }
    if (p === '/recommendations/products') {
      const prod = P.find((x) => String(x.id) === url.searchParams.get('product_id')) || P[0];
      const same = P.filter((x) => x !== prod && x.cols.some((c) => prod.cols.includes(c)));
      const recs = [...new Set(same.concat(P.filter((x) => x !== prod)))].slice(0, Number(url.searchParams.get('limit')) || 4);
      return send(res, 200, await renderSection('related', { type: 'hsd-related-products', settings: {} }, { ...G(), product: prod, recommendations: { performed: true, products_count: recs.length, products: recs } }));
    }

    /* pages */
    if (p === '/') return send(res, 200, await layout('Home', 'index', G()));
    let m;
    if ((m = p.match(/^\/products\/([^/]+)$/))) {
      const prod = BY[m[1]];
      if (prod) {
        const vid = url.searchParams.get('variant');
        const v = prod.variants.find((x) => String(x.id) === vid) || prod.variants.find((x) => x.available) || prod.variants[0];
        const shown = { ...prod, selected_or_first_available_variant: v, options_with_values: [{ ...prod.options_with_values[0], selected_value: v.option1 }] };
        return send(res, 200, await layout(prod.title, 'product', { ...G(), product: shown, recommendations: { performed: false } }));
      }
    }
    if (p === '/collections') {
      const cols = Object.keys(COLLECTION_META).filter((h) => !['all', 'new-arrivals', 'special-offers'].includes(h)).map((h) => collectionFor(h));
      return send(res, 200, await layout('Shop', 'list-collections', { ...G(), collections: cols }));
    }
    if ((m = p.match(/^\/collections\/([^/]+)$/))) {
      const c = collectionFor(m[1], url);
      if (c) return send(res, 200, await layout(c.title, 'collection', { ...G(), collection: c }));
    }
    if (p === '/search') {
      const terms = (url.searchParams.get('q') || '').trim();
      let search = { performed: false, terms: '', results: [], results_count: 0, filters: [], sort_options: SORTS, sort_by: 'relevance', default_sort_by: 'relevance' };
      if (terms) {
        const words = terms.toLowerCase().split(/\s+/);
        const hay = (s) => words.every((w) => s.toLowerCase().includes(w));
        const base = P.filter((x) => hay(`${x.title} ${x.vendor} ${x.type} ${x.metafields.custom.alt_name?.value || ''} ${x.tags.join(' ')}`));
        const { filters, filtered } = buildFilters(base, url);
        const sorted = sortProducts(filtered, url.searchParams.get('sort_by') || 'relevance');
        const pages = Object.entries(PAGES).filter(([, pg]) => hay(`${pg.title} ${pg.content}`)).map(([h, pg]) => ({ object_type: 'page', title: pg.title, url: `/pages/${h}` }));
        const arts = ARTICLES.filter((a) => hay(`${a.title} ${a.content}`));
        const results = [...sorted, ...pages, ...arts];
        search = { performed: true, terms, results, results_count: results.length, filters, sort_options: [{ name: 'Relevance', value: 'relevance' }, ...SORTS.slice(2)], sort_by: url.searchParams.get('sort_by') || 'relevance', default_sort_by: 'relevance' };
      }
      return send(res, 200, await layout(terms ? `Search: ${terms}` : 'Search', 'search', { ...G(), search }));
    }
    if (p === '/cart') return send(res, 200, await layout('Your basket', 'cart', G()));
    if ((m = p.match(/^\/pages\/([^/]+)$/)) && PAGES[m[1]]) {
      const pg = PAGES[m[1]];
      const posted = url.searchParams.get('contact_posted');
      const form = posted === 'true' ? { posted_successfully: true } : posted === 'false' ? { errors: ['Email and message are required'] } : {};
      return send(res, 200, await layout(pg.title, pg.template, { ...G({ __form: form }), page: { title: pg.title, content: pg.content, handle: m[1] } }));
    }
    if ((m = p.match(/^\/policies\/([^/]+)$/)) && POLICIES[m[1]]) {
      const pol = POLICIES[m[1]];
      return send(res, 200, await layout(pol.title, 'page', { ...G(), page: { title: pol.title, content: pol.content } }));
    }
    if (p === '/blogs/recipes-and-tips' || (m = p.match(/^\/blogs\/recipes-and-tips\/tagged\/([^/]+)$/))) {
      const tag = m && m[1];
      const articles = tag ? ARTICLES.filter((a) => a.tags.some((t) => F.handleize(t) === tag)) : ARTICLES;
      const tagName = tag ? BLOG.all_tags.find((t) => F.handleize(t) === tag) : null;
      return send(res, 200, await layout(BLOG.title, 'blog', { ...G({ current_tags: tagName ? [tagName] : null }), blog: { ...BLOG, articles } }));
    }
    if ((m = p.match(/^\/blogs\/recipes-and-tips\/([^/]+)$/))) {
      const a = ARTICLES.find((x) => x.handle === m[1]);
      if (a) return send(res, 200, await layout(a.title, 'article', { ...G(), blog: BLOG, article: a }));
    }
    if (p === '/checkout') return send(res, 200, await infoPage(url, 'Checkout', `<p>In the live store this button opens <strong>Shopify's secure checkout</strong> (payment, address, delivery). Checkout can't be themed and doesn't run locally.</p><p><a href="/cart">Back to your basket</a></p>`));
    if (p.startsWith('/account')) return send(res, 200, await infoPage(url, 'Account', `<p>Customer accounts (sign-in, order history, addresses) are <strong>hosted by Shopify</strong> with the new customer accounts, so they don't need theme pages and don't run locally.</p>`));

    return send(res, 404, await layout('Page not found', '404', G()));
  } catch (e) {
    console.error(e);
    return send(res, 500, `<pre style="white-space:pre-wrap;padding:24px">${String(e.stack || e).replace(/</g, '&lt;')}</pre>`);
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Herbs & Spices preview → http://localhost:${PORT}`));
