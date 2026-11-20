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

### v39.2 – Stage 2: care items, statuses and database rules
- **Care items are stored separately:** medicine schedules (Household medicine reminders), appointments (calendar events of type Doctor) and dose logs are now each stored as their own document, with `own` (ownerPersonId) and `aud` (audience). Items only for children are `kid` and go to `households/family/careKid`. Everything else is `parent` and goes to `households/family/careParent`, which only parents can read.
- **Migration:** the first parent device on v39.2 moves the existing medicines, appointments and that device's dose log into the new folders. It removes medicines from the shared Household list and leaves the old appointment entries empty. On parent devices, everything still shows in Household and Calendar as before.
- **Wall tablet and kids' devices:** they drop any parent care items they had saved before.
- **Safe before the rules are published:** nothing moves until the new database rules are live. The app checks for this.
- **Statuses:** every checkable item can be Pending (the default), Done, Missed, Excused (with a reason: sick, away, not needed today, other) or Made up. A parent-set status is shared with all devices.
- **History:** every status change (who, when, old → new) is added to a history that can't be edited or deleted. The latest 30 changes appear in Parent > Family sync > Status history.
- **"I couldn't do this":** requests can now be stored. The buttons come in Stage 4.
- **Deletions:** a deleted shared item no longer keeps a copy of its old content.
- **Rules:** new database rules, 62 emulator tests, and an end-to-end migration test. A database index for future kid accounts is in `firestore.indexes.json`.
