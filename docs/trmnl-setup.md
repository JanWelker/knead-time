# Sending recipes to a TRMNL device

Knead Time pushes recipes to your [TRMNL](https://trmnl.com/) device via a
Private Plugin webhook. Set the plugin up once on TRMNL's side, paste the
UUID into Knead Time, and from then on every "Send to TRMNL…" click pushes
the current recipe to your device.

## One-time TRMNL setup

1. Sign in at [usetrmnl.com](https://usetrmnl.com/) and create a **Private Plugin**.
2. Set the **Strategy** to **Webhook** and pick whatever refresh cadence you like.
   The webhook URL TRMNL gives you ends in a UUID — that's the only thing
   Knead Time needs.
3. Markup is split into separate fields per view size: **Full**, **Half Horizontal**, **Half Vertical**, **Quadrant**.
   The device picks the field that matches the slot your plugin occupies.
   Paste the template below into the **Full Markup** field. If you also
   use half/quadrant slots, paste the same template into each — it'll be
   cramped at smaller sizes, but it renders; iterate from there.
   If the screen shows **"Full view not available"** even after sending a
   recipe, the markup landed in the wrong field — it must be in **Full
   Markup**, not in **Shared Markup** or one of the smaller-view tabs.

```liquid
<style>
  .kt {
    width: 100%;
    box-sizing: border-box;
    background: #fff;
    color: #000;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 22px;
    line-height: 1.25;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .kt-head { display: flex; justify-content: space-between; align-items: baseline; gap: 18px; }
  .kt-brand { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
  .kt-title { font-size: 34px; font-weight: 700; letter-spacing: -0.01em; margin: 0; }
  .kt-summary { font-size: 18px; margin: 0; }
  .kt-ready { display: flex; flex-direction: column; align-items: flex-end; text-align: right; flex-shrink: 0; }
  .kt-ready-label { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }
  .kt-ready-time { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .kt-panel {
    border: 2px solid #000;
    padding: 8px 14px;
    display: flex;
    align-items: baseline;
    gap: 14px;
  }
  .kt-panel-done { border-width: 3px; justify-content: center; padding: 14px; }
  .kt-panel-label { font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; flex-shrink: 0; }
  .kt-panel-title {
    font-size: 26px;
    font-weight: 700;
    margin: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .kt-panel-time {
    font-size: 20px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .kt-list { display: flex; flex-direction: column; }
  .kt-row {
    display: flex;
    align-items: baseline;
    gap: 16px;
    padding: 4px 0;
    border-bottom: 1px dotted #aaa;
    font-size: 20px;
    font-variant-numeric: tabular-nums;
  }
  .kt-row:last-child { border-bottom: none; }
  .kt-rt { width: 78px; flex-shrink: 0; white-space: nowrap; }
  .kt-rd { width: 130px; flex-shrink: 0; white-space: nowrap; }
  .kt-rs { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .kt-rdur { width: 150px; flex-shrink: 0; text-align: right; white-space: nowrap; }
  .kt-past { color: #888; }
  .kt-current { font-weight: 700; }
  .kt-ready { font-weight: 700; }
</style>
<div class="kt">
  <div class="kt-head">
    <div class="kt-brand">
      <div class="kt-title">{{ t | default: "Knead Time" }}</div>
      <div class="kt-summary">{{ s }}</div>
    </div>
    <div class="kt-ready">
      <span class="kt-ready-label">{{ rl }}</span>
      <span class="kt-ready-time">{{ rt }}</span>
    </div>
  </div>

  {%- assign now_unix = "now" | date: "%s" | plus: 0 -%}
  {%- assign current_index = -1 -%}
  {%- for step in st -%}
    {%- assign step_at = step.u | plus: 0 -%}
    {%- if step_at <= now_unix -%}{%- assign current_index = forloop.index0 -%}{%- endif -%}
  {%- endfor -%}
  {%- assign last_index = st.size | minus: 1 -%}

  {%- if current_index == last_index -%}
    {%- assign featured = st | last -%}
    <div class="kt-panel kt-panel-done">
      <span class="kt-panel-label">{{ l.d }}</span>
      <span class="kt-panel-title">{{ featured.t }}</span>
    </div>
  {%- elsif current_index >= 0 -%}
    {%- assign featured = st[current_index] -%}
    <div class="kt-panel">
      <span class="kt-panel-label">{{ l.n }}</span>
      <span class="kt-panel-title">{{ featured.t }}</span>
      <span class="kt-panel-time">{{ featured.tm }} · {{ featured.dr }}</span>
    </div>
  {%- else -%}
    {%- assign featured = st | first -%}
    <div class="kt-panel">
      <span class="kt-panel-label">{{ l.x }}</span>
      <span class="kt-panel-title">{{ featured.t }}</span>
      <span class="kt-panel-time">{{ featured.tm }} · {{ featured.dr }}</span>
    </div>
  {%- endif -%}

  <div class="kt-list">
    {%- for step in st -%}
      {%- assign step_at = step.u | plus: 0 -%}
      {%- assign row_class = "" -%}
      {%- if step_at < now_unix and forloop.index0 < last_index -%}{%- assign row_class = "kt-past" -%}{%- endif -%}
      {%- if forloop.index0 == current_index and current_index < last_index -%}{%- assign row_class = "kt-current" -%}{%- endif -%}
      {%- if step.r -%}{%- assign row_class = "kt-ready" -%}{%- endif -%}
      <div class="kt-row {{ row_class }}">
        <div class="kt-rt">{{ step.tm }}</div>
        <div class="kt-rd">{{ step.dt }}</div>
        <div class="kt-rs">{{ step.t }}</div>
        <div class="kt-rdur">{{ step.dr }}</div>
      </div>
    {%- endfor -%}
  </div>
</div>
```

4. Copy the **Plugin Setting UUID** from the plugin configuration page (the
   part after `/api/custom_plugins/` in the webhook URL).

## In Knead Time

1. Build your recipe.
2. Open the Actions menu → **Send to TRMNL…**.
3. Paste the UUID, click **Send to TRMNL**.

That's it. Your device picks the recipe up on its next refresh cycle. Every
time the recipe changes, click **Send to TRMNL** again from the menu.

## Troubleshooting

- **Device shows "Full view not available"** — the **Full Markup** field
  on the plugin is empty. The template above must go there, not into
  Shared Markup or a half/quadrant tab.
- **Webhook returns "Large payload received"** — your recipe exceeds the
  free-tier 2 KB cap. The encoder targets ≤ 1.6 KB for a worst-case
  cold-mode + biga recipe; if you're seeing this anyway, open an issue.
- **Webhook returns "Private Plugin not found"** — the UUID is wrong.
  Copy it again from `/api/custom_plugins/<uuid>` in the plugin's webhook
  URL.

## Payload shape

Field names are kept short on purpose — TRMNL's free tier caps webhook
payloads at 2 KB and a cold-mode recipe with a pre-ferment otherwise blows
past that with verbose JSON keys. The Liquid template above uses these names
verbatim.

| Field     | Type    | Notes                                                                |
| --------- | ------- | -------------------------------------------------------------------- |
| `t`       | string  | App title, localized.                                                |
| `s`       | string  | `6 × 280 g · 70 % · Fresh yeast · Cold ferment` — already formatted. |
| `rl`      | string  | "Ready by" in the user's locale.                                     |
| `rt`      | string  | Pre-formatted ready time, no commas.                                 |
| `l.n`     | string  | "Now" label (featured panel mid-schedule).                           |
| `l.x`     | string  | "Next" label (featured panel before the schedule starts).            |
| `l.d`     | string  | "Done" label (featured panel after the bake).                        |
| `st`      | array   | One entry per schedule step.                                         |
| `st[].t`  | string  | Localized step title.                                                |
| `st[].d`  | string  | Localized, interpolated description.                                 |
| `st[].dt` | string  | Short localized date.                                                |
| `st[].tm` | string  | Localized time.                                                      |
| `st[].dr` | string  | "15 min" / "—" for the ready row.                                    |
| `st[].u`  | number  | Unix seconds — for the current-step computation.                     |
| `st[].r`  | boolean | The final "bake" row.                                                |

## Limits

- **Payload size**: free tier ≤ 2 KB, TRMNL+ ≤ 5 KB. Knead Time targets the
  free tier — a cold-mode + biga recipe (the worst case) sits around 1.6 KB
  with the short-key encoding above.
- **Rate**: free tier 12 POST/h, TRMNL+ 30/h. You're well under unless you
  click Send dozens of times in an hour.

## Switching recipes

Edit any field in Knead Time, then click **Send to TRMNL** again. The new
`merge_variables` overwrite the old ones server-side, and your device shows
the new recipe on its next refresh.
