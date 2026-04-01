# DayArc

**AI-powered glucose insights for people who actually live with diabetes.**

DayArc connects to your Dexcom CGM and gives you something Dexcom doesn't — a companion that understands your data and talks to you about it like a person, not a dashboard.

## What it does

- **Real-time glucose monitoring** — your current reading, trend, and a 24-hour chart
- **Pattern detection** — automatically identifies recurring issues like morning spikes, overnight lows, post-meal crashes, and high variability across your data
- **Daily AI insights** — a daily alert, actionable recommendation, and yesterday's recap generated from your patterns and readings
- **Ask DayArc** — tap a quick question ("How was last night?", "Is this spike normal?") or type your own and get a conversational answer grounded in your actual data
- **Time in Range bar** — visual breakdown of your below/in/above range distribution at a glance
- **Shareable profiles** — public link so caregivers or family can see your dashboard without needing an account

## Stack

- **Frontend:** React + TypeScript + Vite, CSS Modules
- **Backend:** Vercel serverless functions (production), Express (local dev)
- **Data:** Supabase (Postgres + Auth), Dexcom Share API
- **AI:** OpenAI API for insight generation and conversational Q&A
- **Patterns:** Custom detection engine analyzing 9 glucose pattern types across rolling 7-day windows

## Why this exists

I'm type 1 diabetic, and I noticed that most of my endo appointments boil down to the same thing — staring at Dexcom Clarity reports, brute-forcing through stats, and trying to reverse-engineer what went wrong three months ago so we can make targeted lifestyle tweaks. It works, but it's slow. You get feedback once a quarter on data you've already forgotten the context for.

DayArc is my attempt at shortening that feedback loop. Instead of waiting for your next appointment to hear "your overnights are running high," you hear it today, while you can still do something about it. And instead of a clinical report that makes you feel like you're failing a test, it's a conversation — friendly, specific to your data, and zero judgment.
