import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight, Globe, Loader2, MapPin, Package, Sparkles, Star,
  Trophy, X, RefreshCcw, Share2, ChevronRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Sticker {
  id: string;
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  landmarkEmoji: string;
  primaryColor: string;
  secondaryColor: string;
  funFact: string;
  amountCents: number;
  currency: string;
  createdAt: string | null;
}

// ── Sticker SVG component ──────────────────────────────────────────────────
function StickerBadge({
  sticker,
  size = "md",
  animate = false,
  shine = false,
}: {
  sticker: Sticker;
  size?: "sm" | "md" | "lg" | "xl";
  animate?: boolean;
  shine?: boolean;
}) {
  const dims = { sm: 96, md: 140, lg: 200, xl: 280 };
  const d = dims[size];
  const cx = d / 2;
  const r = d * 0.46;
  const inner = d * 0.38;

  // Convert hex to rgb for glow
  const hex = sticker.primaryColor.replace("#", "");
  const rgbR = parseInt(hex.substring(0, 2), 16);
  const rgbG = parseInt(hex.substring(2, 4), 16);
  const rgbB = parseInt(hex.substring(4, 6), 16);

  const fontSizes = { sm: { flag: d * 0.22, land: d * 0.13, name: d * 0.07, sub: d * 0.055 }, md: { flag: d * 0.22, land: d * 0.14, name: d * 0.075, sub: d * 0.058 }, lg: { flag: d * 0.22, land: d * 0.14, name: d * 0.072, sub: d * 0.055 }, xl: { flag: d * 0.2, land: d * 0.12, name: d * 0.068, sub: d * 0.05 } };
  const fs = fontSizes[size];

  return (
    <div
      className={`relative select-none ${animate ? "animate-sticker-pop" : ""}`}
      style={{ width: d, height: d }}
    >
      <svg viewBox={`0 0 ${d} ${d}`} width={d} height={d} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id={`bg-${sticker.id}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor={sticker.secondaryColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor={sticker.primaryColor} stopOpacity="1" />
          </radialGradient>
          <radialGradient id={`shine-${sticker.id}`} cx="35%" cy="25%" r="60%">
            <stop offset="0%" stopColor="white" stopOpacity="0.35" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <filter id={`shadow-${sticker.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy={d * 0.025} stdDeviation={d * 0.035} floodColor={`rgb(${rgbR},${rgbG},${rgbB})`} floodOpacity="0.55" />
          </filter>
          <clipPath id={`clip-${sticker.id}`}>
            <circle cx={cx} cy={cx} r={r} />
          </clipPath>
        </defs>

        {/* Outer glow ring */}
        <circle cx={cx} cy={cx} r={r + d * 0.02} fill="none" stroke={sticker.primaryColor} strokeWidth={d * 0.008} strokeOpacity="0.3" />

        {/* Main circle */}
        <circle cx={cx} cy={cx} r={r} fill={`url(#bg-${sticker.id})`} filter={`url(#shadow-${sticker.id})`} />

        {/* Dashed stamp border */}
        <circle cx={cx} cy={cx} r={r - d * 0.025} fill="none" stroke="white" strokeWidth={d * 0.012} strokeOpacity="0.7" strokeDasharray={`${d * 0.03} ${d * 0.022}`} />

        {/* Inner ring */}
        <circle cx={cx} cy={cx} r={inner + d * 0.03} fill="none" stroke="white" strokeWidth={d * 0.005} strokeOpacity="0.35" />

        {/* Stars decoration */}
        {[0, 72, 144, 216, 288].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const starR = r - d * 0.06;
          const sx = cx + starR * Math.cos(rad - Math.PI / 2);
          const sy = cx + starR * Math.sin(rad - Math.PI / 2);
          return (
            <text key={angle} x={sx} y={sy} textAnchor="middle" dominantBaseline="central"
              fontSize={d * 0.04} fill="white" fillOpacity="0.5">✦</text>
          );
        })}

        {/* Country flag emoji (top) */}
        <text x={cx} y={cx - d * 0.1} textAnchor="middle" dominantBaseline="central" fontSize={fs.flag}>{sticker.flagEmoji}</text>

        {/* Divider */}
        <line x1={cx - d * 0.12} y1={cx + d * 0.05} x2={cx + d * 0.12} y2={cx + d * 0.05} stroke="white" strokeWidth={d * 0.005} strokeOpacity="0.5" />

        {/* Country name */}
        <text x={cx} y={cx + d * 0.13} textAnchor="middle" dominantBaseline="central"
          fontSize={fs.name} fontWeight="800" fill="white" fontFamily="system-ui,sans-serif"
          style={{ letterSpacing: d * 0.002 }}>
          {sticker.countryName.toUpperCase()}
        </text>

        {/* Landmark emoji */}
        <text x={cx} y={cx + d * 0.26} textAnchor="middle" dominantBaseline="central" fontSize={fs.land}>{sticker.landmarkEmoji}</text>

        {/* Shine overlay */}
        {shine && <circle cx={cx} cy={cx} r={r} fill={`url(#shine-${sticker.id})`} clipPath={`url(#clip-${sticker.id})`} />}

        {/* Bottom label */}
        <text x={cx} y={cx + d * 0.38} textAnchor="middle" dominantBaseline="central"
          fontSize={fs.sub} fill="white" fillOpacity="0.6" fontFamily="system-ui,sans-serif"
          style={{ letterSpacing: d * 0.004 }}>
          VISA SHUTTLE
        </text>
      </svg>
    </div>
  );
}

// ── Reveal animation overlay ───────────────────────────────────────────────
function StickerReveal({ sticker, onClose }: { sticker: Sticker; onClose: () => void }) {
  const [phase, setPhase] = useState<"spin" | "reveal" | "done">("spin");
  const { toast } = useToast();

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 2200);
    const t2 = setTimeout(() => setPhase("done"), 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  function handleShare() {
    const text = `I just got a ${sticker.countryName} virtual sticker on Visa Shuttle! 🌍✈️`;
    if (navigator.share) { navigator.share({ text, url: window.location.origin + "/travel-sticker" }); }
    else { navigator.clipboard.writeText(text); toast({ title: "Copied to clipboard!" }); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="relative text-center px-6 max-w-sm w-full">
        {/* Particle burst */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(24)].map((_, i) => {
            const angle = (i / 24) * 360;
            const dist = 80 + Math.random() * 80;
            const size = 4 + Math.random() * 8;
            const colors = ["#4055FF", "#FF2060", "#FFBF00", "#00E5A0", "#FF6B35", "#A855F7"];
            return (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: size, height: size,
                  background: colors[i % colors.length],
                  left: "50%", top: "50%",
                  transform: `translate(-50%,-50%)`,
                  opacity: phase === "spin" ? 0 : phase === "reveal" ? 1 : 0,
                  transition: `all 0.8s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.02}s`,
                  ...(phase !== "spin" && {
                    transform: `translate(calc(-50% + ${Math.cos(angle * Math.PI / 180) * dist}px), calc(-50% + ${Math.sin(angle * Math.PI / 180) * dist}px))`,
                  }),
                }}
              />
            );
          })}
        </div>

        {/* Globe spinning → sticker reveal */}
        <div className="flex items-center justify-center mb-6">
          {phase === "spin" ? (
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#4055FF] to-[#9033F5] flex items-center justify-center shadow-2xl shadow-[#4055FF]/50"
                style={{ animation: "spin 0.8s linear infinite" }}>
                <Globe className="w-16 h-16 text-white/80" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-white/20"
                style={{ animation: "ping 1s ease infinite" }} />
            </div>
          ) : (
            <div style={{
              transform: phase === "reveal" ? "scale(1.15) rotate(-5deg)" : "scale(1) rotate(0deg)",
              transition: "transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
              filter: `drop-shadow(0 0 30px ${sticker.primaryColor}80)`,
            }}>
              <StickerBadge sticker={sticker} size="xl" shine />
            </div>
          )}
        </div>

        {phase !== "spin" && (
          <div style={{ opacity: phase === "done" ? 1 : 0, transform: phase === "done" ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease 0.2s" }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">🎉</span>
              <h2 className="text-2xl font-black text-white">You got {sticker.countryName}!</h2>
              <span className="text-2xl">🎉</span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-6 px-4">
              <span className="text-white/90 font-semibold">Fun fact:</span> {sticker.funFact}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleShare} variant="outline" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Share2 className="w-4 h-4" />Share
              </Button>
              <Button onClick={onClose} className="gap-2" style={{ background: "linear-gradient(135deg,#4055FF,#9033F5)", border: 0 }}>
                <Trophy className="w-4 h-4" />View Collection
              </Button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.8); opacity: 0; } }
      `}</style>
    </div>
  );
}

// ── Preview stickers for hero (sample data) ────────────────────────────────
const PREVIEW_STICKERS: Sticker[] = [
  { id: "p1", countryCode: "JP", countryName: "Japan", flagEmoji: "🇯🇵", landmarkEmoji: "⛩️", primaryColor: "#BC002D", secondaryColor: "#FFFFFF", funFact: "", amountCents: 100, currency: "USD", createdAt: null },
  { id: "p2", countryCode: "FR", countryName: "France", flagEmoji: "🇫🇷", landmarkEmoji: "🗼", primaryColor: "#002395", secondaryColor: "#ED2939", funFact: "", amountCents: 100, currency: "USD", createdAt: null },
  { id: "p3", countryCode: "BR", countryName: "Brazil", flagEmoji: "🇧🇷", landmarkEmoji: "🌴", primaryColor: "#009C3B", secondaryColor: "#FFDF00", funFact: "", amountCents: 100, currency: "USD", createdAt: null },
  { id: "p4", countryCode: "IN", countryName: "India", flagEmoji: "🇮🇳", landmarkEmoji: "🕌", primaryColor: "#FF9933", secondaryColor: "#138808", funFact: "", amountCents: 100, currency: "USD", createdAt: null },
  { id: "p5", countryCode: "AU", countryName: "Australia", flagEmoji: "🇦🇺", landmarkEmoji: "🦘", primaryColor: "#00008B", secondaryColor: "#FFBF00", funFact: "", amountCents: 100, currency: "USD", createdAt: null },
  { id: "p6", countryCode: "IS", countryName: "Iceland", flagEmoji: "🇮🇸", landmarkEmoji: "🌋", primaryColor: "#003897", secondaryColor: "#DC1E35", funFact: "", amountCents: 100, currency: "USD", createdAt: null },
  { id: "p7", countryCode: "TR", countryName: "Türkiye", flagEmoji: "🇹🇷", landmarkEmoji: "🕌", primaryColor: "#E30A17", secondaryColor: "#FFFFFF", funFact: "", amountCents: 100, currency: "USD", createdAt: null },
];

// ── Main Page ──────────────────────────────────────────────────────────────
export default function TravelStickerPage() {
  const { user, isLoading: authLoading } = useB2cAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOrdering, setIsOrdering] = useState(false);
  const [revealSticker, setRevealSticker] = useState<Sticker | null>(null);
  const [verifying, setVerifying] = useState(false);

  const sessionId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("session_id")
    : null;
  const canceled = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("canceled")
    : null;

  const { data: collectionData, isLoading: collectionLoading } = useQuery<{ stickers: Sticker[] }>({
    queryKey: ["/api/b2c/stickers"],
    enabled: !!user,
  });
  const stickers = collectionData?.stickers ?? [];

  // Verify payment on return from Stripe
  useEffect(() => {
    if (!sessionId || !user || verifying) return;
    setVerifying(true);
    fetch(`/api/b2c/stickers/verify?session_id=${encodeURIComponent(sessionId)}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.sticker) {
          queryClient.invalidateQueries({ queryKey: ["/api/b2c/stickers"] });
          // Clear the session_id from the URL
          window.history.replaceState({}, "", "/travel-sticker");
          setTimeout(() => setRevealSticker(d.sticker), 400);
        } else if (d.error) {
          toast({ title: "Payment issue", description: d.error, variant: "destructive" });
          window.history.replaceState({}, "", "/travel-sticker");
        }
      })
      .catch(() => toast({ title: "Verification failed", variant: "destructive" }))
      .finally(() => setVerifying(false));
  }, [sessionId, user]);

  async function handleGetSticker() {
    if (!user) { setLocation("/sign-in?next=/travel-sticker"); return; }
    setIsOrdering(true);
    try {
      const r = await fetch("/api/b2c/stickers/order", { method: "POST", credentials: "include" });
      const d = await r.json();
      if (!r.ok || !d.checkoutUrl) throw new Error(d.error || "Could not start checkout");
      window.location.href = d.checkoutUrl;
    } catch (e: any) {
      toast({ title: "Checkout failed", description: e.message, variant: "destructive" });
      setIsOrdering(false);
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-hidden relative" style={{background:"linear-gradient(160deg,#03071e 0%,#0a0a2e 40%,#0d1b4b 70%,#0a2a1a 100%)"}}>

        {/* Stars */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(80)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 2.5 + 0.5,
                height: Math.random() * 2.5 + 0.5,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.7 + 0.15,
                animation: `twinkle ${2 + Math.random() * 4}s ease-in-out ${Math.random() * 4}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Curved earth horizon at bottom */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden" style={{height:"38%"}}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{
              width:"160vw", height:"160vw",
              borderRadius:"50%",
              background:"linear-gradient(180deg,#0d4f2e 0%,#0a3d22 30%,#072c18 60%,#051d10 100%)",
              boxShadow:"0 -4px 60px rgba(0,180,80,0.15), inset 0 4px 40px rgba(0,200,100,0.1)",
            }}
          />
          {/* Atmosphere glow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{
              width:"162vw", height:"162vw",
              borderRadius:"50%",
              background:"transparent",
              boxShadow:"0 -12px 80px rgba(20,200,120,0.18)",
            }}
          />
          {/* City lights dots */}
          {[...Array(18)].map((_, i) => (
            <div key={i} className="absolute rounded-full"
              style={{
                width: Math.random() * 3 + 1,
                height: Math.random() * 3 + 1,
                bottom: `${8 + Math.random() * 28}%`,
                left: `${5 + Math.random() * 90}%`,
                background: ["#FFE066","#FFA040","#80CFFF","#FFFFFF"][i%4],
                opacity: 0.5 + Math.random() * 0.4,
                animation: `twinkle ${1.5 + Math.random() * 3}s ease-in-out ${Math.random() * 3}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Clouds */}
        {[
          {top:"28%",left:"-8%",w:260,op:0.13,dur:28},
          {top:"38%",left:"75%",w:200,op:0.1,dur:22},
          {top:"18%",left:"60%",w:180,op:0.08,dur:35},
        ].map((c,i)=>(
          <div key={i} className="absolute pointer-events-none" style={{top:c.top,left:c.left,opacity:c.op,animation:`cloud-drift ${c.dur}s linear infinite`}}>
            <svg width={c.w} viewBox="0 0 200 70" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="100" cy="50" rx="90" ry="22" fill="white"/>
              <ellipse cx="70" cy="38" rx="45" ry="28" fill="white"/>
              <ellipse cx="130" cy="40" rx="40" ry="24" fill="white"/>
              <ellipse cx="100" cy="34" rx="50" ry="30" fill="white"/>
            </svg>
          </div>
        ))}

        {/* Airplane */}
        <div className="absolute" style={{animation:"fly-across 6s cubic-bezier(0.45,0,0.55,1) infinite", top:"30%"}}>
          <div style={{transform:"rotate(-8deg) scale(1)", filter:"drop-shadow(0 0 18px rgba(100,160,255,0.7))"}}>
            <svg width="110" height="44" viewBox="0 0 110 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Fuselage */}
              <ellipse cx="55" cy="22" rx="48" ry="9" fill="url(#plane-body)"/>
              {/* Nose */}
              <ellipse cx="96" cy="22" rx="14" ry="7" fill="#E8F0FF"/>
              {/* Main wing */}
              <path d="M55 22 L72 4 L82 8 L65 22Z" fill="#C8D8FF" opacity="0.95"/>
              <path d="M55 22 L72 40 L82 36 L65 22Z" fill="#C8D8FF" opacity="0.85"/>
              {/* Tail */}
              <path d="M14 22 L6 10 L18 14 L20 22Z" fill="#B0C4FF" opacity="0.9"/>
              <path d="M14 22 L6 34 L18 30 L20 22Z" fill="#B0C4FF" opacity="0.8"/>
              {/* Windows */}
              {[76,68,60,52,44].map((x,i)=>(
                <ellipse key={i} cx={x} cy="19" rx="3.5" ry="2.5" fill="#E0F0FF" opacity="0.7"/>
              ))}
              {/* Engine */}
              <ellipse cx="63" cy="28" rx="8" ry="4" fill="#A0B8E8" opacity="0.8"/>
              <defs>
                <linearGradient id="plane-body" x1="7" y1="22" x2="103" y2="22" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7090D0"/>
                  <stop offset="50%" stopColor="#C8D8FF"/>
                  <stop offset="100%" stopColor="#E8F0FF"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          {/* Contrail */}
          <div className="absolute top-1/2 right-full -translate-y-1/2" style={{width:120, height:6, marginRight:4}}>
            <div style={{width:"100%",height:"2px",background:"linear-gradient(to left,rgba(180,210,255,0.6),transparent)",borderRadius:2,marginTop:6}}/>
            <div style={{width:"70%",height:"2px",background:"linear-gradient(to left,rgba(180,210,255,0.35),transparent)",borderRadius:2,marginTop:3}}/>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center gap-6 text-white text-center px-6">
          {/* Globe ring */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background:"linear-gradient(135deg,rgba(64,85,255,0.3),rgba(144,51,245,0.3))",
                border:"1.5px solid rgba(100,140,255,0.35)",
                boxShadow:"0 0 40px rgba(64,85,255,0.3), 0 0 80px rgba(64,85,255,0.1)",
                animation:"globe-spin 3s ease-in-out infinite",
              }}>
              <Globe className="w-9 h-9 text-blue-300" />
            </div>
            {/* Orbit ring */}
            <div className="absolute inset-0 rounded-full border border-blue-400/20"
              style={{transform:"rotateX(70deg)", animation:"orbit 4s linear infinite"}}/>
          </div>

          <div>
            <h2 className="text-xl font-black mb-1.5 tracking-wide" style={{textShadow:"0 0 30px rgba(100,160,255,0.5)"}}>
              {"Confirming Your Boarding Pass"}
            </h2>
            <p className="text-sm text-blue-200/60 leading-relaxed">
              {"Verifying your payment and generating your lucky sticker…"}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {[0,1,2,3].map(i=>(
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400"
                style={{animation:`dot-bounce 1.4s ease-in-out ${i*0.2}s infinite`, opacity:0.4}}/>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes twinkle { 0%,100%{opacity:0.15} 50%{opacity:0.9} }
          @keyframes fly-across {
            0%   { left: -15%; opacity: 0; }
            8%   { opacity: 1; }
            92%  { opacity: 1; }
            100% { left: 110%; opacity: 0; }
          }
          @keyframes cloud-drift { from { transform: translateX(0) } to { transform: translateX(110vw) } }
          @keyframes globe-spin {
            0%,100% { transform: scale(1); box-shadow: 0 0 40px rgba(64,85,255,0.3); }
            50%     { transform: scale(1.06); box-shadow: 0 0 60px rgba(64,85,255,0.5); }
          }
          @keyframes orbit { from{transform:rotateX(70deg) rotateZ(0deg)} to{transform:rotateX(70deg) rotateZ(360deg)} }
          @keyframes dot-bounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-6px);opacity:1} }
        `}</style>
      </div>
    );
  }

  return (
    <DashboardLayout title="Travel Stickers" subtitle="Collect your lucky country stickers">
      {/* Reveal overlay */}
      {revealSticker && <StickerReveal sticker={revealSticker} onClose={() => setRevealSticker(null)} />}

      {/* Canceled banner */}
      {canceled && (
        <div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <X className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">Payment was cancelled. Your card was not charged.</p>
        </div>
      )}

      {/* Hero section */}
      <div className="relative overflow-hidden rounded-3xl mb-8 p-8 md:p-12"
        style={{ background: "linear-gradient(135deg, #0A0A1A 0%, #1A0533 40%, #0A1A3A 100%)" }}>

        {/* Floating preview stickers */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {PREVIEW_STICKERS.map((s, i) => {
            const positions = [
              { top: "5%", right: "2%", rotate: "12deg", scale: 0.7 },
              { top: "55%", right: "8%", rotate: "-8deg", scale: 0.6 },
              { top: "10%", right: "22%", rotate: "5deg", scale: 0.55 },
              { top: "65%", right: "28%", rotate: "-15deg", scale: 0.5 },
              { top: "-5%", right: "40%", rotate: "20deg", scale: 0.45 },
              { top: "60%", right: "44%", rotate: "-5deg", scale: 0.4 },
              { top: "20%", right: "55%", rotate: "10deg", scale: 0.35 },
            ];
            const pos = positions[i] || positions[0];
            return (
              <div key={s.id} className="absolute opacity-30 md:opacity-50"
                style={{
                  top: pos.top, right: pos.right,
                  transform: `rotate(${pos.rotate}) scale(${pos.scale})`,
                  animation: `float-${i % 3} ${3 + i * 0.5}s ease-in-out infinite`,
                  transformOrigin: "center",
                }}>
                <StickerBadge sticker={s} size="lg" shine />
              </div>
            );
          })}
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-[#4055FF]/30 text-[#7B94FF] border-[#4055FF]/40 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1" />New Feature
            </Badge>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
              Only $1 USD
            </Badge>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
            Your Lucky<br />
            <span className="bg-gradient-to-r from-[#4055FF] via-[#9033F5] to-[#FF2060] bg-clip-text text-transparent">
              Country Sticker
            </span>
          </h1>
          <p className="text-white/60 text-base md:text-lg leading-relaxed mb-8 max-w-md">
            Spin the globe and discover your lucky destination. Each $1 sticker is a beautifully designed virtual passport stamp — collect them all! 🌍
          </p>

          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={handleGetSticker}
              disabled={isOrdering}
              className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-black text-base transition-all hover:scale-105 hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)", boxShadow: "0 8px 32px rgba(64,85,255,0.4)" }}
            >
              {isOrdering ? (
                <><Loader2 className="w-5 h-5 animate-spin" />Processing…</>
              ) : (
                <>
                  <Globe className="w-5 h-5 group-hover:animate-spin" />
                  Get My Lucky Sticker — $1
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
              {/* Shimmer */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </div>
            </button>

            {stickers.length > 0 && (
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-white/70 font-semibold">{stickers.length}</span> sticker{stickers.length !== 1 ? "s" : ""} collected
              </div>
            )}
          </div>

          {!user && (
            <p className="mt-3 text-white/40 text-xs">
              <Link href="/sign-in?next=/travel-sticker" className="text-[#7B94FF] hover:underline">Sign in</Link> to purchase and collect stickers
            </p>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { icon: "💳", step: "01", title: "Pay $1", desc: "Secure payment via Stripe. One sticker per payment." },
          { icon: "🌍", step: "02", title: "Spin the Globe", desc: "A random lucky country is revealed just for you." },
          { icon: "✨", step: "03", title: "Collect & Share", desc: "Build your collection. Brag about your lucky destinations!" },
        ].map(({ icon, step, title, desc }) => (
          <div key={step} className="p-5 rounded-2xl border border-border bg-card hover:border-[#4055FF]/30 transition-colors group">
            <div className="flex items-start gap-4">
              <div className="text-3xl flex-shrink-0">{icon}</div>
              <div>
                <div className="text-xs font-bold text-[#4055FF] mb-1">{step}</div>
                <h3 className="font-black text-sm mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Collection */}
      {user && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4055FF] to-[#9033F5] flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-black text-base">My Collection</h2>
                <p className="text-xs text-muted-foreground">{stickers.length} of 195 countries</p>
              </div>
            </div>
            {stickers.length > 0 && (
              <div className="flex items-center gap-1.5">
                {[...Array(Math.min(Math.floor(stickers.length / 10) + (stickers.length > 0 ? 1 : 0), 5))].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
                {stickers.length > 5 && <span className="text-xs font-bold text-amber-500">+{stickers.length - 5}</span>}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-6 p-4 rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-muted-foreground">Collection Progress</span>
              <span className="font-black text-[#4055FF]">{stickers.length}/195</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.max((stickers.length / 195) * 100, 2)}%`,
                  background: "linear-gradient(90deg,#4055FF,#9033F5,#FF2060)",
                  boxShadow: "0 0 10px rgba(64,85,255,0.4)",
                }}
              />
            </div>
            {stickers.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">Get your first sticker to start your collection!</p>
            )}
          </div>

          {collectionLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />Loading your collection…
            </div>
          ) : stickers.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4055FF]/10 to-[#9033F5]/10 flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-[#4055FF]/20">
                <Globe className="w-10 h-10 text-[#4055FF]/40" />
              </div>
              <h3 className="font-black text-base mb-2">No stickers yet</h3>
              <p className="text-sm text-muted-foreground mb-6">Your collection is waiting. Get your first lucky sticker for just $1!</p>
              <button onClick={handleGetSticker} disabled={isOrdering}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold"
                style={{ background: "linear-gradient(135deg,#4055FF,#9033F5)" }}>
                {isOrdering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                Get First Sticker — $1
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {stickers.map((sticker, i) => (
                <div
                  key={sticker.id}
                  className="group relative flex flex-col items-center p-4 rounded-2xl border border-border bg-card hover:border-[#4055FF]/40 hover:shadow-lg transition-all cursor-default"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="transition-transform group-hover:-translate-y-1 group-hover:scale-105"
                    style={{ filter: `drop-shadow(0 4px 12px ${sticker.primaryColor}50)` }}>
                    <StickerBadge sticker={sticker} size="md" shine />
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-xs font-black leading-tight">{sticker.countryName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {sticker.createdAt ? new Date(sticker.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}
                    </p>
                  </div>

                  {/* Hover card with fun fact */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 rounded-xl bg-slate-900 text-white text-xs leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-10 shadow-xl border border-white/10">
                    <p className="font-bold mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-[#4055FF]" />{sticker.countryName}
                    </p>
                    <p className="text-white/70">{sticker.funFact}</p>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
                  </div>
                </div>
              ))}

              {/* "Get more" card */}
              <button
                onClick={handleGetSticker}
                disabled={isOrdering}
                className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-[#4055FF]/30 bg-[#4055FF]/5 hover:border-[#4055FF]/60 hover:bg-[#4055FF]/10 transition-all group min-h-[160px]"
              >
                {isOrdering ? (
                  <Loader2 className="w-8 h-8 text-[#4055FF] animate-spin" />
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4055FF] to-[#9033F5] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-[#4055FF]/30">
                      <RefreshCcw className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-black text-[#4055FF]">Get Another</p>
                    <p className="text-[10px] text-muted-foreground">$1 USD</p>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Not logged in CTA */}
      {!user && (
        <div className="mt-6 p-6 rounded-2xl border border-[#4055FF]/20 bg-[#4055FF]/5 text-center">
          <Globe className="w-10 h-10 text-[#4055FF] mx-auto mb-3" />
          <h3 className="font-black mb-1">Ready to collect?</h3>
          <p className="text-sm text-muted-foreground mb-4">Sign in to purchase stickers and build your collection.</p>
          <Link href="/sign-in?next=/travel-sticker">
            <Button className="gap-2" style={{ background: "linear-gradient(135deg,#4055FF,#9033F5)", border: 0 }}>
              Sign in to get started <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}

      <style>{`
        @keyframes float-0 { 0%,100% { transform: inherit; margin-top: 0px; } 50% { margin-top: -12px; } }
        @keyframes float-1 { 0%,100% { transform: inherit; margin-top: 0px; } 50% { margin-top: -8px; } }
        @keyframes float-2 { 0%,100% { transform: inherit; margin-top: 0px; } 50% { margin-top: -16px; } }
        @keyframes animate-sticker-pop { 0% { transform: scale(0.3) rotate(-15deg); opacity: 0; } 60% { transform: scale(1.1) rotate(3deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
        .animate-sticker-pop { animation: animate-sticker-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      `}</style>
    </DashboardLayout>
  );
}
