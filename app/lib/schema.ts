import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  serial,
  unique,
  index,
} from "drizzle-orm/pg-core";

// ─── Better Auth Managed Tables ────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  referralCode: text("referral_code").unique(),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: text("referrer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  refereeId: text("referee_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── NoZar App Tables ──────────────────────────────────────────

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  suburb: text("suburb"),
  city: text("city"),
  province: text("province"),
  lat: real("lat"),
  lng: real("lng"),
  searchRadiusKm: integer("search_radius_km").notNull().default(10),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  preferredLanguage: text("preferred_language").notNull().default("en"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  estimatedValueZar: integer("estimated_value_zar"),
  condition: text("condition"),
  deliveryMethod: text("delivery_method"),
  seekingDescription: text("seeking_description"),
  type: text("type").notNull().default("item"),
  isDigital: boolean("is_digital").notNull().default(false),
  status: text("status").notNull().default("active"),
  lat: real("lat"),
  lng: real("lng"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const listingImages = pgTable("listing_images", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  blurHash: text("blur_hash"),
  order: integer("order").notNull().default(0),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  initiatorId: text("initiator_id")
    .notNull()
    .references(() => users.id),
  responderId: text("responder_id")
    .notNull()
    .references(() => users.id),
  listingId: integer("listing_id")
    .notNull()
    .references(() => listings.id),
  status: text("status").notNull().default("proposed"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id, { onDelete: "cascade" }),
  senderId: text("sender_id")
    .notNull()
    .references(() => users.id),
  text: text("text").notNull(),
  type: text("type").notNull().default("text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id),
  raterId: text("rater_id")
    .notNull()
    .references(() => users.id),
  rateeId: text("ratee_id")
    .notNull()
    .references(() => users.id),
  score: integer("score").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const threadReadCursors = pgTable(
  "thread_read_cursors",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tradeId: integer("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at").notNull().defaultNow(),
  },
  (t) => [
    unique("thread_read_cursors_user_id_trade_id_unique").on(
      t.userId,
      t.tradeId,
    ),
  ],
);

export const contactDisclosures = pgTable("contact_disclosures", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .references(() => trades.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  disclosedFields: jsonb("disclosed_fields").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Payment Tables ──────────────────────────────────────────

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  listingId: integer("listing_id").references(() => listings.id, {
    onDelete: "cascade",
  }),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("ZAR"),
  status: text("status").notNull().default("pending"),
  providerReference: text("provider_reference"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});


// ─── Trust System Tables ───────────────────────────────────────

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
}, (t) => [unique("readiness_flags_trade_user_uq").on(t.tradeId, t.userId)]);

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
}, (t) => [unique("meetup_votes_trade_user_uq").on(t.tradeId, t.userId)]);

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

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id").references(() => trades.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  context: jsonb("context").notNull().default({}),
  model: text("model").notNull().default("nvidia"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  sender: text("sender").notNull().default("user"),
  senderId: text("sender_id").references(() => users.id),
  text: text("text").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  planCode: text("plan_code").notNull(), // plus | business | enterprise
  status: text("status").notNull(), // active | cancelled | expired | promo
  subscriptionCode: text("subscription_code"),
  subscriptionToken: text("subscription_token"),
  email: text("email"),
  nextPaymentDate: timestamp("next_payment_date"),
  promoExpiresAt: timestamp("promo_expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const boostTokens = pgTable("boost_tokens", {
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  lastRefillAt: timestamp("last_refill_at").notNull().defaultNow(),
});

export const tradeProposals = pgTable("trade_proposals", {
  id: serial("id").primaryKey(),
  requesterId: text("requester_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  receiverId: text("receiver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetItemId: integer("target_item_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  offeredItemId: integer("offered_item_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending, accepted, countered, declined
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const reputation = pgTable("reputation", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reviewerId: text("reviewer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: serial("id").primaryKey(),
    mPaymentId: text("m_payment_id").notNull(),
    pfPaymentId: text("pf_payment_id"),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    paymentStatus: text("payment_status").notNull(),
    amountGrossCents: integer("amount_gross_cents").notNull(),
    rawPayload: jsonb("raw_payload").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("payment_events_dedup_uq").on(t.mPaymentId, t.pfPaymentId)],
);

// ─── Campaign Log (n8n campaign tracking) ──────────────────────

export const campaignLog = pgTable(
  "campaign_log",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    campaign: text("campaign").notNull(), // e.g. "skills-first-v1", "trade-followup-v1"
    channel: text("channel").notNull(), // "email" | "sms"
    status: text("status").notNull().default("sent"), // sent | failed | opened | clicked
    recipient: text("recipient").notNull(), // email address or phone number
    tradeId: integer("trade_id"), // optional, for trade-specific campaigns
    errorMessage: text("error_message"), // if failed, store the error
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("campaign_log_user_idx").on(t.userId),
    index("campaign_log_campaign_idx").on(t.campaign),
    index("campaign_log_created_idx").on(t.createdAt),
  ],
);

// ─── Web Push Tables ──────────────────────────────────────────

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Expo Push Tokens (mobile push notifications) ──────────

export const expoPushTokens = pgTable("expo_push_tokens", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  platform: text("platform").notNull().default("android"), // android | ios
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Device Anti-Abuse Tables ─────────────────────────────────

export const deviceFingerprints = pgTable(
  "device_fingerprints",
  {
    id: serial("id").primaryKey(),
    fingerprintHash: text("fingerprint_hash").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    trustLevel: text("trust_level").notNull().default("unknown"), // unknown | trusted | flagged
    registrationFingerprint: boolean("registration_fingerprint").notNull().default(false),
  },
  (t) => [
    index("device_fp_hash_idx").on(t.fingerprintHash),
    index("device_fp_user_idx").on(t.userId),
    unique("device_fp_user_hash_uq").on(t.userId, t.fingerprintHash),
  ],
);

// ─── Better Auth twoFactor Plugin Table ───────────────────────
// Matches the schema expected by better-auth/plugins twoFactor with
// drizzleAdapter({ usePlural: true }). Better Auth manages encryption
// of `secret` and `backupCodes` using BETTER_AUTH_SECRET internally.

export const twoFactors = pgTable("two_factors", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});
