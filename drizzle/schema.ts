import { pgTable, text, timestamp, unique, boolean, foreignKey, serial, integer, jsonb, real } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const verifications = pgTable("verifications", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const listingImages = pgTable("listing_images", {
	id: serial().primaryKey().notNull(),
	listingId: integer("listing_id").notNull(),
	url: text().notNull(),
	blurHash: text("blur_hash"),
	order: integer().default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.listingId],
			foreignColumns: [listings.id],
			name: "listing_images_listing_id_listings_id_fk"
		}).onDelete("cascade"),
]);

export const ratings = pgTable("ratings", {
	id: serial().primaryKey().notNull(),
	tradeId: integer("trade_id").notNull(),
	raterId: text("rater_id").notNull(),
	rateeId: text("ratee_id").notNull(),
	score: integer().notNull(),
	comment: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [trades.id],
			name: "ratings_trade_id_trades_id_fk"
		}),
	foreignKey({
			columns: [table.raterId],
			foreignColumns: [users.id],
			name: "ratings_rater_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.rateeId],
			foreignColumns: [users.id],
			name: "ratings_ratee_id_users_id_fk"
		}),
]);

export const threadReadCursors = pgTable("thread_read_cursors", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	tradeId: integer("trade_id").notNull(),
	lastReadAt: timestamp("last_read_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "thread_read_cursors_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [trades.id],
			name: "thread_read_cursors_trade_id_trades_id_fk"
		}).onDelete("cascade"),
	unique("thread_read_cursors_user_id_trade_id_unique").on(table.userId, table.tradeId),
]);

export const meetupVotes = pgTable("meetup_votes", {
	id: serial().primaryKey().notNull(),
	tradeId: integer("trade_id").notNull(),
	userId: text("user_id").notNull(),
	spotId: integer("spot_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [trades.id],
			name: "meetup_votes_trade_id_trades_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "meetup_votes_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.spotId],
			foreignColumns: [meetupSpots.id],
			name: "meetup_votes_spot_id_meetup_spots_id_fk"
		}),
]);

export const readinessFlags = pgTable("readiness_flags", {
	id: serial().primaryKey().notNull(),
	tradeId: integer("trade_id").notNull(),
	userId: text("user_id").notNull(),
	ready: boolean().default(false).notNull(),
	readyAt: timestamp("ready_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [trades.id],
			name: "readiness_flags_trade_id_trades_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "readiness_flags_user_id_users_id_fk"
		}),
]);

export const meetupSpots = pgTable("meetup_spots", {
	id: serial().primaryKey().notNull(),
	tradeId: integer("trade_id").notNull(),
	name: text().notNull(),
	address: text().notNull(),
	reason: text(),
	order: integer().default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [trades.id],
			name: "meetup_spots_trade_id_trades_id_fk"
		}).onDelete("cascade"),
]);

export const contactDisclosures = pgTable("contact_disclosures", {
	id: serial().primaryKey().notNull(),
	tradeId: integer("trade_id").notNull(),
	userId: text("user_id").notNull(),
	disclosedFields: jsonb("disclosed_fields").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [trades.id],
			name: "contact_disclosures_trade_id_trades_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "contact_disclosures_user_id_users_id_fk"
		}),
]);

export const listings = pgTable("listings", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	title: text().notNull(),
	description: text().notNull(),
	category: text().notNull(),
	estimatedValueZar: integer("estimated_value_zar"),
	condition: text(),
	deliveryMethod: text("delivery_method"),
	seekingDescription: text("seeking_description"),
	type: text().default('item').notNull(),
	status: text().default('active').notNull(),
	lat: real(),
	lng: real(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "listings_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const messages = pgTable("messages", {
	id: serial().primaryKey().notNull(),
	tradeId: integer("trade_id").notNull(),
	senderId: text("sender_id").notNull(),
	text: text().notNull(),
	type: text().default('text').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [trades.id],
			name: "messages_trade_id_trades_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "messages_sender_id_users_id_fk"
		}),
]);

export const profiles = pgTable("profiles", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	displayName: text("display_name").notNull(),
	bio: text(),
	suburb: text(),
	city: text(),
	province: text(),
	lat: real(),
	lng: real(),
	searchRadiusKm: integer("search_radius_km").default(10).notNull(),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "profiles_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("profiles_user_id_unique").on(table.userId),
]);

export const accounts = pgTable("accounts", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const sessions = pgTable("sessions", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("sessions_token_unique").on(table.token),
]);

export const trades = pgTable("trades", {
	id: serial().primaryKey().notNull(),
	initiatorId: text("initiator_id").notNull(),
	responderId: text("responder_id").notNull(),
	listingId: integer("listing_id").notNull(),
	status: text().default('proposed').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.initiatorId],
			foreignColumns: [users.id],
			name: "trades_initiator_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.responderId],
			foreignColumns: [users.id],
			name: "trades_responder_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.listingId],
			foreignColumns: [listings.id],
			name: "trades_listing_id_listings_id_fk"
		}),
]);

export const tradeItems = pgTable("trade_items", {
	id: serial().primaryKey().notNull(),
	tradeId: integer("trade_id").notNull(),
	userId: text("user_id").notNull(),
	listingId: integer("listing_id"),
	description: text(),
	estimatedValueZar: integer("estimated_value_zar"),
	type: text().default('listing').notNull(),
	accepted: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [trades.id],
			name: "trade_items_trade_id_trades_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "trade_items_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.listingId],
			foreignColumns: [listings.id],
			name: "trade_items_listing_id_listings_id_fk"
		}).onDelete("set null"),
]);

export const tradeReports = pgTable("trade_reports", {
	id: serial().primaryKey().notNull(),
	tradeId: integer("trade_id").notNull(),
	reporterId: text("reporter_id").notNull(),
	reason: text().notNull(),
	description: text(),
	status: text().default('active').notNull(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	freezeExpiry: timestamp("freeze_expiry", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [trades.id],
			name: "trade_reports_trade_id_trades_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reporterId],
			foreignColumns: [users.id],
			name: "trade_reports_reporter_id_users_id_fk"
		}),
]);

export const trustProfiles = pgTable("trust_profiles", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	level: text().default('newcomer').notNull(),
	completedTrades: integer("completed_trades").default(0).notNull(),
	cancelledTrades: integer("cancelled_trades").default(0).notNull(),
	averageRating: real("average_rating"),
	reportsReceived: integer("reports_received").default(0).notNull(),
	lastActiveAt: timestamp("last_active_at", { mode: 'string' }).defaultNow(),
	flagged: boolean().default(false).notNull(),
	freezeCount: integer("freeze_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "trust_profiles_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("trust_profiles_user_id_unique").on(table.userId),
]);
