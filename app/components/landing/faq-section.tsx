import { useState, useCallback } from "react";
import { ScrollReveal } from "~/components/motion/scroll-reveal";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const faqItems: FaqItem[] = [
  {
    id: "01",
    question: "What is NoZar?",
    answer:
      "NoZar is a spatial barter network built for South Africa. It lets you bypass ZAR entirely — trade your idle assets, surplus inventory, and professional services directly with others in your area. No currency middleman, no inflation exposure. Our Value Parity Engine ensures every exchange is fair by mapping items and services to hidden value tiers.",
  },
  {
    id: "02",
    question: "Is it really free?",
    answer:
      "Yes — the free tier gives you 5 active listings with unlimited trades and local radius matching at zero cost. No transaction fees, ever. If you need more visibility or capacity, our Trader Plus (R29/mo) and Business (R99/mo) tiers unlock boost tokens, advanced filters, and enterprise tools for power users.",
  },
  {
    id: "03",
    question: "How do I stay safe?",
    answer:
      "NoZar operates a 3-stage trust architecture. Stage 1: Blind Chat — communicate through our encrypted relay without revealing any personal info. Stage 2: Digital Handshake — both parties explicitly confirm the trade terms before any contact details are shared. Stage 3: Safe Zone Routing — for physical exchanges, we suggest verified public meetup points in your area. Your identity stays shielded until you choose otherwise.",
  },
  {
    id: "04",
    question: "What can I trade?",
    answer:
      "Anything legal with real value. Physical items include electronics, furniture, fashion, appliances, vehicles, and sporting goods. Services span design, development, tutoring, repairs, photography, consulting, and more. Our Value Parity Engine categorises everything so you see matches worth your asset — whether you're swapping a laptop for web design or a couch for guitar lessons.",
  },
  {
    id: "05",
    question: "How does contact exchange work?",
    answer:
      "Contact details are never visible by default. Only after both parties complete a mutual Digital Handshake — confirming trade terms and intent — does selective info disclosure begin. You choose exactly which details to share (phone, email, or location). All shared contact data carries a 72-hour auto-expiry window, after which it's purged from the system unless the trade is completed.",
  },
  {
    id: "06",
    question: "What areas do you cover?",
    answer:
      "The NoZar network is currently in beta across Cape Town and Johannesburg, with hyper-local matching active in both metros. We're expanding to Durban, Pretoria, and Bloemfontein in the next rollout phase. Digital services (design, dev, tutoring) are already open for national exchange regardless of your location.",
  },
  {
    id: "07",
    question: "Can businesses use NoZar?",
    answer:
      "Absolutely. Our Enterprise Protocol is purpose-built for registered South African entities. Verify your company via CIPC integration to unlock a verified business badge, dedicated B2B filters, and SARS-compliant ledger exports for every trade. Liquidate dead stock, monetise idle equipment, and preserve cash flow — all within a structured barter framework.",
  },
  {
    id: "08",
    question: "How do ratings work?",
    answer:
      "After every completed trade, both parties submit a mutual rating — ensuring accountability on both sides. Ratings are locked until both are submitted to prevent retaliation bias. Once you hit 10+ completed trades with a 4.5+ average rating, you earn the Trusted Trader badge, which boosts your visibility in search results and signals reliability to other network participants.",
  },
];

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(null);

  const handleToggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <section
      id="faq"
      className="relative z-10 py-24 px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24"
    >
      <ScrollReveal>
        <div className="mb-16">
          <span className="text-emerald-500 font-mono text-xs uppercase tracking-widest block mb-4">
            // Frequently.Asked
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">
            Common Queries.
          </h2>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
      <div className="grid grid-cols-1 gap-4 max-w-4xl">
        {faqItems.map((item) => {
          const isOpen = openId === item.id;

          return (
            <details
              key={item.id}
              open={isOpen}
              className="group"
              onToggle={(e) => {
                // Sync native <details> toggle with React state
                const detail = e.currentTarget;
                if (detail.open) {
                  setOpenId(item.id);
                } else if (openId === item.id) {
                  setOpenId(null);
                }
              }}
            >
              <summary
                onClick={(e) => {
                  // Prevent native toggle; let React handle open/close for smooth animation
                  e.preventDefault();
                  handleToggle(item.id);
                }}
                className={`
                  cursor-pointer list-none [&::-webkit-details-marker]:hidden
                  rounded-2xl p-6 transition-all duration-300 select-none
                  border backdrop-blur-sm
                  ${
                    isOpen
                      ? "bg-[#0F172A] border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
                      : "bg-[#0F172A]/80 border-white/10 hover:border-white/20"
                  }
                `}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-mono text-xs tracking-widest transition-colors duration-300 ${
                        isOpen ? "text-emerald-400" : "text-emerald-500/60"
                      }`}
                    >
                      [{item.id}]
                    </span>
                    <span className="text-slate-50 font-semibold text-sm md:text-base">
                      {item.question}
                    </span>
                  </div>
                  <span
                    className={`
                      flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                      border transition-all duration-300 text-sm font-mono
                      ${
                        isOpen
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 rotate-45"
                          : "bg-white/5 border-white/10 text-slate-500"
                      }
                    `}
                  >
                    +
                  </span>
                </div>
              </summary>

              <div
                className={`
                  overflow-hidden transition-all duration-300 ease-in-out
                  ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
                `}
              >
                <div className="px-6 pb-6 pt-2 ml-0 md:ml-12">
                  <div className="border-l-2 border-emerald-500/30 pl-5">
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </div>
      </ScrollReveal>
    </section>
  );
}
