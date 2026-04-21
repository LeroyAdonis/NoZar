import { relations } from "drizzle-orm/relations";
import { listings, listingImages, trades, ratings, users, threadReadCursors, meetupVotes, meetupSpots, readinessFlags, contactDisclosures, messages, profiles, accounts, sessions, tradeItems, tradeReports, trustProfiles, chatSessions, subscriptions, transactions, boostTokens, chatMessages, referrals, reputation, tradeProposals } from "./schema";

export const listingImagesRelations = relations(listingImages, ({one}) => ({
	listing: one(listings, {
		fields: [listingImages.listingId],
		references: [listings.id]
	}),
}));

export const listingsRelations = relations(listings, ({one, many}) => ({
	listingImages: many(listingImages),
	user: one(users, {
		fields: [listings.userId],
		references: [users.id]
	}),
	trades: many(trades),
	tradeItems: many(tradeItems),
	transactions: many(transactions),
	tradeProposals_targetItemId: many(tradeProposals, {
		relationName: "tradeProposals_targetItemId_listings_id"
	}),
	tradeProposals_offeredItemId: many(tradeProposals, {
		relationName: "tradeProposals_offeredItemId_listings_id"
	}),
}));

export const ratingsRelations = relations(ratings, ({one}) => ({
	trade: one(trades, {
		fields: [ratings.tradeId],
		references: [trades.id]
	}),
	user_raterId: one(users, {
		fields: [ratings.raterId],
		references: [users.id],
		relationName: "ratings_raterId_users_id"
	}),
	user_rateeId: one(users, {
		fields: [ratings.rateeId],
		references: [users.id],
		relationName: "ratings_rateeId_users_id"
	}),
}));

export const tradesRelations = relations(trades, ({one, many}) => ({
	ratings: many(ratings),
	threadReadCursors: many(threadReadCursors),
	meetupVotes: many(meetupVotes),
	readinessFlags: many(readinessFlags),
	meetupSpots: many(meetupSpots),
	contactDisclosures: many(contactDisclosures),
	messages: many(messages),
	user_initiatorId: one(users, {
		fields: [trades.initiatorId],
		references: [users.id],
		relationName: "trades_initiatorId_users_id"
	}),
	user_responderId: one(users, {
		fields: [trades.responderId],
		references: [users.id],
		relationName: "trades_responderId_users_id"
	}),
	listing: one(listings, {
		fields: [trades.listingId],
		references: [listings.id]
	}),
	tradeItems: many(tradeItems),
	tradeReports: many(tradeReports),
	chatSessions: many(chatSessions),
}));

export const usersRelations = relations(users, ({many}) => ({
	ratings_raterId: many(ratings, {
		relationName: "ratings_raterId_users_id"
	}),
	ratings_rateeId: many(ratings, {
		relationName: "ratings_rateeId_users_id"
	}),
	threadReadCursors: many(threadReadCursors),
	meetupVotes: many(meetupVotes),
	readinessFlags: many(readinessFlags),
	contactDisclosures: many(contactDisclosures),
	messages: many(messages),
	profiles: many(profiles),
	listings: many(listings),
	accounts: many(accounts),
	trades_initiatorId: many(trades, {
		relationName: "trades_initiatorId_users_id"
	}),
	trades_responderId: many(trades, {
		relationName: "trades_responderId_users_id"
	}),
	sessions: many(sessions),
	tradeItems: many(tradeItems),
	tradeReports: many(tradeReports),
	trustProfiles: many(trustProfiles),
	chatSessions: many(chatSessions),
	subscriptions: many(subscriptions),
	transactions: many(transactions),
	boostTokens: many(boostTokens),
	chatMessages: many(chatMessages),
	referrals_referrerId: many(referrals, {
		relationName: "referrals_referrerId_users_id"
	}),
	referrals_refereeId: many(referrals, {
		relationName: "referrals_refereeId_users_id"
	}),
	reputations_userId: many(reputation, {
		relationName: "reputation_userId_users_id"
	}),
	reputations_reviewerId: many(reputation, {
		relationName: "reputation_reviewerId_users_id"
	}),
	tradeProposals_requesterId: many(tradeProposals, {
		relationName: "tradeProposals_requesterId_users_id"
	}),
	tradeProposals_receiverId: many(tradeProposals, {
		relationName: "tradeProposals_receiverId_users_id"
	}),
}));

export const threadReadCursorsRelations = relations(threadReadCursors, ({one}) => ({
	user: one(users, {
		fields: [threadReadCursors.userId],
		references: [users.id]
	}),
	trade: one(trades, {
		fields: [threadReadCursors.tradeId],
		references: [trades.id]
	}),
}));

export const meetupVotesRelations = relations(meetupVotes, ({one}) => ({
	trade: one(trades, {
		fields: [meetupVotes.tradeId],
		references: [trades.id]
	}),
	user: one(users, {
		fields: [meetupVotes.userId],
		references: [users.id]
	}),
	meetupSpot: one(meetupSpots, {
		fields: [meetupVotes.spotId],
		references: [meetupSpots.id]
	}),
}));

export const meetupSpotsRelations = relations(meetupSpots, ({one, many}) => ({
	meetupVotes: many(meetupVotes),
	trade: one(trades, {
		fields: [meetupSpots.tradeId],
		references: [trades.id]
	}),
}));

export const readinessFlagsRelations = relations(readinessFlags, ({one}) => ({
	trade: one(trades, {
		fields: [readinessFlags.tradeId],
		references: [trades.id]
	}),
	user: one(users, {
		fields: [readinessFlags.userId],
		references: [users.id]
	}),
}));

export const contactDisclosuresRelations = relations(contactDisclosures, ({one}) => ({
	trade: one(trades, {
		fields: [contactDisclosures.tradeId],
		references: [trades.id]
	}),
	user: one(users, {
		fields: [contactDisclosures.userId],
		references: [users.id]
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	trade: one(trades, {
		fields: [messages.tradeId],
		references: [trades.id]
	}),
	user: one(users, {
		fields: [messages.senderId],
		references: [users.id]
	}),
}));

export const profilesRelations = relations(profiles, ({one}) => ({
	user: one(users, {
		fields: [profiles.userId],
		references: [users.id]
	}),
}));

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const tradeItemsRelations = relations(tradeItems, ({one}) => ({
	trade: one(trades, {
		fields: [tradeItems.tradeId],
		references: [trades.id]
	}),
	user: one(users, {
		fields: [tradeItems.userId],
		references: [users.id]
	}),
	listing: one(listings, {
		fields: [tradeItems.listingId],
		references: [listings.id]
	}),
}));

export const tradeReportsRelations = relations(tradeReports, ({one}) => ({
	trade: one(trades, {
		fields: [tradeReports.tradeId],
		references: [trades.id]
	}),
	user: one(users, {
		fields: [tradeReports.reporterId],
		references: [users.id]
	}),
}));

export const trustProfilesRelations = relations(trustProfiles, ({one}) => ({
	user: one(users, {
		fields: [trustProfiles.userId],
		references: [users.id]
	}),
}));

export const chatSessionsRelations = relations(chatSessions, ({one, many}) => ({
	trade: one(trades, {
		fields: [chatSessions.tradeId],
		references: [trades.id]
	}),
	user: one(users, {
		fields: [chatSessions.userId],
		references: [users.id]
	}),
	chatMessages: many(chatMessages),
}));

export const subscriptionsRelations = relations(subscriptions, ({one}) => ({
	user: one(users, {
		fields: [subscriptions.userId],
		references: [users.id]
	}),
}));

export const transactionsRelations = relations(transactions, ({one}) => ({
	user: one(users, {
		fields: [transactions.userId],
		references: [users.id]
	}),
	listing: one(listings, {
		fields: [transactions.listingId],
		references: [listings.id]
	}),
}));

export const boostTokensRelations = relations(boostTokens, ({one}) => ({
	user: one(users, {
		fields: [boostTokens.userId],
		references: [users.id]
	}),
}));

export const chatMessagesRelations = relations(chatMessages, ({one}) => ({
	chatSession: one(chatSessions, {
		fields: [chatMessages.sessionId],
		references: [chatSessions.id]
	}),
	user: one(users, {
		fields: [chatMessages.senderId],
		references: [users.id]
	}),
}));

export const referralsRelations = relations(referrals, ({one}) => ({
	user_referrerId: one(users, {
		fields: [referrals.referrerId],
		references: [users.id],
		relationName: "referrals_referrerId_users_id"
	}),
	user_refereeId: one(users, {
		fields: [referrals.refereeId],
		references: [users.id],
		relationName: "referrals_refereeId_users_id"
	}),
}));

export const reputationRelations = relations(reputation, ({one}) => ({
	user_userId: one(users, {
		fields: [reputation.userId],
		references: [users.id],
		relationName: "reputation_userId_users_id"
	}),
	user_reviewerId: one(users, {
		fields: [reputation.reviewerId],
		references: [users.id],
		relationName: "reputation_reviewerId_users_id"
	}),
}));

export const tradeProposalsRelations = relations(tradeProposals, ({one}) => ({
	user_requesterId: one(users, {
		fields: [tradeProposals.requesterId],
		references: [users.id],
		relationName: "tradeProposals_requesterId_users_id"
	}),
	user_receiverId: one(users, {
		fields: [tradeProposals.receiverId],
		references: [users.id],
		relationName: "tradeProposals_receiverId_users_id"
	}),
	listing_targetItemId: one(listings, {
		fields: [tradeProposals.targetItemId],
		references: [listings.id],
		relationName: "tradeProposals_targetItemId_listings_id"
	}),
	listing_offeredItemId: one(listings, {
		fields: [tradeProposals.offeredItemId],
		references: [listings.id],
		relationName: "tradeProposals_offeredItemId_listings_id"
	}),
}));