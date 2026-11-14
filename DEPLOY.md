# Deploying `language-learner` to Dokku

## App

The Dokku app `language-learner` already exists on `10.10.30.31` with a linked
Postgres addon (`dokku-postgres-language-learner-db`). The addon link sets
`DATABASE_URL` automatically.

## Required environment variables

The app only reads two env vars (see `src/main.ts`,
`src/prisma/prisma.service.ts`):

| Var            | Value                                  | How it's set |
|----------------|-----------------------------------------|--------------|
| `DATABASE_URL` | Postgres connection string              | Set automatically by the linked Postgres addon |
| `PORT`         | `3000`                                  | Set manually (see below) |
| `NODE_ENV`     | `production`                            | Set manually (standard Node/Nest convention) |

Set/verify with:

```sh
ssh root@10.10.30.31 "dokku config:show language-learner"
```

If `PORT`/`NODE_ENV` are missing, set them:

```sh
ssh root@10.10.30.31 "dokku config:set language-learner NODE_ENV=production PORT=3000"
```

`dokku ps:report`/the Herokuish buildpack by default proxies to internal port
`5000`. Since the app is pinned to `PORT=3000` above, the Dokku port mapping
must match, or the proxy will 502 even though the process is running:

```sh
ssh root@10.10.30.31 "dokku ports:set language-learner http:<DOKKU_PROXY_PORT>:3000"
```

(`<DOKKU_PROXY_PORT>` is whatever `dokku config:show language-learner` reports
for `DOKKU_PROXY_PORT`.)

## Deploy mechanism

`.github/workflows/main.yml` runs on every push to `main` (and via manual
`workflow_dispatch`) and calls the shared
`PeterChauYEG/labone-actions/.github/workflows/node-main.yml@main` ->
`main-node-ci.yml` reusable workflow with `secrets: inherit`. After
lint/typecheck/build/test pass, the `deploy` job runs
`PeterChauYEG/labone-actions/.github/actions/deploy-dokku@main`, which does a
plain `git push` of `main` to the Dokku remote
(`ssh://dokku@10.10.30.31:22/language-learner`) using:

- `secrets.DOKKU_DEPLOY_SSH_KEY` — SSH private key authorized against the
  Dokku host's `dokku` user.

## Known blockers (as of this writing)

1. **Missing `DOKKU_DEPLOY_SSH_KEY` repo secret.** `gh secret list --repo
   PeterChauYEG/language-learner` returns no secrets at all, so the `deploy`
   job has no credential to push to Dokku with. Other repos that deploy
   successfully (e.g. `admin-web`) have `DOKKU_DEPLOY_SSH_KEY`,
   `LAB_GIT_DEPS_SSH_KEY`, and `GH_PAT` set at the repo level (this GitHub
   account is a personal account, not an org, so `secrets: inherit` has
   nothing to inherit from — every repo needs its own copy of these secrets).
   This needs to be added by whoever holds the Dokku deploy key before CI can
   deploy automatically. Until then, deploys can be done manually:

   ```sh
   git push ssh://dokku@10.10.30.31:22/language-learner main
   ```

2. **Fleet-wide CI `startup_failure` since ~2026-11-07.** Every repo using
   `labone-actions`' `main-node-ci.yml`/`node-main.yml` (not just this one —
   confirmed on `gateway-service`, `auth-service`, `ai-harness-api`,
   `payments-service`, `language-learner`) has had its `Main CI` run fail
   instantly with `conclusion: startup_failure` and zero jobs created, for
   both `push` and manual `workflow_dispatch` triggers. The last successful
   `Main CI` run fleet-wide was 2026-10-21. This predates and is unrelated to
   this ticket's env var work, and isn't fixable from this repo alone — it
   needs to be diagnosed/fixed in `PeterChauYEG/labone-actions` directly
   (first suspect: the `notify-slack-deploy` action change in labone-actions
   PR #234, landed 2026-11-05, which is the most recent change to the
   `main-node-ci.yml` deploy path and lines up with the regression window).
   A separate ticket should track that fix.

## Manual verification

```sh
ssh root@10.10.30.31 "dokku ps:report language-learner"
ssh root@10.10.30.31 "dokku logs language-learner"
```
