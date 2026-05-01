# ConnectRight

A full-stack real-time chat application. Discover users, send connection requests, and chat in real time once connected.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Auth, PostgreSQL, Realtime)

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- A Google Cloud project with OAuth 2.0 credentials

---

## Step 1 — Supabase Database Setup

1. Open your Supabase project → **SQL Editor** → **New Query**
2. Paste the contents of `supabase/migration.sql`
3. Click **Run**

This creates all tables, RLS policies, RPCs, and indexes from scratch.

---

## Step 2 — Configure Google OAuth

### In Google Cloud Console
1. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
2. Application type: **Web application**
3. Add Authorized redirect URI:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
4. Copy the **Client ID** and **Client Secret**

### In Supabase Dashboard
1. Go to **Authentication** → **Providers** → **Google**
2. Toggle **Enable** on
3. Paste the Client ID and Client Secret
4. Save

### Add localhost callback URL
1. Go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   ```

---

## Step 3 — Enable Realtime

The migration SQL already runs `alter publication supabase_realtime add table public.messages`.

To verify: **Database** → **Replication** → confirm `messages` is toggled on.

---

## Step 4 — Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase project values (found in **Project Settings** → **API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Step 5 — Run Locally

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## App Flow

| Step | What happens |
|------|-------------|
| `/` | Login page — "Continue with Google" |
| `/auth/callback` | OAuth code exchange → redirects to `/home` or `/setup` |
| `/setup` | New users pick a username (shown once) |
| `/home` | Browse available users, view connected users, open inbox |
| `/chat/[id]` | Real-time chat with a connected user |
| `/profile` | Your own profile + sign out |

---

## Project Structure

```
app/
  page.tsx                     — root redirect
  auth/callback/route.ts       — OAuth handler
  setup/page.tsx               — username setup
  home/page.tsx                — main hub
  chat/[connectionId]/page.tsx — real-time chat
  profile/page.tsx             — own profile
components/
  auth/    LoginPage, UsernameSetup, WelcomePopup
  chat/    ChatWindow, MessageBubble
  inbox/   InboxPanel, RequestCard
  layout/  Header, Footer
  ui/      Button, Input, Modal, Card
  users/   UserCard, ViewProfileModal
hooks/     useAuth, useConnections, useMessages
lib/
  supabase/ client.ts (browser), server.ts (server)
types/     index.ts — all TypeScript interfaces
utils/     helpers.ts — date formatting
supabase/  migration.sql — full DB schema
middleware.ts — route protection + last_active updates
```

---

## Deploying to Vercel

1. Push to a GitHub repo
2. Import at [vercel.com](https://vercel.com)
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Add your Vercel deployment URL to Supabase → Authentication → Redirect URLs:
   ```
   https://your-app.vercel.app/auth/callback
   ```
5. Add the same URL to Google Cloud Console → Authorized redirect URIs
