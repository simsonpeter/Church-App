# Firebase Cloud Functions (member codes & broadcast)

The app calls **`redeemMemberCode`** (region **`europe-west1`**) when a user applies a member code on **Profile**. If this function is not deployed, the user sees an error like “Firebase Functions failed” or “function not found”.

## One-time setup

1. Install Firebase CLI: https://firebase.google.com/docs/cli  
2. From the **repository root** (folder that contains `firebase.json`):

   ```bash
   cd functions
   npm ci
   cd ..
   firebase login
   firebase use songbook-add54
   ```

3. **Enable billing** on the Firebase project if Cloud Functions require it (Blaze plan is often required for callable functions).

## Deploy only what the church app needs

From the repo root:

```bash
firebase deploy --only functions:redeemMemberCode,functions:sendBroadcastPush
```

Or deploy all functions in `functions/index.js`:

```bash
firebase deploy --only functions
```

## Check that it worked

1. Firebase Console → **Build** → **Functions** → you should see **`redeemMemberCode`** in region **europe-west1**.  
2. Open **Logs** for that function and try a code from the app; errors will show there (e.g. Firestore permission, missing `appConfig/memberCodes`).

## Firestore

- Codes are stored in **`appConfig/memberCodes`** (`codes` array). Only **admins** can read/write that document in production rules.  
- Redeem uses the **Admin SDK** inside the function, so client rules do not block the transaction.

## Same project as the app

The PWA uses Firebase project **`songbook-add54`** (see `user-auth.js` / `.firebaserc`). Functions must be deployed to **that** project.
