import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Zap, History, Globe, Lock } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

// Utility for lazy loading sections
const LazySection = ({ children }) => (
  <Suspense fallback={<div className="h-[400px] bg-[#0b0b1a] animate-pulse" />}>
    {children}
  </Suspense>
);

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#0b0b1a] text-[#ddddf0] font-sans selection:bg-[#00ff88] selection:text-[#0b0b1a]">
      {/* Hero Styles (Restored from previous step) */}
      <style>{`
        @keyframes grid-fade { from { opacity: 0; } to { opacity: 0.15; } }
        @keyframes orb-float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, -50px); } }
        @keyframes progress-grow { from { width: 0%; } to { width: var(--progress-width); } }
        .hero-grid {
          background-image: linear-gradient(to right, #2a2a4a 1px, transparent 1px), linear-gradient(to bottom, #2a2a4a 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(circle at center, black, transparent 80%);
          animation: grid-fade 2s ease-out forwards;
        }
        .orb { filter: blur(120px); animation: orb-float 20s infinite ease-in-out; }
        .progress-bar-animate { animation: progress-grow 1.5s cubic-bezier(0.65, 0, 0.35, 1) forwards; }
      `}</style>

      {/* Sticky Navbar */}
      <nav className="fixed top-0 left-0 w-full h-16 border-b border-[#2a2a4a] bg-[#0b0b1a]/80 backdrop-blur-md z-50 flex items-center justify-between px-8">
        <div className="flex items-center gap-2">
          <div className="text-xl font-mono font-bold tracking-tighter text-[#00ff88]">
            {'>'} VEKTOR<span className="text-white">LABS</span>
            <span className="animate-pulse ml-1">_</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/login" className="text-sm font-medium text-[#7777aa] hover:text-[#00ff88] transition-colors">
            Login
          </Link>
          <Link to="/register">
            <button className="bg-[#00ff88] text-[#0b0b1a] px-4 py-2 rounded-sm text-sm font-bold uppercase tracking-wider hover:bg-[#00ccff] transition-all">
              Start Free Trial
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center px-4 overflow-hidden pt-16">
        <div className="absolute inset-0 z-0">
          <div className="hero-grid absolute inset-0 opacity-15" />
          <div className="orb absolute top-1/4 -left-1/4 w-[60%] h-[60%] bg-[#00ff88]/10 rounded-full" />
          <div className="orb absolute bottom-1/4 -right-1/4 w-[60%] h-[60%] bg-[#00ccff]/10 rounded-full animation-delay-2000" />
        </div>

        <div className="relative z-10 max-w-5xl w-full text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-[#00ff88]/30 bg-[#00ff88]/5 text-[#00ff88] text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-4">
            Terminal Status: Operational
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-mono font-bold tracking-tight text-white leading-[1.1]">
            KNOW WHAT THE MARKET <br />
            IS DOING <span className="text-[#00ff88]">BEFORE IT DOES IT.</span>
          </h1>
          <p className="text-xl md:text-2xl text-[#7777aa] max-w-3xl mx-auto font-medium leading-relaxed">
            One avoided bad trade covers 50 months of subscription.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
            <Link to="/register">
              <button className="bg-[#00ff88] text-[#0b0b1a] px-12 py-5 rounded-sm text-lg font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,255,136,0.3)]">
                Start Free Trial
              </button>
            </Link>
            <a href="#live-preview">
              <button className="border border-[#00ccff] text-[#00ccff] px-12 py-5 rounded-sm text-lg font-bold uppercase tracking-widest hover:bg-[#00ccff]/10 transition-all">
                See Live Demo
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Live Preview Section */}
      <section id="live-preview" className="relative z-10 bg-[#0b0b1a] py-32 px-8 border-t border-[#2a2a4a]">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-mono font-bold text-white uppercase tracking-tighter">See it live.</h2>
          <div className="mt-2 h-px w-24 bg-[#00ff88] mx-auto" />
        </div>

        <div className="max-w-2xl mx-auto bg-[#11112a] border border-[#2a2a4a] rounded-sm p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4">
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-ping" />
                <span className="text-[10px] font-mono text-[#00ff88] uppercase tracking-widest">Live Stream</span>
             </div>
          </div>

          <div className="space-y-12">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono text-[#7777aa] uppercase tracking-[0.3em] mb-2">Market Regime</div>
                <div className="text-5xl font-mono font-bold text-[#00ff88] tracking-tighter">TRENDING</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-[#7777aa] uppercase tracking-[0.3em] mb-2">Confidence</div>
                <div className="text-5xl font-mono font-bold text-white">87<span className="text-[#7777aa] text-2xl">%</span></div>
              </div>
            </div>

            <div className="space-y-6">
              {[
                { label: 'Trending', val: 87, color: '#00ff88' },
                { label: 'Mean-Reverting', val: 8, color: '#00ccff' },
                { label: 'Volatile', val: 4, color: '#f5c542' },
                { label: 'Illiquid', val: 1, color: '#ff4455' },
              ].map((r) => (
                <div key={r.label} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-[#7777aa]">
                    <span>{r.label}</span>
                    <span style={{ color: r.color }}>{r.val}%</span>
                  </div>
                  <div className="h-1.5 bg-[#0b0b1a] rounded-full overflow-hidden">
                    <div 
                      className="progress-bar-animate h-full" 
                      style={{ backgroundColor: r.color, width: `${r.val}%`, '--progress-width': `${r.val}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-[#2a2a4a] flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="text-[10px] font-mono text-[#7777aa] uppercase">HMM-V4 Cluster</div>
                  <div className="h-4 w-px bg-[#2a2a4a]" />
                  <div className="text-[10px] font-mono text-white">BTC-USDT-PERP</div>
               </div>
               <div className="text-[10px] font-mono text-[#00ff88]">STATUS: OPTIMAL</div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Points Section */}
      <section className="bg-[#090910] py-24 px-8 border-t border-[#2a2a4a]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Regime-aware', desc: "Every signal knows what market it's in. No more trading trend-followers in a chop-zone.", icon: Globe },
            { title: 'Explainable', desc: 'No black box. Full math shown. Probability distributions and causal links for every call.', icon: ShieldCheck },
            { title: 'Verifiable', desc: 'Dated public performance log. Every regime call is archived and verifiable via our public feed.', icon: History },
          ].map((point) => (
            <div key={point.title} className="bg-[#11112a] p-8 border-l-2 border-[#00ccff] hover:bg-[#16162e] transition-colors">
              <point.icon className="h-6 w-6 text-[#00ccff] mb-6" />
              <h3 className="text-xl font-mono font-bold text-white uppercase tracking-tight mb-4">{point.title}</h3>
              <p className="text-sm text-[#7777aa] leading-relaxed">{point.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-[#0b0b1a] py-32 px-8 border-t border-[#2a2a4a]">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-mono font-bold text-white uppercase tracking-tighter">Choose your access.</h2>
          <p className="text-[#7777aa] mt-4 font-mono text-sm uppercase tracking-widest">Institutional intelligence, priced for the semi-pro.</p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { name: 'Trial', price: 'Free', sub: '14 days', features: ['3 symbols', 'All features', 'Community support'], cta: 'Start Free Trial', highlighted: false },
            { name: 'Standard', price: '$47', sub: '/mo', features: ['10 symbols', 'All features', '50 AI queries/day', 'Standard API'], cta: 'Get Standard', highlighted: true },
            { name: 'Unlimited', price: '$97', sub: '/mo', features: ['Unlimited symbols', 'Unlimited AI queries', 'Full API access', 'Priority support'], cta: 'Get Unlimited', highlighted: false },
          ].map((plan) => (
            <div 
              key={plan.name} 
              className={`p-10 bg-[#11112a] border flex flex-col ${plan.highlighted ? 'border-[#00ff88] scale-105 z-10' : 'border-[#2a2a4a] scale-100'}`}
            >
              <h3 className="text-xl font-mono font-bold text-white uppercase tracking-widest mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-mono font-bold text-white">{plan.price}</span>
                <span className="text-[#7777aa] font-mono text-sm uppercase tracking-widest">{plan.sub}</span>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-[#7777aa]">
                    <CheckCircle2 className="h-4 w-4 text-[#00ff88]" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-4 font-mono font-bold uppercase tracking-widest transition-all ${
                plan.highlighted 
                  ? 'bg-[#00ff88] text-[#0b0b1a] hover:bg-[#00ccff]' 
                  : 'border border-[#7777aa] text-[#7777aa] hover:border-white hover:text-white'
              }`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
           <div className="inline-flex items-center gap-4 px-6 py-3 border border-[#2a2a4a] rounded-full bg-[#11112a]/50">
              <span className="text-xs font-mono text-[#7777aa] uppercase tracking-widest">Payments secured by OxaPay</span>
              <div className="h-4 w-px bg-[#2a2a4a]" />
              <div className="flex gap-2">
                 {['BTC', 'ETH', 'USDT'].map(c => <span key={c} className="text-[10px] font-mono text-white opacity-50">{c}</span>)}
              </div>
           </div>
        </div>
      </section>

      {/* Performance Log Section */}
      <section className="bg-[#090910] py-32 px-8 border-t border-[#2a2a4a]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-mono font-bold text-white uppercase tracking-tighter">Performance Log.</h2>
              <p className="text-[#7777aa] mt-2 font-mono text-xs uppercase tracking-widest">Walk-forward validated. No hindsight.</p>
            </div>
            <div className="hidden md:block h-px flex-1 mx-12 bg-gradient-to-r from-[#2a2a4a] to-transparent" />
          </div>

          <div className="overflow-x-auto no-scrollbar border border-[#2a2a4a]">
            <table className="w-full text-left font-mono text-[11px] uppercase tracking-widest border-collapse">
              <thead>
                <tr className="bg-[#11112a] border-b border-[#2a2a4a]">
                  <th className="px-6 py-4 font-bold text-[#7777aa]">Date</th>
                  <th className="px-6 py-4 font-bold text-[#7777aa]">Symbol</th>
                  <th className="px-6 py-4 font-bold text-[#7777aa]">Regime Called</th>
                  <th className="px-6 py-4 font-bold text-[#7777aa]">Confidence</th>
                  <th className="px-6 py-4 font-bold text-[#7777aa]">Outcome</th>
                  <th className="px-6 py-4 font-bold text-[#7777aa] text-right">Return Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a4a]">
                {[
                  { date: '2024.04.28', sym: 'BTC-PERP', reg: 'TRENDING', conf: '92%', out: 'CONFIRMED', ret: '+4.2%' },
                  { date: '2024.04.26', sym: 'ETH-PERP', reg: 'VOLATILE', conf: '84%', out: 'CONFIRMED', ret: '-1.2%' },
                  { date: '2024.04.25', sym: 'SOL-PERP', reg: 'MEAN-REV', conf: '89%', out: 'CONFIRMED', ret: '+0.8%' },
                  { date: '2024.04.22', sym: 'BTC-PERP', reg: 'TRENDING', conf: '94%', out: 'CONFIRMED', ret: '+2.1%' },
                  { date: '2024.04.20', sym: 'BNB-PERP', reg: 'ILLIQUID', conf: '78%', out: 'AVOIDED', ret: 'N/A' },
                  { date: '2024.04.18', sym: 'BTC-PERP', reg: 'VOLATILE', conf: '81%', out: 'CONFIRMED', ret: '-0.4%' },
                  { date: '2024.04.15', sym: 'ETH-PERP', reg: 'TRENDING', conf: '90%', out: 'CONFIRMED', ret: '+3.5%' },
                  { date: '2024.04.12', sym: 'SOL-PERP', reg: 'MEAN-REV', conf: '86%', out: 'CONFIRMED', ret: '+1.1%' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-[#555570]">{row.date}</td>
                    <td className="px-6 py-4 text-white font-bold">{row.sym}</td>
                    <td className="px-6 py-4 text-[#00ff88]">{row.reg}</td>
                    <td className="px-6 py-4 text-[#7777aa]">{row.conf}</td>
                    <td className="px-6 py-4 text-[#00ccff]">{row.out}</td>
                    <td className="px-6 py-4 text-right text-white font-bold">{row.ret}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[9px] text-[#555570] font-mono uppercase tracking-[0.3em] text-center">
            Historical performance is not indicative of future results. All trades carry risk.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0b0b1a] border-t border-[#2a2a4a] py-16 px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-sm font-mono font-bold tracking-tighter text-[#00ff88]">
            VEKTOR<span className="text-white">LABS</span>
          </div>
          <div className="flex gap-8 text-[10px] font-mono uppercase tracking-[0.2em] text-[#7777aa]">
            <Link to="/docs" className="hover:text-white transition-colors">Docs</Link>
            <a href="#" className="hover:text-white transition-colors">Twitter/X</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
          <div className="text-[9px] font-mono text-[#555570] uppercase tracking-widest">
            © 2026 VEKTOR LABS AG.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
