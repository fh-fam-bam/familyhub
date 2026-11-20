# Firestore rules tests

Runs `firestore.rules` against the local Firestore emulator (needs Node and Java). Nothing touches the real database. Run from the repo root:

```
npm install --no-save firebase-tools@13.29.1 @firebase/rules-unit-testing@3.0.4 firebase@10.12.2
npx firebase emulators:exec --only firestore --project demo-fh "node tests/rules.test.js"
```

## End-to-end care migration test

Runs the old v38.25 app and the current app in a headless browser (Playwright) against the emulator: an old parent phone and the tablet sync care data the old way, a v39 parent phone migrates it, and the tablet must lose every parent care item and get "403" when it asks for them directly.

```
npx firebase emulators:exec --only firestore --project family-hub-e8690 "node tests/e2e-care.test.js"
```
