export type Asset = {
  id: number;
  title: string;
  need: string;
  user: string;
  distance: string;
  tier: "TIER_01" | "TIER_02" | "TIER_03";
  time: string;
  image: string; // Tailwind bg class e.g. "bg-emerald-900/20"
  desc: string;
  category: string;
  isVerified: boolean;
};

export type Message = {
  text: string;
  sender: "me" | "them";
  time: string;
};

export type Ping = {
  id: number;
  assetId: number;
  user: string;
  asset: string;
  status: "awaiting_reply" | "handshake_ready";
  unread: boolean;
  time: string;
  messages: Message[];
};

export type HandshakeStage = "chatting" | "proposed" | "accepted";
