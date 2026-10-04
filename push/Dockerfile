# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
# The runtime is distroless: Debian 13's Python and libc, no shell, no package
# manager. Its interpreter is Debian's 3.13 at /usr/bin/python3, so the build
# stage has to resolve wheels for the same minor. See README.md, Tooling.
FROM ghcr.io/astral-sh/uv:python3.13-trixie-slim@sha256:4cf2255999bc7e6112abfdfda19492e05e1e1c2d1c6e0c5076d0e768e9925032 AS build
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=0
WORKDIR /app
COPY pyproject.toml uv.lock README.md ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project
COPY kneadtime_push ./kneadtime_push
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable

FROM gcr.io/distroless/python3-debian13:nonroot@sha256:774595d652a294b54c9bd575b2d9fdd1a4b47547dc17b8bfa4c0e953c64855b3
# Only the packages: the venv's own interpreter is a link into the build image.
COPY --from=build /app/.venv/lib/python3.13/site-packages /app/site-packages
ENV PYTHONPATH=/app/site-packages PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
# Fails the build when a compiled wheel does not load under this interpreter.
RUN ["python3", "-c", "import kneadtime_push.app, psycopg, psycopg_binary, cryptography.hazmat.bindings._rust, uvicorn"]
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["python3", "-m", "uvicorn", "--factory", "kneadtime_push.app:main", "--host", "0.0.0.0", "--port", "8080"]
