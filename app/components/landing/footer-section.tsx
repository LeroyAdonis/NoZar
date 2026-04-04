import { Link } from "react-router";
import { Repeat } from "lucide-react";
import { ScrollReveal } from "~/components/motion/scroll-reveal";

const anchorLinks = [
  { label: "How It Works", id: "how-it-works" },
  { label: "Features", id: "consumers" },
  { label: "Pricing", id: "pricing" },
  { label: "FAQ", id: "faq" },
] as const;

const legalLinks = [
  { label: "Terms of Service", to: "/legal/terms" },
  { label: "Privacy Policy", to: "/legal/privacy" },
  { label: "Community Guidelines", to: "/legal/community-guidelines" },
  { label: "Complaints Process", to: "/legal/complaints" },
] as const;

const linkClasses =
  "text-sm text-slate-400 hover:text-emerald-400 transition-colors";

export default function FooterSection() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#030712] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Column Grid */}
        <ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pb-12">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Repeat className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
              </div>
              <span className="text-2xl font-black tracking-tighter uppercase text-white">
                NoZar<span className="text-emerald-500">.</span>
              </span>
            </div>
            <p className="font-mono text-xs uppercase tracking-widest text-emerald-500 mb-2">
              Trade without cash.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              The spatial barter network for South Africa. Bypass inflation by
              exchanging idle assets directly.
            </p>
          </div>

          {/* Platform Column */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-emerald-500 mb-4">
              Platform
            </h4>
            <ul className="space-y-3">
              {anchorLinks.map(({ label, id }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className={linkClasses}
                    onClick={(e) => {
                      e.preventDefault();
                      document
                        .getElementById(id)
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-emerald-500 mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              {legalLinks.map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className={linkClasses}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect Column */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-emerald-500 mb-4">
              Connect
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:hello@nozar.co.za"
                  className={linkClasses}
                >
                  hello@nozar.co.za
                </a>
              </li>
              <li>
                <span className="text-sm text-slate-400">
                  Follow us on X (Twitter)
                </span>
              </li>
              <li>
                <span className="text-sm text-slate-400">
                  Cape Town &amp; Johannesburg, RSA
                </span>
              </li>
            </ul>
          </div>
        </div>
        </ScrollReveal>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-xs text-slate-600 uppercase tracking-widest">
          <p>Made with ❤️ in Mzansi 🇿🇦</p>
          <p>
            Sys.Build // {new Date().getFullYear()} // NoZar PTY LTD // RSA
          </p>
        </div>
      </div>
    </footer>
  );
}
