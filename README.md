# DuoDay 👥
A modern full-stack web application designed for teammates or duos to plan daily routines, build habits, manage shared goals, and stay synchronized every day.
---
## 🚀 Features
- **Shared Duo Space**: Create or join a duo with an invite code.
- **Daily Task & Habit Tracker**: Track shared tasks, daily checklists, and habit streaks.
- **Interactive UI**: Built with React, TailwindCSS, Framer Motion, and Radix UI components.
- **tRPC API & Express Backend**: End-to-end type safety between frontend client and backend server.
- **Database Ready**: Schema managed using Drizzle ORM (MySQL / PlanetScale / Neon / Supabase).
- **Vercel Deploy Ready**: Optimized for serverless API deployment on Vercel with static frontend caching.
- **Installable Web App (PWA)**: Manifest, service worker, and offline shell — DuoDay can be installed as a native-style app on Chrome, Edge, Android, and iOS.
---

## 📁 Project Structure

```text
duoday/
├── api/                   # Vercel Serverless API entrypoint
│   └── index.ts
├── client/                # React Frontend (Vite)
│   ├── index.html
│   ├── public/
│   │   ├── icons/         # PWA app icons
│   │   ├── favicon.svg
│   │   ├── manifest.webmanifest
│   │   └── sw.js          # Service worker
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── contexts/      # React contexts
│       ├── hooks/         # Custom React hooks
│       ├── pages/         # Application pages
│       ├── App.tsx        # Router & App root
│       ├── index.css      # Design system & Tailwind styling
│       └── main.tsx       # Vite client entrypoint
├── drizzle/               # Database Schema & Migrations
│   ├── schema.ts          # Drizzle tables & TypeScript types
│   └── migrations/
├── server/                # Express & tRPC Backend
│   ├── _core/             # Server setup, middleware, OAuth, & tRPC
│   ├── db.ts              # Database client & helper functions
│   ├── routers.ts         # tRPC router definitions
│   └── storage.ts         # File storage proxy/helpers
├── shared/                # Shared types & constants
│   ├── const.ts
│   └── types.ts
├── scripts/               # Build-time helper scripts
│   └── generate-pwa-icons.mjs
├── drizzle.config.ts      # Drizzle ORM configuration
├── package.json           # Scripts & dependencies
├── tsconfig.json          # TypeScript configuration
├── vercel.json            # Vercel deployment configuration
└── vite.config.ts         # Vite build configuration
```

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or pnpm installed locally

### 2. Installation
Install the project dependencies:
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=mysql://user:password@localhost:3306/duoday
JWT_SECRET=your_jwt_secret_here
```

### 4. Running the App
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠 Building & Verification

- **Type Check**:
  ```bash
  npm run check
  ```
- **Production Build**:
  ```bash
  npm run build
  ```
- **Start Production Server**:
  ```bash
  npm run start
  ```
---

## 📲 Installable App (PWA)

DuoDay ships as a Progressive Web App, so it can be installed from the browser
(Chrome / Edge: ⋮ menu → *Install DuoDay*; iOS Safari: *Share* → *Add to Home
Screen*) and then launches in its own standalone window.

| Piece | Location | Purpose |
| --- | --- | --- |
| Web app manifest | `client/public/manifest.webmanifest` | Name, icons, colours, standalone display mode |
| Service worker | `client/public/sw.js` | Offline app shell, cache-first assets, live API |
| App icons | `client/public/icons/` | 96/192/512 px, maskable variants, Apple touch icon |
| Icon generator | `scripts/generate-pwa-icons.mjs` | Renders the icons from the CSS `.app-mark` logo |
| Registration | `client/src/lib/pwa.ts` | Registers the worker, handles updates |
| Install button | `client/src/components/InstallAppButton.tsx` | Triggers the native install prompt |

Notes:
- The service worker never caches `/api/*`, so duo data always stays live.
- The worker detects the Vite dev server at runtime and stays completely
  transparent there, so HMR keeps working during `npm run dev`.
- Regenerate the icons after changing the logo in `client/src/index.css`:
  ```bash
  npm run icons
  ```

---

## 🌐 Deploying to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/new) and import the repository.
3. Configure Environment Variables in Vercel settings (`DATABASE_URL`, `JWT_SECRET`, etc.).
4. Click **Deploy**. Vercel will automatically use `vercel.json` to build the frontend and host the Serverless API at `/api/*`.

---


