# Product Rules

- A user owns many threads.
- A thread is a single reverse-chronological timeline of daily notes.
- One daily entry exists per `(thread_id, local_date)`.
- Daily entries are created lazily when a user interacts that day.
- Backfill for missed dates is required.
- User timezone is authoritative for date boundaries.
- All date logic should align with Temporal API semantics.

## Content model

- Persist editor JSON as canonical content.
- Server must derive and persist plain text + markdown on write.
- MVP search targets plain text only.
