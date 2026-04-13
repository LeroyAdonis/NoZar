import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { ScrollReveal } from "~/components/motion/scroll-reveal";
import {
  StaggerChildren,
  StaggerItem,
} from "~/components/motion/stagger-children";

type Testimonial = {
  initials: string;
  name: string;
  location: string;
  traded: string;
  quote: string;
};

const testimonials: Testimonial[] = [
  {
    initials: "S",
    name: "Sipho M.",
    location: "Soweto, JHB",
    traded: "Acoustic guitar → Handmade laptop stand",
    quote:
      "I had a guitar collecting dust for two years. Within a week on NoZar, I found someone in Sandton who made custom laptop stands. No cash changed hands — just a clean swap.",
  },
  {
    initials: "F",
    name: "Fatima K.",
    location: "Cape Town, WC",
    traded: "Homemade preserves → Garden tools",
    quote:
      "I make fig jam and chutney every season, way more than we can eat. Through NoZar, I connected with a retired gardener in Stellenbosch who had spare tools. Three jars of jam for a complete pruning set!",
  },
  {
    initials: "T",
    name: "Thabo D.",
    location: "Midrand, JHB",
    traded: "Web design services → Photography sessions",
    quote:
      "As a freelance web developer, I bartered a landing page build for a professional headshot session. My new client profile photo has already landed me two paying clients. NoZar paid for itself.",
  },
];

function StarRating() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-4 h-4 fill-emerald-500 text-emerald-500"
        />
      ))}
    </div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-slate-950">{initials}</span>
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24"
    >
      <ScrollReveal>
        <div className="mb-16">
          <span className="text-emerald-500 font-mono text-xs uppercase tracking-widest block mb-4">
            // Network.Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase">
            Verified Trades.
          </h2>
        </div>
      </ScrollReveal>

      <StaggerChildren className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 md:grid md:grid-cols-3 md:overflow-visible scrollbar-hide">
        {testimonials.map((t) => (
          <StaggerItem
            key={t.name}
            className="min-w-[85vw] md:min-w-0 snap-center"
          >
            <Card
              variant="glass"
              className="h-full hover:border-white/20 transition-all duration-500"
            >
              <CardContent className="flex flex-col gap-5">
                {/* Quote icon */}
                <Quote className="w-8 h-8 text-emerald-500/40 rotate-180" />

                {/* Testimonial text */}
                <p className="text-slate-300 italic leading-relaxed text-sm">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Star rating */}
                <StarRating />

                {/* Author info */}
                <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                  <Avatar initials={t.initials} />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-50 text-sm">
                      {t.name}
                    </p>
                    <p className="font-mono text-xs text-slate-400">
                      {t.location}
                    </p>
                  </div>
                </div>

                {/* What they traded */}
                <p className="text-xs text-emerald-400 font-mono">
                  {t.traded}
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerChildren>
    </section>
  );
}
