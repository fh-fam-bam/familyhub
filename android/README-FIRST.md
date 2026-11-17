# Family Hub for Fire tablets (Android wrapper)

What it is: a thin app that opens your live Family Hub page full-screen, keeps the screen awake,
and falls back to a copy packed inside the app if there is no internet and nothing cached.
Your web page stays the real app. Uploading a new Family-Hub.html to GitHub still updates the tablet.

## One-time setup (about 10 minutes)
1. In your `familyhub` GitHub repository, upload these three things keeping the folder names:
   - the `android` folder
   - the `.github` folder (it holds `workflows/build-android.yml`)
   (Family-Hub.html is already in the repo root.)
2. Repo > Settings > Secrets and variables > Actions > New repository secret. Create the four secrets listed in SECRETS-PRIVATE.txt.
3. Repo > Actions > "Build Android app (Fire tablets)" > Run workflow.
4. When it finishes (a few minutes), open the run, download the artifact `FamilyHub-apk` (a zip containing FamilyHub.apk).
5. On the tablet: Settings > Security & Privacy > Apps from unknown sources > allow for your browser/Files app. Copy FamilyHub.apk to the tablet and tap it to install.
6. Open Family Hub once with internet. Sign in/sync as you do today.

## Updating
- Page changes: upload Family-Hub.html as usual. Nothing to rebuild.
- App changes (rare): re-run the workflow and install the new APK over the old one (same signing key, data is kept).

## Notes
- First launch starts fresh storage (it is a different app from Silk). Sign in to sync and your data comes back from Firebase.
- Voice "Talk to Add": the app now includes a voice bridge. The microphone button appears only if the tablet has a speech service (for example Google's, after you add Google services on the 2019 tablet) and the page is v31.4 or newer. The first tap asks for microphone permission. If the button does not appear, the tablet has no speech service; typing still works.
- Not tested on a real tablet yet. Test on the 2023 tablet first.

## Voice troubleshooting (2019 tablet)
- No mic button: Settings > Apps, confirm Google app / 'Speech Recognition & Synthesis by Google' are installed and updated, then reopen Family Hub.
- Button shows but says it could not hear: allow the Microphone permission for Family Hub in Settings > Apps.
- 'Network' errors: speech recognition needs internet unless you download an offline English voice pack in Google's speech settings.
