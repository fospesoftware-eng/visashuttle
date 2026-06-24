import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Download, Globe, MapPin, RefreshCcw, Trophy, X } from "lucide-react";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa6";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";

// ── Country data ────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: "JP", name: "Japan",         flag: "🇯🇵", landmark: "⛩️",  primary: "#BC002D", secondary: "#FFCDD2", fact: "Japan has the world's oldest company, Kongō Gumi, founded in 578 AD." },
  { code: "CN", name: "China",         flag: "🇨🇳", landmark: "🏯",  primary: "#DE2910", secondary: "#FFDE00", fact: "China invented paper, printing, gunpowder, and the compass." },
  { code: "IN", name: "India",         flag: "🇮🇳", landmark: "🕌",  primary: "#FF9933", secondary: "#138808", fact: "India invented the number zero and the decimal system." },
  { code: "KR", name: "South Korea",   flag: "🇰🇷", landmark: "🏯",  primary: "#003478", secondary: "#CD2E3A", fact: "South Korea has the fastest average internet speeds in the world." },
  { code: "TH", name: "Thailand",      flag: "🇹🇭", landmark: "🛕",  primary: "#A51931", secondary: "#F9C440", fact: "Thailand is the world's largest exporter of rice." },
  { code: "VN", name: "Vietnam",       flag: "🇻🇳", landmark: "🍜",  primary: "#DA251D", secondary: "#FFCD00", fact: "Vietnam is the world's second largest coffee producer." },
  { code: "SG", name: "Singapore",     flag: "🇸🇬", landmark: "🌃",  primary: "#EF3340", secondary: "#FFFFFF", fact: "Changi Airport has won the world's best airport award for 12+ years." },
  { code: "MY", name: "Malaysia",      flag: "🇲🇾", landmark: "🏙️", primary: "#CC0001", secondary: "#010066", fact: "The Petronas Towers were the world's tallest buildings from 1998–2004." },
  { code: "ID", name: "Indonesia",     flag: "🇮🇩", landmark: "🌴",  primary: "#CE1126", secondary: "#FFFFFF", fact: "Indonesia has more active volcanoes than any other country on Earth." },
  { code: "PH", name: "Philippines",   flag: "🇵🇭", landmark: "🏝️", primary: "#0038A8", secondary: "#FCD116", fact: "The Philippines has over 7,640 islands." },
  { code: "NP", name: "Nepal",         flag: "🇳🇵", landmark: "🏔️", primary: "#003893", secondary: "#DC143C", fact: "Nepal is home to 8 of the world's 10 tallest mountains." },
  { code: "BT", name: "Bhutan",        flag: "🇧🇹", landmark: "🐉",  primary: "#FF8000", secondary: "#FF0000", fact: "Bhutan is the world's only carbon-negative country." },
  { code: "LK", name: "Sri Lanka",     flag: "🇱🇰", landmark: "🦁",  primary: "#8D153A", secondary: "#EB7400", fact: "Sri Lanka was the first country to elect a female prime minister." },
  { code: "MN", name: "Mongolia",      flag: "🇲🇳", landmark: "🏕️", primary: "#C4272F", secondary: "#015197", fact: "Mongolia has the lowest population density of any sovereign nation." },
  { code: "KZ", name: "Kazakhstan",    flag: "🇰🇿", landmark: "🏇",  primary: "#00AFCA", secondary: "#FFCC00", fact: "Kazakhstan is the world's largest landlocked country." },
  { code: "UZ", name: "Uzbekistan",    flag: "🇺🇿", landmark: "🕌",  primary: "#1EB53A", secondary: "#0099B5", fact: "Samarkand is one of the oldest continuously inhabited cities on Earth." },
  { code: "AZ", name: "Azerbaijan",    flag: "🇦🇿", landmark: "🔥",  primary: "#0092BC", secondary: "#E8323B", fact: "Azerbaijan means 'Land of Fire' — it has eternal flames from the ground." },
  { code: "AM", name: "Armenia",       flag: "🇦🇲", landmark: "⛪",  primary: "#D90012", secondary: "#F2A800", fact: "Armenia was the first country to officially adopt Christianity in 301 AD." },
  { code: "GE", name: "Georgia",       flag: "🇬🇪", landmark: "⛪",  primary: "#FF0000", secondary: "#FFFFFF", fact: "Georgia is home to the world's deepest cave at 2,212 metres." },
  { code: "IR", name: "Iran",          flag: "🇮🇷", landmark: "🕌",  primary: "#239F40", secondary: "#DA0000", fact: "Iran (Persia) is one of the world's oldest civilisations at 7,000 years." },
  { code: "SA", name: "Saudi Arabia",  flag: "🇸🇦", landmark: "🕌",  primary: "#006C35", secondary: "#FFFFFF", fact: "Saudi Arabia holds 17% of the world's proven oil reserves." },
  { code: "AE", name: "UAE",           flag: "🇦🇪", landmark: "🏙️", primary: "#00732F", secondary: "#FF0000", fact: "The Burj Khalifa is the world's tallest building at 828 metres." },
  { code: "QA", name: "Qatar",         flag: "🇶🇦", landmark: "🏟️", primary: "#8D1B3D", secondary: "#FFFFFF", fact: "Qatar has the world's third largest natural gas reserves." },
  { code: "JO", name: "Jordan",        flag: "🇯🇴", landmark: "🏜️", primary: "#007A3D", secondary: "#CE1126", fact: "Jordan's Petra, carved from rose-red rock, is one of the Seven Wonders." },
  { code: "FR", name: "France",        flag: "🇫🇷", landmark: "🗼",  primary: "#002395", secondary: "#ED2939", fact: "France is the world's most visited country with 90 million tourists annually." },
  { code: "IT", name: "Italy",         flag: "🇮🇹", landmark: "🏛️", primary: "#009246", secondary: "#CE2B37", fact: "Italy has more UNESCO World Heritage Sites than any other nation." },
  { code: "DE", name: "Germany",       flag: "🇩🇪", landmark: "🏰",  primary: "#333333", secondary: "#DD0000", fact: "Germany has 1,500 types of beer brewed in over 1,300 breweries." },
  { code: "ES", name: "Spain",         flag: "🇪🇸", landmark: "💃",  primary: "#AA151B", secondary: "#F1BF00", fact: "Spain has the second largest number of UNESCO sites in Europe." },
  { code: "GB", name: "United Kingdom",flag: "🇬🇧", landmark: "🎡",  primary: "#012169", secondary: "#C8102E", fact: "The UK invented the World Wide Web, telephone, and television." },
  { code: "PT", name: "Portugal",      flag: "🇵🇹", landmark: "⛵",  primary: "#006600", secondary: "#FF0000", fact: "Portugal is the world's oldest nation-state with borders since 1139." },
  { code: "NL", name: "Netherlands",   flag: "🇳🇱", landmark: "🌷",  primary: "#AE1C28", secondary: "#21468B", fact: "The Netherlands grows more flowers than any country except Kenya." },
  { code: "CH", name: "Switzerland",   flag: "🇨🇭", landmark: "🏔️", primary: "#FF0000", secondary: "#FFFFFF", fact: "Switzerland has been officially neutral in conflicts since 1815." },
  { code: "AT", name: "Austria",       flag: "🇦🇹", landmark: "🎻",  primary: "#ED2939", secondary: "#FFFFFF", fact: "Vienna is the birthplace of classical music — Mozart, Beethoven, Schubert." },
  { code: "SE", name: "Sweden",        flag: "🇸🇪", landmark: "🎿",  primary: "#006AA7", secondary: "#FECC02", fact: "Sweden invented the seatbelt, which has saved over a million lives." },
  { code: "NO", name: "Norway",        flag: "🇳🇴", landmark: "🏔️", primary: "#EF2B2D", secondary: "#002868", fact: "Norway has the world's longest road tunnel at 24.5 km." },
  { code: "DK", name: "Denmark",       flag: "🇩🇰", landmark: "🧜",  primary: "#C60C30", secondary: "#FFFFFF", fact: "Denmark is consistently ranked the world's happiest country." },
  { code: "FI", name: "Finland",       flag: "🇫🇮", landmark: "🎅",  primary: "#003580", secondary: "#FFFFFF", fact: "Finland has the most heavy metal bands per capita of any nation." },
  { code: "IS", name: "Iceland",       flag: "🇮🇸", landmark: "🌋",  primary: "#003897", secondary: "#DC1E35", fact: "Iceland is the world's most peaceful country with no standing army." },
  { code: "IE", name: "Ireland",       flag: "🇮🇪", landmark: "🍀",  primary: "#169B62", secondary: "#FF883E", fact: "Ireland has never had a native snake population." },
  { code: "PL", name: "Poland",        flag: "🇵🇱", landmark: "🦅",  primary: "#DC143C", secondary: "#FFFFFF", fact: "Poland has the world's oldest salt mine in operation since 1044." },
  { code: "CZ", name: "Czechia",       flag: "🇨🇿", landmark: "🏰",  primary: "#D7141A", secondary: "#11457E", fact: "Prague has the highest density of castles per capita in the world." },
  { code: "HU", name: "Hungary",       flag: "🇭🇺", landmark: "🏰",  primary: "#CE2939", secondary: "#477050", fact: "Hungary has the third most Nobel Prize winners per capita." },
  { code: "RO", name: "Romania",       flag: "🇷🇴", landmark: "🏰",  primary: "#002B7F", secondary: "#FCD116", fact: "Romania's Parliament Palace is the world's heaviest administrative building." },
  { code: "GR", name: "Greece",        flag: "🇬🇷", landmark: "🏺",  primary: "#0D5EAF", secondary: "#FFFFFF", fact: "Greece has more archaeological museums than any other country." },
  { code: "UA", name: "Ukraine",       flag: "🇺🇦", landmark: "🌻",  primary: "#005BBB", secondary: "#FFD500", fact: "Ukraine is Europe's largest country and its breadbasket." },
  { code: "NG", name: "Nigeria",       flag: "🇳🇬", landmark: "🥁",  primary: "#008751", secondary: "#FFFFFF", fact: "Nigeria is Africa's most populous nation and largest economy." },
  { code: "ZA", name: "South Africa",  flag: "🇿🇦", landmark: "🦁",  primary: "#007A4D", secondary: "#FFB81C", fact: "South Africa has three official capital cities." },
  { code: "EG", name: "Egypt",         flag: "🇪🇬", landmark: "🐪",  primary: "#CE1126", secondary: "#C09300", fact: "Ancient Egyptians invented toothpaste over 5,000 years ago." },
  { code: "ET", name: "Ethiopia",      flag: "🇪🇹", landmark: "☕",  primary: "#078930", secondary: "#FCDD09", fact: "Ethiopia is the birthplace of coffee and humanity's earliest ancestors." },
  { code: "KE", name: "Kenya",         flag: "🇰🇪", landmark: "🦒",  primary: "#006600", secondary: "#BB0000", fact: "Kenya's Rift Valley is where the earliest human fossils were found." },
  { code: "TZ", name: "Tanzania",      flag: "🇹🇿", landmark: "🦣",  primary: "#1EB53A", secondary: "#FCD116", fact: "Tanzania is home to Africa's highest peak, Mount Kilimanjaro." },
  { code: "GH", name: "Ghana",         flag: "🇬🇭", landmark: "🥁",  primary: "#006B3F", secondary: "#FCD116", fact: "Ghana was the first sub-Saharan African country to gain independence." },
  { code: "MA", name: "Morocco",       flag: "🇲🇦", landmark: "🕌",  primary: "#C1272D", secondary: "#006233", fact: "Morocco has the world's oldest continuously operating university, founded in 859 AD." },
  { code: "MG", name: "Madagascar",    flag: "🇲🇬", landmark: "🦜",  primary: "#FC3D32", secondary: "#007E3A", fact: "90% of Madagascar's wildlife exists nowhere else on the planet." },
  { code: "ZW", name: "Zimbabwe",      flag: "🇿🇼", landmark: "🌊",  primary: "#006400", secondary: "#FFD200", fact: "Zimbabwe's Victoria Falls is the world's largest waterfall by area." },
  { code: "RW", name: "Rwanda",        flag: "🇷🇼", landmark: "🌄",  primary: "#20603D", secondary: "#FAD201", fact: "Rwanda has the highest percentage of women in parliament globally." },
  { code: "UG", name: "Uganda",        flag: "🇺🇬", landmark: "🦍",  primary: "#000000", secondary: "#FCDC04", fact: "Uganda is home to over half the world's remaining mountain gorillas." },
  { code: "US", name: "United States", flag: "🇺🇸", landmark: "🗽",  primary: "#002868", secondary: "#BF0A30", fact: "The US has won more Nobel Prizes than any other country in history." },
  { code: "CA", name: "Canada",        flag: "🇨🇦", landmark: "🍁",  primary: "#FF0000", secondary: "#FFFFFF", fact: "Canada has the longest coastline of any country at 202,080 km." },
  { code: "MX", name: "Mexico",        flag: "🇲🇽", landmark: "🏺",  primary: "#006847", secondary: "#CE1126", fact: "Mexico City was built on an ancient Aztec lake — it sinks 10 cm/year." },
  { code: "BR", name: "Brazil",        flag: "🇧🇷", landmark: "🌴",  primary: "#009C3B", secondary: "#FFDF00", fact: "Brazil's Amazon contains 10% of all species on Earth." },
  { code: "AR", name: "Argentina",     flag: "🇦🇷", landmark: "🌎",  primary: "#74ACDF", secondary: "#FFFFFF", fact: "Argentina has won the FIFA World Cup three times." },
  { code: "CL", name: "Chile",         flag: "🇨🇱", landmark: "🗿",  primary: "#D52B1E", secondary: "#003580", fact: "Chile is the longest country in the world at 4,300 km." },
  { code: "CO", name: "Colombia",      flag: "🇨🇴", landmark: "🌸",  primary: "#FCD116", secondary: "#003893", fact: "Colombia is the only South American country with two coastlines." },
  { code: "PE", name: "Peru",          flag: "🇵🇪", landmark: "🏔️", primary: "#D91023", secondary: "#FFFFFF", fact: "Machu Picchu was built without mortar or iron tools." },
  { code: "VE", name: "Venezuela",     flag: "🇻🇪", landmark: "🌊",  primary: "#CF142B", secondary: "#007A5E", fact: "Venezuela has the world's highest waterfall, Angel Falls, at 979 m." },
  { code: "CU", name: "Cuba",          flag: "🇨🇺", landmark: "🎶",  primary: "#002A8F", secondary: "#CF142B", fact: "Cuba has the highest literacy rate in Latin America at 99.8%." },
  { code: "JM", name: "Jamaica",       flag: "🇯🇲", landmark: "🎵",  primary: "#000000", secondary: "#009B3A", fact: "Jamaica is the birthplace of reggae music and Bob Marley." },
  { code: "CR", name: "Costa Rica",    flag: "🇨🇷", landmark: "🦋",  primary: "#002B7F", secondary: "#CE1126", fact: "Costa Rica runs on 100% renewable energy." },
  { code: "PA", name: "Panama",        flag: "🇵🇦", landmark: "⛵",  primary: "#FFFFFF", secondary: "#D21034", fact: "Panama Canal reduced ocean routes by up to 20,000 km." },
  { code: "AU", name: "Australia",     flag: "🇦🇺", landmark: "🦘",  primary: "#00008B", secondary: "#FFBF00", fact: "Australia is the only country that is also a continent." },
  { code: "NZ", name: "New Zealand",   flag: "🇳🇿", landmark: "🌋",  primary: "#00247D", secondary: "#CC142B", fact: "New Zealand was the first country to give women the right to vote." },
  { code: "FJ", name: "Fiji",          flag: "🇫🇯", landmark: "🏝️", primary: "#003F87", secondary: "#FFFFFF", fact: "Fiji's 333 islands are spread across 1.3 million sq km of ocean." },
  { code: "PG", name: "Papua New Guinea", flag: "🇵🇬", landmark: "🦅", primary: "#000000", secondary: "#CE1126", fact: "Papua New Guinea has over 800 distinct languages." },
  { code: "MV", name: "Maldives",      flag: "🇲🇻", landmark: "🏖️", primary: "#D21034", secondary: "#007E3A", fact: "The Maldives is the world's lowest-lying country at just 1.5 m above sea level." },
  { code: "LU", name: "Luxembourg",    flag: "🇱🇺", landmark: "🏰",  primary: "#EF3340", secondary: "#00A1DE", fact: "Luxembourg has the highest GDP per capita in the world." },
  { code: "MC", name: "Monaco",        flag: "🇲🇨", landmark: "🎰",  primary: "#CE1126", secondary: "#FFFFFF", fact: "Monaco is the world's second smallest and most densely populated country." },
  { code: "VA", name: "Vatican City",  flag: "🇻🇦", landmark: "⛪",  primary: "#FFE000", secondary: "#FFFFFF", fact: "Vatican City is the world's smallest internationally recognized country." },
  { code: "BO", name: "Bolivia",       flag: "🇧🇴", landmark: "🏔️", primary: "#D52B1E", secondary: "#F4E400", fact: "Bolivia has the world's largest salt flat, Salar de Uyuni." },
  { code: "EC", name: "Ecuador",       flag: "🇪🇨", landmark: "🌎",  primary: "#FFD100", secondary: "#003580", fact: "Ecuador is the only country named after a geographic feature — the Equator." },
  { code: "NA", name: "Namibia",       flag: "🇳🇦", landmark: "🏜️", primary: "#009543", secondary: "#003580", fact: "The Namib is the world's oldest desert at 55–80 million years old." },
  { code: "BW", name: "Botswana",      flag: "🇧🇼", landmark: "🦓",  primary: "#75AADB", secondary: "#000000", fact: "Botswana transformed from the world's poorest to middle-income in just 30 years." },
  { code: "SN", name: "Senegal",       flag: "🇸🇳", landmark: "🎺",  primary: "#00853F", secondary: "#FDEF42", fact: "Senegal's Lake Retba is naturally pink due to algae and its high salt content." },
  { code: "ML", name: "Mali",          flag: "🇲🇱", landmark: "🕌",  primary: "#14B53A", secondary: "#CE1126", fact: "Mali's Timbuktu was the world's most important Islamic learning centre in medieval times." },
  { code: "TR", name: "Turkey",        flag: "🇹🇷", landmark: "🕌",  primary: "#E30A17", secondary: "#FFFFFF", fact: "Turkey has the world's oldest known temple, Göbekli Tepe, at 12,000 years old." },
  { code: "PK", name: "Pakistan",      flag: "🇵🇰", landmark: "🏔️", primary: "#01411C", secondary: "#FFFFFF", fact: "Pakistan is home to K2, the world's second highest mountain." },
  { code: "BD", name: "Bangladesh",    flag: "🇧🇩", landmark: "🌿",  primary: "#006A4E", secondary: "#F42A41", fact: "Bangladesh has the world's largest river delta — the Ganges-Brahmaputra." },
  { code: "MM", name: "Myanmar",       flag: "🇲🇲", landmark: "🛕",  primary: "#FECB00", secondary: "#34B233", fact: "Myanmar has over 2,000 ancient temples in the Bagan plain." },
  { code: "KH", name: "Cambodia",      flag: "🇰🇭", landmark: "🏯",  primary: "#032EA1", secondary: "#E00025", fact: "Angkor Wat is the world's largest religious monument." },
  { code: "UY", name: "Uruguay",       flag: "🇺🇾", landmark: "🌞",  primary: "#FFFFFF", secondary: "#009FCA", fact: "Uruguay was the first country to fully legalise marijuana." },
  { code: "PY", name: "Paraguay",      flag: "🇵🇾", landmark: "💧",  primary: "#D52B1E", secondary: "#0038A8", fact: "Paraguay's Itaipu Dam is the world's largest hydroelectric power plant." },
  { code: "SC", name: "Seychelles",    flag: "🇸🇨", landmark: "🏝️", primary: "#003F87", secondary: "#FCD856", fact: "Seychelles has more giant tortoises per sq km than anywhere else on Earth." },
  { code: "MU", name: "Mauritius",     flag: "🇲🇺", landmark: "🌺",  primary: "#EA2839", secondary: "#1A206D", fact: "Mauritius is home to the famous dodo bird, now extinct since 1680." },
  { code: "CV", name: "Cape Verde",    flag: "🇨🇻", landmark: "🏝️", primary: "#003893", secondary: "#CF2027", fact: "Cape Verde has one of Africa's most stable democracies." },
  { code: "TO", name: "Tonga",         flag: "🇹🇴", landmark: "🐳",  primary: "#C10000", secondary: "#FFFFFF", fact: "Tonga is the last Polynesian monarchy in the world." },
  { code: "PW", name: "Palau",         flag: "🇵🇼", landmark: "🐠",  primary: "#4AADD6", secondary: "#FFE900", fact: "Palau established the world's first shark sanctuary in 2009." },
  { code: "WS", name: "Samoa",         flag: "🇼🇸", landmark: "🌺",  primary: "#CE1126", secondary: "#002B7F", fact: "Samoa is the first country in the world to see each new day." },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", landmark: "🌺",  primary: "#F77F00", secondary: "#009A44", fact: "Côte d'Ivoire is the world's largest producer of cocoa beans." },
];

// ── Shape & pattern system ──────────────────────────────────────────────────
type Shape = "circle" | "hexagon" | "shield" | "diamond" | "starburst" | "rounded";
type PatternType = "islamic" | "waves" | "diamonds" | "celtic" | "tribal" | "aztec" | "oriental" | "nordic";

function codeHash(code: string): number {
  return code.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

const SHAPE_LIST: Shape[] = ["circle", "hexagon", "shield", "rounded", "starburst", "diamond"];
const PATTERN_LIST: PatternType[] = ["islamic", "waves", "diamonds", "celtic", "tribal", "aztec", "oriental", "nordic"];

function getShape(code: string): Shape   { return SHAPE_LIST[codeHash(code) % SHAPE_LIST.length]; }
function getPattern(code: string): PatternType { return PATTERN_LIST[codeHash(code) % PATTERN_LIST.length]; }

const f = (n: number) => n.toFixed(2);

// ── Shape path helpers ──────────────────────────────────────────────────────
function hexagonPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 90) * Math.PI / 180;
    return `${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`;
  }).join(" ");
}

function shieldPath(cx: number, cy: number, r: number): string {
  return [
    `M ${f(cx - r * 0.62)},${f(cy - r * 0.88)}`,
    `Q ${f(cx - r)},${f(cy - r * 0.88)} ${f(cx - r)},${f(cy - r * 0.1)}`,
    `Q ${f(cx - r)},${f(cy + r * 0.5)} ${f(cx)},${f(cy + r)}`,
    `Q ${f(cx + r)},${f(cy + r * 0.5)} ${f(cx + r)},${f(cy - r * 0.1)}`,
    `Q ${f(cx + r)},${f(cy - r * 0.88)} ${f(cx + r * 0.62)},${f(cy - r * 0.88)}`,
    `Q ${f(cx)},${f(cy - r * 1.1)} ${f(cx - r * 0.62)},${f(cy - r * 0.88)} Z`,
  ].join(" ");
}

function starburstPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI / 8) - Math.PI / 2;
    const pr = i % 2 === 0 ? r : r * 0.62;
    return `${f(cx + pr * Math.cos(a))},${f(cy + pr * Math.sin(a))}`;
  }).join(" ");
}

function diamondPath(cx: number, cy: number, r: number): string {
  const rx = r * 0.88, ry = r * 1.02;
  return `M ${f(cx)},${f(cy - ry)} L ${f(cx + rx)},${f(cy)} L ${f(cx)},${f(cy + ry)} L ${f(cx - rx)},${f(cy)} Z`;
}

// ── Shape element renderer ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SVGAttr = Record<string, any>;

function ShapeEl({ shape, cx, cy, r, ...attr }: { shape: Shape; cx: number; cy: number; r: number } & SVGAttr) {
  if (shape === "hexagon")   return <polygon points={hexagonPoints(cx, cy, r)} {...attr} />;
  if (shape === "shield")    return <path d={shieldPath(cx, cy, r)} {...attr} />;
  if (shape === "starburst") return <polygon points={starburstPoints(cx, cy, r)} {...attr} />;
  if (shape === "diamond")   return <path d={diamondPath(cx, cy, r)} {...attr} />;
  if (shape === "rounded") {
    const w = r * 1.85, h = r * 2.0, rx = r * 0.22;
    return <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={rx} ry={rx} {...attr} />;
  }
  return <circle cx={cx} cy={cy} r={r} {...attr} />;
}

// Inset version (for dashed ring) — slightly smaller
function ShapeElInner({ shape, cx, cy, r, inset, ...attr }: { shape: Shape; cx: number; cy: number; r: number; inset: number } & SVGAttr) {
  return <ShapeEl shape={shape} cx={cx} cy={cy} r={r - inset} {...attr} />;
}

// ── Cultural patterns defs ──────────────────────────────────────────────────
function PatternDefs({ uid, size }: { uid: string; size: number }) {
  const s = size / 7; // tile size
  return (
    <defs>
      {/* Islamic geometric star */}
      <pattern id={`pat-islamic-${uid}`} x="0" y="0" width={s} height={s} patternUnits="userSpaceOnUse">
        <polygon points={`${s/2},0 ${s*0.62},${s*0.35} ${s},${s*0.35} ${s*0.69},${s*0.57} ${s*0.81},${s} ${s/2},${s*0.72} ${s*0.19},${s} ${s*0.31},${s*0.57} 0,${s*0.35} ${s*0.38},${s*0.35}`}
          fill="white" fillOpacity="0.07" />
      </pattern>
      {/* Waves */}
      <pattern id={`pat-waves-${uid}`} x="0" y="0" width={s} height={s/2} patternUnits="userSpaceOnUse">
        <path d={`M0,${s*0.25} Q${s*0.25},0 ${s*0.5},${s*0.25} Q${s*0.75},${s*0.5} ${s},${s*0.25}`}
          fill="none" stroke="white" strokeWidth="0.7" strokeOpacity="0.13" />
      </pattern>
      {/* Diamonds lattice */}
      <pattern id={`pat-diamonds-${uid}`} x="0" y="0" width={s} height={s} patternUnits="userSpaceOnUse">
        <polygon points={`${s/2},0 ${s},${s/2} ${s/2},${s} 0,${s/2}`}
          fill="none" stroke="white" strokeWidth="0.65" strokeOpacity="0.1" />
        <circle cx={s/2} cy={s/2} r={s*0.1} fill="white" fillOpacity="0.06" />
      </pattern>
      {/* Celtic knot circles */}
      <pattern id={`pat-celtic-${uid}`} x="0" y="0" width={s} height={s} patternUnits="userSpaceOnUse">
        <circle cx={s*0.25} cy={s*0.25} r={s*0.2} fill="none" stroke="white" strokeWidth="0.6" strokeOpacity="0.1" />
        <circle cx={s*0.75} cy={s*0.75} r={s*0.2} fill="none" stroke="white" strokeWidth="0.6" strokeOpacity="0.1" />
        <line x1={s*0.25} y1={s*0.25} x2={s*0.75} y2={s*0.75} stroke="white" strokeWidth="0.4" strokeOpacity="0.07" />
      </pattern>
      {/* Tribal chevrons */}
      <pattern id={`pat-tribal-${uid}`} x="0" y="0" width={s} height={s*0.5} patternUnits="userSpaceOnUse">
        <polyline points={`0,${s*0.25} ${s*0.25},0 ${s*0.5},${s*0.25} ${s*0.75},0 ${s},${s*0.25}`}
          fill="none" stroke="white" strokeWidth="0.7" strokeOpacity="0.1" />
      </pattern>
      {/* Aztec steps */}
      <pattern id={`pat-aztec-${uid}`} x="0" y="0" width={s} height={s} patternUnits="userSpaceOnUse">
        <rect x={s*0.1} y={s*0.1} width={s*0.3} height={s*0.3} fill="white" fillOpacity="0.07" />
        <rect x={s*0.6} y={s*0.6} width={s*0.3} height={s*0.3} fill="white" fillOpacity="0.07" />
        <rect x={s*0.2} y={s*0.2} width={s*0.15} height={s*0.15} fill="white" fillOpacity="0.04" />
        <rect x={s*0.7} y={s*0.7} width={s*0.15} height={s*0.15} fill="white" fillOpacity="0.04" />
      </pattern>
      {/* Oriental clouds */}
      <pattern id={`pat-oriental-${uid}`} x="0" y="0" width={s*1.5} height={s} patternUnits="userSpaceOnUse">
        <path d={`M0,${s*0.6} Q${s*0.2},${s*0.2} ${s*0.5},${s*0.5} Q${s*0.8},${s*0.8} ${s},${s*0.5} Q${s*1.2},${s*0.2} ${s*1.5},${s*0.6}`}
          fill="none" stroke="white" strokeWidth="0.7" strokeOpacity="0.1" />
      </pattern>
      {/* Nordic runes */}
      <pattern id={`pat-nordic-${uid}`} x="0" y="0" width={s} height={s} patternUnits="userSpaceOnUse">
        <line x1={s*0.5} y1="0" x2={s*0.5} y2={s} stroke="white" strokeWidth="0.5" strokeOpacity="0.08" />
        <line x1="0" y1={s*0.5} x2={s} y2={s*0.5} stroke="white" strokeWidth="0.5" strokeOpacity="0.08" />
        <line x1="0" y1="0" x2={s} y2={s} stroke="white" strokeWidth="0.35" strokeOpacity="0.05" />
        <line x1={s} y1="0" x2="0" y2={s} stroke="white" strokeWidth="0.35" strokeOpacity="0.05" />
      </pattern>
    </defs>
  );
}

// ── Sticker Badge SVG ───────────────────────────────────────────────────────
interface StickerData {
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

function StickerBadge({
  sticker, size = 140, shine = false, style, svgId,
}: {
  sticker: StickerData | typeof COUNTRIES[0];
  size?: number;
  shine?: boolean;
  style?: React.CSSProperties;
  svgId?: string;
}) {
  const shape   = getShape(sticker.code);
  const pattern = getPattern(sticker.code);
  const d = size, cx = d / 2, cy = d / 2;

  // For non-circle shapes the "r" is the circumradius; content fits inside inscribed circle
  const r = shape === "rounded"   ? d * 0.43
          : shape === "shield"    ? d * 0.43
          : shape === "diamond"   ? d * 0.43
          : shape === "starburst" ? d * 0.44
          : d * 0.46;

  // Inscribed circle for content (starburst inner star, others same as r)
  const contentR = shape === "starburst" ? r * 0.62 : r;
  const uid = sticker.code + (svgId || size);

  // Flag emoji size
  const flagSize = size * 0.22;
  // Name font size (shrinks for long names)
  const nameFontSize = Math.min(size * 0.075, size * 0.075 * (9 / Math.max(sticker.name.length, 9)));

  // Vertical content positions (relative to cy) — adjusted for shape
  const shieldOffset = shape === "shield" ? -d * 0.03 : 0;
  const yFlag     = cy + shieldOffset - contentR * 0.18;
  const yDiv      = cy + shieldOffset + contentR * 0.11;
  const yName     = cy + shieldOffset + contentR * 0.28;
  const yLandmark = cy + shieldOffset + contentR * 0.55;
  const yBrand    = cy + shieldOffset + contentR * 0.82;

  return (
    <svg id={svgId} viewBox={`0 0 ${d} ${d}`} width={d} height={d}
      xmlns="http://www.w3.org/2000/svg" style={style}>
      <defs>
        <radialGradient id={`bg-${uid}`} cx="50%" cy="36%" r="72%">
          <stop offset="0%" stopColor={sticker.secondary} stopOpacity="0.85" />
          <stop offset="55%" stopColor={sticker.primary} stopOpacity="1" />
          <stop offset="100%" stopColor={sticker.primary} stopOpacity="1" />
        </radialGradient>
        <radialGradient id={`shine-${uid}`} cx="36%" cy="26%" r="58%">
          <stop offset="0%" stopColor="white" stopOpacity="0.42" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <filter id={`shadow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy={d * 0.03} stdDeviation={d * 0.045}
            floodColor={sticker.primary} floodOpacity="0.55" />
        </filter>
        <clipPath id={`clip-${uid}`}>
          <ShapeEl shape={shape} cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      <PatternDefs uid={uid} size={size} />

      {/* Outer glow ring */}
      <ShapeEl shape={shape} cx={cx} cy={cy} r={r + d * 0.028}
        fill="none" stroke={sticker.primary} strokeWidth={d * 0.009} strokeOpacity="0.3" />

      {/* Main fill */}
      <ShapeEl shape={shape} cx={cx} cy={cy} r={r}
        fill={`url(#bg-${uid})`} filter={`url(#shadow-${uid})`} />

      {/* Cultural pattern overlay (clipped to shape) */}
      <ShapeEl shape={shape} cx={cx} cy={cy} r={r}
        fill={`url(#pat-${pattern}-${uid})`} clipPath={`url(#clip-${uid})`} />

      {/* Dashed border ring (inset) */}
      <ShapeElInner shape={shape} cx={cx} cy={cy} r={r} inset={d * 0.028}
        fill="none" stroke="white" strokeWidth={d * 0.012} strokeOpacity="0.6"
        strokeDasharray={`${d * 0.032} ${d * 0.022}`} />

      {/* Inner content ring (subtle) */}
      <circle cx={cx} cy={cy} r={contentR * 0.92}
        fill="none" stroke="white" strokeWidth={d * 0.004} strokeOpacity="0.12" />

      {/* 5 decorative stars at corners */}
      {[0, 72, 144, 216, 288].map(angle => {
        const rad = (angle * Math.PI) / 180;
        const sr  = r - d * 0.07;
        return (
          <text key={angle}
            x={cx + sr * Math.cos(rad - Math.PI / 2)}
            y={cy + sr * Math.sin(rad - Math.PI / 2)}
            textAnchor="middle" dominantBaseline="central"
            fontSize={d * 0.036} fill="white" fillOpacity="0.35">✦</text>
        );
      })}

      {/* Flag emoji */}
      <text x={cx} y={yFlag} textAnchor="middle" dominantBaseline="central"
        fontSize={flagSize}>{sticker.flag}</text>

      {/* Divider line */}
      <line x1={cx - d * 0.12} y1={yDiv} x2={cx + d * 0.12} y2={yDiv}
        stroke="white" strokeWidth={d * 0.005} strokeOpacity="0.4" />

      {/* Country name */}
      <text x={cx} y={yName} textAnchor="middle" dominantBaseline="central"
        fontSize={nameFontSize} fontWeight="800" fill="white"
        fontFamily="system-ui,sans-serif" letterSpacing="0.02em">
        {sticker.name.toUpperCase()}
      </text>

      {/* Landmark emoji */}
      <text x={cx} y={yLandmark} textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.13}>{sticker.landmark}</text>

      {/* Brand text */}
      <text x={cx} y={yBrand} textAnchor="middle" dominantBaseline="central"
        fontSize={d * 0.048} fill="white" fillOpacity="0.45"
        fontFamily="system-ui,sans-serif" letterSpacing={`${d * 0.004}px`}>
        VISA SHUTTLE
      </text>

      {/* Shine overlay */}
      {shine && (
        <ShapeEl shape={shape} cx={cx} cy={cy} r={r}
          fill={`url(#shine-${uid})`} clipPath={`url(#clip-${uid})`} />
      )}
    </svg>
  );
}

// ── Download helpers ────────────────────────────────────────────────────────
async function downloadStickerPNG(sticker: StickerData, svgId: string) {
  const el = document.getElementById(svgId) as SVGElement | null;
  if (!el) return;
  const SIZE = 600;
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(el);
  // Inject white-space for background
  const withBg = svgStr.replace("<svg ", `<svg style="background:${sticker.primary}22" `);
  const blob = new Blob([withBg], { type: "image/svg+xml;charset=utf-8" });
  const url  = URL.createObjectURL(blob);

  return new Promise<void>(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = SIZE; canvas.height = SIZE;
      const ctx = canvas.getContext("2d")!;
      // Dark background
      ctx.fillStyle = "#03071e";
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      canvas.toBlob(b => {
        if (!b) { resolve(); return; }
        const pngUrl = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `${sticker.name.replace(/\s+/g, "-").toLowerCase()}-sticker.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(pngUrl);
        resolve();
      }, "image/png");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// ── Collect sound (Web Audio — no asset needed) ─────────────────────────────
function playCollectSound() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;

    // Master with a gentle reverb-ish tail
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

    // Cheerful ascending arpeggio (C–E–G–C major, sparkle)
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const t = now + i * 0.085;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i < 3 ? "triangle" : "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + 0.5);
    });

    // Final shimmer chord
    [1046.5, 1318.5, 1567.98].forEach((freq) => {
      const t = now + 0.42;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + 1.05);
    });

    setTimeout(() => ctx.close().catch(() => {}), 2000);
  } catch { /* ignore */ }
}

// ── Confetti burst ──────────────────────────────────────────────────────────
function Confetti({ active }: { active: boolean }) {
  const COLORS = ["#4055FF","#FF2060","#FFBF00","#00E5A0","#FF6B35","#A855F7","#06B6D4","#F43F5E"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(40)].map((_, i) => {
        const angle = (i / 40) * 360;
        const dist  = 110 + (i % 5) * 30;
        const size  = 5 + (i % 4) * 3;
        const delay = (i % 8) * 0.02;
        return (
          <div key={i} className="absolute rounded-sm"
            style={{
              width: size, height: size * (i % 2 === 0 ? 1 : 0.4),
              background: COLORS[i % COLORS.length],
              left: "50%", top: "50%",
              transform: `translate(-50%,-50%) rotate(${i * 9}deg)`,
              opacity: 0,
              ...(active && {
                opacity: 0,
                transform: `translate(calc(-50% + ${Math.cos(angle * Math.PI / 180) * dist}px), calc(-50% + ${Math.sin(angle * Math.PI / 180) * dist}px)) rotate(${i * 50}deg)`,
                transition: `all 0.95s cubic-bezier(0.1,0.8,0.25,1) ${delay}s`,
              }),
            }}
          />
        );
      })}
    </div>
  );
}

// ── Shape label for the badge ───────────────────────────────────────────────
const SHAPE_LABELS: Record<Shape, string> = {
  circle:    "🔵 Passport Stamp",
  hexagon:   "⬡ Hex Badge",
  shield:    "🛡️ Heritage Crest",
  rounded:   "🪪 Travel Card",
  starburst: "⭐ Star Collector",
  diamond:   "💎 Diamond Gem",
};

// ── Sticker Detail Modal ────────────────────────────────────────────────────
function StickerDetailModal({
  sticker, onClose,
}: { sticker: StickerData; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();
  const DETAIL_SVG_ID = `sticker-detail-${sticker.id}`;
  const shareUrl  = encodeURIComponent(`${window.location.origin}/travel-sticker`);
  const shareText = encodeURIComponent(`I just collected ${sticker.flag} ${sticker.name} on Visa Shuttle Travel Stickers! 🌍✈️`);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t); }, []);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadStickerPNG(sticker, DETAIL_SVG_ID);
      toast({ title: "Sticker downloaded!", description: `${sticker.name} saved as PNG.` });
    } finally {
      setDownloading(false);
    }
  }

  async function handleInstagram() {
    // Try Web Share API (works on mobile)
    const el = document.getElementById(DETAIL_SVG_ID) as SVGElement | null;
    if (el && navigator.share) {
      try {
        const serializer = new XMLSerializer();
        const svgStr = serializer.serializeToString(el);
        const blob = new Blob([svgStr], { type: "image/svg+xml" });
        const file = new File([blob], `${sticker.name}-sticker.svg`, { type: "image/svg+xml" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `${sticker.name} Travel Sticker`, text: `${sticker.flag} ${sticker.name} — Visa Shuttle` });
          return;
        }
      } catch { /* fallthrough */ }
    }
    // Desktop fallback: download + instruct
    await downloadStickerPNG(sticker, DETAIL_SVG_ID);
    toast({ title: "Image saved!", description: "Open Instagram and share from your photos gallery." });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2,4,20,0.90)", backdropFilter: "blur(18px)" }}
      onClick={onClose}>
      <div className="relative flex flex-col items-center max-w-xs w-full rounded-3xl border border-white/10 p-6"
        style={{
          background: "linear-gradient(160deg,#0d0f2a,#0a0a1a)",
          boxShadow: `0 0 80px ${sticker.primary}40, 0 32px 64px rgba(0,0,0,0.7)`,
          transform: mounted ? "scale(1) translateY(0)" : "scale(0.8) translateY(40px)",
          opacity: mounted ? 1 : 0,
          transition: "all 0.45s cubic-bezier(0.34,1.4,0.64,1)",
        }}
        onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition">
          <X className="w-4 h-4" />
        </button>

        {/* Shape label */}
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10 text-white/40 mb-3">
          {SHAPE_LABELS[getShape(sticker.code)]}
        </span>

        {/* Large sticker */}
        <div style={{ filter: `drop-shadow(0 0 50px ${sticker.primary}80)` }}>
          <StickerBadge sticker={sticker} size={240} shine svgId={DETAIL_SVG_ID} />
        </div>

        {/* Info */}
        <div className="mt-4 text-center mb-5">
          <h2 className="text-xl font-black text-white mb-1">{sticker.flag} {sticker.name}</h2>
          <p className="text-white/50 text-xs leading-relaxed">
            <span className="text-white/70 font-semibold">Fun fact: </span>{sticker.fact}
          </p>
          <p className="text-white/25 text-[10px] mt-2">
            Collected {new Date(sticker.earnedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Download */}
        <button onClick={handleDownload} disabled={downloading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold mb-3 transition hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg,#4055FF,#9033F5)" }}>
          <Download className="w-4 h-4" />
          {downloading ? "Saving…" : "Download Sticker PNG"}
        </button>

        {/* Social share row */}
        <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold mb-2">Share</p>
        <div className="flex gap-2.5 justify-center">
          {/* WhatsApp */}
          <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold transition hover:opacity-90 active:scale-95"
            style={{ background: "#25D366" }}>
            <FaWhatsapp className="w-4 h-4" />WhatsApp
          </a>
          {/* Facebook */}
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold transition hover:opacity-90 active:scale-95"
            style={{ background: "#1877F2" }}>
            <FaFacebookF className="w-3.5 h-3.5" />Facebook
          </a>
          {/* Instagram */}
          <button onClick={handleInstagram}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold transition hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
            <FaInstagram className="w-4 h-4" />Instagram
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Travel partner match type ───────────────────────────────────────────────
interface MatchInfo { name: string; collectedAt: string | null; }

// ── Reveal overlay (sticker earned + travel partner match) ──────────────────
function RevealOverlay({
  sticker, match, matchLoading, onClose,
}: {
  sticker: StickerData;
  match: MatchInfo | null;
  matchLoading: boolean;
  onClose: () => void;
}) {
  // phase 0 hidden → 1 sticker pops → 2 sticker text → 3 partner section
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const t1 = setTimeout(() => { setPhase(1); playCollectSound(); }, 80);
    const t2 = setTimeout(() => setPhase(2), 1500);
    const t3 = setTimeout(() => setPhase(3), 2800);
    return () => { [t1, t2, t3].forEach(clearTimeout); };
  }, []);

  const initial = (match?.name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-8"
      style={{ background: "rgba(2,4,20,0.94)", backdropFilter: "blur(20px)" }}>
      <div className="relative text-center px-6 max-w-sm w-full flex flex-col items-center">
        <Confetti active={phase >= 1} />

        {/* Sticker pop-in */}
        <div style={{
          transform: phase === 0 ? "scale(0) rotate(-18deg)" : phase === 1 ? "scale(1.1) rotate(4deg)" : "scale(1) rotate(0deg)",
          transition: phase === 0 ? "none" : "transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
          filter: `drop-shadow(0 0 48px ${sticker.primary}80)`,
          marginBottom: 18,
        }}>
          <StickerBadge sticker={sticker} size={200} shine />
        </div>

        {/* Sticker text */}
        <div style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "translateY(0)" : "translateY(24px)",
          transition: "all 0.5s ease",
        }}>
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <span className="text-2xl">🎉</span>
            <h2 className="text-xl font-black text-white">You're going to {sticker.name}!</h2>
            <span className="text-2xl">🎉</span>
          </div>
          <p className="text-white/50 text-xs leading-relaxed mb-1 px-2">
            <span className="font-semibold text-white/75">Did you know? </span>{sticker.fact}
          </p>
        </div>

        {/* Travel partner match */}
        <div className="w-full mt-5" style={{
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.55s ease",
        }}>
          {matchLoading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-7 h-7 rounded-full border-2 border-white/15 border-t-white/70 animate-spin" />
              <p className="text-white/40 text-xs">Finding your travel partner…</p>
            </div>
          ) : match ? (
            <div className="rounded-2xl border border-white/10 p-4"
              style={{ background: `linear-gradient(160deg, ${sticker.primary}22, rgba(255,255,255,0.03))` }}>
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">✈️ Your Travel Partner</p>
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white shrink-0"
                  style={{ background: `linear-gradient(135deg, ${sticker.primary}, ${sticker.secondary})` }}>
                  {initial}
                </div>
                <div className="text-left">
                  <p className="text-white font-black text-base leading-tight">{match.name}</p>
                  <p className="text-white/45 text-xs">also landed on {sticker.flag} {sticker.name}</p>
                </div>
              </div>
              <p className="text-white/45 text-xs leading-relaxed">
                You two are matched for the journey to <span className="font-semibold text-white/70">{sticker.name}</span>! 🌍
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 p-4"
              style={{ background: `linear-gradient(160deg, ${sticker.primary}22, rgba(255,255,255,0.03))` }}>
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">🌟 Trailblazer</p>
              <p className="text-white font-black text-base mb-1">You're the first explorer of {sticker.flag} {sticker.name}!</p>
              <p className="text-white/45 text-xs leading-relaxed">
                The next traveller who lands here will be matched with <span className="font-semibold text-white/70">you</span> as their travel partner.
              </p>
            </div>
          )}

          <button onClick={onClose}
            className="mt-4 inline-flex items-center gap-2 px-7 py-3 rounded-xl text-white font-bold text-sm transition hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg,#4055FF,#9033F5)" }}>
            View My Sticker →
          </button>
        </div>

        <button onClick={onClose}
          className="absolute top-0 right-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Name entry gate ─────────────────────────────────────────────────────────
function NameGate({ onSubmit, onClose }: { onSubmit: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 30); return () => clearTimeout(t); }, []);

  function submit() {
    const n = name.trim();
    if (n.length < 2) return;
    onSubmit(n);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2,4,20,0.92)", backdropFilter: "blur(18px)" }}
      onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 p-6 text-center"
        style={{
          background: "linear-gradient(160deg,#0d0f2a,#0a0a1a)",
          boxShadow: "0 0 60px rgba(64,85,255,0.3), 0 32px 64px rgba(0,0,0,0.7)",
          transform: mounted ? "scale(1) translateY(0)" : "scale(0.85) translateY(30px)",
          opacity: mounted ? 1 : 0,
          transition: "all 0.4s cubic-bezier(0.34,1.4,0.64,1)",
        }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition">
          <X className="w-4 h-4" />
        </button>
        <div className="text-4xl mb-3">🌍✈️</div>
        <h2 className="text-xl font-black text-white mb-1.5">What's your name, traveller?</h2>
        <p className="text-white/45 text-xs mb-5 leading-relaxed">
          We'll match you with another explorer heading to the same destination — your travel partner for the journey!
        </p>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          placeholder="Enter your name"
          maxLength={60}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-[#4055FF]/60 transition mb-4"
        />
        <button onClick={submit} disabled={name.trim().length < 2}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-black text-sm transition hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg,#4055FF,#9033F5,#FF2060)" }}>
          <Globe className="w-4 h-4" />Spin the Globe
        </button>
      </div>
    </div>
  );
}

// ── Spinning slot machine ───────────────────────────────────────────────────
function SpinWheel({ onDone }: { onDone: () => void }) {
  const [index, setIndex]   = useState(0);
  const [speed, setSpeed]   = useState(55);
  const cyclesRef = useRef(0);
  const iRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    iRef.current = setInterval(() => {
      setIndex(i => (i + 1) % COUNTRIES.length);
      cyclesRef.current++;
      if (cyclesRef.current > 45) {
        setSpeed(s => {
          const next = s + 20;
          if (next > 420) {
            clearInterval(iRef.current!);
            setTimeout(onDone, 250);
          }
          return next;
        });
      }
    }, speed);
    return () => clearInterval(iRef.current!);
  }, [speed]);

  const c = COUNTRIES[index];
  const dummy: StickerData = { ...c, id: "spin", earnedAt: 0 };

  return (
    <div className="flex flex-col items-center gap-4">
      <div style={{ filter: `drop-shadow(0 0 28px ${c.primary}90)`, animation: "globe-spin 0.4s ease-in-out infinite alternate" }}>
        <StickerBadge sticker={dummy} size={180} shine />
      </div>
      <p className="text-white/40 text-xs tracking-widest uppercase font-bold">Spinning the globe…</p>
    </div>
  );
}

// ── Floating sticker hero field ─────────────────────────────────────────────
const HERO_CODES = ["JP", "FR", "BR", "AU", "IS", "IN", "TR", "NZ", "KR", "IT", "EG", "PE", "ZA", "GR", "MX", "CA"];
const HERO_STICKERS = COUNTRIES.filter(c => HERO_CODES.includes(c.code));

// ── Animated travel backdrop ────────────────────────────────────────────────
function TravelBackdrop() {
  // Dotted world-map silhouette: scatter of points across a 1000×420 viewBox.
  const dots = useRef<{ x: number; y: number; r: number; o: number }[]>();
  if (!dots.current) {
    const pts: { x: number; y: number; r: number; o: number }[] = [];
    let seed = 1337;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 240; i++) {
      pts.push({ x: rnd() * 1000, y: rnd() * 420, r: 0.8 + rnd() * 1.6, o: 0.05 + rnd() * 0.22 });
    }
    dots.current = pts;
  }

  // Flight arcs: start → control → end, with a plane animating along each.
  const arcs = [
    { d: "M 60,330 Q 350,40 640,210",  dur: "9s",  delay: "0s",   color: "#7B94FF" },
    { d: "M 120,90 Q 480,330 880,130", dur: "11s", delay: "1.5s", color: "#FF6BA8" },
    { d: "M 250,380 Q 600,120 960,300",dur: "13s", delay: "3s",   color: "#5BE0C0" },
    { d: "M 40,200 Q 420,420 820,360", dur: "10s", delay: "2.2s", color: "#FFC857" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Aurora gradient orbs */}
      <div className="absolute rounded-full" style={{
        top: "-12%", left: "8%", width: 460, height: 460,
        background: "radial-gradient(circle, rgba(64,85,255,0.32), transparent 70%)",
        filter: "blur(40px)", animation: "orb-drift-a 18s ease-in-out infinite",
      }} />
      <div className="absolute rounded-full" style={{
        bottom: "-18%", right: "12%", width: 520, height: 520,
        background: "radial-gradient(circle, rgba(255,32,96,0.22), transparent 70%)",
        filter: "blur(50px)", animation: "orb-drift-b 22s ease-in-out infinite",
      }} />
      <div className="absolute rounded-full" style={{
        top: "30%", left: "45%", width: 380, height: 380,
        background: "radial-gradient(circle, rgba(144,51,245,0.20), transparent 70%)",
        filter: "blur(45px)", animation: "orb-drift-a 25s ease-in-out infinite reverse",
      }} />

      {/* Starfield */}
      {[...Array(60)].map((_, i) => {
        const left = (i * 53) % 100, top = (i * 37) % 100, sz = (i % 3) + 1;
        return <span key={i} className="absolute rounded-full bg-white" style={{
          left: `${left}%`, top: `${top}%`, width: sz, height: sz,
          opacity: 0.12 + (i % 5) * 0.05,
          animation: `twinkle ${2 + (i % 4)}s ease-in-out ${(i % 7) * 0.3}s infinite`,
        }} />;
      })}

      {/* Dotted world map + flight paths */}
      <svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full">
        <defs>
          {arcs.map((a, i) => (
            <linearGradient key={i} id={`arc-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={a.color} stopOpacity="0" />
              <stop offset="50%" stopColor={a.color} stopOpacity="0.55" />
              <stop offset="100%" stopColor={a.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* world dots */}
        {dots.current.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#9FB0FF" opacity={p.o} />
        ))}

        {/* flight arcs */}
        {arcs.map((a, i) => (
          <g key={i}>
            <path d={a.d} fill="none" stroke={`url(#arc-grad-${i})`} strokeWidth="1.5"
              strokeDasharray="3 6" opacity="0.5" />
            {/* endpoint pulse */}
            <circle r="3" fill={a.color} opacity="0.8">
              <animateMotion dur={a.dur} begin={a.delay} repeatCount="indefinite" path={a.d} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
            </circle>
            {/* plane */}
            <g opacity="0.9">
              <animateMotion dur={a.dur} begin={a.delay} repeatCount="indefinite" rotate="auto" path={a.d} />
              <path d="M -7,0 L 7,0 M 4,0 L -2,-4 M 4,0 L -2,4" stroke={a.color} strokeWidth="1.6"
                strokeLinecap="round" fill="none" />
              <circle cx="6" cy="0" r="1.6" fill={a.color} />
            </g>
          </g>
        ))}
      </svg>

      {/* Drifting clouds */}
      {[
        { top: "18%", dur: "34s", scale: 1.0,  o: 0.06, delay: "0s" },
        { top: "55%", dur: "46s", scale: 1.5,  o: 0.05, delay: "-12s" },
        { top: "72%", dur: "40s", scale: 0.8,  o: 0.07, delay: "-22s" },
      ].map((c, i) => (
        <svg key={i} viewBox="0 0 120 50" width={120 * c.scale} height={50 * c.scale}
          className="absolute" style={{
            top: c.top, left: 0, opacity: c.o, fill: "white",
            animation: `cloud-drift ${c.dur} linear ${c.delay} infinite`,
          }}>
          <ellipse cx="40" cy="32" rx="34" ry="16" />
          <ellipse cx="68" cy="26" rx="26" ry="20" />
          <ellipse cx="86" cy="34" rx="22" ry="13" />
        </svg>
      ))}
    </div>
  );
}

function FloatingHero() {
  const positions = [
    { top: "3%",   right: "1%",   size: 116, rotate:  12, float: 0, opacity: 0.95 },
    { top: "48%",  right: "5%",   size:  96, rotate:  -7, float: 1, opacity: 0.85 },
    { top: "76%",  right: "13%",  size:  84, rotate: -10, float: 2, opacity: 0.72 },
    { top: "6%",   right: "18%",  size:  86, rotate:   5, float: 2, opacity: 0.78 },
    { top: "63%",  right: "23%",  size:  74, rotate: -14, float: 0, opacity: 0.64 },
    { top: "28%",  right: "13%",  size:  66, rotate:   8, float: 1, opacity: 0.70 },
    { top: "-4%",  right: "34%",  size:  70, rotate:  19, float: 1, opacity: 0.58 },
    { top: "58%",  right: "40%",  size:  60, rotate:  -5, float: 2, opacity: 0.46 },
    { top: "16%",  right: "36%",  size:  54, rotate:  -9, float: 0, opacity: 0.42 },
    { top: "82%",  right: "34%",  size:  50, rotate:  14, float: 1, opacity: 0.34 },
    { top: "34%",  right: "50%",  size:  50, rotate:  10, float: 0, opacity: 0.34 },
    { top: "70%",  right: "52%",  size:  44, rotate: -16, float: 2, opacity: 0.26 },
    { top: "5%",   right: "52%",  size:  46, rotate:   6, float: 1, opacity: 0.28 },
    { top: "44%",  right: "61%",  size:  40, rotate: -18, float: 1, opacity: 0.20 },
    { top: "16%",  right: "66%",  size:  36, rotate:   8, float: 2, opacity: 0.15 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {positions.map((p, i) => {
        const c = HERO_STICKERS[i % HERO_STICKERS.length];
        const dummy: StickerData = { ...c, id: `h${i}`, earnedAt: 0 };
        return (
          <div key={i} style={{
            position: "absolute", top: p.top, right: p.right,
            transform: `rotate(${p.rotate}deg)`,
            opacity: p.opacity,
            animation: `hero-float-${p.float} ${4.5 + i * 0.35}s ease-in-out ${i * 0.28}s infinite`,
            filter: `drop-shadow(0 8px 22px ${c.primary}55)`,
          }}>
            <StickerBadge sticker={dummy} size={p.size} shine />
          </div>
        );
      })}
    </div>
  );
}

// ── Local storage (single sticker per traveller) ────────────────────────────
const LS_KEY = "vs_travel_sticker_v3";
interface SavedState { name: string; sticker: StickerData; match: MatchInfo | null; }
function loadState(): SavedState | null {
  try { const v = localStorage.getItem(LS_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}
function saveState(s: SavedState) { localStorage.setItem(LS_KEY, JSON.stringify(s)); }
function clearState() { localStorage.removeItem(LS_KEY); }

// ── Main page ───────────────────────────────────────────────────────────────
export default function TravelStickerPage() {
  const [saved,        setSaved]        = useState<SavedState | null>(loadState);
  const [nameGate,     setNameGate]     = useState(false);
  const [spinning,     setSpinning]     = useState(false);
  const [detail,       setDetail]       = useState<StickerData | null>(null);
  const [reveal,       setReveal]       = useState<StickerData | null>(null);
  const [match,        setMatch]        = useState<MatchInfo | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const pendingName = useRef<string>("");

  const hasSticker = !!saved;

  function handleStartSpin() {
    if (hasSticker) return;        // one sticker only
    setNameGate(true);
  }

  function handleNameSubmit(name: string) {
    pendingName.current = name;
    setNameGate(false);
    setSpinning(true);
  }

  async function handleSpinDone() {
    const picked = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    const sticker: StickerData = { ...picked, id: crypto.randomUUID(), earnedAt: Date.now() };
    setSpinning(false);
    setReveal(sticker);
    setMatchLoading(true);
    setMatch(null);

    // Find / register travel partner on the server
    let foundMatch: MatchInfo | null = null;
    try {
      const r = await fetch("/api/travel-stickers/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pendingName.current,
          code: picked.code, countryName: picked.name, flag: picked.flag,
          landmark: picked.landmark, primary: picked.primary,
          secondary: picked.secondary, fact: picked.fact,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        foundMatch = data.match || null;
      }
    } catch { /* offline / no DB → trailblazer */ }

    setMatch(foundMatch);
    setMatchLoading(false);
    const next: SavedState = { name: pendingName.current, sticker, match: foundMatch };
    setSaved(next);
    saveState(next);
  }

  function handleReset() {
    clearState();
    setSaved(null);
    setReveal(null);
    setMatch(null);
    pendingName.current = "";
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg,#03071e 0%,#08082e 38%,#0d1030 68%,#0a0a1a 100%)" }}>

      {nameGate && <NameGate onSubmit={handleNameSubmit} onClose={() => setNameGate(false)} />}
      {reveal   && <RevealOverlay sticker={reveal} match={match} matchLoading={matchLoading} onClose={() => setReveal(null)} />}
      {detail   && <StickerDetailModal sticker={detail} onClose={() => setDetail(null)} />}

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
          {saved && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.05]">
              <span className="text-sm">{saved.sticker.flag}</span>
              <span className="text-xs font-black text-white">{saved.name}</span>
            </div>
          )}
          <ThemeToggle className="h-8 w-8 rounded-xl border border-white/10 bg-white/[0.05] text-white/60" />
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[560px] flex items-center">
        <TravelBackdrop />
        <FloatingHero />
        {/* readability mask — only over the text column on the left */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to right,rgba(3,7,30,0.92) 24%,rgba(3,7,30,0.45) 50%,transparent 72%)" }} />
        <div className="absolute inset-x-0 top-0 h-16 pointer-events-none"
          style={{ background: "linear-gradient(to bottom,rgba(3,7,30,0.8),transparent)" }} />
        <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
          style={{ background: "linear-gradient(to top,rgba(10,10,26,0.95),transparent)" }} />

        <div className="relative z-10 px-6 md:px-12 py-16 max-w-lg">
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full border"
              style={{ background: "rgba(64,85,255,0.2)", borderColor: "rgba(64,85,255,0.4)", color: "#7B94FF" }}>
              ✨ One lucky sticker
            </span>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full border"
              style={{ background: "rgba(0,200,100,0.15)", borderColor: "rgba(0,200,100,0.3)", color: "#4ade80" }}>
              🆓 Free to play
            </span>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full border"
              style={{ background: "rgba(255,191,0,0.12)", borderColor: "rgba(255,191,0,0.3)", color: "#FFBF00" }}>
              ✈️ Find a travel partner
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-none tracking-tight">
            Find Your<br />
            <span style={{ background: "linear-gradient(90deg,#4055FF,#9033F5,#FF2060)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Travel Partner
            </span>
          </h1>

          <p className="text-white/50 text-base md:text-lg leading-relaxed mb-7 max-w-md">
            Spin the globe to reveal your lucky destination — then get matched with another explorer who landed on the same country. They're your travel partner for the journey! 🌍✈️
          </p>

          {!hasSticker ? (
            <button onClick={handleStartSpin}
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white text-base font-black transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#4055FF,#9033F5,#FF2060)",
                boxShadow: "0 0 40px rgba(64,85,255,0.45), 0 8px 32px rgba(144,51,245,0.3)",
              }}>
              <Globe className="w-5 h-5 group-hover:animate-spin" />
              Spin the Globe — Free!
              <span className="w-2 h-2 rounded-full bg-white/80" style={{ animation: "ping-dot 1.5s ease infinite" }} />
              <span className="absolute inset-0 rounded-2xl overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={() => setDetail(saved.sticker)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-sm font-black transition hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg,#4055FF,#9033F5)", boxShadow: "0 0 30px rgba(64,85,255,0.35)" }}>
                <Download className="w-4 h-4" />View &amp; Share My Sticker
              </button>
              <button onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl text-white/50 text-xs font-bold border border-white/10 hover:text-white/80 hover:border-white/20 transition">
                <RefreshCcw className="w-3.5 h-3.5" />Start over
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Spin modal */}
      {spinning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(2,4,20,0.95)", backdropFilter: "blur(22px)" }}>
          <SpinWheel onDone={handleSpinDone} />
        </div>
      )}

      {/* Result section */}
      <section className="px-5 md:px-10 pb-20 pt-6 max-w-3xl mx-auto w-full">
        {!hasSticker ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-5 border-2 border-dashed border-white/[0.1]"
              style={{ background: "rgba(64,85,255,0.07)" }}>
              <Globe className="w-12 h-12 text-white/20" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">No destination yet</h3>
            <p className="text-white/35 text-sm mb-6 max-w-sm mx-auto">
              Enter your name, spin the globe once, and we'll pair you with a fellow traveller heading to the same place.
            </p>
            <button onClick={handleStartSpin}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold"
              style={{ background: "linear-gradient(135deg,#4055FF,#9033F5)" }}>
              <Globe className="w-4 h-4" />Spin Now — Free!
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {/* My sticker */}
            <div className="rounded-3xl border border-white/[0.08] p-6 flex flex-col items-center text-center"
              style={{ background: `linear-gradient(160deg, ${saved.sticker.primary}18, rgba(255,255,255,0.02))` }}>
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-3">My Destination</p>
              <button onClick={() => setDetail(saved.sticker)}
                className="transition hover:scale-105 active:scale-95"
                style={{ filter: `drop-shadow(0 8px 28px ${saved.sticker.primary}55)` }}
                title="View, download & share">
                <StickerBadge sticker={saved.sticker} size={150} shine />
              </button>
              <h3 className="mt-4 text-lg font-black text-white">{saved.sticker.flag} {saved.sticker.name}</h3>
              <p className="text-white/45 text-xs leading-relaxed mt-1 mb-4">{saved.sticker.fact}</p>
              <button onClick={() => setDetail(saved.sticker)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#4055FF,#9033F5)" }}>
                <Download className="w-3.5 h-3.5" />Download &amp; Share
              </button>
            </div>

            {/* Travel partner */}
            <div className="rounded-3xl border border-white/[0.08] p-6 flex flex-col items-center justify-center text-center"
              style={{ background: "linear-gradient(160deg, rgba(64,85,255,0.08), rgba(255,255,255,0.02))" }}>
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-3">✈️ My Travel Partner</p>
              {saved.match ? (
                <>
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white mb-3"
                    style={{ background: `linear-gradient(135deg, ${saved.sticker.primary}, ${saved.sticker.secondary})`, boxShadow: `0 8px 28px ${saved.sticker.primary}55` }}>
                    {saved.match.name.trim().charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-xl font-black text-white">{saved.match.name}</h3>
                  <p className="text-white/45 text-sm mt-1 mb-3">also landed on {saved.sticker.flag} {saved.sticker.name}</p>
                  <p className="text-white/55 text-xs leading-relaxed max-w-xs">
                    You and <span className="font-bold text-white/80">{saved.match.name}</span> are matched for the journey to <span className="font-bold text-white/80">{saved.sticker.name}</span>. Say hi to your travel buddy! 🌍
                  </p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">🌟</div>
                  <h3 className="text-lg font-black text-white">You're the first explorer!</h3>
                  <p className="text-white/50 text-xs leading-relaxed mt-2 max-w-xs">
                    No one had landed on {saved.sticker.flag} {saved.sticker.name} before you. The next traveller who spins this country will be matched with <span className="font-bold text-white/75">you</span> as their travel partner.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      <style>{`
        @keyframes hero-float-0 { 0%,100%{margin-top:0} 50%{margin-top:-13px} }
        @keyframes hero-float-1 { 0%,100%{margin-top:0} 50%{margin-top:-8px}  }
        @keyframes hero-float-2 { 0%,100%{margin-top:0} 50%{margin-top:-17px} }
        @keyframes globe-spin   { from{filter:drop-shadow(0 0 12px #4055FF80)} to{filter:drop-shadow(0 0 30px #4055FFcc)} }
        @keyframes ping-dot     { 0%,100%{opacity:0.8;transform:scale(1)} 50%{opacity:0.3;transform:scale(2)} }
        @keyframes pop-in       { from{opacity:0;transform:scale(0.6) rotate(-10deg)} to{opacity:1;transform:scale(1) rotate(0deg)} }
        @keyframes twinkle      { 0%,100%{opacity:0.15} 50%{opacity:0.7} }
        @keyframes cloud-drift  { from{transform:translateX(-25vw)} to{transform:translateX(125vw)} }
        @keyframes orb-drift-a  { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,30px) scale(1.12)} }
        @keyframes orb-drift-b  { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-50px,-25px) scale(1.15)} }
      `}</style>
    </div>
  );
}
