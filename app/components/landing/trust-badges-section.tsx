import { Shield, FileCheck, Phone, Lock, Users, Heart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScrollReveal } from "~/components/motion/scroll-reveal";

interface TrustBadge {
  icon: LucideIcon;
  title: string;
  description: string;
}

const TRUST_BADGES: TrustBadge[] = [
  {
    icon: Shield,
    title: "POPIA Compliant",
    description: "Your data is handled under SA's privacy law",
  },
  {
    icon: FileCheck,
    title: "ECTA Registered",
    description: "Compliant with SA's electronic transactions act",
  },
  {
    icon: Phone,
    title: "Phone-verified users",
    description: "Every trader verified by SMS before their first swap",
  },
  {
    icon: Lock,
    title: "5 safety steps",
    description: "Private chat, mutual agreement, safe meetup, ratings, disputes",
  },
  {
    icon: Users,
    title: "Community rules",
    description: "Clear standards for respectful, safe trading",
  },
  {
    icon: Heart,
    title: "Built in Mzansi 🇿🇦",
    description: "Designed and built for South African communities",
  },
];

export function TrustBadgesSection() {
  return (
    <section className="relative z-10 py-16 bg-[#030712] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-emerald-500 font-mono text-xs uppercase tracking-widest mb-10">
          {"// Trust & safety"}
        </p>

        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {TRUST_BADGES.map((badge) => (
              <div
                key={badge.title}
                className="bg-[#0F172A]/60 border border-white/5 rounded-2xl p-4 text-center"
              >
                <badge.icon className="text-emerald-400 w-6 h-6 mx-auto mb-2" />
                <h3 className="text-xs font-bold text-slate-200 mb-1">
                  {badge.title}
                </h3>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {badge.description}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
