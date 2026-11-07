# Grind Buddy · 你一道我一道，明天拿下大结果！

A small tracker for two friends preparing for tech interviews together. It covers **NeetCode 150 + System Design**: you share one weekly plan, track every problem from "done once" to "mastered", get weekly problem sets drawn toward what you've practised least, and have a stats page built to keep you going.

**[Live demo](https://ZzzzzzT233.github.io/grind-buddy/)**: without a backend configured, the site runs in local demo mode and your data stays in your browser.

> The interface is in Chinese for now. An English UI is a welcome contribution.

---

## Features

| | |
|---|---|
| **Per-problem tracking** | Every problem shows its progress on the right: not started / done 1× / 2× / 3× / mastered. Tap **+1** after each attempt, tap **Mastered** once you know it cold, and use **↶** to undo a mistake. |
| **Shared weekly plan** | Set this week's target together: how many LeetCode problems and System Design topics. Pick focus topics (e.g. Backtracking, Graphs) or draw from all 150. |
| **Weighted draws** | Each person draws their own list for the week. Weights: not started 4 · 1× 3 · 2× 2 · 3× 1 · mastered 0, so mastered problems never come back. If the focus topics run out, other topics fill the gap. |
| **"Not done" stamp** | Anyone behind on the weekly target gets a big red stamp on their card, and last week's misses are called out at the top of the home page. |
| **Stats page** | Mastered count in a big ring, problems attempted, total attempts, daily streak, milestone badges, a mastery map across all 18 topics, a difficulty breakdown, and team totals. |
| **History** | Week by week, who hit the target and who didn't. |
| **Realtime sync** | Built on Supabase, so your buddy's check-ins show up right away. |

Problem sets: [NeetCode 150](https://neetcode.io/practice) (18 topics) plus 29 System Design topics (10 core concepts and 19 classic design questions).

## Quick start

```bash
git clone https://github.com/ZzzzzzT233/grind-buddy.git
cd grind-buddy
npm install
npm run dev
```

It runs with no configuration in **local demo mode**: data is kept in localStorage and nothing syncs with a friend.

## Sync with a friend: set up Supabase (free tier)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the tables, row-level security (RLS) policies, and realtime publication.
3. Under **Authentication → URL Configuration**, add your site URL to *Site URL* and *Redirect URLs*. Use `http://localhost:5173` for local development and your deployed URL in production.
   Then go to **Authentication → Sign In / Providers → Email** and turn off **Confirm email**. Sign-in uses email + password, so no emails are sent (Supabase's built-in mailer only allows a couple per hour).
4. Copy `.env.example` to `.env.local` and fill in the `Project URL` and `anon public` key from **Project Settings → API**:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Run `npm run dev`, register with an email and password, create a team, and send the 8-character invite code from **Settings** to your buddy. They register and enter the code to join.

The anon key is meant to be public in the frontend. Data is protected by the RLS policies in `schema.sql`: only team members can read a team's data, and each person can write only their own progress.

## Deploy to GitHub Pages

The repo includes [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. In **Settings → Pages → Source**, choose **GitHub Actions**.
2. In **Settings → Secrets and variables → Actions**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Without them the site builds in local demo mode.
3. Push to `main` to deploy. Remember to add the Pages URL to Supabase's Redirect URLs.

Vercel, Netlify, and Cloudflare Pages also work: the build command is `npm run build` and the output directory is `dist`.

## Project structure

```
src/
  data/            NeetCode 150 and System Design problem sets
  lib/
    draw.ts        weighted problem draws (with tests)
    stats.ts       stats, milestones, encouragement messages
    dates.ts       week math (weeks start on Monday)
  store/
    backend.ts     storage interface
    supabaseBackend.ts / localBackend.ts
    useTeam.ts     state with optimistic updates
  components/      This week / Stats / Problem bank / History
supabase/schema.sql
```

To use a different backend (Firebase, your own API), implement the `Backend` interface in `src/store/backend.ts`.

## Development

```bash
npm test          # unit tests (vitest)
npm run build     # type-check and build
```

Pull requests are welcome: more problem lists (Blind 75, Grind 169), an English UI, more charts, and so on.

## License

[MIT](LICENSE). Problem names and topics come from [NeetCode](https://neetcode.io), and problem links point to LeetCode. This project is not affiliated with either.
