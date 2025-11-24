# Dashboard Configuration Reference

This document shows the exact custom field IDs and enum values configured for the Najot Nur Dashboard.

## amoCRM Custom Fields

### 1. Course Type Field (Kurs turi)
**Field ID:** `1119699`

This field determines whether a sale is counted as Online or Offline.

**Online Course Enum IDs:**
- `865961`
- `865963`
- `865959`
- `923327`
- `923329`

**Offline Course Enum IDs:**
- `671757`
- `865965`
- `865967`

**How to check in amoCRM:**
1. Go to Settings → Custom Fields
2. Find the field with ID `1119699`
3. Make sure your leads have this field filled with one of the above values

---

### 2. Lead Source Field (Qayerdan)
**Field ID:** `1312637`

This field is used for the "Lidslar manbai" pie chart on the dashboard.

---

### 3. Objection Field (E'tiroz sababi)
**Field ID:** `1121759`

Used for tracking customer objections.

---

## amoCRM Statuses

### Won Status IDs (Completed Deals)
These statuses mark a lead as "won" and contribute to:
- **Kelishuv summasi** (Total deal amount)
- **Sotuv - Online** (if Course Type = Online)
- **Sotuv - Offline** (if Course Type = Offline)

**Status IDs:**
- `142`
- `79190542`

---

### Qualified Status IDs
These statuses mark a lead as "qualified":
- `79198062`
- `79190542`
- `142`
- `79199558`
- `79190534`
- `79190530`
- `79190526`

---

### Lost Status ID
**Status ID:** `143`

---

## Loss Reasons (Yo'qotish sabablari)

### Qualified Loss Reason IDs
Lost leads with these reasons are still counted as "qualified":
- `923397`
- `923603`
- `927869`
- `927871`

---

### NOT Qualified Reason IDs (Sifatsiz lidlar)
Lost leads with these reasons are counted as "Sifatsiz lidlar":
- `927873`
- `930117`
- `927867`
- `927865`
- `886101`
- `885455`
- `885519`
- `881379`
- `672845`
- `672843`

**How this works:**
1. Lead must have `loss_reason_id` set (marked as lost)
2. The `loss_reason_id` must match one of the above IDs
3. Then it will be counted in "Sifatsiz lidlar"

---

## Pipeline Filter

**Pipeline ID:** `9975586`

Only leads from this pipeline are counted in dashboard metrics.

---

## Google Sheets Revenue Data

**Spreadsheet ID:** `1WmYVOW6surq2eG03WBE8mJGn2CnTaB-cgeQTrsqJnZo`

**Link:** https://docs.google.com/spreadsheets/d/1WmYVOW6surq2eG03WBE8mJGn2CnTaB-cgeQTrsqJnZo

**Sheet Configuration:**
- **Sheet name:** `Asosiy`
- **Date column:** `A` (Column A)
- **Manager column:** `B` (Column B)
- **Course Type column:** `C` (Column C)
- **Payment Type column:** `D` (Column D)
- **Amount column:** `E` (Column E)

**Used for:**
- **Oylik tushum** (Monthly revenue)
- **Haftalik tushum** (Weekly revenue)

---

## Common Issues & Solutions

### Why is "Sotuv - Online" showing 0?

Check these 3 things:
1. ✅ Lead status is `142` or `79190542` (Won)
2. ✅ Lead has a price/amount > 0
3. ✅ Custom field `1119699` (Course Type) is filled with one of: `865961`, `865963`, `865959`, `923327`, `923329`

### Why is "Sotuv - Offline" showing 0?

Check these 3 things:
1. ✅ Lead status is `142` or `79190542` (Won)
2. ✅ Lead has a price/amount > 0
3. ✅ Custom field `1119699` (Course Type) is filled with one of: `671757`, `865965`, `865967`

### Why is "Sifatsiz lidlar" showing 0?

Check these 2 things:
1. ✅ Lead has `loss_reason_id` set (marked as lost in amoCRM)
2. ✅ The `loss_reason_id` matches one of the NOT_QUALIFIED_REASON_IDS listed above

### Why is "Haftalik tushum" showing 0?

Check Google Sheets:
1. ✅ Sheet named "Asosiy" exists
2. ✅ Column A has dates in the current week
3. ✅ Column E has revenue amounts
4. ✅ Date format is recognized (try: YYYY-MM-DD or DD.MM.YYYY)

---

## How to Find Your Custom Field IDs in amoCRM

1. Go to amoCRM → Settings → Custom Fields
2. Click on the field you want to check
3. Look at the URL - it will contain the field ID
   - Example: `https://yourcompany.amocrm.ru/settings/fields/123456/edit`
   - The field ID is `123456`

## How to Find Enum IDs for Dropdown Fields

1. Go to Settings → Custom Fields
2. Open the dropdown/select field
3. Each option has an enum_id
4. Use browser DevTools (F12) → Network tab when saving to see the IDs

Alternatively, use the amoCRM API to fetch field details.
