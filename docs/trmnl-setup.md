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
3. Paste the markup template below into the plugin's **Markup** editor and save.

```liquid
<div class="layout layout--col gap--medium">
  <div class="row row--space-between">
    <div class="stack stack--start">
      <h1 class="title">{{ t | default: "Knead Time" }}</h1>
      <p class="value value--small">{{ s }}</p>
    </div>
    <div class="stack stack--end">
      <span class="label">{{ rl }}</span>
      <span class="title title--small">{{ rt }}</span>
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
    <div class="panel panel--filled">
      <span class="label">{{ l.d }}</span>
      <h2 class="title">{{ featured.t }}</h2>
    </div>
  {%- elsif current_index >= 0 -%}
    {%- assign featured = st[current_index] -%}
    <div class="panel">
      <span class="label">{{ l.n }}</span>
      <h2 class="title">{{ featured.t }} · {{ featured.tm }} ({{ featured.dr }})</h2>
      <p class="value value--small">{{ featured.d }}</p>
    </div>
  {%- else -%}
    {%- assign featured = st | first -%}
    <div class="panel">
      <span class="label">{{ l.x }}</span>
      <h2 class="title">{{ featured.t }} · {{ featured.tm }} ({{ featured.dr }})</h2>
      <p class="value value--small">{{ featured.d }}</p>
    </div>
  {%- endif -%}

  <table class="table">
    {%- for step in st -%}
      {%- assign step_at = step.u | plus: 0 -%}
      <tr
        class="{% if step_at < now_unix and forloop.index0 < last_index %}row--muted{% endif %}{% if step.r %} row--bold{% endif %}"
      >
        <td class="value value--tnum">{{ step.tm }}</td>
        <td class="value value--tnum">{{ step.dt }}</td>
        <td class="value">{{ step.t }}</td>
        <td class="value value--tnum">{{ step.dr }}</td>
      </tr>
    {%- endfor -%}
  </table>
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
