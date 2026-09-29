# kneadtime-push

The one server Knead Time has: it holds a device's push subscription and the
times of its hands-on steps, and sends a Web Push notification when each comes
due. What it is for, what it stores and how a phone opts in is in
[`docs/reminders.md`](../docs/reminders.md); this file is how to run it.

## Run it

```bash
cd push
uv sync                       # Python 3.13, deps and dev tools into .venv
uv run pytest                 # needs PostgreSQL: DATABASE_URL, or a local install (initdb on PATH
                              # or under /opt/homebrew/opt/postgresql@18) for a throwaway cluster
uv run ruff check . && uv run ruff format --check .
```

To run the service itself:

```bash
export DATABASE_URL=postgresql://postgres@localhost:5432/postgres   # docker compose up -d
export VAPID_PRIVATE_KEY="$(openssl ecparam -name prime256v1 -genkey -noout)"
export ALLOWED_ORIGINS=http://localhost:5173
uv run uvicorn --factory kneadtime_push.app:main --port 8080
```

and point the app at it with `PUSH_ORIGIN=http://localhost:8080 npm run dev`.

## Environment

| Variable            | Meaning                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | PostgreSQL URI; on the cluster it is the `uri` key CloudNativePG writes                       |
| `VAPID_PRIVATE_KEY` | P-256 private key, PEM. The public key is derived from it and served on `GET /v1/vapid`       |
| `VAPID_SUBJECT`     | The `sub` claim push services may contact; defaults to `https://kneadtime.pizza`              |
| `ALLOWED_ORIGINS`   | Comma-separated CORS origins; the site, and a dev server when running locally                 |
| `FORWARDED_ALLOW_IPS` | Proxies whose `X-Forwarded-For` uvicorn trusts for the client address (a CIDR is fine); unset, the peer address is the client |

## API

| Route                                | Does                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `GET /v1/vapid`                      | `{"publicKey"}` for `pushManager.subscribe`                                                   |
| `PUT /v1/schedules`                  | Replaces the schedule for a subscription; sends the receipt at once; `{scheduled, dropped, receipt}` |
| `DELETE /v1/schedules?endpoint=`     | Forgets the subscription and everything queued for it                                         |
| `GET /healthz`, `GET /readyz`        | Liveness; readiness checks the database                                                       |
| `GET /metrics`                       | Prometheus text: sent, failed, gone, subscriptions                                            |

Limits are pinned in `tests/`: 16 reminders per schedule, 14 days ahead, 120-character
titles, 500-character bodies, 16 KB bodies, endpoints on a known push service only, and
30 requests a minute per client address on `/v1/` (429 with `Retry-After`; the probes are
exempt). The address is what uvicorn reads out of `X-Forwarded-For` from a proxy listed in
`FORWARDED_ALLOW_IPS` — on the cluster the pod CIDR, since only the Gateway's Envoy reaches
the pod — and the peer address otherwise.

## Tooling

Ruff owns this directory (`.prettierignore` lists `push/`), so the repo's pre-commit
hook does not touch it; the `push` job in `ci.yml` runs the three commands above.
The image is built by `push-image.yml` on every push to `main` that touches
`push/`, tagged with the version in `pyproject.toml`, and published to
`ghcr.io/janwelker/knead-time-push`.

The runtime stage is `gcr.io/distroless/python3-debian13`: no shell and no package
manager, so there is nothing in it to patch but Python and libc. Its interpreter is
Debian's, so the build stage must resolve wheels for the same minor version; the
`COPY` names that version's `site-packages` and the import check after it fails the
build when the two drift. Debug with `python3 -c`, the only thing there is to exec.
