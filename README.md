# HandFont

Turn your handwriting into a custom digital font.

## About

HandFont is a full-stack web application that converts your handwriting into a personalized, usable font. Write characters either directly in your browser or on your mobile device using our QR code sync feature, then download your completed font to use in documents, presentations, or any application that supports custom fonts.

## Features

- **Intuitive Drawing Interface**: Draw on any device with a smooth, responsive canvas
- **QR Code Synchronization**: Seamlessly continue your work across devices
- **Smart Character Extraction**: Write full sentences and let our system extract individual characters
- **Real-time Font Preview**: See your font come to life as you draw
- **Guided Drawing Templates**: Reference guides help you draw consistent characters 
- **Character Validation**: Review and approve character extraction for best results

## Tech Stack

- Frontend: [Next.js](https://nextjs.org/docs), [Tailwind](https://tailwindcss.com/docs/guides/nextjs), [Shadcn](https://ui.shadcn.com/docs/installation), [Framer Motion](https://www.framer.com/motion/introduction/)
- Backend: [PostgreSQL](https://www.postgresql.org/about/), [Supabase](https://supabase.com/), [Drizzle](https://orm.drizzle.team/docs/get-started-postgresql), [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- Auth: [Clerk](https://clerk.com/)
- Analytics: [PostHog](https://posthog.com/)

## Prerequisites

You will need accounts for the following services.

They all have free plans that you can use to get started.

- Create a [Supabase](https://supabase.com/) account
- Create a [Clerk](https://clerk.com/) account
- Create a [PostHog](https://posthog.com/) account
- Create a [Vercel](https://vercel.com/) account for deployment

## Environment Variables

```bash
# DB (Supabase)
DATABASE_URL=

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# App URL (For QR Code Generation)
NEXT_PUBLIC_APP_URL=
```

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in the environment variables from above
3. Run `npm install` to install dependencies
4. Run `npm run dev` to run the app locally

### Running on Mobile Devices

To test the QR code sync functionality:

1. Run `npm run dev:remote` to make the server accessible on your local network
2. Use one of the following options to make your app accessible to mobile devices:
   - Run `npm run app-url` and enter your local IP address
   - Run `npm run ngrok` to create a tunnel (requires ngrok installed)
   - Run `npm run tunnel` to set up a custom tunnel

For Windows users, you may need to open firewall ports with:
```bash
npm run firewall
```

See the full QR code testing instructions in README-QR-TESTING.md
