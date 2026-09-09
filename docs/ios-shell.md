# Step reminders on iOS

Knead Time is a plan you live inside for two days, and the one thing it cannot do
from a browser is tell you when a step is due. This document is the bridge that
fixes that, the constraints around it, and what building the native side
actually involves.

## Why this exists

[#306](https://github.com/JanWelker/knead-time/issues/306) settled that the
reminder half of a PWA is not buildable client-side, and not for want of trying:

- iOS **suspends a backgrounded web app's JavaScript**, so a `setTimeout` for a
  step eight hours out never runs.
- It wakes a service worker for **exactly one thing** — an incoming push
  message, which requires a server to send.
- **Notification Triggers** (`TimestampTrigger`/`showTrigger`), the one web API
  that would let a page hand the OS a "fire this at 06:40" instruction, was
  removed from Chromium and never existed in Safari.

So a reminder at 03:00 needs a backend. Knead Time does not have one, and the
one-origin promise exists precisely to avoid ever needing one.

[#309](https://github.com/JanWelker/knead-time/issues/309) is the way out that
keeps that promise: a thin native shell whose only screen is a `WKWebView`
loading the bundled static build, and a script-message handler the page posts its
step times to. Swift turns them into `UNCalendarNotificationTrigger` requests and
the OS fires them with the app closed, killed, or the phone in a drawer. **No
server, no push, no network.**

This fits the schedule model unusually well: `computeSchedule` is deterministic
and returns every step time up front, so the whole plan is scheduled in one pass
the moment the recipe changes.

## What ships today

The web half, in `src/lib/native/`. It is inert in every browser — `nativeBridge()`
returns null, no menu item is rendered, and nothing is ever posted — so it is
live on the site right now and invisible there.

The Swift shell is not in the tree yet. Everything below the wire format is what
building it involves.

## In the app

Inside the shell: **Menu → Step reminders… → Turn on reminders**, answer the iOS
prompt, and the dialog reports how many are scheduled. The permission is only
ever requested from that press — iOS gives an app exactly one prompt, ever, and
spending it on a cold launch is how you end up permanently denied. If it is
refused, the dialog says so and points at Settings, and every other part of the
app carries on unchanged.

## Which steps get one

The steps where the baker has to be at the counter — `preferment-mix`, `prep`,
`mix`, `divide` — plus `ready`, the bake itself. Everything else is dough sitting
still: the autolyse rest and the proof legs get nothing, because the baker has
already walked away from them.

That list is `REMINDED_KINDS`, and it is deliberately its own set rather than a
call to `isActiveStep()`, even though the two agree today and a test pins that
they do. `isActiveStep` exists for UI affordances; `schedule.ts` already keeps a
second, wider set for the night-window guard. Retuning which step gets a bold row
on screen must not silently change what wakes someone up.

## Night steps

A step falling in `[22:00, 08:00)` still fires **at its real time** — the dough
does not wait — but silently. On the Swift side that is `sound = nil` **and**
`interruptionLevel = .passive`: a nil sound alone still lights the screen and
counts as an interruption, which is not what "silent" is supposed to buy here.

The schedule already refuses to place work in that window where it can, and
raises a `night-step` warning where it cannot. A reminder should not be louder
than the plan that produced it. The dialog says this in advance, because an alert
that arrives without a sound at 23:40 reads as broken otherwise.

## Wire format

Page → shell, via `window.webkit.messageHandlers.kneadtime.postMessage`. Every
message carries `v: 1`, because the shell ships through App Review while the web
app deploys in three minutes — a months-old shell will meet a fresh page.

| `type`          | Fields                  | Notes                                                                      |
| --------------- | ----------------------- | -------------------------------------------------------------------------- |
| `hello`         | —                       | Sent once on mount. The shell answers with its state.                      |
| `permission`    | —                       | Request authorization. Only ever from an explicit press.                   |
| `reminders`     | `reminders: Reminder[]` | The **complete** set. Cancel everything pending, then add these.           |
| `reminders-off` | —                       | Cancel everything pending.                                                 |
| `print`         | `url`                   | Render that route offscreen and hand it to `UIPrintInteractionController`. |
| `ics`           | `filename`, `text`      | Write to a temp file and offer it through the share sheet.                 |
| `copy`          | `text`                  | `UIPasteboard.general.string`.                                             |

A `Reminder`:

| Field    | Type    | Notes                                                                                    |
| -------- | ------- | ---------------------------------------------------------------------------------------- |
| `id`     | string  | `stableUid(step)` — the same identity the calendar event carries.                        |
| `at`     | number  | Epoch **milliseconds**. The wire stays dumb; the shell owns the timezone decision.       |
| `title`  | string  | The step's own title, already localized.                                                 |
| `body`   | string  | What the step puts on the scale, then what to do with it. Same text as the `.ics` event. |
| `silent` | boolean | The step is in the night window.                                                         |

Shell → page, via `evaluateJavaScript`:

```js
window.kneadtime?.onState({ permission: 'granted' | 'denied' | 'unknown', pending: 6 });
```

This is a call the shell can make unprompted, rather than a reply to one message,
because it **must** be able to volunteer a change: the user can revoke
notifications in Settings, and the shell only learns that when it returns to the
foreground. `pending` is what lets the dialog state a number rather than hope.

## Limits

- **64 pending notifications per app**, and iOS drops the excess _silently_ — no
  error, no callback. The cap is enforced on both sides of the bridge, because
  whichever side forgets, the user simply stops being reminded. The real worst
  case today is six: biga and poolish in parallel gives two pre-ferment mixes,
  prep, mix, divide and ready.
- **Silent is not suppressed.** A `.passive` notification is still delivered and
  still visible in Notification Centre; it just does not make a sound or wake the
  screen. Focus rules still apply on top.
- **Replacement is not transactional.** `UNUserNotificationCenter` has no
  transaction, so a process kill between the cancel and the last add leaves the
  user with _fewer_ reminders, never stale ones. That is the safe direction:
  silence, not a 03:00 buzz for a dough that no longer exists.
- **A step already in the past is never scheduled.** iOS fires a trigger for
  "now" immediately, so the page drops anything at or before the current instant.

## Turning it off

The in-app toggle posts `reminders-off` and the shell cancels everything pending.
Switching notifications off in iOS Settings works too — the shell notices on its
next foreground and the dialog updates. Deleting the app takes the pending
requests with it.

## Troubleshooting

- **No "Step reminders…" in the menu.** You are in a browser, not the shell.
  There is no host, so the item is not rendered at all.
- **Nothing fires.** Settings → Notifications → Knead Time.
- **Nothing at night.** By design — see above.
- **The reminders changed after I edited the recipe.** They are _replaced_, not
  added to. That is the feature: the old plan's reminders are exactly what you
  do not want at 03:00.

## Building the shell

Not in the tree yet. What it involves, in the order the surprises arrive:

1. **Serve the bundle from a custom scheme, not `file://`.** WKWebView gives
   `file://` an opaque origin: `localStorage` throws, so the app forgets your
   recipes, language and theme on every launch; `history.pushState` throws, which
   is the app's entire navigation; and `loadFileURL` rejects a URL carrying a
   query string, which is what a recipe _is_. A `WKURLSchemeHandler` at
   `kneadtime://localhost/` gets a real, stable origin. The host `localhost` is
   load-bearing rather than decorative: it is what makes the origin a _secure
   context_, which keeps `navigator.clipboard` and `crypto` alive.
2. **Path resolution.** `""` → `index.html`; an existing file; then `path +
".html"` (the static adapter emits `print/en.html`, not `print/en/index.html`);
   then `path/index.html`; else `404.html` — answered with **HTTP 200**, because
   SvelteKit's fallback is a full app shell that hydrates and reads the URL
   itself. Build with `BASE_PATH=` explicitly empty.
3. **Bridge the three things a WKWebView breaks.** `window.open` returns null and
   there is no print UI at all; a blob-URL download never reaches a download
   delegate, so the `.ics` anchor click does nothing whatsoever; the clipboard
   usually works but is worth a fallback. The page already forks on all three
   when a host is present.
4. **External links need a navigation policy.** Five components carry
   `target="_blank"` links to github.com and elsewhere. Without a
   `WKNavigationDelegate` cancelling non-`kneadtime` schemes and handing them to
   `UIApplication.open`, they either do nothing or strand the shell on another
   site with no back button.
5. **No service worker.** `navigator.serviceWorker` is undefined for a custom
   scheme; SvelteKit's registration is guarded and no-ops. It would have nothing
   to precache anyway — the whole app is already on the device.

### Constraints worth knowing first

- **The Apple Developer Program is $99/year and is a prerequisite, not a nicety.**
  A free account sideloads, but the provisioning profile **expires after 7 days** —
  useless for a schedule you set three weeks out.
- **App Store Guideline 4.2** rejects pure website wrappers. The local scheduling
  is what answers it, and it needs saying explicitly in the review notes.
  Reviewers will also test the offline claim in Airplane Mode.
- **Deploy latency changes shape.** A web fix is a three-minute Pages deploy; the
  same fix for shell users is a rebuild, an upload and 24–48 h of review.
- **The PWA is not superseded.** Android and desktop are the offline web version's
  whole story.
