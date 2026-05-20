import { useState, useCallback } from "react";
import { ScrollReveal } from "~/components/motion/scroll-reveal";
import { BUSINESS_PRODUCTS_LIVE } from "~/lib/tier-limits";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const buildFaqItems = (): FaqItem[] => [
  {
    id: "01",
    question: "What is NoZar?",
    answer:
      "NoZar is a barter platform for South Africa. Swap your stuff, skills, and services directly with people near you — no cash needed. Every listing sits in a value tier, so you only see fair swaps.",
  },
  {
    id: "02",
    question: "Is it really free?",
    answer: BUSINESS_PRODUCTS_LIVE
      ? "Yes. The Free plan gives you 5 active listings, unlimited swaps, and local matching — at no cost. No transaction fees, ever. If you want more capacity, Plus (R99/mo) and Business (R299/mo) unlock advanced filters, AI match, priority support, and business tools."
      : "Yes. The Free plan gives you 5 active listings, unlimited swaps, and local matching — at no cost. No transaction fees, ever. If you want more capacity, Plus (R99/mo) unlocks advanced filters, AI match, and priority support.",
  },
  {
    id: "03",
    question: "How do I stay safe?",
    answer:
      "Three steps. First, you chat privately on NoZar — phone numbers and emails are blocked. Then both of you confirm the swap. Only after that do contact details unlock, and we suggest safe public meetup spots. Your identity stays private until you both agree.",
  },
  {
    id: "04",
    question: "What can I trade?",
    answer:
      "Anything legal with real value. Items like electronics, furniture, clothes, appliances, vehicles, and sports gear. Services like design, dev, tutoring, repairs, photography, and more. We match things by value tier so you only see swaps that are worth your while.",
  },
  {
    id: "05",
    question: "How does contact exchange work?",
    answer:
      "Contact details are hidden by default. Only after you both confirm the swap do they unlock — and even then, you choose what to share (phone, email, or location). Shared details expire after 72 hours, with an optional 48-hour extension if you both agree.",
  },
  {
    id: "06",
    question: "How are disputes handled?",
    answer:
      "If a swap goes wrong, open a dispute from your trade page. A neutral moderator reviews the chat and confirmation history, then proposes a fair outcome.",
  },
  {
    id: "07",
    question: "Which areas do you cover?",
    answer:
      "We're live in Johannesburg and Cape Town. Durban, Pretoria, and Bloemfontein are next. Digital services (design, dev, tutoring) are already open nationwide. Your local radius starts at 15km and you can adjust it between 3km and 50km in your profile.",
  },
  {
    id: "08",
    question: "Can businesses use NoZar?",
    answer: BUSINESS_PRODUCTS_LIVE
      ? "Yes. The Business plan is built for registered SA companies. Verify with CIPC to get a business badge, business-only filters, and SARS-ready exports for every swap. Move dead stock and put idle equipment to work — without touching cash flow."
      : "Business plans are launching soon. For now NoZar is open to individual traders. Drop us a note at hello@nozar.co.za if you want to be on the waitlist when business features go live.",
  },
  {
    id: "09",
    question: "Is barter legal with SARS?",
    answer:
      "Yes. SARS treats barter as legitimate trade. Under the VAT Act and Income Tax Act, you account for the fair market value of what you receive as taxable income. NoZar's trade ledger export helps you keep accurate records for the five years SARS requires.",
  },
  {
    id: "10",
    question: "How do ratings work?",
    answer:
      "After every completed swap, both of you rate each other. Ratings are hidden until both are in, so no one can retaliate. Hit 10+ swaps with a 4.5+ average and you earn the Trusted Trader badge — it boosts you in search.",
  },
];

const faqItems = buildFaqItems();

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(null);

  const handleToggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <section
      id="faq"
      className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24"
    >
      <ScrollReveal>
        <div className="mb-16">
          <span className="text-emerald-500 font-mono text-xs uppercase tracking-widest block mb-4">
            // FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase">
            Common questions.
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
