type MockAsset = {
  id: number;
  title: string;
  need: string;
  user: string;
  distance: string;
  tier: string;
  time: string;
  image: string;
  desc: string;
  category: string;
  isVerified: boolean;
};

type MockMessage = {
  text: string;
  sender: string;
  time: string;
};

type MockPing = {
  id: number;
  assetId: number;
  user: string;
  asset: string;
  status: string;
  unread: boolean;
  time: string;
  messages: MockMessage[];
};

export const MOCK_ASSETS: MockAsset[] = [
  {
    id: 1,
    title: "Sony A7III + Lens",
    need: "MacBook M1/M2",
    user: "David M.",
    distance: "2.4km",
    tier: "TIER_03",
    time: "2h ago",
    image: "bg-emerald-900/20",
    desc: "Lightly used Sony A7III body with a 50mm f1.8 lens. Shutter count is around 15k. Looking to swap for a working MacBook M1 or M2 for video editing. Will consider adding ZAR value if the Mac is high-spec.",
    category: "Electronics",
    isVerified: true,
  },
  {
    id: 2,
    title: "5hrs Plumbing Service",
    need: "Old Bakkie Tires",
    user: "Sipho T.",
    distance: "4.1km",
    tier: "TIER_02",
    time: "5h ago",
    image: "bg-cyan-900/20",
    desc: "Certified plumber offering 5 hours of labor. Good for fixing geysers, unblocking drains, or pipe installations. Need a set of 15-inch tires for my work bakkie, minimum 50% tread left.",
    category: "Service",
    isVerified: true,
  },
  {
    id: 3,
    title: "Office Desk (Oak)",
    need: "Microwave or R500 Value",
    user: "Sarah K.",
    distance: "800m",
    tier: "TIER_01",
    time: "1d ago",
    image: "bg-purple-900/20",
    desc: "Solid oak office desk. Dimensions: 120cm x 60cm. Has a small scratch on the back right corner. I need a working microwave or anything of similar value for a student flat.",
    category: "Furniture",
    isVerified: false,
  },
];

export const MOCK_PINGS: MockPing[] = [
  {
    id: 101,
    assetId: 2,
    user: "Sipho T.",
    asset: "Plumbing Service",
    status: "awaiting_reply",
    unread: true,
    time: "10m ago",
    messages: [
      {
        text: "Hey, I have 4 Goodyear 15-inch tires. Tread is about 60%. Would that cover the 5 hours?",
        sender: "them",
        time: "10:05 AM",
      },
    ],
  },
  {
    id: 102,
    assetId: 3,
    user: "Sarah K.",
    asset: "Office Desk",
    status: "handshake_ready",
    unread: false,
    time: "1d ago",
    messages: [
      {
        text: "Is the desk still available? I have a Defy microwave, practically new.",
        sender: "me",
        time: "Yesterday",
      },
      {
        text: "Yes it is! The microwave sounds perfect.",
        sender: "them",
        time: "Yesterday",
      },
    ],
  },
];
