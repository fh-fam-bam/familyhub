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

### v39.6 – Stage 6: parent actions on the wall tablet
- **Parent mode:** on the wall tablet's Parent screen, a parent can approve chores and points, set statuses and use To review for **5 minutes**. A green bar shows the time left and has **Lock now**. When the time is up, the tablet locks itself and goes back to the wall display.
- **6a, wall PIN:** a parent sets a 6–8 digit wall PIN in Parent > Family sync > Wall tablet on their phone. Only a scrambled version (a hash) is stored, somewhere the tablet can't read. The database checks the PIN itself, so it can't be bypassed from the tablet. After 5 wrong tries the tablet waits a minute.
- **6b, "Unlock from my phone":** the tablet sends an unlock request. A parent's phone with Family Hub open shows "🔓 Unlock wall tablet?" with Approve and Ignore. Approve opens a 5-minute session. The database checks that a parent approved it and that it hasn't expired.
- **Limits while unlocked:** the tablet still can't read parent care items, PIN hashes, private settings or accounts. A medicine marked on the tablet still goes through the kids' path, and the tablet never sends its own copy of the Household list or device settings.
- **Rules:** database rules for unlock requests, unlock sessions and the wall PIN, plus 29 new rule tests (91 in total) and an end-to-end parent-mode test.

### v39.7 – Stage 7: kids' progress pages
- **"This week" card** under each kid's name on their page:
  - **Meter:** Done ÷ (Done + Missed), in the kid's own colour, with marks at 60% and 85%. Excused doesn't count. Made up counts as Done. Chores, routine steps and the kid's pet-care shifts are included.
  - **Zones:** 🌟 Great week (85%+), 👍 On track (60–84%), 💪 Needs a push (under 60%). There are no sad faces or scolding words.
  - **Today's result**, and a **7-day row of dots**, one per day, coloured by that day's result.
- **Animations:** a star burst and a smooth fill when something is marked Done, and a gentle dip of the meter when something becomes Missed. They only move and fade (no heavy effects), use 3 stars instead of 6 on Fire tablets, and switch off for "reduced motion".
- **Plant:** it grows a little on each day the kid was On track or better, blooms after 5 good days, and droops slightly after a Needs-a-push day. Parents can turn it off in Parent > Family sync > Kids' progress pages.
- **Weekly reset:** the week starts fresh every Monday. On parent phones, ◀ ▶ shows earlier weeks (up to 8 back, from what that phone has saved). Days before the family's start date show as "not counted".
- **Fix (from Stage 4):** marking an already-approved chore as Missed no longer turns it into "Made up". Only a make-up the kid actually sent in becomes Made up.

### v39.8 – Stage 8: parents' summary
- **Summary cards:** on parent phones, the Home screen shows a small card per child under "To review", in the child's colour: this week's percentage, its zone, and how many were missed and excused.
- **History:** tapping a card opens that child's history:
  - the This week meter, with ◀ ▶ for earlier weeks
  - each day with every item's status and reason ("Excused · Sick · by Monica", "Missed · not done by the end of the day", "waiting for approval"), with a ⋯ button to change it
  - "Changes this week": old → new status, who made the change and when
- **Wording:** single days now read "Great day" instead of "Great week". Days before tracking started read "Not counted".
- **Tablet:** the wall tablet shows no summary cards and can't open the history.

### v39.9 – Stage 9: a tidier Parent area (the parent's choices)
- **New "📱 This phone" screen** (button at the top of the Parent area): device type, return to Home after idle, night dimming, light/dark, Family sync sign-in and connection check, AI helper without the PIN, and Display effects. These only change the device in your hand.
- **To review now also holds:**
  - a "Send a note to the other parent" box
  - "↩️ Recently approved", to undo an approval
  - "😕 Tough days", when a child picked Tough in the last 3 days
- **Each child's history page** shows the mood they picked for each day.
- **Removed from the Parent area:**
  - the older chore editors ("Add a chore or task", "Manage tasks"), replaced by one "Open the Chore Manager" button; the "Add a chore" quick action opens it too
  - the family-wide Status history (each child's history page has it)
  - the Medicine due tile (Care covers it)
  - the "ask" part of the AI helper box (the ✨ AI button does it; the address setup stays)
  - the Kids' account email field (existing settings keep working)
  - the Rewards trial section once the trial is over
- **Merged:** "Challenges" (Family + Team challenge) and "Chores & progress" (Chore statuses + Kids' progress pages).
- **Cloud backup:** the full cloud backup button is now in **Backup**.
- **Kept, as asked:** Parent PINs, Change PIN and Lock (now in one "PIN and lock" section).
- **Fix:** the "No backup downloaded yet" reminder is back in the Parent area. v39.5 had dropped it by mistake.
- **iPhone bottom menu:** it now scrolls only left and right. It can no longer be pushed up or down, and its height now includes the iPhone's home-indicator gap, so the icons are never cut off.
- **Sign-in message:** after signing in, a clear message stays on screen until you tap OK, or for about 10 seconds. While Google sign-in finishes it says "⏳ Finishing Google sign-in…". Then it says "✅ You're signed in with Google as …", with what happens next: Parent account / waiting for a parent to approve / wall display. Cancelled or failed sign-ins also show a message.

## v40 – visual refresh

### v40.0 – new look (design from Gemini, adapted to fit the app)
- **Colours:** new light and dark colours with stronger text contrast. There are two new themes. **Pastel** is soft and light. **Techno** is dark with cyan.
  - Choose them for the whole phone in 📱 This phone, or for one person's page in Customize, which now has theme buttons.
  - Each new theme is built on top of light or dark, so every screen that already adapts to dark mode keeps working.
- **Line icons:** they replace the emoji in the menu, the top buttons (AI, camera, light/dark), To review, ⋯, the status chips and the calendar event types.
  - The Household icon was redrawn as a clipboard, because Gemini's version looked like the Parent lock.
- **Avatar art:** new art for all 9 avatar packs × 6 levels, in the Chores & Wins card and on the kids' buddy card.
- **Plant:** new plant pictures for stages 0–7, plus a droopy stage 3. The pot uses the child's colour.
- **Classic emoji:** Parent › **Look** switches everything back to the old emoji. Moods and celebrations always stay emoji.
- **Patterns and cosmetics:** background patterns are lighter. Gemini's star and wave patterns had a broken address and are fixed. The cosmetic frames and glows no longer use heavy shadows, which is easier on the Fire tablet.
- **Wall display:**
  - text is about 10% larger, with bolder, darker headings and more space between rows
  - each child's chore card has a thick bar in their colour
  - rows no longer squeeze into each other, and the clock and date stay on one line
- **Idle screen:** the clock, date and info pills always have a dark backing, so bright photos never wash out the text.
- **Kid pages:** on phones the person switcher is one row that scrolls sideways, and there's a one-line legend under the 7-day dots.
- **Not used from Gemini's code:** its separate theme-switch script (it would have fought the existing per-person theme settings), and its plain dark-mode selector (it would have broken Pastel on phones set to dark mode).

### v40.3 – Spin page fits the phone
- **Fix:** on iPhone the Spin page was zoomed out, with the page squeezed to one side. The long "No repeats" checkbox line couldn't wrap, which made the page wider than the screen. Checkbox lines now wrap on every page.

### v40.2 – iPhone bottom bar fix
- iPhone: the bottom bar no longer stays stuck in the middle of the screen after typing (for example after signing in). When the keyboard closes, the page is nudged so iOS puts the bar back at the bottom.

### v40.1 – easier Google sign-in for the second parent
- **Google button in Family sync:** "Sign in with Google" now also shows in Family sync (📱 This phone) whenever a parent phone isn't signed in, not only on the locked Parent screen.
- **One-tap switch:** a parent phone still on the old shared family login shows **"Use my own Google account"**, both on the locked Parent screen and in Family sync. It switches that phone to the person's own Google account. Nothing saved on the phone is lost.
- **Safeguard:** if the Google account picked has the same email as the shared login, the app stops before contacting Firebase and changes nothing. Signing in with Google using the shared login's address could otherwise remove that login's password.
- **Tidier forms:** the tablet-account and sign-in forms have their labels above the boxes.
- **Fix:** "Sign out" on the 📱 This phone screen did sign out, but the screen didn't update, so it looked like nothing happened. The screen now refreshes straight away.
