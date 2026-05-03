# VisaShuttle Design Guidelines

## Design Approach
**System-Based**: Material Design principles adapted for enterprise SaaS with premium refinements. Focus on clarity, efficiency, and trust-building for B2B visa processing platform.

## Color System

### From Logo Extraction
Extract 3-5 dominant colors from attached logo file (PhotoshopExtension_Image_(1)_1768226779522.png):
- **Primary**: Main brand color from logo (deep blue expected)
- **Secondary**: Supporting color from logo (teal/cyan expected)
- **Accent**: Highlight color for CTAs and interactive elements
- **Neutral**: Grayscale for backgrounds and text
- **Success/Warning/Error**: Semantic colors for status indicators

### Theme Implementation
**Light Theme**:
- Background: White/Light Gray (neutral-50)
- Surface: White with subtle shadows
- Text: Dark gray hierarchy (900/700/500)

**Dark Theme**:
- Background: Near-black (neutral-950)
- Surface: Elevated dark cards (neutral-900)
- Text: Light gray hierarchy (50/200/400)

Theme switcher in top navigation bar, persisted to user preferences.

## Typography

### Font Stack
- **Primary**: Inter (Google Fonts) - UI text, body copy
- **Headings**: Inter Semi-Bold/Bold
- **Monospace**: JetBrains Mono - for document numbers, IDs, codes

### Scale (Tailwind)
- Display: text-5xl (48px) - Public landing heroes
- H1: text-4xl (36px) - Dashboard page titles
- H2: text-3xl (30px) - Section headers
- H3: text-2xl (24px) - Card titles
- H4: text-xl (20px) - Subsections
- Body: text-base (16px) - Standard text
- Small: text-sm (14px) - Helper text, labels
- XS: text-xs (12px) - Badges, timestamps

## Layout System

### Spacing Units (Tailwind)
Common spacing: **4, 6, 8, 12, 16, 24** (as in p-4, gap-6, mb-8, etc.)
- Component padding: p-6
- Section spacing: py-16 to py-24
- Card spacing: p-8
- Grid gaps: gap-6

### Grid Structure
- **Public Website**: max-w-7xl container, full-bleed hero sections
- **SaaS Admin/Agency**: Sidebar (256px) + main content area
- **Customer Dashboard**: Mobile-first with bottom navigation, responsive top bar on desktop

### Sidebar Navigation (Admin/Agency)
- Width: 256px (w-64)
- Background: Surface color with border-r
- Logo at top (h-16)
- Collapsible groups with icons
- Active state: background accent + border-l-4 primary
- Hover: subtle background change

## Interface-Specific Layouts

### 1. Public Marketing Website

**Hero Section**:
- Full viewport height (min-h-screen)
- Large background image: abstract visa/travel imagery (passport stamps, world map overlay, airplane silhouettes)
- Gradient overlay for text readability
- Centered headline (text-5xl font-bold) + subheadline (text-xl text-neutral-300)
- Dual CTA buttons: "Start Free Trial" (primary solid) + "Watch Demo" (outline with blur backdrop)
- Floating trust indicators: "Trusted by 500+ agencies" with logos

**Features Section** (3-column grid):
- Icon-led cards with hover lift effect
- Icon size: w-12 h-12 in accent color
- Title (text-2xl), description (text-base text-neutral-600)

**Pricing Section**:
- 3-tier comparison table
- Toggle: Monthly/Annual
- Highlight "Popular" tier with border-primary
- Feature checkmarks with checkCircle icons

**Footer**:
- 4-column layout: Product, Company, Resources, Legal
- Newsletter signup form
- Social icons
- Trust badges (SOC2, GDPR compliance placeholders)

### 2. SaaS Admin Dashboard

**Layout**: Sidebar + top bar + main content
**Top Bar**: Global search (⌘K trigger), notifications bell, user avatar menu
**Main Content**:
- Page title with action button (top-right)
- Stats cards in 4-column grid (total tenants, active cases, AI usage, revenue)
- Data tables with search, filters, pagination
- Modal overlays for tenant creation/editing

### 3. Agency Dashboard

**Home/Overview**:
- Stats cards: Active Cases, Pending Docs, Success Rate, Revenue (4-col)
- Recent activity timeline (left 2/3) + quick actions sidebar (right 1/3)

**CRM Pipeline**:
- Kanban board layout: columns for Lead stages (New, Contacted, Qualified, Won, Lost)
- Drag-drop cards with lead name, value, days in stage
- Card hover: slight elevation + border glow

**Case Detail Page**:
- Header: Case ID, applicant name, status badge, action menu
- 3-column layout: 
  - Left sidebar: Applicant profile card, timeline
  - Center: Checklist with progress bar, document uploads grid
  - Right: AI readiness score gauge + recommended actions list
- Document cards: thumbnail, name, status badge, quality score progress ring

**Document Center**:
- Grid view (default) or list view toggle
- Filter by: document type, quality, status
- Upload dropzone: dashed border, icon, "Drop files or click to upload"
- Document card: thumbnail preview, extracted fields expandable panel

### 4. Customer Dashboard

**Mobile-First Design**:
- Bottom navigation: Home, My Case, Upload, Messages, Profile
- Top bar: case progress stepper (mobile: condensed dots; desktop: full labels)

**Case Progress**:
- Linear stepper visualization
- Current step highlighted with pulse animation
- Completed: checkmark icon, green
- Current: numbered circle with accent border
- Upcoming: gray outline

**Upload Page**:
- Large dropzone (min-h-64)
- Real-time upload progress with percentage
- Uploaded docs: grid cards with AI quality feedback badges (green checkmark, yellow warning, red issue)

**Messages**:
- Chat interface: left-aligned agency messages, right-aligned customer messages
- Message bubbles with timestamps
- Input box fixed at bottom with paperclip attachment icon

## Component Library

### Core Components
1. **Button**: shadcn Button with variants (default, primary, outline, ghost)
2. **Card**: Elevated surface with border, rounded-lg, shadow-sm
3. **Badge**: Rounded-full px-3 py-1, colored by status (success=green, warning=amber, error=red)
4. **StatusPill**: Similar to Badge but with dot indicator
5. **DataTable**: shadcn Table with sorting, filtering, row selection
6. **Stepper**: Horizontal progress indicator with connecting lines
7. **Timeline**: Vertical activity feed with avatar + timestamp + action description
8. **UploadDropzone**: Dashed border with hover state, file list below
9. **DiffViewer**: Split-pane for VKB changes (removed=red background, added=green background)
10. **Gauge**: Circular progress for readiness score (0-100%)
11. **Command Palette**: ⌘K modal with fuzzy search (shadcn Command component)

### Form Inputs
- Text/Email/Password: shadcn Input with floating labels
- Select: shadcn Select with search
- Date: shadcn Calendar popup
- File: Custom UploadDropzone
- Consistent spacing: label (mb-2), input (mb-4)

## Animations (Framer Motion)

**Minimal & Purposeful**:
- Page transitions: Fade + slide-up (50px, 0.3s)
- Card hover: scale(1.02) + shadow increase
- Button press: scale(0.98)
- Status change: Color fade transition (0.5s)
- Stepper progress: Width animation on step completion
- Loading states: Skeleton with shimmer gradient
- NO autoplay carousels or excessive motion

## Images

### Hero Section (Public Website)
**Large background image**: High-quality photo showing passport with visa stamps, blurred world map, or abstract travel collage. Overlay: gradient from transparent to dark (bottom). Image should convey trust, professionalism, and global reach.

### Features Section
**Illustration/Icons**: Abstract icons representing AI (brain/chip), document processing (paper/scan), security (shield/lock). Use SVG icons from lucide-react, no custom illustrations.

### Agency Dashboard
**Empty states**: Simple illustrations (use lucide icons composed into scenes) for "No cases yet", "No documents uploaded"

### Customer Upload Page
**Placeholder**: Document preview thumbnails - use PDF icon or actual thumbnail generation

## Accessibility

- WCAG AA contrast ratios (4.5:1 text, 3:1 UI)
- Focus visible states: 2px offset ring in primary color
- Keyboard navigation: Tab order logical, Skip to content link
- ARIA labels on icon-only buttons
- Form validation: inline error messages below inputs
- Screen reader announcements for dynamic updates (case status changes)

## Production Polish

- Empty states with helpful CTAs
- Loading skeletons matching content layout
- Error boundaries with friendly messages + retry button
- Pagination: shadcn Pagination component (10/25/50/100 per page)
- Search: debounced input with loading spinner
- Toasts: shadcn Sonner for success/error notifications (top-right)
- Confirmation modals for destructive actions

This design system creates a premium, enterprise-grade SaaS experience that balances visual appeal with functional efficiency across all four interfaces.