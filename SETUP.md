# BotbaseAI — Setup Guide

## Prerequisites

- Node.js 22+ (use nvm: `nvm install 22 && nvm use 22`)
- A Supabase project (free tier works)
- OpenAI API key
- Stripe account (test mode)
- (Optional) Resend API key for emails

## Quick Start

```bash
# Copy env vars
cp .env.local.example .env.local

# Fill in your .env.local values (see below)

# Install dependencies
npm install

# Run development server
npm run dev
```

## 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run the contents of `supabase/migrations/00001_schema.sql`
3. Go to **Project Settings > API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`
4. Enable **Auth > Providers > Google**:
   - Get OAuth 2.0 Client ID and Secret from Google Cloud Console
   - Set redirect URL to `http://localhost:3000/auth/callback`
5. Enable **Storage** (for file uploads):
   - Create a new bucket called `sources`
   - Set it to private
6. Enable **pgvector** extension (included in the migration)

## 2. OpenAI Setup

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Set `OPENAI_API_KEY` in `.env.local`

## 3. Stripe Setup

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) and enable test mode
2. Create **Products** and **Prices** for each tier:
   - Hobby Monthly ($32) and Hobby Yearly ($384)
   - Standard Monthly ($120) and Standard Yearly ($1,440)
   - Pro Monthly ($400) and Pro Yearly ($4,800)
3. Copy the Price IDs into `.env.local`:
   ```
   NEXT_PUBLIC_STRIPE_PRICE_HOBBY_MONTHLY=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_HOBBY_YEARLY=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_STANDARD_YEARLY=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_xxx
   NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=price_xxx
   ```
4. Get Stripe keys from **Developers > API Keys**:
   - `STRIPE_SECRET_KEY` (sk_test_...)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test_...)
5. For webhooks (local dev):
   - Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
   - Run: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   - Copy the webhook secret → `STRIPE_WEBHOOK_SECRET`

## 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 5. Deployment (Vercel)

```bash
npm run build
npx vercel deploy
```

Set all environment variables in Vercel dashboard.

## Project Structure

```
src/
├── components/
│   ├── dashboard/       # Dashboard layout (Sidebar, Topbar)
│   ├── marketing/       # Landing page (Navbar, Footer)
│   └── ui/             # shadcn/ui components
├── lib/
│   ├── api/            # Example server functions
│   ├── rag/            # RAG pipeline (chunker, embeddings, search, chat)
│   ├── server-functions/ # All server functions (auth, chatbots, etc.)
│   ├── supabase/       # Supabase clients (client, server, admin)
│   ├── auth-context.tsx # Auth context provider
│   ├── openai.ts       # OpenAI client
│   ├── rate-limit.ts   # In-memory rate limiter
│   ├── stripe.ts       # Stripe client + price config
│   └── utils.ts        # cn() helper
├── routes/             # All routes (file-based)
│   ├── index.tsx       # Landing page
│   ├── pricing.tsx     # Pricing page
│   ├── login.tsx       # Login page
│   ├── signup.tsx      # Signup page
│   ├── dashboard.tsx   # Dashboard layout
│   ├── dashboard/
│   │   ├── index.tsx        # AI Agents list
│   │   ├── create.tsx       # Create agent wizard
│   │   ├── settings.tsx     # Account settings
│   │   └── agents/$id/      # Agent-specific pages
│   │       ├── index.tsx    # Playground
│   │       ├── analytics.tsx
│   │       ├── activity.tsx
│   │       ├── sources.tsx
│   │       ├── actions.tsx
│   │       └── settings.tsx
│   ├── api/
│   │   └── stripe/
│   │       └── webhook.tsx  # Stripe webhook handler
├── types/
│   └── database.ts    # TypeScript types for DB schema
├── styles.css         # Global styles + Tailwind theme
├── router.tsx         # TanStack Router setup
├── server.ts          # SSR error handling
└── start.ts           # TanStack Start instance
public/
└── widget.js          # Embeddable chat widget (~5KB)
supabase/
└── migrations/
    └── 00001_schema.sql  # Full database schema
```

## Key Features

- **Auth**: Supabase Auth (email/password + Google OAuth)
- **RAG Pipeline**: OpenAI embeddings → pgvector similarity search → GPT-4o streaming
- **Billing**: Stripe subscription management with webhooks
- **Widget**: Standalone embeddable JS widget (no framework dependencies)
- **Rate Limiting**: Per-session rate limiting on chat endpoint
