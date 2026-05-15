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
      <h1 class="title">{{ title | default: "Knead Time" }}</h1>
      <p class="value value--small">{{ summary }}</p>
    </div>
    <div class="stack stack--end">
      <span class="label">{{ ready_label }}</span>
      <span class="title title--small">{{ ready_time }}</span>
    </div>
  </div>

  {%- assign now_unix = "now" | date: "%s" | plus: 0 -%}
  {%- assign current_index = -1 -%}
  {%- for step in steps -%}
    {%- assign step_at = step.at_unix | plus: 0 -%}
    {%- if step_at <= now_unix -%}{%- assign current_index = forloop.index0 -%}{%- endif -%}
  {%- endfor -%}
  {%- assign last_index = steps.size | minus: 1 -%}

  {%- if current_index == last_index -%}
    {%- assign featured = steps | last -%}
    <div class="panel panel--filled">
      <span class="label">{{ labels.done }}</span>
      <h2 class="title">{{ featured.title }}</h2>
    </div>
  {%- elsif current_index >= 0 -%}
    {%- assign featured = steps[current_index] -%}
    <div class="panel">
      <span class="label">{{ labels.now }}</span>
      <h2 class="title">{{ featured.title }} · {{ featured.time }} ({{ featured.duration }})</h2>
      <p class="value value--small">{{ featured.description }}</p>
    </div>
  {%- else -%}
    {%- assign featured = steps | first -%}
    <div class="panel">
      <span class="label">{{ labels.next }}</span>
      <h2 class="title">{{ featured.title }} · {{ featured.time }} ({{ featured.duration }})</h2>
      <p class="value value--small">{{ featured.description }}</p>
    </div>
  {%- endif -%}

  <table class="table">
    {%- for step in steps -%}
      {%- assign step_at = step.at_unix | plus: 0 -%}
      <tr
        class="{% if step_at < now_unix and forloop.index0 < last_index %}row--muted{% endif %}{% if step.is_ready %} row--bold{% endif %}"
      >
        <td class="value value--tnum">{{ step.time }}</td>
        <td class="value value--tnum">{{ step.date }}</td>
        <td class="value">{{ step.title }}</td>
        <td class="value value--tnum">{{ step.duration }}</td>
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

## What gets sent

The webhook payload is a `merge_variables` object:

| Field                          | Type    | Notes                                                                |
| ------------------------------ | ------- | -------------------------------------------------------------------- |
| `title`                        | string  | App title, localized.                                                |
| `summary`                      | string  | `6 × 280 g · 70 % · Fresh yeast · Cold ferment` — already formatted. |
| `ready_label`                  | string  | "Ready by" in the user's locale.                                     |
| `ready_time`                   | string  | Pre-formatted, no commas.                                            |
| `ready_time_unix`              | number  | Unix seconds.                                                        |
| `steps`                        | array   | One entry per schedule step.                                         |
| `steps[].title`                | string  | Localized step name.                                                 |
| `steps[].description`          | string  | Localized, interpolated.                                             |
| `steps[].date`                 | string  | Short localized date.                                                |
| `steps[].time`                 | string  | Localized time.                                                      |
| `steps[].duration`             | string  | "15 min" / "—" for ready.                                            |
| `steps[].duration_minutes`     | number  | Raw minutes.                                                         |
| `steps[].at_unix`              | number  | Unix seconds — for current-step math.                                |
| `steps[].is_ready`             | boolean | The final "bake" row.                                                |
| `labels.now` / `next` / `done` | string  | Featured-panel labels per state.                                     |
| `generated_at`                 | string  | ISO timestamp of when the user clicked Send.                         |
| `locale`                       | string  | `en` / `de` / `it` / `fr` / `nl` / `jam`.                            |

## Limits

- **Payload size**: free tier ≤ 2 KB, TRMNL+ ≤ 5 KB. A typical Knead Time
  recipe lands around 1.4–2 KB; longer step descriptions or many steps can
  push past the free limit.
- **Rate**: free tier 12 POST/h, TRMNL+ 30/h. You're well under unless
  you click Send dozens of times in an hour.

## Switching recipes

Edit any field in Knead Time, then click **Send to TRMNL** again. The new
`merge_variables` overwrite the old ones server-side, and your device shows
the new recipe on its next refresh.
