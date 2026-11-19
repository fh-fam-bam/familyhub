# Family Hub change log

## v39 – profiles and roles, statuses, kids' progress (in progress)

### v39.0 – Stage 0: safety
- Version is now v39.0.
- `Family-Hub-v38.25-backup.html`: an exact copy of v38.25, to go back to if anything goes wrong.
- New parent-only button: Parent > Family sync > **Download full cloud backup**. It saves an exact copy of every document in the family database (`households/family`, its `items` and `private` folders) with all fields and timestamps. It only reads and never changes the database.
- No change to sign-in: the shared family login works exactly as before.

### v39.1 – Stage 1: accounts and roles
- Each account can have a record at `/users/{uid}` with a role (`parent`, `display`, `kid`) and a person. Only a parent can create or change these records, and a parent cannot remove their own parent role.
- **Parents:** "Sign in with Google" on the Parent screen (phones only, never on the Fire tablet). You stay signed in, and the Parent area opens with no PIN.
- **Wall tablet:** its own email + password "display" account, created by a parent in Parent > Accounts. It stays signed in and is always a wall display.
- **Kids:** a `kid` role is ready for later. It behaves like a kids' device.
- **New accounts:** a new Google account asks for approval. A parent approves it in Parent > Accounts, or can add it by its account ID.
- **Old logins:** the old shared family login and kids' login work exactly as before.
- **No built-in PIN:** the starting PIN 1234 is no longer built into the page. Devices keep the PIN they already have.
- `firestore.rules` (to publish) and `tests/` (emulator tests).
