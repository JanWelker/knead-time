# Feature tour

What Knead Time does, by feature and by the version that brought it. The major version tracks the share-link schema, so a link stamped `v=7` was written by a 7.x app; every older link still reproduces its recipe, gram for gram.

## The job ticket (v7)

The app is a service that prints its own paperwork. It opens with one question set 72 px tall, _when are you eating?_, and walks through four more, each answerable in a single gesture, with the order forming beside you as a ticket stub and the Italian flag painting itself across a progress rule as you go.

The answer is a job ticket you return to: a full-screen numbered schedule you open at 07:00 with flour on your hands, the weights beside it set as a deli ticket with dotted leaders, a tear-off perforation and a double-ruled total. Every value on the ticket is a blank on a printed form; tap one and the **Adjust** order pad opens with that field under the cursor.

Anyone arriving with a share link or a saved recipe lands straight on the plan and is never asked the questions again; anyone who already knows all twelve numbers opens the pad and fills them in at once. My recipes, Community and 50 Top Pizza live in a **Recipes** rack of their own, one press from anywhere.

Which view you are on lives in the URL fragment (`#ask/<step>`, `#plan`, `#library`), so it is linkable, survives a reload and walks with the back button. The recipe query is untouched: v=7 adds no key, it only records which app wrote the link.

Two faces off one press, Anton for the signs and Archivo for the work, on warm stock in light and on the same press at night in dark.

## Home Screen and offline (v7.1)

It installs from Safari's share sheet or Chrome's install prompt and opens standalone, with its own icon and no browser chrome. A service worker precaches the whole app, so the plan and the print sheet open with no signal at all.

It does **not** send notifications, and cannot: iOS only ever wakes a web app's service worker for an incoming push message, so a reminder at 03:00 needs a server to send it, and this app has none. Use the `.ics` export for alerts that fire while the app is closed. The reasoning is in [issue #306](https://github.com/JanWelker/knead-time/issues/306).

## Flour strength and the fermentation window (v6)

Pick your flour and the schedule paints the window that flour actually tolerates. Twelve presets are shelved by what each strength is for: same-day, ~24 h, ~48 h, 48–72 h, plus a too-weak and a too-strong shelf, with the AVPN spec's W 220–380 as the outer edges. They cover Caputo (Doppio Zero, Pizzeria, Nuvola, Saccorosso, Cuoco, Nuvola Super), Dallagiovanna (Classica Oro, La Napoletana, Uniqua Blu), Le 5 Stagioni Pizza Napoletana, Polselli Classica and a generic supermarket tipo 00. Or type a W yourself.

The slider snaps to the windows Neapolitan practice uses (6, 8, 12, 16, 18, 24, 36, 48, 72 h, plus 80 h, which is the schedule's own ceiling rather than a Neapolitan figure), greys out anything that no longer fits before your bake time, and gives the longest window your flour handles well a stop of its own, marked under the rail. Change the bake time or the flour and it re-picks that window for you; a **Use best** button puts it back after you have dragged elsewhere.

W is advisory only. It predicts how long the gluten survives fermenting, **not** how much water the flour takes, so it never touches hydration, the ingredient masses or the yeast solve. Old share links predate the field and stay flour-less.

## Autolyse (v5)

When you are not using a pre-ferment, the app rests flour and water for 30 min before the salt and yeast go in: less kneading and a more extensible dough. It is on by default, including in the beginner view; experts can switch it off. Old share links predate it and reproduce their original schedule unchanged.

## Views, kneading, pre-ferments, yeast and memory (v4)

- **Beginner view**: just how many, when, how you knead and which flour, with every step explained through the schedule's short/detailed switch. Experts get the full sheet.
- **Spiral, stand-mixer or hand kneading**, each adapting the mix step and the water temperature to how efficiently it works the dough.
- **Combined pre-ferments**: biga and poolish maturing in parallel, each with its own flour share and an optional cellar temperature.
- **Dry yeast**: instant and active dry alongside fresh and sourdough.
- **Cold ball proof**: divide first, then the balls ripen in the fridge.
- **Recipe memory**: the app restores your last recipe on a fresh visit and keeps a device-local recipe book.

## Outputs

- **Schedule**: a numbered timeline with the in-progress step marked, a short or detailed explanation under every step, and a note wherever a pizzeria recipe's own timing differs from the computed one.
- **Ingredients**: a deli ticket in grams, split into pre-dough, main dough and totals when a pre-ferment is in play, with the flour row named after the bag you chose.
- **Calendar**: one `.ics` event per step, with the same ingredient list and method as the screen, so a re-export of the same bake updates rather than duplicates.
- **Print / Save as PDF**: a dedicated sheet that fits one page on A4 or Letter, reads on a black-and-white printer, and carries a QR code back to the recipe.
- **Share link**: the whole recipe in a compact query string. Every version only ever adds keys, so old links keep resolving.
- **TRMNL**: pushed to an e-ink display from your browser. Setup in [trmnl-setup.md](trmnl-setup.md).

## Privacy and performance

Everything is served from one origin: no backend, no analytics, no CDN, no font server. The two typefaces (Anton and Archivo, both SIL Open Font License 1.1, shipped via the Fontsource packages) are self-hosted alongside the app. The single outbound request is the TRMNL webhook, on an explicit click. A browser test (`e2e/self-hosted.spec.ts`) fails if anything else ever reaches for another host.

The app ships as one bundle and one stylesheet: a visit is five requests, the page, the bundle, the stylesheet and the two font subsets it needs.
