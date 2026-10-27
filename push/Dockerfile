# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
# The runtime is distroless: Debian 13's libc, no shell, no package manager.
# Python is uv's standalone build of the minor in .python-version, copied in
# whole, so the image runs the interpreter CI tests on. See README.md, Tooling.
FROM ghcr.io/astral-sh/uv:trixie-slim@sha256:95611d89b7324e0517fe7257bb00979cf1f68461e5fb2b2d027d039da054bc07 AS build
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_INSTALL_DIR=/python UV_PYTHON_PREFERENCE=only-managed
WORKDIR /app
COPY .python-version ./
RUN uv python install
COPY pyproject.toml uv.lock README.md ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project
COPY kneadtime_push ./kneadtime_push
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable

FROM gcr.io/distroless/cc-debian13:nonroot@sha256:3ee00291cf386ec52a552e6a858d555debd74776eb4bfa53fa3df2cd6677515e
# The venv's interpreter links into /python, the same path in both stages.
COPY --from=build /python /python
COPY --from=build /app/.venv /app/.venv
ENV PATH=/app/.venv/bin:$PATH PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
# Fails the build when a compiled wheel does not load under this interpreter.
RUN ["python", "-c", "import kneadtime_push.app, psycopg, psycopg_binary, cryptography.hazmat.bindings._rust, uvicorn"]
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["python", "-m", "uvicorn", "--factory", "kneadtime_push.app:main", "--host", "0.0.0.0", "--port", "8080"]
