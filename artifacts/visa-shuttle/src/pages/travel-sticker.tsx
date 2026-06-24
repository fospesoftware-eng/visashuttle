import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Globe, MapPin, RefreshCcw, Share2, Sparkles, Trophy, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";

// ── Country data ────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: "JP", name: "Japan", flag: "🇯🇵", landmark: "⛩️", primary: "#BC002D", secondary: "#FFFFFF", fact: "Japan has the world's oldest company, Kongō Gumi, founded in 578 AD." },
  { code: "CN", name: "China", flag: "🇨🇳", landmark: "🏯", primary: "#DE2910", secondary: "#FFDE00", fact: "China invented paper, printing, gunpowder, and the compass." },
  { code: "IN", name: "India", flag: "🇮🇳", landmark: "🕌", primary: "#FF9933", secondary: "#138808", fact: "India invented the number zero and the decimal system." },
  { code: "KR", name: "South Korea", flag: "🇰🇷", landmark: "🏯", primary: "#003478", secondary: "#CD2E3A", fact: "South Korea has the fastest average internet speeds in the world." },
  { code: "TH", name: "Thailand", flag: "🇹🇭", landmark: "🛕", primary: "#A51931", secondary: "#2D2A6E", fact: "Thailand is the world's largest exporter of rice." },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", landmark: "🍜", primary: "#DA251D", secondary: "#FFCD00", fact: "Vietnam is the world's second largest coffee producer." },
  { code: "SG", name: "Singapore", flag: "🇸🇬", landmark: "🌃", primary: "#EF3340", secondary: "#FFFFFF", fact: "Changi Airport has won the world's best airport award for over 12 years." },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", landmark: "🏙️", primary: "#CC0001", secondary: "#010066", fact: "The Petronas Towers were the world's tallest buildings from 1998–2004." },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", landmark: "🌴", primary: "#CE1126", secondary: "#FFFFFF", fact: "Indonesia has more active volcanoes than any country on Earth." },
  { code: "PH", name: "Philippines", flag: "🇵🇭", landmark: "🏝️", primary: "#0038A8", secondary: "#CE1126", fact: "The Philippines has over 7,640 islands." },
  { code: "NP", name: "Nepal", flag: "🇳🇵", landmark: "🏔️", primary: "#003893", secondary: "#DC143C", fact: "Nepal is home to 8 of the world's 10 tallest mountains." },
  { code: "BT", name: "Bhutan", flag: "🇧🇹", landmark: "🐉", primary: "#FF8000", secondary: "#FF0000", fact: "Bhutan is the world's only carbon-negative country." },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", landmark: "🦁", primary: "#8D153A", secondary: "#EB7400", fact: "Sri Lanka was the first country to elect a female prime minister." },
  { code: "MN", name: "Mongolia", flag: "🇲🇳", landmark: "🏕️", primary: "#C4272F", secondary: "#015197", fact: "Mongolia has the lowest population density of any sovereign nation." },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿", landmark: "🏇", primary: "#00AFCA", secondary: "#FFCC00", fact: "Kazakhstan is the world's largest landlocked country." },
  { code: "UZ", name: "Uzbekistan", flag: "🇺🇿", landmark: "🕌", primary: "#1EB53A", secondary: "#0099B5", fact: "Samarkand is one of the oldest continuously inhabited cities on Earth." },
  { code: "AZ", name: "Azerbaijan", flag: "🇦🇿", landmark: "🔥", primary: "#0092BC", secondary: "#E8323B", fact: "Azerbaijan means 'Land of Fire' — it has eternal flames from the ground." },
  { code: "AM", name: "Armenia", flag: "🇦🇲", landmark: "⛪", primary: "#D90012", secondary: "#F2A800", fact: "Armenia was the first country to officially adopt Christianity in 301 AD." },
  { code: "GE", name: "Georgia", flag: "🇬🇪", landmark: "⛪", primary: "#FF0000", secondary: "#FFFFFF", fact: "Georgia is home to the world's deepest cave at 2,212 metres." },
  { code: "IR", name: "Iran", flag: "🇮🇷", landmark: "🕌", primary: "#239F40", secondary: "#DA0000", fact: "Iran (Persia) is one of the world's oldest civilisations at 7,000 years." },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", landmark: "🕌", primary: "#006C35", secondary: "#FFFFFF", fact: "Saudi Arabia holds 17% of the world's proven oil reserves." },
  { code: "AE", name: "UAE", flag: "🇦🇪", landmark: "🏙️", primary: "#00732F", secondary: "#FF0000", fact: "The Burj Khalifa is the world's tallest building at 828 metres." },
  { code: "QA", name: "Qatar", flag: "🇶🇦", landmark: "🏟️", primary: "#8D1B3D", secondary: "#FFFFFF", fact: "Qatar has the world's third largest natural gas reserves." },
  { code: "JO", name: "Jordan", flag: "🇯🇴", landmark: "🏜️", primary: "#007A3D", secondary: "#CE1126", fact: "Jordan's Petra, carved from rose-red rock, is one of the Seven Wonders." },
  { code: "FR", name: "France", flag: "🇫🇷", landmark: "🗼", primary: "#002395", secondary: "#ED2939", fact: "France is the world's most visited country with 90 million tourists annually." },
  { code: "IT", name: "Italy", flag: "🇮🇹", landmark: "🏛️", primary: "#009246", secondary: "#CE2B37", fact: "Italy has more UNESCO World Heritage Sites than any other nation." },
  { code: "DE", name: "Germany", flag: "🇩🇪", landmark: "🏰", primary: "#000000", secondary: "#DD0000", fact: "Germany has 1,500 types of beer brewed in over 1,300 breweries." },
  { code: "ES", name: "Spain", flag: "🇪🇸", landmark: "💃", primary: "#AA151B", secondary: "#F1BF00", fact: "Spain has the second largest number of UNESCO sites in Europe." },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", landmark: "🎡", primary: "#012169", secondary: "#C8102E", fact: "The UK invented the World Wide Web, telephone, and television." },
  { code: "PT", name: "Portugal", flag: "🇵🇹", landmark: "⛵", primary: "#006600", secondary: "#FF0000", fact: "Portugal is the world's oldest nation-state with borders since 1139." },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", landmark: "🌷", primary: "#AE1C28", secondary: "#21468B", fact: "The Netherlands grows more flowers than any country except Kenya." },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", landmark: "🏔️", primary: "#FF0000", secondary: "#FFFFFF", fact: "Switzerland has been officially neutral in conflicts since 1815." },
  { code: "AT", name: "Austria", flag: "🇦🇹", landmark: "🎻", primary: "#ED2939", secondary: "#FFFFFF", fact: "Vienna is the birthplace of classical music — Mozart, Beethoven, Schubert." },
  { code: "SE", name: "Sweden", flag: "🇸🇪", landmark: "🎿", primary: "#006AA7", secondary: "#FECC02", fact: "Sweden invented the seatbelt, which has saved over a million lives." },
  { code: "NO", name: "Norway", flag: "🇳🇴", landmark: "🏔️", primary: "#EF2B2D", secondary: "#002868", fact: "Norway has the world's longest road tunnel at 24.5 km." },
  { code: "DK", name: "Denmark", flag: "🇩🇰", landmark: "🧜", primary: "#C60C30", secondary: "#FFFFFF", fact: "Denmark is consistently ranked the world's happiest country." },
  { code: "FI", name: "Finland", flag: "🇫🇮", landmark: "🎅", primary: "#003580", secondary: "#FFFFFF", fact: "Finland has the most heavy metal bands per capita of any nation." },
  { code: "IS", name: "Iceland", flag: "🇮🇸", landmark: "🌋", primary: "#003897", secondary: "#DC1E35", fact: "Iceland is the world's most peaceful country with no standing army." },
  { code: "IE", name: "Ireland", flag: "🇮🇪", landmark: "🍀", primary: "#169B62", secondary: "#FF883E", fact: "Ireland has never had a native snake population." },
  { code: "PL", name: "Poland", flag: "🇵🇱", landmark: "🦅", primary: "#DC143C", secondary: "#FFFFFF", fact: "Poland has the world's oldest salt mine in operation since 1044." },
  { code: "CZ", name: "Czechia", flag: "🇨🇿", landmark: "🏰", primary: "#D7141A", secondary: "#11457E", fact: "Prague has the highest density of castles per capita in the world." },
  { code: "HU", name: "Hungary", flag: "🇭🇺", landmark: "🏰", primary: "#CE2939", secondary: "#477050", fact: "Hungary has the third most Nobel Prize winners per capita." },
  { code: "RO", name: "Romania", flag: "🇷🇴", landmark: "🏰", primary: "#002B7F", secondary: "#FCD116", fact: "Romania's Parliament Palace is the world's heaviest administrative building." },
  { code: "GR", name: "Greece", flag: "🇬🇷", landmark: "🏺", primary: "#0D5EAF", secondary: "#FFFFFF", fact: "Greece has more archaeological museums than any other country." },
  { code: "UA", name: "Ukraine", flag: "🇺🇦", landmark: "🌻", primary: "#005BBB", secondary: "#FFD500", fact: "Ukraine is Europe's largest country and its breadbasket." },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", landmark: "🥁", primary: "#008751", secondary: "#FFFFFF", fact: "Nigeria is Africa's most populous nation and largest economy." },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", landmark: "🦁", primary: "#007A4D", secondary: "#FFB81C", fact: "South Africa has three official capital cities." },
  { code: "EG", name: "Egypt", flag: "🇪🇬", landmark: "🐪", primary: "#CE1126", secondary: "#C09300", fact: "Ancient Egyptians invented toothpaste over 5,000 years ago." },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹", landmark: "☕", primary: "#078930", secondary: "#FCDD09", fact: "Ethiopia is the birthplace of coffee and humanity's earliest ancestors." },
  { code: "KE", name: "Kenya", flag: "🇰🇪", landmark: "🦒", primary: "#006600", secondary: "#BB0000", fact: "Kenya's Rift Valley is where the earliest human fossils were found." },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", landmark: "🦣", primary: "#1EB53A", secondary: "#FCD116", fact: "Tanzania is home to Africa's highest peak, Mount Kilimanjaro." },
  { code: "GH", name: "Ghana", flag: "🇬🇭", landmark: "🥁", primary: "#006B3F", secondary: "#FCD116", fact: "Ghana was the first sub-Saharan African country to gain independence." },
  { code: "MA", name: "Morocco", flag: "🇲🇦", landmark: "🕌", primary: "#C1272D", secondary: "#006233", fact: "Morocco has the world's oldest university, founded in 859 AD." },
  { code: "MG", name: "Madagascar", flag: "🇲🇬", landmark: "🦜", primary: "#FC3D32", secondary: "#007E3A", fact: "90% of Madagascar's wildlife exists nowhere else on the planet." },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼", landmark: "🌊", primary: "#006400", secondary: "#FFD200", fact: "Zimbabwe's Victoria Falls is the world's largest waterfall by area." },
  { code: "US", name: "United States", flag: "🇺🇸", landmark: "🗽", primary: "#002868", secondary: "#BF0A30", fact: "The US has won more Nobel Prizes than any other country in history." },
  { code: "CA", name: "Canada", flag: "🇨🇦", landmark: "🍁", primary: "#FF0000", secondary: "#FFFFFF", fact: "Canada has the longest coastline of any country at 202,080 km." },
  { code: "MX", name: "Mexico", flag: "🇲🇽", landmark: "🏺", primary: "#006847", secondary: "#CE1126", fact: "Mexico City was built on an ancient Aztec lake — it sinks 10 cm/year." },
  { code: "BR", name: "Brazil", flag: "🇧🇷", landmark: "🌴", primary: "#009C3B", secondary: "#FFDF00", fact: "Brazil's Amazon contains 10% of all species on Earth." },
  { code: "AR", name: "Argentina", flag: "🇦🇷", landmark: "🌎", primary: "#74ACDF", secondary: "#FFFFFF", fact: "Argentina has won the FIFA World Cup three times." },
  { code: "CL", name: "Chile", flag: "🇨🇱", landmark: "🗿", primary: "#D52B1E", secondary: "#003580", fact: "Chile is the longest country in the world at 4,300 km." },
  { code: "CO", name: "Colombia", flag: "🇨🇴", landmark: "🌸", primary: "#FCD116", secondary: "#003893", fact: "Colombia is the only South American country with two coastlines." },
  { code: "PE", name: "Peru", flag: "🇵🇪", landmark: "🏔️", primary: "#D91023", secondary: "#FFFFFF", fact: "Machu Picchu was built without mortar or iron tools." },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", landmark: "🌊", primary: "#CF142B", secondary: "#007A5E", fact: "Venezuela has the world's highest waterfall, Angel Falls, at 979 m." },
  { code: "CU", name: "Cuba", flag: "🇨🇺", landmark: "🎶", primary: "#002A8F", secondary: "#CF142B", fact: "Cuba has the highest literacy rate in Latin America at 99.8%." },
  { code: "JM", name: "Jamaica", flag: "🇯🇲", landmark: "🎵", primary: "#000000", secondary: "#009B3A", fact: "Jamaica is the birthplace of reggae music and Bob Marley." },
  { code: "TT", name: "Trinidad & Tobago", flag: "🇹🇹", landmark: "🎺", primary: "#CE1126", secondary: "#000000", fact: "Trinidad and Tobago is the birthplace of steelpan music." },
  { code: "BB", name: "Barbados", flag: "🇧🇧", landmark: "🏖️", primary: "#00267F", secondary: "#FFC726", fact: "Barbados is the birthplace of rum, first distilled in the 1620s." },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷", landmark: "🦋", primary: "#002B7F", secondary: "#CE1126", fact: "Costa Rica runs on 100% renewable energy." },
  { code: "PA", name: "Panama", flag: "🇵🇦", landmark: "⛵", primary: "#FFFFFF", secondary: "#D21034", fact: "Panama Canal reduced ocean routes by up to 20,000 km." },
  { code: "AU", name: "Australia", flag: "🇦🇺", landmark: "🦘", primary: "#00008B", secondary: "#FFBF00", fact: "Australia is the only country that is also a continent." },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", landmark: "🌋", primary: "#00247D", secondary: "#CC142B", fact: "New Zealand was the first country to give women the right to vote." },
  { code: "FJ", name: "Fiji", flag: "🇫🇯", landmark: "🏝️", primary: "#003F87", secondary: "#FFFFFF", fact: "Fiji's 333 islands are spread across 1.3 million sq km of ocean." },
  { code: "PG", name: "Papua New Guinea", flag: "🇵🇬", landmark: "🦅", primary: "#000000", secondary: "#CE1126", fact: "Papua New Guinea has over 800 distinct languages." },
  { code: "WS", name: "Samoa", flag: "🇼🇸", landmark: "🌺", primary: "#CE1126", secondary: "#002B7F", fact: "Samoa is the first country in the world to see each new day." },
  { code: "TO", name: "Tonga", flag: "🇹🇴", landmark: "🐳", primary: "#C10000", secondary: "#FFFFFF", fact: "Tonga is the last Polynesian monarchy in the world." },
  { code: "PW", name: "Palau", flag: "🇵🇼", landmark: "🐠", primary: "#4AADD6", secondary: "#FFE900", fact: "Palau established the world's first shark sanctuary in 2009." },
  { code: "MV", name: "Maldives", flag: "🇲🇻", landmark: "🏖️", primary: "#D21034", secondary: "#007E3A", fact: "The Maldives is the world's lowest-lying country at just 1.5 m." },
  { code: "SC", name: "Seychelles", flag: "🇸🇨", landmark: "🏝️", primary: "#003F87", secondary: "#FCD856", fact: "Seychelles has more giant tortoises per sq km than anywhere else." },
  { code: "MU", name: "Mauritius", flag: "🇲🇺", landmark: "🌺", primary: "#EA2839", secondary: "#1A206D", fact: "Mauritius is home to the famous dodo bird, now extinct since 1680." },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺", landmark: "🏰", primary: "#EF3340", secondary: "#00A1DE", fact: "Luxembourg has the highest GDP per capita in the world." },
  { code: "MC", name: "Monaco", flag: "🇲🇨", landmark: "🎰", primary: "#CE1126", secondary: "#FFFFFF", fact: "Monaco is the world's second smallest and most densely populated country." },
  { code: "SM", name: "San Marino", flag: "🇸🇲", landmark: "🏰", primary: "#5EB6E4", secondary: "#FFFFFF", fact: "San Marino is the world's oldest republic, founded in 301 AD." },
  { code: "VA", name: "Vatican City", flag: "🇻🇦", landmark: "⛪", primary: "#FFE000", secondary: "#FFFFFF", fact: "Vatican City is the world's smallest internationally recognized country." },
  { code: "BT2", name: "Brunei", flag: "🇧🇳", landmark: "🕌", primary: "#F7E017", secondary: "#000000", fact: "Brunei has one of the highest GDP per capita in Southeast Asia." },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", landmark: "🌄", primary: "#20603D", secondary: "#FAD201", fact: "Rwanda has the highest percentage of women in parliament globally." },
  { code: "UG", name: "Uganda", flag: "🇺🇬", landmark: "🦅", primary: "#000000", secondary: "#FCDC04", fact: "Uganda is home to over half the world's remaining mountain gorillas." },
  { code: "BO", name: "Bolivia", flag: "🇧🇴", landmark: "🏔️", primary: "#D52B1E", secondary: "#F4E400", fact: "Bolivia has the world's largest salt flat, Salar de Uyuni." },
  { code: "PY", name: "Paraguay", flag: "🇵🇾", landmark: "💧", primary: "#D52B1E", secondary: "#0038A8", fact: "Paraguay's Itaipu Dam is the world's largest hydroelectric power plant." },
  { code: "UY", name: "Uruguay", flag: "🇺🇾", landmark: "🌞", primary: "#FFFFFF", secondary: "#009FCA", fact: "Uruguay was the first country to fully legalise marijuana." },
  { code: "EC", name: "Ecuador", flag: "🇪🇨", landmark: "🌎", primary: "#FFD100", secondary: "#003580", fact: "Ecuador is the only country named after a geographic feature — the Equator." },
  { code: "NA", name: "Namibia", flag: "🇳🇦", landmark: "🏜️", primary: "#009543", secondary: "#003580", fact: "The Namib is the world's oldest desert at 55–80 million years old." },
  { code: "BW", name: "Botswana", flag: "🇧🇼", landmark: "🦓", primary: "#75AADB", secondary: "#000000", fact: "Botswana transformed from the world's poorest to a middle-income country in 30 years." },
  { code: "SN", name: "Senegal", flag: "🇸🇳", landmark: "🎺", primary: "#00853F", secondary: "#FDEF42", fact: "Senegal's Lake Retba is naturally pink due to algae and high salt." },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", landmark: "🌺", primary: "#F77F00", secondary: "#009A44", fact: "Côte d'Ivoire is the world's largest producer of cocoa beans." },
  { code: "CV", name: "Cape Verde", flag: "🇨🇻", landmark: "🏝️", primary: "#003893", secondary: "#CF2027", fact: "Cape Verde has one of Africa's most stable democracies." },
  { code: "ML", name: "Mali", flag: "🇲🇱", landmark: "🕌", primary: "#14B53A", secondary: "#CE1126", fact: "Mali's Timbuktu was the most important Islamic learning centre in medieval times." },
  { code: "SS", name: "South Sudan", flag: "🇸🇸", landmark: "🌿", primary: "#078930", secondary: "#003DA5", fact: "South Sudan became the world's newest country on July 9, 2011." },
];

// ── Sticker Badge SVG ───────────────────────────────────────────────────────
interface Sticker {
  id: string;
  code: string;
  name: string;
  flag: string;
  landmark: string;
  primary: string;
  secondary: string;
  fact: string;
  earnedAt: number;
}

function StickerBadge({ sticker, size = 140, shine = false, style }: {
  sticker: Sticker | typeof COUNTRIES[0];
  size?: number;
  shine?: boolean;
  style?: React.CSSProperties;
}) {
  const d = size;
  const cx = d / 2;
  const r = d * 0.455;
  const hex = sticker.primary.replace("#", "");
  const rgbR = parseInt(hex.substring(0, 2) || "64", 16);
  const rgbG = parseInt(hex.substring(2, 4) || "85", 16);
  const rgbB = parseInt(hex.substring(4, 6) || "255", 16);
  const uid = sticker.code + size;

  return (
    <svg viewBox={`0 0 ${d} ${d}`} width={d} height={d} xmlns="http://www.w3.org/2000/svg" style={style}>
      <defs>
        <radialGradient id={`bg-${uid}`} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor={sticker.secondary} stopOpacity="0.9" />
          <stop offset="100%" stopColor={sticker.primary} stopOpacity="1" />
        </radialGradient>
        <radialGradient id={`shine-${uid}`} cx="38%" cy="28%" r="55%">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <filter id={`shadow-${uid}`} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy={d * 0.03} stdDeviation={d * 0.04}
            floodColor={`rgb(${rgbR},${rgbG},${rgbB})`} floodOpacity="0.6" />
        </filter>
        <clipPath id={`clip-${uid}`}><circle cx={cx} cy={cx} r={r} /></clipPath>
      </defs>
      {/* Glow ring */}
      <circle cx={cx} cy={cx} r={r + d * 0.025} fill="none" stroke={sticker.primary} strokeWidth={d * 0.01} strokeOpacity="0.35" />
      {/* Main fill */}
      <circle cx={cx} cy={cx} r={r} fill={`url(#bg-${uid})`} filter={`url(#shadow-${uid})`} />
      {/* Stamp dashes */}
      <circle cx={cx} cy={cx} r={r - d * 0.028} fill="none" stroke="white" strokeWidth={d * 0.013} strokeOpacity="0.65" strokeDasharray={`${d * 0.032} ${d * 0.024}`} />
      {/* Inner ring */}
      <circle cx={cx} cy={cx} r={r * 0.78} fill="none" stroke="white" strokeWidth={d * 0.005} strokeOpacity="0.25" />
      {/* Stars */}
      {[0, 72, 144, 216, 288].map(a => {
        const rad = (a * Math.PI) / 180;
        const sr = r - d * 0.063;
        return <text key={a} x={cx + sr * Math.cos(rad - Math.PI / 2)} y={cx + sr * Math.sin(rad - Math.PI / 2)}
          textAnchor="middle" dominantBaseline="central" fontSize={d * 0.038} fill="white" fillOpacity="0.4">✦</text>;
      })}
      {/* Flag emoji */}
      <text x={cx} y={cx - d * 0.1} textAnchor="middle" dominantBaseline="central" fontSize={d * 0.22}>{sticker.flag}</text>
      {/* Divider */}
      <line x1={cx - d * 0.13} y1={cx + d * 0.05} x2={cx + d * 0.13} y2={cx + d * 0.05} stroke="white" strokeWidth={d * 0.005} strokeOpacity="0.45" />
      {/* Name */}
      <text x={cx} y={cx + d * 0.135} textAnchor="middle" dominantBaseline="central"
        fontSize={Math.min(d * 0.075, d * 0.075 * (10 / Math.max(sticker.name.length, 10)))} fontWeight="800"
        fill="white" fontFamily="system-ui,sans-serif">
        {sticker.name.toUpperCase()}
      </text>
      {/* Landmark */}
      <text x={cx} y={cx + d * 0.265} textAnchor="middle" dominantBaseline="central" fontSize={d * 0.14}>{sticker.landmark}</text>
      {/* Brand */}
      <text x={cx} y={cx + d * 0.395} textAnchor="middle" dominantBaseline="central"
        fontSize={d * 0.052} fill="white" fillOpacity="0.5" fontFamily="system-ui,sans-serif" letterSpacing={d * 0.004}>
        VISA SHUTTLE
      </text>
      {/* Shine */}
      {shine && <circle cx={cx} cy={cx} r={r} fill={`url(#shine-${uid})`} clipPath={`url(#clip-${uid})`} />}
    </svg>
  );
}

// ── Particle burst ──────────────────────────────────────────────────────────
function Confetti({ active }: { active: boolean }) {
  const COLORS = ["#4055FF", "#FF2060", "#FFBF00", "#00E5A0", "#FF6B35", "#A855F7", "#06B6D4", "#F43F5E"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(40)].map((_, i) => {
        const angle = (i / 40) * 360 + Math.random() * 9;
        const dist = 120 + Math.random() * 140;
        const size = 5 + Math.random() * 10;
        const delay = Math.random() * 0.15;
        return (
          <div key={i} className="absolute rounded-sm"
            style={{
              width: size, height: size * (Math.random() > 0.5 ? 1 : 0.4),
              background: COLORS[i % COLORS.length],
              left: "50%", top: "50%",
              transform: `translate(-50%,-50%) rotate(${Math.random() * 360}deg)`,
              opacity: active ? 0 : 0,
              transition: active ? `all 0.9s cubic-bezier(0.1,0.8,0.3,1) ${delay}s` : "none",
              ...(active && {
                opacity: 0,
                transform: `translate(calc(-50% + ${Math.cos(angle * Math.PI / 180) * dist}px), calc(-50% + ${Math.sin(angle * Math.PI / 180) * dist}px)) rotate(${Math.random() * 720}deg)`,
              }),
            }}
          />
        );
      })}
    </div>
  );
}

// ── Reveal overlay ──────────────────────────────────────────────────────────
function RevealOverlay({ sticker, onClose }: { sticker: Sticker; onClose: () => void }) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const { toast } = useToast();

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(2,4,20,0.92)", backdropFilter: "blur(16px)" }}>
      <div className="relative text-center px-6 max-w-sm w-full flex flex-col items-center">
        <Confetti active={phase >= 1} />

        {/* Sticker with pop-in */}
        <div style={{
          transform: phase === 0 ? "scale(0) rotate(-20deg)" : phase === 1 ? "scale(1.12) rotate(3deg)" : "scale(1) rotate(0deg)",
          transition: phase === 0 ? "none" : "transform 0.65s cubic-bezier(0.34,1.56,0.64,1)",
          filter: `drop-shadow(0 0 40px ${sticker.primary}90)`,
          marginBottom: 28,
        }}>
          <StickerBadge sticker={sticker} size={220} shine />
        </div>

        {/* Text reveal */}
        <div style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.5s ease",
        }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl">🎉</span>
            <h2 className="text-2xl font-black text-white">You got {sticker.name}!</h2>
            <span className="text-3xl">🎉</span>
          </div>
          <p className="text-white/60 text-sm leading-relaxed mb-6 px-2">
            <span className="text-white/85 font-semibold">Fun fact: </span>{sticker.fact}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                const txt = `I just collected ${sticker.flag} ${sticker.name} on Visa Shuttle Travel Stickers! 🌍✈️`;
                if (navigator.share) navigator.share({ text: txt });
                else { navigator.clipboard.writeText(txt); toast({ title: "Copied to clipboard!" }); }
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/20 text-white text-sm font-semibold hover:bg-white/10 transition"
            >
              <Share2 className="w-4 h-4" />Share
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition"
              style={{ background: "linear-gradient(135deg,#4055FF,#9033F5)" }}
            >
              <Trophy className="w-4 h-4" />View Collection
            </button>
          </div>
        </div>

        {/* Close */}
        <button onClick={onClose} className="absolute top-0 right-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Floating sticker for hero ───────────────────────────────────────────────
const HERO_COUNTRIES = ["JP", "FR", "BR", "AU", "IS", "IN", "TR", "NZ", "KR", "IT"];
const HERO_STICKERS = COUNTRIES.filter(c => HERO_COUNTRIES.includes(c.code));

function FloatingStickerField() {
  const positions = [
    { top: "5%",  right: "1%",  size: 105, rotate:  12, float: 0, opacity: 0.9 },
    { top: "52%", right: "7%",  size:  90, rotate:  -8, float: 1, opacity: 0.8 },
    { top: "8%",  right: "20%", size:  82, rotate:   5, float: 2, opacity: 0.75 },
    { top: "63%", right: "27%", size:  72, rotate: -14, float: 0, opacity: 0.65 },
    { top: "-4%", right: "38%", size:  65, rotate:  19, float: 1, opacity: 0.55 },
    { top: "62%", right: "45%", size:  58, rotate:  -5, float: 2, opacity: 0.45 },
    { top: "18%", right: "56%", size:  52, rotate:  10, float: 0, opacity: 0.35 },
    { top: "40%", right: "63%", size:  45, rotate: -18, float: 1, opacity: 0.25 },
    { top: "2%",  right: "70%", size:  40, rotate:   8, float: 2, opacity: 0.2 },
    { top: "72%", right: "16%", size:  78, rotate: -10, float: 0, opacity: 0.6 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {positions.map((p, i) => {
        const c = HERO_STICKERS[i % HERO_STICKERS.length];
        return (
          <div key={i} style={{
            position: "absolute",
            top: p.top, right: p.right,
            transform: `rotate(${p.rotate}deg)`,
            opacity: p.opacity,
            animation: `hero-float-${p.float} ${4.5 + i * 0.4}s ease-in-out ${i * 0.3}s infinite`,
            filter: `drop-shadow(0 8px 20px ${c.primary}55)`,
          }}>
            <StickerBadge sticker={{ ...c, id: `h${i}`, earnedAt: 0 }} size={p.size} shine />
          </div>
        );
      })}
    </div>
  );
}

// ── Local storage helpers ───────────────────────────────────────────────────
const LS_KEY = "vs_travel_stickers";
function loadStickers(): Sticker[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}
function saveStickers(s: Sticker[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

// ── Spin animation numbers ─────────────────────────────────────────────────
function SpinWheel({ onDone }: { onDone: (c: typeof COUNTRIES[0]) => void }) {
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState(50);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cyclesRef = useRef(0);
  const targetRef = useRef(Math.floor(Math.random() * COUNTRIES.length));

  useEffect(() => {
    const step = () => {
      setIndex(i => (i + 1) % COUNTRIES.length);
      cyclesRef.current++;

      if (cyclesRef.current > 40) {
        setSpeed(s => {
          const next = s + 18;
          if (next > 380) {
            clearInterval(intervalRef.current!);
            setTimeout(() => onDone(COUNTRIES[targetRef.current]), 200);
          }
          return next;
        });
      }
    };
    intervalRef.current = setInterval(step, speed);
    return () => clearInterval(intervalRef.current!);
  }, [speed]);

  const c = COUNTRIES[index];
  return (
    <div className="flex flex-col items-center gap-3">
      <div style={{ filter: `drop-shadow(0 0 24px ${c.primary}80)`, animation: "globe-pulse 0.3s ease-in-out infinite alternate" }}>
        <StickerBadge sticker={{ ...c, id: "spin", earnedAt: 0 }} size={160} shine />
      </div>
      <p className="text-white/50 text-xs tracking-widest uppercase">Spinning the globe…</p>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function TravelStickerPage() {
  const [stickers, setStickers] = useState<Sticker[]>(loadStickers);
  const [reveal, setReveal] = useState<Sticker | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { toast } = useToast();

  const ownedCodes = stickers.map(s => s.code);

  function handleSpin() {
    const available = COUNTRIES.filter(c => !ownedCodes.includes(c.code));
    if (available.length === 0) {
      toast({ title: "You've collected all countries! 🌍", description: "You're a true world traveller." });
      return;
    }
    setSpinning(true);
  }

  function handleSpinDone(country: typeof COUNTRIES[0]) {
    const available = COUNTRIES.filter(c => !ownedCodes.includes(c.code));
    const picked = available[Math.floor(Math.random() * available.length)];
    const newSticker: Sticker = { ...picked, id: crypto.randomUUID(), earnedAt: Date.now() };
    const updated = [newSticker, ...stickers];
    setStickers(updated);
    saveStickers(updated);
    setSpinning(false);
    setReveal(newSticker);
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg,#03071e 0%,#08082e 35%,#0d1030 65%,#0a0a1a 100%)" }}>

      {reveal && <RevealOverlay sticker={reveal} onClose={() => setReveal(null)} />}

      {/* Minimal header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />Back
            </button>
          </Link>
          <Logo size="sm" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-white">{stickers.length}</span>
            <span className="text-xs text-white/40">/{COUNTRIES.length}</span>
          </div>
          <ThemeToggle className="h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-white/60" />
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[480px] flex items-center">
        <FloatingStickerField />

        {/* Gradient mask over stickers on left */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to right, rgba(3,7,30,1) 30%, rgba(3,7,30,0.5) 65%, transparent 100%)" }} />

        <div className="relative z-10 px-6 md:px-12 py-16 max-w-xl">
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border"
              style={{ background: "rgba(64,85,255,0.2)", borderColor: "rgba(64,85,255,0.4)", color: "#7B94FF" }}>
              <Sparkles className="w-3 h-3" />Virtual Collectibles
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border"
              style={{ background: "rgba(0,200,100,0.15)", borderColor: "rgba(0,200,100,0.3)", color: "#4ade80" }}>
              🆓 Free to play
            </span>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full border"
              style={{ background: "rgba(255,191,0,0.12)", borderColor: "rgba(255,191,0,0.3)", color: "#FFBF00" }}>
              {COUNTRIES.length} countries
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-none tracking-tight">
            Collect Every<br />
            <span style={{ background: "linear-gradient(90deg,#4055FF,#9033F5,#FF2060)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Country on Earth
            </span>
          </h1>

          <p className="text-white/55 text-base md:text-lg leading-relaxed mb-8 max-w-md">
            Spin the globe and discover your lucky destination. Beautiful virtual passport stamps — free to collect, fun to share. 🌍
          </p>

          <button
            onClick={handleSpin}
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white text-base font-black transition-all hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg,#4055FF,#9033F5,#FF2060)",
              boxShadow: "0 0 40px rgba(64,85,255,0.45), 0 8px 32px rgba(144,51,245,0.3)",
            }}
          >
            <Globe className="w-5 h-5 group-hover:animate-spin" />
            Spin the Globe — Free!
            <span className="w-2 h-2 rounded-full bg-white/80" style={{ animation: "ping-dot 1.5s ease infinite" }} />
            {/* shimmer */}
            <span className="absolute inset-0 rounded-2xl overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </span>
          </button>

          {stickers.length > 0 && (
            <p className="mt-4 text-white/35 text-sm flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400/60" />
              {stickers.length} sticker{stickers.length > 1 ? "s" : ""} in your collection
            </p>
          )}
        </div>
      </section>

      {/* Spin overlay modal */}
      {spinning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(2,4,20,0.95)", backdropFilter: "blur(20px)" }}>
          <SpinWheel onDone={handleSpinDone} />
        </div>
      )}

      {/* Collection */}
      <section className="px-5 md:px-10 pb-16 pt-8">
        {/* Progress bar */}
        <div className="mb-8 p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#4055FF,#9033F5)" }}>
                <Globe className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">My Collection</p>
                <p className="text-xs text-white/40">{stickers.length} of {COUNTRIES.length} countries</p>
              </div>
            </div>
            {stickers.length >= 10 && (
              <div className="flex gap-1">
                {[...Array(Math.min(5, Math.floor(stickers.length / 10)))].map((_, i) => (
                  <span key={i} className="text-amber-400 text-base">⭐</span>
                ))}
              </div>
            )}
          </div>
          <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.max((stickers.length / COUNTRIES.length) * 100, stickers.length > 0 ? 1.5 : 0)}%`,
                background: "linear-gradient(90deg,#4055FF,#9033F5,#FF2060)",
                boxShadow: "0 0 12px rgba(64,85,255,0.5)",
              }}
            />
          </div>
        </div>

        {stickers.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-5 border-2 border-dashed border-white/[0.12]"
              style={{ background: "rgba(64,85,255,0.07)" }}>
              <Globe className="w-12 h-12 text-white/20" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Your passport is empty</h3>
            <p className="text-white/40 text-sm mb-6">Spin the globe to earn your first lucky country sticker!</p>
            <button onClick={handleSpin}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold"
              style={{ background: "linear-gradient(135deg,#4055FF,#9033F5)" }}>
              <Globe className="w-4 h-4" />Spin Now — Free!
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {stickers.map((s, i) => (
              <div key={s.id}
                className="relative flex flex-col items-center p-3 rounded-2xl border cursor-default transition-all"
                style={{
                  borderColor: hoveredId === s.id ? s.primary + "60" : "rgba(255,255,255,0.06)",
                  background: hoveredId === s.id ? s.primary + "14" : "rgba(255,255,255,0.03)",
                  transform: hoveredId === s.id ? "translateY(-4px) scale(1.03)" : "none",
                  animation: `pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.04}s both`,
                }}
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div style={{ filter: hoveredId === s.id ? `drop-shadow(0 4px 16px ${s.primary}70)` : undefined }}>
                  <StickerBadge sticker={s} size={100} shine={hoveredId === s.id} />
                </div>
                <p className="mt-2 text-[10px] font-black text-white/70 text-center leading-tight">{s.name}</p>
                <p className="text-[9px] text-white/25 mt-0.5">
                  {new Date(s.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>

                {/* Tooltip */}
                {hoveredId === s.id && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 rounded-xl text-xs leading-relaxed z-20 border border-white/10 shadow-2xl"
                    style={{ background: "#0d0f1e" }}>
                    <p className="font-bold text-white mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" style={{ color: s.primary }} />{s.name}
                    </p>
                    <p className="text-white/55">{s.fact}</p>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-4 border-r-4 border-t-4 border-transparent" style={{ borderTopColor: "#0d0f1e" }} />
                  </div>
                )}
              </div>
            ))}

            {/* Get more */}
            <button onClick={handleSpin}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed transition-all group min-h-[140px]"
              style={{ borderColor: "rgba(64,85,255,0.25)", background: "rgba(64,85,255,0.04)" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(64,85,255,0.5)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(64,85,255,0.25)")}
            >
              <div className="w-10 h-10 rounded-full mb-2 flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ background: "linear-gradient(135deg,#4055FF,#9033F5)", boxShadow: "0 4px 16px rgba(64,85,255,0.35)" }}>
                <RefreshCcw className="w-4 h-4 text-white" />
              </div>
              <p className="text-[11px] font-black text-blue-400">Spin Again</p>
              <p className="text-[9px] text-white/30 mt-0.5">Free!</p>
            </button>
          </div>
        )}
      </section>

      <style>{`
        @keyframes hero-float-0 { 0%,100%{transform:inherit;margin-top:0} 50%{margin-top:-14px} }
        @keyframes hero-float-1 { 0%,100%{transform:inherit;margin-top:0} 50%{margin-top:-9px} }
        @keyframes hero-float-2 { 0%,100%{transform:inherit;margin-top:0} 50%{margin-top:-18px} }
        @keyframes globe-pulse  { from{filter:drop-shadow(0 0 10px #4055FF80)} to{filter:drop-shadow(0 0 28px #4055FFcc)} }
        @keyframes ping-dot     { 0%,100%{opacity:0.8;transform:scale(1)} 50%{opacity:0.3;transform:scale(2)} }
        @keyframes pop-in       { from{opacity:0;transform:scale(0.6) rotate(-10deg)} to{opacity:1;transform:scale(1) rotate(0)} }
      `}</style>
    </div>
  );
}
