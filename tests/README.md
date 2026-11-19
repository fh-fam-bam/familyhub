# Firestore rules tests

Runs `firestore.rules` against the local Firestore emulator (needs Node and Java). Nothing touches the real database. Run from the repo root:

```
npm install --no-save firebase-tools@13.29.1 @firebase/rules-unit-testing@3.0.4 firebase@10.12.2
npx firebase emulators:exec --only firestore --project demo-fh "node tests/rules.test.js"
```
