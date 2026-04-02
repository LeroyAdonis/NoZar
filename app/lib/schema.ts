import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  serial,
  unique,
} from "drizzle-orm/pg-core";

// ─── New NoZar App Tables ───────────

export const trustProfiles = pgTable("trust_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  level: text("level").notNull().default("newcomer"), // newcomer | verified | trusted
  completedTrades: integer("completed_trades").notNull().default(0),
  cancelledTrades: integer("cancelled_trades").notNull().default(0),
  averageRating: real("average_rating"),
  reportsReceived: integer("reports_received").notNull().default(0),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  flagged: boolean("flagged").notNull().default(false),
  freezeCount: integer("freeze_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tradeReports = pgTable("trade_reports", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id, { onDelete: "cascade" }),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(), // harassment | scam | safety_concern | no_show | other
  description: text("description"),
  status: text("status").notNull().default("active"), // active | resolved | dismissed
  resolvedAt: timestamp("resolved_at"),
  freezeExpiry: timestamp("freeze_expiry"), // auto-unfreeze after 72h if no escalation
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const readinessFlags = pgTable("readiness_flags", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  ready: boolean("ready").notNull().default(false),
  readyAt: timestamp("ready_at"),
}, (t) => [unique("readiness_flags_trade_user_uq", t.tradeId, t.userId)]);

export const meetupSpots = pgTable("meetup_spots", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  reason: text("reason"),
  order: integer("order").notNull().default(0),
});

export const meetupVotes = pgTable("meetup_votes", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  spotId: integer("spot_id")
    .notNull()
    .references(() => meetupSpots.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique("meetup_votes_trade_user_uq", t.tradeId, t.userId)]);

export const tradeItems = pgTable("trade_items", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  listingId: integer("listing_id")
    .references(() => listings.id, { onDelete: "set null" }),
  description: text("description"),
  estimatedValue: integer("estimated_value_zar"),
  type: text("type").notNull().default("listing"), // listing | service_extension
  accepted: boolean("accepted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});