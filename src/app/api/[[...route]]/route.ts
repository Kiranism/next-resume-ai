import appRouter from '@/server';
import { handle } from 'hono/vercel';

// This route catches all incoming API requests and lets your appRouter handle them.
// Raise the function timeout above Vercel's 10s default so slower AI calls
// (generation / ATS / import via OpenRouter) aren't cut off. 60s is the Hobby cap
// without Fluid Compute; with Fluid Compute enabled this can be raised to 300.
export const maxDuration = 60;

export const GET = handle(appRouter.handler);
export const POST = handle(appRouter.handler);
