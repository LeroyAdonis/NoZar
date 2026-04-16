# Design: Trade Archive Feature

## Overview
Adds the ability to archive completed or cancelled trades to keep the dashboard clutter-free.

## Proposed Solution: Archived Flag
- **Database**: Add an `archived` boolean column to the `trades` table. Default value `false`.
- **Schema**: Update `app/lib/schema.ts` to include the `archived` field.
- **UI/UX**:
  - Add an "Archive" button on the trade details view, visible only when a trade is marked as "completed" or "cancelled".
  - Update the dashboard trade list to filter out archived trades by default.
  - Create an "Archive" view or filter in the dashboard to see past trades.

## Migration
- Generate a new Drizzle migration: `npx drizzle-kit generate`
- Apply the migration: `npx drizzle-kit migrate`

## Implementation Plan
- Use `writing-plans` to outline the steps for database and UI changes.
