# Feature tour

What Knead Time does, by feature and by the version that brought it. The major version tracks the share-link schema, so a link stamped `v=8` was written by an 8.x app; every older link still reproduces its recipe, gram for gram.

## All the options, where you look for them (v8.4)

The expert view is no longer hidden at the bottom of the recipe sheet ([issue #434](https://github.com/JanWelker/knead-time/issues/434)). A **Simple / All options** switch now heads the sheet, the first thing you see on opening it, and in the simple view the plan's row of values ends with a **More options…** blank that switches to all options and opens the sheet on ball weight. The view is still a device preference: nothing about it enters the recipe or the share link beyond the `md=b` a simple-view link has always carried.

## Recipes, one press away (v8.3)

**Recipes** now sits in plain sight instead of only inside the menu ([issue #437](https://github.com/JanWelker/knead-time/issues/437)): beside **Guide me** on the plan, and beside **Skip to the plan** on the questions, so someone about to answer five questions can go straight to a recipe they already know. It is still in the menu as well.

## AVPN salt and ball-weight bands (v8.1)

The star rating now judges salt and ball weight against the AVPN disciplinare instead of its own looser bands ([issue #422](https://github.com/JanWelker/knead-time/issues/422)): 2.2–3.75 % salt (40–60 g per litre of water against 1.6–1.8 kg of flour) and 200–280 g balls. They were 2–3.5 % and 200–320 g. The disciplinare's saltiest dough no longer loses a point, and a ball over 280 g now costs a little. No gram of any recipe changes; only the rating does. Dry yeast stays as it was: instant converts at the disciplinare's 1:3, active dry at 1:2.5, a distinction the disciplinare does not make.

## No fridge, for the AVPN dough (v8)

**Keep it out of the fridge (AVPN)**, at the head of the proof group in the recipe sheet, keeps the whole ferment on the counter whatever the window ([issue #422](https://github.com/JanWelker/knead-time/issues/422)). Without it a window of 16 h or more still goes to the fridge. The AVPN disciplinare ferments its dough 12–24 h at room temperature or in an 18–20 °C cabinet and never mentions a fridge, so before this a 24 h AVPN dough could only be planned as a cold one. With it, that dough solves to 1.2–1.7 g of fresh yeast per litre at 18–20 °C, inside the disciplinare's 0.1–3 g. The fridge temperature and the cold ball proof leave the sheet while it is on, and the flour is judged on its room band.

It travels in share links as `nf=1`, which is why the major version moved: a 7.x app would ignore it and plan the fridge. Every older link reproduces its recipe unchanged. The Community rack's AVPN row now uses it, at 18 h, the middle of the disciplinare's range.

## The job ticket (v7)

The app is a service that prints its own paperwork. It opens with one question set 72 px tall, _when are you eating?_, and walks through four more, each answerable in a single gesture, with the order forming beside you as a ticket stub and the Italian flag painting itself across a progress rule as you go.

The answer is a job ticket you return to: a full-screen numbered schedule you open at 07:00 with flour on your hands, the weights beside it set as a deli ticket with dotted leaders, a tear-off perforation and a double-ruled total. Every value on the ticket is a blank on a printed form; tap one and the **Adjust** order pad opens with that field under the cursor.

Anyone arriving with a share link or a saved recipe lands straight on the plan and is never asked the questions again; anyone who already knows all eighteen values opens the pad and fills them in at once. My recipes, Community and 50 Top Pizza live in a **Recipes** rack of their own, one press from anywhere.

Which view you are on lives in the URL fragment (`#ask/<step>`, `#plan`, `#library`), so it is linkable, survives a reload and walks with the back button. The recipe query is untouched: v=7 adds no key, it only records which app wrote the link.

Two faces off one press, Anton for the signs and Archivo for the work, on warm stock in light and on the same press at night in dark.

## Home Screen and offline (v7.1)

It installs from Safari's share sheet or Chrome's install prompt and opens standalone, with its own icon and no browser chrome. A service worker precaches the whole app, so the plan and the print sheet open with no signal at all.

The page itself never schedules a notification, and cannot: iOS only ever wakes a web app's service worker for an incoming push message, so a reminder at 03:00 needs a server to send it ([issue #306](https://github.com/JanWelker/knead-time/issues/306)). The `.ics` export remains the path that involves no server at all.

## The biga and the dough, quoted separately (v7.4)

With a biga or poolish, the window card now writes the window the way Italian pizzaioli do — **Biga 14 h, then 40 h of dough** — under the wall-clock total. The flour's tolerance band is judged on the second figure: the hours after the final mix. The mills publish their windows for a direct dough, which starts fermenting at the mix, and the flour that sits through the biga's hours is the biga's own portion, not the bag the rest of the dough is made from. So the warning, the fit score, the painted band and the **Use best** re-pick all moved: Caputo Pizzeria with a 14 h biga now aims at 54 h, not 40 h. Schedules, ingredients and share links are untouched ([issue #397](https://github.com/JanWelker/knead-time/issues/397)).

## AVPN suppliers in the flour list (v7.6)

Flours whose mill appears in the AVPN's own [register of approved suppliers](https://www.pizzanapoletana.org/en/fornitori) carry **· AVPN** in the flour select ([issue #420](https://github.com/JanWelker/knead-time/issues/420)). The mark is about the mill, not a certificate for that particular bag, and it changes no calculation.

## TRMNL push removed (v7.5)

**Send to TRMNL…** is gone from the plan's actions menu, and with it the webhook, the setup guide and the Liquid template ([issue #423](https://github.com/JanWelker/knead-time/issues/423)). It proved unreliable in use, and every fix cost a round-trip with a physical device: the free tier's 2 KB payload cap, the framework's class names overriding the template's, the Full Markup slot, date math in Liquid. Share links are untouched. A plugin you set up keeps showing the last recipe you pushed until you remove it on trmnl.com; the device id the app remembered is cleared from your browser on the next visit.

## Step reminders (v7.2)

**Remind me**, the plaque on the schedule’s header band (also **Remind me on this device…** in the plan's actions menu), asks for notification permission and hands the plan's hands-on steps to the reminder service — a small server in this repository under `push/`, run on a homelab — which pushes a notification for each at its time, with the app closed. A test notification confirms the path at once; editing the plan afterwards shows an info line offering to update the reminders, and **Turn off** forgets the device again. On an iPhone the app has to be on the Home Screen first. What leaves the device, and for how long it is kept, is in [reminders.md](reminders.md).

## Flour strength and the fermentation window (v6)

Pick your flour and the schedule paints the window that flour actually tolerates. Twelve presets are shelved by what each strength is for: same-day, ~24 h, ~48 h, 48–72 h, plus a too-weak and a too-strong shelf, with the AVPN spec's W 220–380 as the outer edges. They cover Caputo (Doppio Zero, Pizzeria, Nuvola, Saccorosso, Cuoco, Nuvola Super), Dallagiovanna (Classica Oro, La Napoletana, Uniqua Blu), Le 5 Stagioni Pizza Napoletana, Polselli Classica and a generic supermarket tipo 00. Or type a W yourself.

The slider snaps to the windows Neapolitan practice uses (6, 8, 12, 16, 18, 24, 36, 48, 72 h, plus 80 h, which is the schedule's own ceiling rather than a Neapolitan figure), greys out anything that no longer fits before your bake time, and gives the longest window your flour handles well a stop of its own, marked under the rail. Change the bake time or the flour and it re-picks that window for you; a **Use best** button puts it back after you have dragged elsewhere.

W is advisory only. It predicts how long the gluten survives fermenting, **not** how much water the flour takes, so it never touches hydration, the ingredient masses or the yeast solve. Old share links predate the field and stay flour-less.

## Autolyse (v5)

When you are not using a pre-ferment, the app rests flour and water for 30 min before the salt and yeast go in: less kneading and a more extensible dough. It is on by default, including in the beginner view; experts can switch it off. Old share links predate it and reproduce their original schedule unchanged.

The mix step says how each held-back ingredient goes onto the rested dough: fresh and active dry yeast dissolved in two tablespoons of the weighed water that the prep step keeps back, instant yeast sprinkled in dry, starter spread over, and the salt scattered dry and worked in after it ([issue #407](https://github.com/JanWelker/knead-time/issues/407)).

## Views, kneading, pre-ferments, yeast and memory (v4)

- **Beginner view**: just how many, when, how you knead and which flour, with every step explained through the `Detailed` switch on the schedule's header band. Experts get the full sheet.
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
- **Reminders**: a push notification for every hands-on step, sent by the reminder service on an explicit tap. How and what in [reminders.md](reminders.md).

## Privacy and performance

Everything is served from one origin: no CDN, no font server, no third-party analytics. The two typefaces (Anton and Archivo, both SIL Open Font License 1.1, shipped via the Fontsource packages) are self-hosted alongside the app. The one request made without a click goes to the site's own visit counter, [Umami](https://umami.is/) at `analytics.k8s.wlkr.ch`, self-hosted on the same homelab as the reminder service: cookieless, and it stores no address. One other outbound request exists, and it happens only on an explicit click: the reminder service at `kneadtime.k8s.wlkr.ch` when you set step reminders. A browser test (`e2e/self-hosted.spec.ts`) fails if anything else ever reaches for another host.

The app ships as one bundle and one stylesheet: a visit is five requests, the page, the bundle, the stylesheet and the two font subsets it needs.
