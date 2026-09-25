# Herbs & Spices International Groceries — Shopify theme sections

Custom Online Store 2.0 storefront for **Herbs & Spices International Groceries** (Cordele, Georgia).

| Folder | What it is |
|---|---|
| [`handoff/`](handoff/) | The theme files to install: 25 sections, 8 snippets, 13 JSON templates, CSS, JS, logo font. **Start with [`handoff/README.md`](handoff/README.md).** |
| [`local-preview/`](local-preview/) | A small Node server that renders the `handoff/` Liquid files on your machine with sample products, so every page can be clicked through without a Shopify store. |

Design reference: https://claude.ai/artifact/2qEpog8hnrznbjHD2v7qGU

## Run the preview

```bash
cd local-preview
npm install
node server.js        # → http://localhost:9292
```

Pages: home, collections (filters, sort, pagination), product, search, cart, about, delivery, returns, FAQ, contact, blog, article, policies, 404.

Sample data only: product photos are placeholders (see `local-preview/img/README.md` to add your own), prices are made up, and checkout/accounts are Shopify-hosted so they don't run locally.

## Install on Shopify

See [`handoff/README.md`](handoff/README.md). Short version: copy `assets/`, `snippets/` and `sections/` into the theme, add the templates as `*.hsd.json` alternates, and add `{% render 'hsd-head' %}` inside `<head>`. Everything is prefixed `hsd-`, so no existing file is overwritten.
