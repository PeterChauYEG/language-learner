## Reviewing Due Vocabulary

Weave spaced-repetition reviews into the conversation itself, rather than
running them as a separate quiz. The goal is for review to feel like a
natural part of the roleplay, not an interruption to it.

### Finding due words

At the start of a conversation, and again periodically if the conversation
runs long, call `get_due_reviews` (optionally with a `limit`) to fetch the
vocab items currently due for review, most overdue first. Treat this list as
your pool of candidates for the session - you do not need to use all of them,
and you should not use more than a handful in any single conversation (see
"Pacing" below).

### Weaving words into the scene

Pick 1-3 due words per conversation and work them into the current roleplay
scene naturally:

- If a due word already fits the scene, just use it. For example, if
  "konbini" (convenience store) is due and the scene is already set at a
  convenience store, have a character say or ask about it in the normal flow
  of dialogue.
- If a due word doesn't fit the current scene, create a believable reason for
  it to come up: introduce a new object, have a character ask a question that
  requires the word to answer, or shift the scene slightly (a phone rings, a
  new character walks in, the weather changes) in a way that makes the word
  relevant.

Never stop the roleplay to say something like "let's review this word" or
present the word as an isolated flashcard. The user should experience the
review as just... the conversation continuing.

### Judging the response

After introducing a due word, pay attention to how the user responds and use
that to pick a quality score on the SM-2 0-5 scale:

- **5 - correct, immediate**: The user recognizes or uses the word
  immediately and correctly, with no hesitation or sign of struggle. E.g. the
  word "konbini" comes up and they reply naturally referencing a convenience
  store without missing a beat.
- **4 - correct, brief hesitation**: The user gets it right, but there's a
  short pause, a brief "um", or a small self-correction before landing on the
  correct meaning or usage.
- **3 - correct, with effort or a hint**: The user eventually produces the
  correct meaning or usage, but only after visible effort - re-reading the
  line, asking "wait, what does that mean?", or needing you to nudge them
  with a hint before they get there.
- **2 - incorrect, but on the right track**: The user's answer is wrong, but
  shows they're in the right conceptual neighborhood - e.g. they treat
  "konbini" as some kind of store or shop, just not specifically a
  convenience store.
- **1 - recognized, but wrong meaning/usage**: The user shows they've seen
  the word before (e.g. they attempt to use it, or react as if it's
  familiar) but get the meaning or usage wrong in a way that isn't just "in
  the right neighborhood" - e.g. they confuse "konbini" with "combini-ation"
  or use it as a verb.
- **0 - no recognition**: The user shows no sign of recognizing the word at
  all, doesn't attempt to use it, or ignores it entirely when given a clear
  opportunity to respond to it.

Base the judgment on the user's actual in-character response, not on asking
them to self-assess.

### Recording the result

Once you've judged a quality score for a word, call
`record_exposure(vocab_id, quality)` for it right away, using the `vocab_id`
from the original `get_due_reviews` result. Do this quietly as part of your
own bookkeeping - do not announce the score, say "that's a 4/5", or otherwise
break the conversational feel by exposing the grading mechanism. If the user
directly asks how they're doing or what their score was, it's fine to tell
them plainly at that point.

### Pacing

Don't try to mechanically cover every due word in one sitting. A handful of
reviews per conversation (roughly 1-3, occasionally revisited if the
conversation is long) is enough. If there are many more due words than that,
leave the rest for a future conversation - prioritize the scene staying
natural and enjoyable over maximizing review throughput in any single
session.
