# NestEgg demo script (auth-aware)

Use a fresh browser profile or clear site data (`Application → Local Storage → Clear`) between runs if you need to repeat flows.

## 1. Fresh user

1. Open the app root URL → redirected to **`/signin`** (protected routes require auth).
2. Go to **`/signup`** → create an account (passwords are stored encoded locally, not shown in UI).
3. After sign-up → **`/`** risk profiler → **Continue to goal →** **`/goal`** → **Let’s go** → **`/dashboard`**.
4. Confirm greeting + avatar use your name (fallback: **Investor**).
5. Open **FinPilot** / **Scenarios** from the dashboard links as needed.
6. **Sign out** from the avatar menu → **`/signin`**.

## 2. Returning user

1. Sign in with the same email/password → land on **`/dashboard`** if onboarding was completed (`nestegg_onboarding_complete` + saved profile).
2. Goal and risk fields restore from **`nestegg_profile_[email]`** in localStorage.

## 3. Judge / demo shortcut

1. On **`/signin`** (dev build): **Use demo account →** or use the floating **Demo** pill on any authenticated screen.
2. **Sign in as Alex (demo)** seeds **`alex@nestegg.demo`**, onboarding, and mock portfolio context → **`/dashboard`**.
3. Use **Jump to** targets in the demo pill (auto signs in first if logged out).
4. **Sign out and restart** clears all **`nestegg_*`** keys and returns to **`/signin`**.

## Build check

```bash
npm run build
```

Expect **zero errors**.
