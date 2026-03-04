import type { InferSelectModel } from "drizzle-orm";
import type {
  users,
  profiles,
  listings,
  listingImages,
  trades,
  messages,
  ratings,
} from "./schema";

// ─── Drizzle-inferred types ─────────────────────────────────

export type User = InferSelectModel<typeof users>;
export type Profile = InferSelectModel<typeof profiles>;
export type Listing = InferSelectModel<typeof listings>;
export type ListingImage = InferSelectModel<typeof listingImages>;
export type Trade = InferSelectModel<typeof trades>;
export type Message = InferSelectModel<typeof messages>;
export type Rating = InferSelectModel<typeof ratings>;

// ─── View models for components ─────────────────────────────

/** Listing card data as displayed in the feed */
export type ListingCard = {
  id: number;
  title: string;
  description: string;
  seekingDescription: string | null;
  category: string;
  type: string;
  estimatedValueZar: number | null;
  condition: string | null;
  distance: string;
  timeAgo: string;
  userName: string;
  isVerified: boolean;
  imageUrl: string | null;
};

/** Trade thread as displayed in pings list */
export type TradeThread = {
  id: number;
  counterpartyName: string;
  listingTitle: string;
  status: string;
  unread: boolean;
  lastMessage: string | null;
  lastMessageTime: string | null;
  timeAgo: string;
};

/** Trade detail for chat view */
export type TradeDetail = {
  trade: Trade;
  listing: Listing;
  counterparty: { name: string; image: string | null; emailVerified: boolean };
  messages: Message[];
};

/** Handshake stage — matches trade status progression */
export type HandshakeStage =
  | "proposed"
  | "negotiating"
  | "agreed"
  | "contact_shared"
  | "completed"
  | "cancelled"
  | "disputed";
