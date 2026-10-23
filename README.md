# jelgo — Shopify theme

Custom Shopify (Online Store 2.0) theme for **jelgo**, a concept store for daily vitamin jelly pouches: one 90 g squeeze pouch with 15 vitamins and minerals, in five fruit flavours. Built for Business 4572 (Online Retailing) at Ivey Business School, Fall 2026.

The store runs in test mode. No real products are sold.

## What's in the theme

- **Home page:** auto-rotating pouch hero that recolours the page per flavour, a pills / greens powder / pouch comparison, a scroll-driven "twist, squeeze, go" section, product lineup, a swipeable "your week" row, FAQ and a Discovery Box call to action
- **Product page:** pack-size selector with live price per pouch, subscribe-and-save support (Shopify Subscriptions selling plans), slide-out bag
- **Shop page:** filter chips (flavours / bundles)
- **Cart drawer** using Shopify's AJAX cart API, with a free-shipping progress bar
- All copy is editable in the Shopify theme editor

## How products drive the design

Each product's tags set its look:

| Tag | Example | Effect |
|---|---|---|
| `pouch:HEX` | `pouch:A23FC2` | Accent colour for that product |
| `flavour:Text` | `flavour:15 vitamins & minerals` | Subtitle on cards and in the hero |
| `goal:Text` | `goal:Flavour` | Card eyebrow and shop filter |
| `pill:Text` | `pill:90 g pouch` | Chips on the product page |
| `bundle` | | Treated as a bundle (full-bleed photo, left out of the hero) |
| `pouches:N` | `pouches:10` | Pack size for the per-pouch price on single-variant products |

## Install

Shopify admin → Online Store → Themes → Add theme → Connect from GitHub → pick this repo and the `main` branch → Publish.

## Tools

Shopify, Liquid, vanilla JavaScript and CSS. Theme code written with Claude (Anthropic). Product images generated with ChatGPT and cut out with rembg.
