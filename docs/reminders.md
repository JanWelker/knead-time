# Step reminders

A notification for every hands-on step of a plan, at its time, with the app closed. It is the one thing Knead Time cannot do on its own: iOS suspends a backgrounded web app's JavaScript and only wakes its service worker for a **server-sent push**, so a reminder at 03:00 needs a server to send it ([issue #306](https://github.com/JanWelker/knead-time/issues/306)). That server is the reminder service under [`push/`](../push/README.md), and it hears from the app only when you tap **Remind me on this device**.

## Turning them on

1. **iPhone or iPad:** add Knead Time to the Home Screen from Safari's share sheet and open it from there. A Safari tab cannot receive notifications; the app has to run standalone (iOS 16.4 or newer). Android Chrome and desktop browsers need no install.
2. Open your plan, open the actions menu and choose **Remind me on this device…**. The dialog says how many reminders the plan has left and when the first is due.
3. Tap **Set reminders**. The browser asks for notification permission, subscribes, and the schedule goes to the service. A test notification arrives at once so you know the path works.

Change the plan afterwards and it says so: the reminders belong to the plan they were set for, and an info line above the schedule offers to update them. Nothing is sent until you tap. **Turn off** in the same dialog forgets the device on the service and in the browser.

If the icon is removed from the Home Screen, iOS drops the subscription; the dialog reports that the next time it opens rather than pretending the reminders still exist.

## Which steps

Every moment the baker touches the dough: mixing a pre-ferment, prep, mix, dough into the fridge, divide, balls out of the fridge, and the bake. Not the autolyse rest, which starts on its own when prep ends, and not the room-temperature bulk, which starts where mix ends. The list is `REMINDER_KINDS` in `src/lib/push/reminders.ts`, pinned by membership.

Reminders fire at the step's start. A step the schedule had to place in the night carries a warning on the plan; its reminder fires all the same, because a reminder is what a step at 03:00 needs most.

## What leaves the device

On the tap, and only then:

| Sent                        | Why                                                                                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The push subscription       | The endpoint at Apple's, Google's or Mozilla's push service and its two keys — what the service needs to reach this device and nothing else can be reached with |
| One title and body per step | Already in your language; the service holds no copy of its own                                                                                                  |
| The time of each step       | When to send                                                                                                                                                    |
| The receipt text            | The test notification, also already in your language                                                                                                            |

Not sent: the recipe, the weights, the flour, your name, anything about the browser. Reminders are deleted a day after they are sent; a subscription with nothing pending is deleted after thirty days, or at once on **Turn off**. The service logs counts, never endpoints. It runs on a homelab at `kneadtime.k8s.wlkr.ch`; the whole thing, manifests included, is in this repository and the two homelab repositories linked from [`push/README.md`](../push/README.md).

The one-origin promise in [features.md](features.md#privacy-and-performance) stands with one more exception of the same kind as the TRMNL webhook: an explicit tap, to one named host. `e2e/self-hosted.spec.ts` still expects zero requests to any other origin on a plain visit, and `e2e/reminders.spec.ts` pins that the tap makes exactly the requests above.

## The API

The service is small enough to read; `push/README.md` lists the routes. The contract the app relies on:

- `GET /v1/vapid` returns `{"publicKey"}`, the application server key the browser subscribes with.
- `PUT /v1/schedules` takes `{subscription, receipt, reminders[]}` and **replaces** everything queued for that subscription, so an update is one call and an abandoned plan never buzzes. Reminders already in the past are dropped and counted in the reply; one more than fourteen days out is refused.
- `DELETE /v1/schedules?endpoint=…` forgets the subscription.

The service accepts subscriptions only on the push-service hosts its network policy lets it reach, refuses more than sixteen reminders per schedule, allows thirty requests a minute per client address (a `429` with `Retry-After` beyond that), and treats a `401`, `403`, `404` or `410` from a push service as the end of that subscription.

## Running it locally

```sh
cd push
docker compose up -d                        # or a local PostgreSQL; see push/README.md
export DATABASE_URL=postgresql://postgres@localhost:5432/postgres
export VAPID_PRIVATE_KEY="$(openssl ecparam -name prime256v1 -genkey -noout)"
export ALLOWED_ORIGINS=http://localhost:5173
uv run uvicorn --factory kneadtime_push.app:main --port 8080
```

Then `PUSH_ORIGIN=http://localhost:8080 npm run dev` points the app at it. A desktop Chrome on `localhost` can subscribe and receive the pushes; the service reaches Google's push service through your machine's network.
