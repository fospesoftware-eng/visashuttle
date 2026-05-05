import { useId } from "react";
import type { SVGProps, ReactNode } from "react";

export type SignalKind =
  | "nationality"
  | "destination"
  | "visatype"
  | "intent"
  | "profile"
  | "finance"
  | "footprint"
  | "rejection"
  | "triplogic"
  | "return"
  | "stay"
  | "funding"
  | "docs"
  | "behavioral";

interface Props extends Omit<SVGProps<SVGSVGElement>, "children"> {
  kind: SignalKind;
}

const BRAND_BLUE = "#4055FF";
const BRAND_PURPLE = "#9033F5";
const BRAND_PINK = "#FF2060";

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-brand`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={BRAND_BLUE} />
        <stop offset="55%" stopColor={BRAND_PURPLE} />
        <stop offset="100%" stopColor={BRAND_PINK} />
      </linearGradient>
      <linearGradient id={`${id}-brand-v`} x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor={BRAND_BLUE} />
        <stop offset="55%" stopColor={BRAND_PURPLE} />
        <stop offset="100%" stopColor={BRAND_PINK} />
      </linearGradient>
      <linearGradient id={`${id}-soft`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={BRAND_BLUE} stopOpacity="0.14" />
        <stop offset="55%" stopColor={BRAND_PURPLE} stopOpacity="0.10" />
        <stop offset="100%" stopColor={BRAND_PINK} stopOpacity="0.14" />
      </linearGradient>
      <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="55%">
        <stop offset="0%" stopColor={BRAND_PURPLE} stopOpacity="0.22" />
        <stop offset="100%" stopColor={BRAND_PURPLE} stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function Backdrop({ id }: { id: string }) {
  return (
    <g>
      <rect width="400" height="300" fill={`url(#${id}-soft)`} />
      <circle cx="200" cy="150" r="170" fill={`url(#${id}-glow)`} />
      {/* decorative dots */}
      <circle cx="36" cy="40" r="3" fill={BRAND_BLUE} opacity="0.55" />
      <circle cx="364" cy="38" r="2.4" fill={BRAND_PINK} opacity="0.55" />
      <circle cx="32" cy="262" r="2" fill={BRAND_PURPLE} opacity="0.5" />
      <circle cx="368" cy="266" r="3" fill={BRAND_BLUE} opacity="0.5" />
    </g>
  );
}

/* ─────────── Illustrations (all 400×300, brand-uniform) ─────────── */

function Nationality({ id }: { id: string }) {
  // passport book
  const g = `url(#${id}-brand-v)`;
  return (
    <g>
      <rect x="135" y="70" width="130" height="170" rx="12" fill={g} />
      <rect x="135" y="70" width="130" height="170" rx="12" fill="white" opacity="0.06" />
      {/* page edge */}
      <rect x="143" y="74" width="4" height="162" rx="2" fill="white" opacity="0.35" />
      {/* emblem */}
      <circle cx="200" cy="135" r="22" fill="none" stroke="white" strokeWidth="2" opacity="0.85" />
      <circle cx="200" cy="135" r="8" fill="white" opacity="0.85" />
      {/* lines */}
      <rect x="160" y="180" width="80" height="5" rx="2.5" fill="white" opacity="0.55" />
      <rect x="170" y="194" width="60" height="5" rx="2.5" fill="white" opacity="0.4" />
      <rect x="178" y="208" width="44" height="5" rx="2.5" fill="white" opacity="0.3" />
    </g>
  );
}

function Destination({ id }: { id: string }) {
  const g = `url(#${id}-brand)`;
  return (
    <g>
      {/* globe */}
      <circle cx="200" cy="160" r="78" fill="none" stroke={g} strokeWidth="2.5" />
      <ellipse cx="200" cy="160" rx="78" ry="30" fill="none" stroke={g} strokeWidth="1.5" opacity="0.7" />
      <ellipse cx="200" cy="160" rx="40" ry="78" fill="none" stroke={g} strokeWidth="1.5" opacity="0.7" />
      <line x1="122" y1="160" x2="278" y2="160" stroke={g} strokeWidth="1.5" opacity="0.7" />
      {/* pins */}
      <g>
        <path d="M150 110 q0 -18 14 -18 q14 0 14 18 q0 14 -14 26 q-14 -12 -14 -26 z" fill={BRAND_PINK} />
        <circle cx="164" cy="110" r="4.5" fill="white" />
      </g>
      <g>
        <path d="M236 90 q0 -16 12 -16 q12 0 12 16 q0 12 -12 22 q-12 -10 -12 -22 z" fill={BRAND_BLUE} />
        <circle cx="248" cy="90" r="4" fill="white" />
      </g>
      {/* dotted route */}
      <path d="M164 110 Q210 60 248 90" stroke={BRAND_PURPLE} strokeWidth="1.6" strokeDasharray="3 4" fill="none" />
    </g>
  );
}

function VisaType({ id }: { id: string }) {
  const g = `url(#${id}-brand)`;
  return (
    <g transform="rotate(-10 200 150)">
      <rect x="100" y="90" width="200" height="120" rx="8" fill="none" stroke={g} strokeWidth="3" />
      <rect x="112" y="102" width="176" height="96" rx="4" fill="none" stroke={g} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />
      {/* badge circle */}
      <circle cx="200" cy="150" r="34" fill={g} opacity="0.95" />
      <path d="M186 150 l10 10 l18 -22" stroke="white" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* corner stars */}
      <circle cx="125" cy="115" r="3" fill={BRAND_PINK} />
      <circle cx="275" cy="115" r="3" fill={BRAND_BLUE} />
      <circle cx="125" cy="185" r="3" fill={BRAND_BLUE} />
      <circle cx="275" cy="185" r="3" fill={BRAND_PINK} />
    </g>
  );
}

function Intent({ id }: { id: string }) {
  const g = `url(#${id}-brand)`;
  return (
    <g>
      <circle cx="200" cy="155" r="80" fill="none" stroke={g} strokeWidth="2.5" />
      <circle cx="200" cy="155" r="62" fill="none" stroke={g} strokeWidth="1" opacity="0.5" strokeDasharray="2 4" />
      {/* needle */}
      <polygon points="200,90 212,155 200,170 188,155" fill={BRAND_PINK} />
      <polygon points="200,220 212,155 200,140 188,155" fill={BRAND_BLUE} opacity="0.85" />
      <circle cx="200" cy="155" r="6" fill="white" stroke={g} strokeWidth="2" />
      {/* N S E W */}
      <text x="200" y="80" textAnchor="middle" fill={BRAND_PURPLE} fontSize="14" fontWeight="700" fontFamily="ui-sans-serif,system-ui">N</text>
      <text x="200" y="248" textAnchor="middle" fill={BRAND_PURPLE} fontSize="11" opacity="0.7" fontFamily="ui-sans-serif,system-ui">S</text>
      <text x="116" y="160" textAnchor="middle" fill={BRAND_PURPLE} fontSize="11" opacity="0.7" fontFamily="ui-sans-serif,system-ui">W</text>
      <text x="284" y="160" textAnchor="middle" fill={BRAND_PURPLE} fontSize="11" opacity="0.7" fontFamily="ui-sans-serif,system-ui">E</text>
    </g>
  );
}

function Profile({ id }: { id: string }) {
  const g = `url(#${id}-brand-v)`;
  return (
    <g>
      {/* head */}
      <circle cx="200" cy="120" r="32" fill={g} />
      {/* shoulders */}
      <path d="M132 230 q0 -52 68 -52 q68 0 68 52 z" fill={g} />
      {/* check badge */}
      <circle cx="246" cy="148" r="20" fill="white" />
      <circle cx="246" cy="148" r="20" fill={`url(#${id}-brand)`} opacity="0.95" />
      <path d="M236 148 l7 7 l13 -14" stroke="white" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* meter dots */}
      <circle cx="100" cy="252" r="3.5" fill={BRAND_BLUE} />
      <circle cx="118" cy="252" r="3.5" fill={BRAND_PURPLE} />
      <circle cx="136" cy="252" r="3.5" fill={BRAND_PINK} />
      <circle cx="154" cy="252" r="3.5" fill={BRAND_PURPLE} opacity="0.35" />
      <circle cx="172" cy="252" r="3.5" fill={BRAND_PURPLE} opacity="0.2" />
    </g>
  );
}

function Finance({ id }: { id: string }) {
  const g = `url(#${id}-brand-v)`;
  return (
    <g>
      {/* bars */}
      <rect x="120" y="180" width="34" height="60"  rx="6" fill={g} opacity="0.6" />
      <rect x="166" y="150" width="34" height="90"  rx="6" fill={g} opacity="0.8" />
      <rect x="212" y="120" width="34" height="120" rx="6" fill={g} />
      <rect x="258" y="90"  width="34" height="150" rx="6" fill={g} />
      {/* trend line */}
      <path d="M137 180 L183 150 L229 120 L275 90" stroke={BRAND_PINK} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="137" cy="180" r="4" fill="white" stroke={BRAND_PINK} strokeWidth="2" />
      <circle cx="183" cy="150" r="4" fill="white" stroke={BRAND_PINK} strokeWidth="2" />
      <circle cx="229" cy="120" r="4" fill="white" stroke={BRAND_PINK} strokeWidth="2" />
      <circle cx="275" cy="90"  r="4" fill="white" stroke={BRAND_PINK} strokeWidth="2" />
    </g>
  );
}

function Footprint({ id }: { id: string }) {
  const g = `url(#${id}-brand)`;
  return (
    <g>
      {/* paper plane */}
      <polygon points="120,200 300,90 250,210 220,170" fill={g} />
      <polygon points="220,170 250,210 230,160" fill="white" opacity="0.35" />
      {/* trail */}
      <path d="M90 230 q60 -10 80 -40 q20 -32 70 -50" stroke={BRAND_PURPLE} strokeWidth="1.8" strokeDasharray="3 5" fill="none" strokeLinecap="round" />
      {/* tiny circles trail */}
      <circle cx="90" cy="230" r="3" fill={BRAND_BLUE} />
      <circle cx="105" cy="225" r="2.4" fill={BRAND_PURPLE} opacity="0.7" />
      <circle cx="118" cy="218" r="1.8" fill={BRAND_PINK} opacity="0.5" />
    </g>
  );
}

function Rejection({ id }: { id: string }) {
  const g = `url(#${id}-brand-v)`;
  return (
    <g>
      {/* shield */}
      <path
        d="M200 70 L280 100 L280 160 Q280 220 200 240 Q120 220 120 160 L120 100 Z"
        fill={g}
      />
      <path
        d="M200 70 L280 100 L280 160 Q280 220 200 240 Q120 220 120 160 L120 100 Z"
        fill="white"
        opacity="0.06"
      />
      {/* alert exclamation */}
      <rect x="194" y="115" width="12" height="60" rx="6" fill="white" />
      <circle cx="200" cy="195" r="7" fill="white" />
      {/* warning ring */}
      <circle cx="200" cy="155" r="92" fill="none" stroke={BRAND_PINK} strokeWidth="1.4" strokeDasharray="2 6" opacity="0.5" />
    </g>
  );
}

function TripLogic({ id }: { id: string }) {
  const g = `url(#${id}-brand)`;
  return (
    <g>
      {/* calendar body */}
      <rect x="110" y="80" width="180" height="160" rx="10" fill="none" stroke={g} strokeWidth="2.5" />
      {/* header bar */}
      <path d="M110 110 h180" stroke={g} strokeWidth="2.5" />
      <rect x="110" y="80" width="180" height="30" fill={g} opacity="0.18" />
      {/* hangers */}
      <rect x="138" y="68" width="6" height="22" rx="3" fill={BRAND_BLUE} />
      <rect x="256" y="68" width="6" height="22" rx="3" fill={BRAND_PINK} />
      {/* day cells */}
      {[0, 1, 2, 3, 4].map((c) =>
        [0, 1, 2].map((r) => (
          <rect
            key={`${c}-${r}`}
            x={128 + c * 30}
            y={128 + r * 32}
            width="20"
            height="20"
            rx="4"
            fill={c === 2 && r === 1 ? g : BRAND_PURPLE}
            opacity={c === 2 && r === 1 ? 1 : 0.18}
          />
        ))
      )}
    </g>
  );
}

function ReturnTicket({ id }: { id: string }) {
  const g = `url(#${id}-brand)`;
  return (
    <g transform="rotate(-6 200 150)">
      {/* ticket */}
      <path
        d="
          M100 110
          h90
          a10 10 0 0 1 0 20
          a10 10 0 0 1 0 20
          h-90
          a10 10 0 0 1 0 -20
          a10 10 0 0 1 0 -20
          z
        "
        fill="none"
        stroke={g}
        strokeWidth="0"
      />
      <path
        d="M100 90 h200 v40 a10 10 0 0 0 0 20 v40 h-200 v-40 a10 10 0 0 0 0 -20 z"
        fill={g}
        opacity="0.95"
      />
      {/* perforation */}
      <line x1="220" y1="100" x2="220" y2="190" stroke="white" strokeWidth="1.6" strokeDasharray="3 4" />
      {/* plane glyph */}
      <path d="M125 140 l40 -14 l5 6 l-30 14 l8 14 l-6 4 l-12 -10 l-10 4 l-2 -8 z" fill="white" opacity="0.95" />
      {/* code lines */}
      <rect x="240" y="115" width="40" height="6" rx="2" fill="white" opacity="0.65" />
      <rect x="240" y="130" width="28" height="6" rx="2" fill="white" opacity="0.45" />
      <rect x="240" y="155" width="36" height="6" rx="2" fill="white" opacity="0.65" />
      <rect x="240" y="170" width="22" height="6" rx="2" fill="white" opacity="0.45" />
    </g>
  );
}

function Stay({ id }: { id: string }) {
  const g = `url(#${id}-brand-v)`;
  return (
    <g>
      {/* tall building */}
      <rect x="150" y="80" width="60" height="160" rx="6" fill={g} />
      {/* short building */}
      <rect x="218" y="130" width="50" height="110" rx="6" fill={g} opacity="0.7" />
      {/* roof on tall */}
      <polygon points="150,80 180,58 210,80" fill={BRAND_PINK} />
      {/* windows tall */}
      {[0, 1, 2, 3].map((r) =>
        [0, 1].map((c) => (
          <rect
            key={`t-${c}-${r}`}
            x={160 + c * 22}
            y={104 + r * 28}
            width="14"
            height="14"
            rx="2"
            fill="white"
            opacity={r === 1 && c === 0 ? 1 : 0.55}
          />
        ))
      )}
      {/* windows short */}
      {[0, 1, 2].map((r) =>
        [0, 1].map((c) => (
          <rect
            key={`s-${c}-${r}`}
            x={228 + c * 18}
            y={148 + r * 26}
            width="12"
            height="12"
            rx="2"
            fill="white"
            opacity={r === 0 && c === 1 ? 1 : 0.5}
          />
        ))
      )}
      {/* star */}
      <path d="M295 90 l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1 z" fill={BRAND_BLUE} />
    </g>
  );
}

function Funding({ id }: { id: string }) {
  const g = `url(#${id}-brand)`;
  return (
    <g transform="rotate(-8 200 150)">
      {/* card */}
      <rect x="100" y="90" width="200" height="120" rx="14" fill={g} />
      <rect x="100" y="90" width="200" height="120" rx="14" fill="white" opacity="0.06" />
      {/* mag stripe */}
      <rect x="100" y="115" width="200" height="18" fill="black" opacity="0.35" />
      {/* chip */}
      <rect x="120" y="148" width="32" height="24" rx="4" fill="white" opacity="0.95" />
      <rect x="125" y="153" width="22" height="3" fill={BRAND_PURPLE} opacity="0.5" />
      <rect x="125" y="160" width="22" height="3" fill={BRAND_PURPLE} opacity="0.5" />
      <rect x="125" y="167" width="22" height="3" fill={BRAND_PURPLE} opacity="0.5" />
      {/* number dots */}
      {[0, 1, 2, 3].map((g2) => (
        <g key={g2}>
          {[0, 1, 2, 3].map((d) => (
            <circle key={d} cx={170 + g2 * 32 + d * 5} cy="190" r="2" fill="white" opacity="0.85" />
          ))}
        </g>
      ))}
      {/* contactless */}
      <path d="M250 140 q10 10 0 24" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M260 134 q16 16 0 36" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
    </g>
  );
}

function Docs({ id }: { id: string }) {
  const g = `url(#${id}-brand-v)`;
  return (
    <g>
      {/* back paper */}
      <rect x="150" y="78" width="110" height="140" rx="6" fill="white" opacity="0.7" stroke={BRAND_PURPLE} strokeWidth="1.2" />
      <rect x="162" y="96" width="84" height="5" rx="2" fill={BRAND_PURPLE} opacity="0.4" />
      <rect x="162" y="108" width="62" height="5" rx="2" fill={BRAND_PURPLE} opacity="0.3" />
      {/* folder */}
      <path
        d="M110 110 h70 l16 -16 h94 a10 10 0 0 1 10 10 v126 a10 10 0 0 1 -10 10 h-180 a10 10 0 0 1 -10 -10 v-110 a10 10 0 0 1 10 -10 z"
        fill={g}
      />
      <path
        d="M110 110 h70 l16 -16 h94 a10 10 0 0 1 10 10 v126 a10 10 0 0 1 -10 10 h-180 a10 10 0 0 1 -10 -10 v-110 a10 10 0 0 1 10 -10 z"
        fill="white"
        opacity="0.05"
      />
      {/* check tag */}
      <circle cx="285" cy="155" r="22" fill="white" />
      <path d="M275 155 l8 8 l14 -16" stroke={BRAND_PINK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function Behavioral({ id }: { id: string }) {
  const g = `url(#${id}-brand)`;
  // node coordinates
  const nodes: Array<[number, number, string, number]> = [
    [120, 100, BRAND_BLUE, 6],
    [200, 70,  BRAND_PURPLE, 7],
    [290, 110, BRAND_PINK, 6],
    [110, 200, BRAND_PURPLE, 5],
    [200, 235, BRAND_PINK, 8],
    [290, 200, BRAND_BLUE, 6],
    [200, 155, BRAND_PURPLE, 11],
  ];
  const links: Array<[number, number]> = [
    [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
    [0, 1], [1, 2], [3, 4], [4, 5],
  ];
  return (
    <g>
      {links.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]} y1={nodes[a][1]}
          x2={nodes[b][0]} y2={nodes[b][1]}
          stroke={g}
          strokeWidth="1.5"
          opacity="0.55"
        />
      ))}
      {nodes.map(([x, y, c, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r + 4} fill={c} opacity="0.18" />
          <circle cx={x} cy={y} r={r} fill={c} />
        </g>
      ))}
      {/* center pulse */}
      <circle cx="200" cy="155" r="22" fill="none" stroke={BRAND_PURPLE} strokeWidth="1.2" opacity="0.5" />
      <circle cx="200" cy="155" r="34" fill="none" stroke={BRAND_PURPLE} strokeWidth="1" opacity="0.3" />
    </g>
  );
}

const ART: Record<SignalKind, (props: { id: string }) => ReactNode> = {
  nationality: Nationality,
  destination: Destination,
  visatype: VisaType,
  intent: Intent,
  profile: Profile,
  finance: Finance,
  footprint: Footprint,
  rejection: Rejection,
  triplogic: TripLogic,
  return: ReturnTicket,
  stay: Stay,
  funding: Funding,
  docs: Docs,
  behavioral: Behavioral,
};

export function SignalArt({ kind, ...props }: Props) {
  // useId() guarantees gradient IDs are unique even when the marquee
  // duplicates each card in the DOM.
  const reactId = useId().replace(/:/g, "");
  const id = `sa-${kind}-${reactId}`;
  const Art = ART[kind];
  return (
    <svg
      viewBox="0 0 400 300"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <Defs id={id} />
      <Backdrop id={id} />
      <Art id={id} />
    </svg>
  );
}

export default SignalArt;
