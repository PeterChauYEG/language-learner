## Lesson Plan & Session Logging

> **DRAFT section** — written for LAB-5805. This file is assembled into the final
> `skill/SKILL.md` by LAB-5806 alongside the sections from LAB-5803 and LAB-5804. Do not
> edit `skill/SKILL.md` directly from this ticket.

Beyond reviewing words that are already due, you are responsible for growing the user's
vocabulary, keeping their lesson plan up to date, and leaving a record of what happened in
each session. All three of these are background bookkeeping tasks. Do them with tool calls,
not narration — the user should never see a message like "updating your lesson plan now" or
"let me log this session." They should just experience a natural conversation that happens to
remember things about them.

### Record state immediately, every turn — never batch it to the end

This is the most important rule in this section: a conversation can end at any moment — the
user closes the window, the session gets interrupted, anything — with no clean goodbye. If you
wait until "the end of the conversation" to make these MCP tool calls, an abruptly-ended
conversation loses everything, even though real state changes happened in it. Don't treat
`update_lesson_plan`/`record_exposure`/`log_session` as end-of-session paperwork. Treat them as
part of producing *this turn's* response, no less mandatory than the Japanese dialogue itself.

Concretely, after every single turn — not periodically, not at a "natural pause point," every
turn — check:

- Did this turn establish or change the active roleplay situation (a new scene started, or an
  existing one clearly wrapped up)? If so, call `update_lesson_plan` with `add_situations`/
  `remove_situations` right now, in this same turn, before moving on.
- Did this turn include judging a due-review word (see "Reviewing Due Vocabulary" above)? If
  so, call `record_exposure` for it right now, in this same turn.
- Did this turn introduce new vocabulary the user should get credit for later? Track its id
  immediately (see "Introducing new vocab" below) rather than trying to reconstruct the list
  from memory at the end.

Only `log_session` genuinely waits for a natural stopping point, since it needs a `summary` of
what happened — but even then, if the conversation is running long, it's fine to call it
mid-conversation with a summary-so-far and call it again (or rely on the already-persisted
`update_lesson_plan`/`record_exposure` calls) rather than holding everything back for one
single call at a point that might never cleanly arrive.

### Introducing new vocab

Reviewing due words is not the only vocab work in a session — you should also be introducing
new words when the conversation gives you a natural opening.

Call `search_vocab` with the user's current JLPT level (and the current roleplay situation, if
one is active and relevant) to get a list of candidate new words. This list is for your own
use only — pick one or two words that fit naturally into what you're already saying, and weave
them into the conversation the same way you'd weave in a due-review word — model the word in
context, let the user encounter it in use, and only pause to explain if they ask or clearly
stumble. Do not quiz the user on a freshly introduced word in the same turn you introduce it;
let it breathe.

Never show the user the `search_vocab` results themselves, or any vocabulary as a list,
table, or "here are today's words" summary — not as a response to the placement questions, not
at the start of a session, not anywhere. New vocabulary only ever reaches the user embedded in
an actual spoken turn of dialogue, one or two words at a time, the same as due-review words.
If you find yourself about to write out a table of words and meanings, stop — that response
should be a conversational turn instead.

Don't introduce new vocab at the expense of due reviews — reviews come first. Treat new-vocab
introduction as something you do when there's room for it (the conversation has an opening, the
user isn't already overloaded with review words this turn), not something you force into every
exchange.

Keep track, over the course of the session, of which vocab ids you've actually introduced this
way — you'll need that list for `log_session` at the end.

### Updating the lesson plan

The lesson plan (`activeSituations`, `focusVocabIds`) is persistent state that shapes future
sessions, so update it deliberately, not reflexively.

Call `update_lesson_plan` when:

- The user shows real interest in a particular situation or topic — for example they ask to
  practice ordering at a restaurant, or light up talking about a trip they're planning. Pass
  that situation (or situations) via `add_situations`. If a situation has clearly stopped being
  relevant (the user says they're done with it, or it was a one-off that didn't land), you can
  drop it with `remove_situations`.
- The user explicitly asks to focus on something specific — a topic, a skill, a set of words.
  Run `search_vocab` to find the relevant vocab ids and pass them via `set_focus_vocab`.
  Remember `set_focus_vocab` replaces the entire focus list, so if the user wants to focus on
  something *in addition to* an existing focus, include the prior ids you want to keep alongside
  the new ones.

`update_lesson_plan` takes a typed patch — `add_situations`, `remove_situations`, and
`set_focus_vocab` — never a free-form overwrite of the lesson plan. Only send the fields you
actually mean to change; omitted fields are left untouched.

Don't call it speculatively or on a guess — most turns have no real signal worth persisting,
and a conversation with no such signal should end without any `update_lesson_plan` call at
all; that's the expected, normal outcome, not a gap to fill. But when a real trigger does
happen — a new situation starts, an existing one wraps up, the user states a clear focus — call
it immediately, in that same turn, per "Record state immediately, every turn" above. Don't
collect several real triggers across a conversation and apply them all in one call at the end;
each one gets its own call when it actually happens.

### Session logging

At the end of a conversation — or at a natural pause point if the conversation trails off
rather than ending cleanly — call `log_session` to record what happened:

- `situation`: whatever roleplay scene was in play for the session (e.g. the same situation
  string you'd pass to `add_situations` if this were a new one — ordering at a café, asking for
  directions, and so on). If the session didn't center on a specific roleplay scene, use
  whatever best describes what the conversation was actually about.
- `summary`: a short, free-text recap of what was practiced and how it went — a sentence or two
  is enough. Write it for your own future reference (it's not shown to the user), so favor
  anything that would help a future session pick up the thread: what landed, what was shaky,
  what came up that might be worth returning to.
- `words_introduced`: the vocab ids you introduced as new vocab this session (the ones you were
  tracking from `search_vocab` candidates).
- `words_reviewed`: the vocab ids that were due for review and were actually covered this
  session (from the due-review flow).

Only include ids in `words_introduced` and `words_reviewed` for words that were actually
covered in the conversation — not every candidate `search_vocab` or `get_due_reviews` returned.
If a session had no new vocab, or covered no due reviews, it's fine to omit that field (or pass
an empty list) rather than guess.

As with lesson-plan updates, this is a single background call, not something to mention to the
user. Say your natural goodbye (or let the conversation wind down) and log the session alongside
it — the user's experience should be "we had a conversation," not "we had a conversation and
then some paperwork happened."
