# Japanese Conversation Tutor skill

This directory holds a [claude.ai Agent Skill](https://support.anthropic.com/en/articles/12512180)
that turns Claude into a Japanese conversation tutor, backed by this repo's MCP server
(`src/mcp/*.controller.ts`, deployed per `DEPLOY.md` at
`https://language-learner.labone.tech/mcp`).

- `SKILL.md` — the assembled skill (YAML frontmatter + instructional body). This is the file
  claude.ai actually needs; it's assembled from `sections/01-*.md` through `sections/03-*.md`
  plus a short intro. Edit the section files for content changes and re-run the build below —
  don't hand-edit the assembled sections in `SKILL.md` (the intro paragraph and frontmatter are
  fine to edit directly).
- `sections/` — the original drafted sections (LAB-5803, LAB-5804, LAB-5805), kept as the
  source of truth for their content.
- `dist/` — build output (gitignored; see "Building the zip" below). Not committed.

## Building the zip

claude.ai's Skill upload accepts a `.zip` whose root contains `SKILL.md` (plus any bundled
scripts/resources — this skill has none, so just the one file). This repo's root `.gitignore`
excludes `dist/` globally, so the zip isn't committed to git — only the inputs (`SKILL.md`) are
versioned, and the archive is reproducible from them on demand:

```sh
mkdir -p skill/dist
cd skill && python3 -c "
import zipfile
with zipfile.ZipFile('dist/language-learner-tutor.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.write('SKILL.md', 'SKILL.md')
"
```

(Any zip tool works — `zip -j skill/dist/language-learner-tutor.zip skill/SKILL.md` is
equivalent if `zip` is installed.)

## Manual end-to-end test (cannot be done from a container)

Everything below requires a human with access to the claude.ai web UI — there is no API or CLI
path to Skills/Connectors setup, so this can't be scripted or run from CI/a container.

1. **Build the zip** (see above) and confirm it contains exactly `SKILL.md` at its root.
2. **Upload the skill**: claude.ai -> Settings -> Capabilities -> Skills -> upload
   `language-learner-tutor.zip`. Claude.ai parses the `name`/`description` frontmatter for
   skill discovery, so double check the skill shows up with the expected name after upload.
3. **Add the MCP connector**: claude.ai -> Settings -> Connectors -> Add custom connector,
   pointing at `https://language-learner.labone.tech/mcp` (Streamable HTTP transport, no auth
   — the server has no auth layer yet, see `src/mcp/mcp.strategy.ts`). Enable all 6 tools:
   `get_user_state`, `get_due_reviews`, `search_vocab`, `record_exposure`,
   `update_lesson_plan`, `log_session`.
4. **Enable the skill + connector together in a chat** and have an actual conversation:
   - Say hello in Japanese or English and confirm Claude opens with a roleplay situation
     rather than announcing a test.
   - Check that `get_user_state` gets called (visible in the connector's tool-call log) at the
     start of the conversation.
   - Converse for a few turns and confirm due vocab (if any — see "Seeding test data" below)
     gets woven into the scene rather than presented as a flashcard, and that a quality score
     eventually shows up as a `record_exposure` call.
   - Ask to practice a specific situation (e.g. "let's practice ordering coffee") and confirm
     Claude honors it over picking its own.
   - End the conversation and confirm `log_session` fires once, with a sensible `situation` and
     `summary`.
5. **Multi-session check**: start a second conversation and confirm `get_user_state` reflects
   whatever `update_lesson_plan`/`log_session` calls happened in step 4 (e.g. `activeSituations`
   includes the situation just practiced).

### Seeding test data

The server currently operates on a single hardcoded user (`HARDCODED_USER_ID = 1` in
`log-session.controller.ts`/`record-exposure.controller.ts`) with no sign-up flow, so there's
nothing extra to set up to point the connector at "a test user" — it's just the one row,
created on first write if it doesn't exist yet. If you want due reviews to show up immediately
for step 4 rather than needing a full SM-2 interval to elapse, call `record_exposure` directly
(e.g. via `curl` against the `/mcp` endpoint, or through the connector once added) with a low
quality score (0-2) — that schedules a short interval and the word will show up as due again
soon. `seed-data/` has the vocab bank backing `search_vocab`/`get_due_reviews` if a broader seed
is needed.

## What's already been verified (not a substitute for the manual test above)

- `SKILL.md` has valid YAML frontmatter (`name`, `description`) and every backtick-quoted tool
  name in the body (`get_user_state`, `get_due_reviews`, `search_vocab`, `record_exposure`,
  `update_lesson_plan`, `log_session`) matches a tool actually registered in
  `src/mcp/*.controller.ts` — confirmed via the server's live `tools/list` response.
- All 6 tools were called directly against the deployed server (via SSH to the Dokku host and
  curl against the Streamable HTTP `/mcp` endpoint on localhost, since
  `language-learner.labone.tech` doesn't resolve from inside this task's container — DNS, not
  an app issue) and returned correct-looking responses: `get_user_state`,
  `get_due_reviews`, `search_vocab` round-tripped real data; `record_exposure`,
  `update_lesson_plan`, `log_session` wrote successfully and were verified then cleaned back up
  (the lesson-plan/session test rows used a clearly-named `skill-verification-smoke-test`
  situation, removed afterward via `remove_situations`).
- What this does *not* cover: an actual multi-turn conversation exercising the skill's
  judgment calls (tone, situation variety, when to grade a 3 vs a 4, when a lesson-plan update
  is warranted) — that's what step 4 above is for.
