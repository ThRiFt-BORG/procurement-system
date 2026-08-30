# User Guide

How to use the procurement system day to day. This guide is for the people running the restaurant's purchasing — it doesn't assume any technical background.

If the app isn't running yet, see [docs/DEPLOYMENT.md](DEPLOYMENT.md) instead.

## Contents

- [Logging in](#logging-in)
- [Roles — who can do what](#roles--who-can-do-what)
- [Dashboard](#dashboard)
- [Suppliers](#suppliers)
- [Categories](#categories)
- [Products](#products)
- [Prices](#prices)
- [Purchase orders (LPOs)](#purchase-orders-lpos)
- [Deliveries](#deliveries)
- [Credit notes](#credit-notes)
- [Reports](#reports)
- [Settings](#settings)
- [Users](#users)
- [Common questions](#common-questions)

---

## Logging in

Open a browser and go to the app's address (usually `http://localhost:3100` on the laptop it runs on — ask whoever set it up if you're unsure). Enter the email and password given to you and click **Sign in**.

To sign out, use **Sign out** at the bottom of the left-hand menu.

## Roles — who can do what

Every account has one of four roles. An administrator assigns these under [Users](#users).

| Role | Can view everything | Can add/edit suppliers, products, prices, deliveries, credit notes | Can create LPOs | Can approve LPOs | Can change Settings | Can manage user accounts |
|---|---|---|---|---|---|---|
| **Viewer** | ✅ | — | — | — | — | — |
| **Procurement Officer** | ✅ | ✅ | ✅ | — | — | — |
| **Manager** | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

If a button or link is missing on a page, it's because your role doesn't have that permission — not a fault. A Procurement Officer, for example, can put an LPO together and submit it, but only a Manager or Admin can give it final approval.

## Dashboard

The first screen after logging in. At a glance:

- **Purchases this month / this year** — total spend across all approved-and-onward LPOs.
- **Total / Pending / Outstanding deliveries** — how much is in flight.
- **Notable price increases** — anything that's risen 5% or more since the last time it was bought, so you notice creeping costs early.
- **Recent LPOs** and **Recent price changes** — quick links into the detail.

## Suppliers

**Suppliers → Add supplier** to record a new one: name, contact person, phone, email, address, payment terms, tax/VAT PIN, and bank details. All optional except the name.

Click any supplier's name to see everything about them in one place: their contact details, every product they supply with the current price, and their purchase history. **Edit** on that page changes their details; **Deactivate** hides them from new LPOs without deleting their history (use **Activate** to bring them back).

## Categories

**Categories** groups products (e.g. "Vegetables", "Dry Goods"). The standard set is created automatically when the system is first set up. Add more any time from this page — there's no limit, and nothing about the rest of the app needs to change to support a new one.

## Products

**Products → Add product** to record something you buy: its name, which category it belongs to, its unit of measure (kg, litre, bottle, carton — whatever fits), and its VAT treatment.

**VAT status matters**: mark a product **Exempt** if VAT doesn't apply to it (fresh produce is commonly exempt), or **Applicable** with a rate (usually 16%) if it is. This decision is per-product and drives every VAT calculation on every LPO that includes it — get it right once here rather than fixing it on every order.

A product's page shows every supplier who provides it, the current price from each, and the full price history. Two things happen here:

- **Add a supplier** links an existing supplier to this product and records their opening price for it.
- **Record a new price** adds a new price point for a supplier you've already linked — for example, when they send an updated price list.

Either way, the price you had before is never overwritten or deleted — it just becomes history you can still see.

> Products currently can't be renamed or otherwise edited once created (only deactivated). If a product needs fixing, deactivate it and add a corrected one.

## Prices

**Prices** has two parts:

- **Compare suppliers on one product** — pick a product and see every supplier's current price side by side, with the cheapest one flagged.
- **Recent price changes** — every price update across every product and supplier, most recent first, with the percentage change so increases (or decreases) are easy to spot.

## Purchase orders (LPOs)

This is the core of the system — an LPO ("Local Purchase Order") is a single order to one supplier.

### Creating one

**LPOs → Create LPO**:

1. Choose the supplier.
2. Click **+ Add line** for each product you're ordering from them. The product picker only shows products already linked to that supplier (see [Products](#products) if the one you need isn't listed yet).
3. Set the quantity. The unit price is pre-filled from the last recorded price — change it if this order's price is different, and the system records that as a new price point automatically, tied back to this LPO.
4. Choose whether the price you typed **includes** or **excludes** VAT — the system does the conversion either way.
5. Subtotal, VAT, and grand total update live as you go. Add notes/terms if needed, then **Save LPO as draft**.

### Moving it forward

An LPO moves through statuses in order:

**Draft → Pending approval → Approved → Partially/Fully received** (or **Cancelled** at any point before it's received).

- **Submit for approval** — a Procurement Officer sends a draft on for sign-off.
- **Approve** — a Manager (or Admin) confirms it. This is the one step Officers can't do themselves.
- Once approved, **Record delivery** becomes available (see [Deliveries](#deliveries)).

### Printing

Every LPO has a clean, professional printable layout — **Print / Save as PDF** on the LPO's page opens your browser's print dialog, where "Save as PDF" produces a PDF if you need to email it to a supplier.

## Deliveries

When goods arrive against an approved LPO, go to that LPO (or **Deliveries → Awaiting delivery**) and click **Record delivery**.

Enter what actually arrived for each line — it's pre-filled with what's still outstanding, so you only need to change lines that came up short. Anything less than ordered is automatically flagged **"Credit note required"**, with the shortfall's value already calculated.

An LPO can receive multiple partial deliveries over time (e.g. the rest arrives the next day) — each one only asks about what's still outstanding at that point, and the LPO's status updates automatically to Partially or Fully Received.

## Credit notes

When a delivery comes up short, its page shows **Credit note required** with the amount already worked out. Expand it to log the supplier's actual credit note number and date once you have it (or leave them blank and fill in later).

**Credit Notes** lists every one raised, with its status: **Pending → Requested → Received → Completed**. Move it along as you follow up with the supplier — this is how you keep track of money owed back to you that hasn't shown up yet.

## Reports

**Reports** shows spend for any date range you choose: total expenditure, VAT paid, outstanding deliveries, pending credit notes, and breakdowns by supplier, category, and product. **Export CSV** downloads the underlying LPOs for that period as a spreadsheet file you can open in Excel.

## Settings

**Settings** (Manager/Admin only) holds the company details that appear on every printed LPO — name, address, phone, email — and the default VAT rate that pre-fills when adding a new product. Everyone else can view this page but not change it.

## Users

**Users** (Admin only) is where accounts are managed:

- **Add user** — create a new account with a name, email, role, and starting password. Share the password with them directly; there's no automatic email invite.
- Change someone's **role** any time from the dropdown next to their name.
- **Reset password** — set a new password for someone who's forgotten theirs (this also signs them out everywhere, so they'll need to log in again with the new one).
- **Deactivate** — disables an account without deleting their history (every LPO they prepared or approved stays on record). You can't deactivate your own account.

## Common questions

**I changed something and nothing seemed to happen.** Most save actions redirect you back to the same page — look for a confirmation message near the top, or check that your change is now showing in the list/detail view. If a button is simply missing, it's a permissions issue — see [Roles](#roles--who-can-do-what).

**Can I delete a supplier, product, or LPO?** Not permanently — everything is deactivated/cancelled instead of deleted, so financial history is never lost. This is intentional.

**A price looks wrong on an old LPO after I updated it.** That's expected and correct — an LPO always shows the price that was actually charged at the time it was placed, even if the supplier's price has changed since. Look at the product's price history to see the full trail.

**Who do I contact if something looks broken?** Note exactly what you were doing, what you expected, and what happened instead, and pass it to whoever maintains the system for you.
