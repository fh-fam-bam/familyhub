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

### v39.2.1 – Google sign-in that works from the home-screen icon
- **Home-screen fix:** "Sign in with Google" now goes to Google in the same window and comes back to the app, then hands Google's answer to Firebase. This works in iPhone home-screen apps, where Firebase's pop-up sign-in never reported back and the app stayed on "Opening Google sign-in…".
- **One public setting:** the Web client ID from Firebase > Authentication > Google > Web SDK configuration is now set in the app (`GOOGLE_CLIENT_ID`). The app address is allowed in Google Cloud > Google Auth Platform > Clients.
- **No more hanging:** the pop-up sign-in gives up after 25 seconds with a clear message.

### v39.3 – Stage 3: Care section by role
- **New Care section** (💊 in the menu): each person's medicines, today's dose and the next 30 days of Doctor appointments.
- **Parent phones:** Care shows everyone. "+ Add medicine", "+ Add appointment" and Edit open the existing Household and Calendar editors, with the type already chosen. Parents can mark a dose Taken or Skip it.
- **Wall tablet and kids' devices:** Care shows only Julian and Emilio, with no add or edit buttons.
- **Kids marking doses:** a child taps "I took it" on the tablet. The dose counts at once, with no waiting for approval, and is saved as kid-marked, needing review. Parents see "Julian marked it on the tablet · needs review" and can tap **Looks good**. The parent phone then moves the medicine on to its next date.
- **"Care today" cards:** on the Home screen and the wall display. The wall shows the kids only.

### v39.4 – Stage 4: statuses everywhere and automatic end of day
- **A "⋯" button next to every check-off:** chores, to-dos, routine steps, pet chores, pet-care shifts and medicine doses (in Care and in Household).
  - Parents: Done, Missed, Excused (Sick, Away, Not needed today, Other) and Back to pending.
  - Kids: "I couldn't do this", with an optional reason. It goes to the parents, who can Excuse it, mark it Missed or Dismiss it (for now in Parent > Family sync; it moves to "To review" in Stage 5).
- **Status chips:** items show a small Missed / Excused · reason / Made up / Sent to a parent chip.
- **Automatic end of day:** at the cut-off time (default 9:00 PM, set in Parent > Family sync > Chore statuses), a parent device marks everything still Pending as Missed. A medicine dose that wasn't marked is recorded as missed and moves on to its next date. Done and Excused are left alone, and recurring items start fresh the next day. It only counts from the day v39.4 first runs, so older days aren't marked.
- **Make-up:** on a kid's page, "Make up a missed chore" lists chores missed earlier the same week (Monday to Sunday). The kid sends one in for half points, and once a parent approves it, it shows **Made up**.
- **Points:** Missed doesn't take points away by default. The new setting "Missed chores cost points" (off by default) takes the chore's points away when it's marked Missed, and gives them back if it's changed to Excused or Done.

### v39.5 – Stage 5: "To review" inbox for parents
- **One button:** "📥 To review", with a count badge, at the top of the Home screen on parent devices. The Parent menu badge uses the same count.
- **Everything waiting, in groups:**
  - chore approvals (points can be changed, plus Half / +1 / Send back as before)
  - reward requests
  - kids' calendar suggestions
  - family board requests
  - AI suggestions
  - doses a child marked on the tablet
  - items the end of day marked Missed
  - "I couldn't do this" requests
  - "Needs a quick look" events in the next 7 days, from Care, Activities and Calendar (no driver chosen yet, or newly added from a synced calendar)
  - notes from the other parent
- **Actions:** each item has a one-tap Approve / OK / Looks good / Got it, Excuse for missed items, and Change. Each group has "Approve all" (or OK all / All look fine / Got them all / Excuse all). Handled items leave the list.
- **Moved out of the Parent area:** the approval sections (Waiting for approval, Reward requests, Calendar change requests, Board requests, AI suggestions) are gone from the Parent area. Its "Needs you" tiles are now one To review tile plus Medicine due. "Recent approvals" (undo an approval) and sending a note to the other parent stay there for now; Stage 9 reviews them.
