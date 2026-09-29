# syntax=docker/dockerfile:1
# The runtime is distroless: Debian 13's Python and libc, no shell, no package
# manager. Its interpreter is Debian's 3.13 at /usr/bin/python3, so the build
# stage has to resolve wheels for the same minor. See README.md, Tooling.
FROM ghcr.io/astral-sh/uv:python3.13-trixie-slim@sha256:520ead6668d302a3d307d63e3b2b02a3205e69f503dfc1af836d609d3ff591e0 AS build
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=0
WORKDIR /app
COPY pyproject.toml uv.lock README.md ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project
COPY kneadtime_push ./kneadtime_push
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable

FROM gcr.io/distroless/python3-debian13:nonroot@sha256:8ee214843129f43e2ebf5e0ca9f2e4e6d8292143d1b8a6787f169b5898578884
# Only the packages: the venv's own interpreter is a link into the build image.
COPY --from=build /app/.venv/lib/python3.13/site-packages /app/site-packages
ENV PYTHONPATH=/app/site-packages PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
# Fails the build when a compiled wheel does not load under this interpreter.
RUN ["python3", "-c", "import kneadtime_push.app, psycopg, psycopg_binary, cryptography.hazmat.bindings._rust, uvicorn"]
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["python3", "-m", "uvicorn", "--factory", "kneadtime_push.app:main", "--host", "0.0.0.0", "--port", "8080"]
