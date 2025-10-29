# Frontend Design Documentation for Figma
**AI Financial Analysis Platform - "I NEED RED"**

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Design System](#design-system)
3. [Component Library](#component-library)
4. [Page Layouts](#page-layouts)
5. [User Flows](#user-flows)
6. [Responsive Design](#responsive-design)

---

## 🎯 Project Overview

### Application Type
**React-based AI-powered Financial Analysis Platform**

### Core Features
- Real-time stock price charting
- AI-driven investment analysis
- Personalized news recommendations
- Stock search with favorites
- Multi-market support (US, Korean stocks)

### Tech Stack
- React 18.3.1 + TypeScript
- Material-UI (MUI) 5.18.0
- Recharts for data visualization
- Axios for API integration
- FastAPI backend

---

## 🎨 Design System

### Color Palette

#### Primary Colors
```
Primary (Kakao Yellow)
HEX: #FEE500
RGB: 254, 229, 0
Usage: Main CTAs, highlights, selected states
```

```
Secondary (Dark Brown)
HEX: #3C1E1E
RGB: 60, 30, 30
Usage: Text on primary, accents, tab indicators
```

#### Semantic Colors
```
Success (Green)
HEX: #4CAF50
Usage: Positive feedback, price increases, high recommendation scores

Error (Red)
HEX: #FF1744
Usage: Errors, negative feedback, price decreases (Korean market)

Warning (Orange)
HEX: #FFC107
Usage: Caution states, medium recommendation scores

Info (Blue)
HEX: #2196F3
Usage: Information states, price decreases (US market), low recommendation scores
```

#### Neutral Colors
```
Background: #FFFFFF (White)
Surface: #F5F5F5 (Light Gray)
Text Primary: #333333 (Dark Gray)
Text Secondary: #666666 (Medium Gray)
Border: #E0E0E0 (Border Gray)
```

### Typography

#### Font Family
```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```

#### Type Scale
| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| h1 | 64px (4rem) | 700 (Bold) | 1.2 | Landing page hero |
| h5 | 24px (1.5rem) | 600 (Semi-bold) | 1.334 | Section headers |
| h6 | 20px (1.25rem) | 600 (Semi-bold) | 1.6 | Card headers |
| body1 | 16px (1rem) | 400 (Regular) | 1.5 | Main content |
| body2 | 14px (0.875rem) | 400 (Regular) | 1.43 | Secondary content |
| caption | 12px (0.75rem) | 400 (Regular) | 1.66 | Metadata, timestamps |

### Spacing System

#### Base Unit: 8px

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon padding, minimal spacing |
| sm | 8px | Between related items |
| md | 16px | Between components |
| lg | 24px | Between sections |
| xl | 32px | Major section separation |
| 2xl | 48px | Page margins |
| 3xl | 64px | Hero section spacing |

### Border Radius

| Size | Value | Usage |
|------|-------|-------|
| Small | 4px | Input fields, small components |
| Medium | 8px | Buttons, chips |
| Large | 12px | Cards, major sections |
| Rounded | 50% | Avatars, circular buttons |

### Shadows

#### Elevation System
```
Elevation 1: 0 1px 4px rgba(0,0,0,0.1)
Usage: AppBar, subtle depth

Elevation 2: 0 4px 12px rgba(0,0,0,0.08)
Usage: Cards, dropdowns

Elevation 3: 0 8px 16px rgba(0,0,0,0.1)
Usage: Modals, dialogs
```

### Breakpoints (Responsive)

| Name | Width | Device |
|------|-------|--------|
| xs | 0px | Mobile |
| sm | 600px | Tablet |
| md | 960px | Small Desktop |
| lg | 1280px | Desktop |
| xl | 1920px | Large Desktop |

---

## 🧩 Component Library

### 1. Buttons

#### Primary Button
- **Background**: #FEE500 (Primary Yellow)
- **Text Color**: #3C1E1E (Secondary Brown)
- **Border Radius**: 8px
- **Height**: 36px (medium), 44px (large)
- **Padding**: 16px horizontal
- **Font Weight**: 600
- **States**:
  - Default: Yellow background
  - Hover: Slight opacity reduction (0.9)
  - Active: Pressed state
  - Disabled: Reduced opacity, gray text
  - Loading: Spinner icon inside

#### Secondary Button
- **Background**: Transparent
- **Border**: 1px solid #3C1E1E
- **Text Color**: #3C1E1E
- **Border Radius**: 8px
- **Height**: Same as primary
- **States**:
  - Hover: Light brown background (#F5F5F5)
  - Active: Darker border

#### Text Button
- **Background**: None
- **Text Color**: Primary or Secondary
- **States**:
  - Hover: Slight background (#F5F5F5)

#### Icon Button
- **Size**: 40px × 40px
- **Icon Size**: 24px
- **States**:
  - Default: Gray icon
  - Hover: Background circle appears
  - Active: Primary/Secondary color

### 2. Input Fields

#### Text Field
- **Variant**: Outlined
- **Height**: 48px
- **Border Radius**: 4px
- **Border Color**: #E0E0E0 (default), #333333 (focused)
- **Label**: Floating label animation
- **Helper Text**: 12px caption below field
- **States**:
  - Default: Gray border
  - Focused: Dark border, blue outline
  - Error: Red border, red helper text
  - Disabled: Gray background, lighter text

#### Autocomplete
- **Base**: TextField variant
- **Dropdown**: White background, shadow elevation 2
- **Options**:
  - Height: 48px per option
  - Hover: Light gray background
  - Selected: Primary yellow background
- **Custom Rendering**:
  - Symbol + company name
  - Heart icon (favorite toggle)

### 3. Cards

#### Base Card
- **Background**: #FFFFFF
- **Border Radius**: 12px
- **Shadow**: Elevation 2 (0 4px 12px)
- **Padding**: 16px (sm), 24px (md)

#### Variants

##### Default Card
Standard white card with shadow

##### Primary Card (AI Summary)
- **Background**: #FEE500 or #FFF9C4 (light yellow)
- **Border**: None
- **Usage**: AI summaries, highlights

##### Dark Card (AI Analysis)
- **Background**: #000000 or #1E1E1E
- **Text Color**: #FFFFFF
- **Usage**: AI analysis reports

##### Outlined Card
- **Background**: #FFFFFF
- **Border**: 1px solid #E0E0E0
- **Shadow**: None

#### News Card
- **Structure**:
  - Avatar (40px circle, first letter of source)
  - Timestamp with clock icon
  - Title (body1, bold)
  - Description (body2, 2 lines max)
  - Action buttons row
- **Height**: Auto, min 120px
- **Padding**: 16px

### 4. Chips

#### Variants
- **Filled**: Solid background with white text
- **Outlined**: Border with colored text

#### Colors
- **Primary**: Yellow background or border
- **Error**: Red (#FF1744)
- **Warning**: Orange (#FFC107)
- **Info**: Blue (#2196F3)

#### Sizes
- **Small**: Height 24px, font 12px
- **Medium**: Height 32px, font 14px

#### With Delete
- X icon on right side (16px)
- Click to remove

### 5. Tabs

#### Design
- **Background**: Transparent
- **Indicator**: Bottom border, 2px thick, secondary color
- **Tab Height**: 48px
- **Font Weight**: 600
- **States**:
  - Default: Gray text (#666666)
  - Selected: Dark text (#333333), indicator visible
  - Hover: Slight background

### 6. AppBar (Navigation Header)

#### Specifications
- **Height**: 80px
- **Background**: #FFFFFF with backdrop blur
- **Shadow**: Elevation 1 (0 1px 4px)
- **Position**: Sticky (remains on scroll)

#### Layout (3 columns)
- **Left**: Logo (60px height), clickable
- **Center**: Stock search (Autocomplete, max 600px width)
- **Right**: "관심 뉴스" button, user name, logout button

### 7. Icons

#### Source
Material-UI Icons library

#### Sizes
- **Small**: 20px (metadata, inline icons)
- **Medium**: 24px (default, buttons)
- **Large**: 40px+ (hero sections)

#### Common Icons
- `Favorite` / `FavoriteBorder` - Favorites
- `Psychology` - AI features
- `Assessment` - Analysis
- `TrendingUp` - Charts, growth
- `Article` - News
- `Refresh` - Update actions
- `Schedule` / `AccessTime` - Timestamps
- `ThumbUp` / `ThumbDown` - Feedback
- `Bookmark` / `BookmarkBorder` - Save
- `Share` - Social sharing

### 8. Charts (Recharts)

#### LineChart
- **Type**: Responsive LineChart
- **Line Color**: Primary yellow (#FEE500)
- **Line Width**: 2px
- **Dot Size**: 3px (only on hover)
- **Grid**: Light gray, dashed
- **Axes**: Dark gray text, 12px
- **Tooltip**:
  - White background
  - Shadow elevation 2
  - Date + price + percentage

### 9. Avatars

#### Sizes
- **Small**: 32px
- **Medium**: 40px
- **Large**: 56px

#### Variants
- **Letter Avatar**: First letter of source name, random color
- **Icon Avatar**: Material icon inside circle

### 10. Alerts/Snackbar

#### Snackbar (Toast)
- **Position**: Top center
- **Width**: Auto, max 600px
- **Background**: Varies by severity
- **Border Radius**: 8px
- **Duration**: 3-6 seconds
- **States**:
  - Success: Green background
  - Error: Red background
  - Warning: Orange background
  - Info: Blue background

#### Alert Card
- **Inline Alerts**: Inside forms/pages
- **Border Left**: 4px colored bar
- **Icon**: Matching severity icon
- **Padding**: 12px 16px

---

## 📱 Page Layouts

### 1. Authentication Pages

#### Login Page
```
Layout:
┌─────────────────────────────────┐
│         [Company Logo]          │
│                                 │
│           로그인                │
│                                 │
│    [Username TextField]         │
│    [Password TextField]         │
│                                 │
│    [Login Button - Primary]     │
│                                 │
│    계정이 없으신가요? 가입하기     │
│                                 │
└─────────────────────────────────┘
```
- **Container**: Centered, max-width 400px
- **Card**: White, elevation 2, 32px padding
- **Logo**: 60px height, centered
- **Spacing**: 16px between fields, 24px before button

#### Register Page
```
Layout:
┌─────────────────────────────────┐
│         [Company Logo]          │
│                                 │
│           회원가입               │
│                                 │
│    [Username TextField]         │
│    [Email TextField]            │
│    [Password TextField]         │
│    [Confirm Password Field]     │
│                                 │
│    [Register Button - Primary]  │
│                                 │
│    이미 계정이 있으신가요? 로그인   │
│                                 │
└─────────────────────────────────┘
```

### 2. Landing Page

#### Full-Screen Sections (3 sections)
```
Section 1 - Welcome:
┌────────────────────────────────────┐
│  [Background Image - Stocks]       │
│                                    │
│    AI 금융 분석에 오신 것을          │
│         환영합니다                  │
│                                    │
│   주식 시장 분석을 위한              │
│      원스톱 솔루션입니다             │
│                                    │
│           [↓ Icon]                 │
└────────────────────────────────────┘

Section 2 - Charts:
[Background: Chart imagery]
Title: 실시간 주식 차트
Subtitle: 인터랙티브한 실시간 차트로...

Section 3 - AI & News:
[Background: Digital/AI imagery]
Title: AI 기반 분석 및 뉴스
Subtitle: 선택한 주식에 대한 최신...
```

- **Height**: 100vh each
- **Scroll**: Snap to each section
- **Animation**: Fade in on scroll (50% visibility trigger)
- **Text**: White, centered, with dark overlay (rgba(0,0,0,0.5))
- **Typography**: h1 (4rem) titles, body1 (1.5rem) subtitles

### 3. Dashboard - Stock Chart Tab

```
Layout:
┌───────────────────────────────────────────┐
│ [AppBar - Sticky]                         │
├───────────────────────────────────────────┤
│ [Tabs: Chart | AI Analysis | News]       │
├───────────────────────────────────────────┤
│                                           │
│  Stock Name               [Refresh] [⟳]  │
│  $XXX,XXX.XX +X.XX%      [Auto-refresh]  │
│  Previous Close: $XXX                     │
│                                           │
│  [Period: 1y ▼] [Interval: 1d ▼]        │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │                                     │ │
│  │      [Line Chart - Responsive]     │ │
│  │                                     │ │
│  │                                     │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  Last Updated: YYYY-MM-DD HH:MM:SS       │
│                                           │
└───────────────────────────────────────────┘
```

- **Stock Header**:
  - Company name (h5)
  - Price (h4, colored by direction)
  - Change (body1, colored)
- **Controls**: Right-aligned, 16px spacing
- **Chart**: Responsive, min-height 400px
- **Padding**: 24px container

### 4. Dashboard - AI Analysis Tab

```
Layout:
┌───────────────────────────────────────────┐
│ [AppBar - Sticky]                         │
├───────────────────────────────────────────┤
│ [Tabs: Chart | AI Analysis | News]       │
├───────────────────────────────────────────┤
│                                           │
│  [Psychology Icon] AI 주식 분석            │
│                                           │
│  SYMBOL - Company Name                    │
│  Current Price: $XXX,XXX.XX              │
│                                           │
│  [AI 분석 시작 Button - Primary]          │
│                                           │
│  ┌───────────────────────────────────┐   │
│  │ [Dark Card - Black Background]    │   │
│  │                                   │   │
│  │ ## Analysis Header                │   │
│  │ **Bold text here**                │   │
│  │ - Bullet point 1                  │   │
│  │ - Bullet point 2                  │   │
│  │                                   │   │
│  │ (Scrollable content)              │   │
│  │                                   │   │
│  └───────────────────────────────────┘   │
│                                           │
│  ⓘ AI 생성 참고 자료입니다                 │
│                                           │
└───────────────────────────────────────────┘
```

- **Header**: Psychology icon + title
- **Stock Info**: Symbol chip + price
- **Analysis Card**:
  - Black background (#000000)
  - White text
  - Max-height 600px, scrollable
  - Padding 24px
- **Disclaimer**: Small caption text

### 5. Dashboard - News Tab

```
Layout:
┌───────────────────────────────────────────┐
│ [AppBar - Sticky]                         │
├───────────────────────────────────────────┤
│ [Tabs: Chart | AI Analysis | News]       │
├───────────────────────────────────────────┤
│                                           │
│  [Article Icon] SYMBOL 관련 뉴스           │
│                                           │
│  [뉴스 업데이트] [뉴스 기반 AI 분석]         │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ [Yellow Card - AI Summary]          │ │
│  │ AI Summary text here...             │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ [Dark Card - AI Analysis]           │ │
│  │ Detailed analysis...                │ │
│  │ Related News: (5 articles)          │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  News Articles (Scrollable):              │
│  ┌─────────────────────────────────────┐ │
│  │ [S] Source Name    🕐 2시간 전       │ │
│  │ Article Title Here                  │ │
│  │ Description text...                 │ │
│  │ [원문 보기]                          │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │ [Next news card...]                 │ │
│  └─────────────────────────────────────┘ │
│                                           │
└───────────────────────────────────────────┘
```

- **Action Buttons**: Row layout, 8px spacing
- **AI Cards**: Full-width, 16px spacing between
- **News List**: Max-height 600px, scrollable
- **News Cards**: White, elevation 1, 16px padding

### 6. Landing - Recommended News Section

```
Layout:
┌───────────────────────────────────────────┐
│  맞춤 뉴스 추천                [Refresh ⟳] │
│                                           │
│  Your Interests (X개):                    │
│  [AAPL ✕] [GOOGL ✕] [TSLA ✕] ...        │
│                                           │
│  Recommended News:                        │
│  ┌─────────────────────────────────────┐ │
│  │ [AAPL] [고관련성] 95%                │ │
│  │ News Title Here                     │ │
│  │ Description...                      │ │
│  │ Source | 1시간 전                    │ │
│  │ [👍] [👎] [🔖] [↗]                 │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │ [Next recommendation card...]       │ │
│  └─────────────────────────────────────┘ │
│                                           │
└───────────────────────────────────────────┘
```

- **Header**: Title + refresh button, space-between
- **Interest Chips**: Row wrap, 8px spacing, deletable
- **News Cards**: Stack, 16px spacing
- **Score Badge**: Circle, colored by score (green/orange/blue)
- **Action Icons**: Row, 8px spacing

---

## 🔄 User Flows

### Authentication Flow
```
Landing → Login Page
         ↓
      [Submit]
         ↓
   Token Stored
         ↓
   Dashboard (Landing View)
```

### Stock Analysis Flow
```
Dashboard (Landing) → [Search Stock]
                      ↓
                  Select Stock
                      ↓
              Dashboard (Stock View)
                   ↓
         [Tab: Chart | AI | News]
               ↓          ↓          ↓
          View Chart   Get AI    Read News
                      Analysis
```

### News Interaction Flow
```
News Tab → [뉴스 업데이트] → Crawl Latest News
        → [AI 분석] → Generate Analysis
        → [AI 요약] → Summarize Articles
        → [원문 보기] → External Link
```

### Favorite Management Flow
```
Stock Search → [Heart Icon Click]
              ↓
         Toggle Favorite
              ↓
    Save to User Interests
              ↓
    Show in Recommended News
```

---

## 📐 Responsive Design

### Breakpoint Behavior

#### Mobile (xs: 0-599px)
- **AppBar**: Single column, hamburger menu
- **Stock Search**: Full-width
- **Tabs**: Scrollable tabs
- **Cards**: Full-width, reduced padding (12px)
- **Chart**: Height 300px
- **Typography**: Reduced sizes (h1 → 2.5rem)

#### Tablet (sm: 600-959px)
- **AppBar**: 2 columns (logo+search, user)
- **Cards**: 2 columns for news feed
- **Chart**: Height 400px
- **Spacing**: Standard (8px base)

#### Desktop (md: 960-1279px)
- **AppBar**: 3 columns (logo, search, user)
- **Cards**: 3 columns for news feed
- **Max Content Width**: 1280px
- **Chart**: Height 500px

#### Large Desktop (lg+: 1280px+)
- **Centered Content**: Max-width 1280px with auto margins
- **Cards**: 4 columns possible for news
- **Spacing**: Increased (12px base)

### Responsive Patterns

#### Stack Component
- **Mobile**: Column direction
- **Desktop**: Row direction
- **Spacing**: Responsive (1 on mobile, 2 on desktop)

#### Grid System
- **Mobile**: 4 columns
- **Tablet**: 8 columns
- **Desktop**: 12 columns

---

## 🎬 Animations and Transitions

### Fade-In on Scroll (Landing Page)
```css
Initial State:
- opacity: 0
- transform: translateY(50px)

Animated State (in view):
- opacity: 1
- transform: translateY(0)
- transition: 1s ease-out
```

### Bounce Animation (Scroll Indicator)
```css
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
animation: bounce 2s infinite
```

### Button Hover
```
Transition: 0.3s ease
Hover: background-color change or opacity 0.9
```

### Tab Indicator
```
Transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
Transform: translateX based on selected tab
```

### Loading Spinner
```
Rotation: 360deg continuous
Duration: 1s linear infinite
```

### Card Elevation on Hover
```
Transition: box-shadow 0.3s ease
Hover: Elevation increases (elevation 2 → 3)
```

---

## 📦 Asset Requirements for Figma

### Logo Assets
- **Company Logo**: myLogo.png (I NEED RED brand)
- **SVG Logo**: logo.svg (React logo)
- **Sizes Needed**: 40px, 60px, 80px heights

### Icons
**Material-UI Icon Set** (import from Material Design)
- All icons listed in Component Library section
- Sizes: 20px, 24px, 40px

### Background Images
**Landing Page Sections** (from Unsplash):
- Financial/stock market imagery
- Chart/analytics imagery
- Digital/AI technology imagery
- **Overlay**: rgba(0, 0, 0, 0.5) dark overlay on all

### Chart Elements
- Line chart component (Recharts equivalent)
- Grid lines, axes, tooltip
- Responsive container

---

## 🔍 Key Design Principles

### 1. Minimalism
- Clean white backgrounds
- Generous white space
- Simple, clear typography

### 2. Color Coding
- Red = Increase (Korean market convention)
- Blue = Decrease
- Yellow = Primary actions
- Green = Success/high scores

### 3. Hierarchy
- Clear visual hierarchy with size and weight
- Important info larger and bolder
- Metadata smaller and lighter

### 4. Consistency
- All cards same border radius (12px)
- All buttons same height (36px/44px)
- Consistent spacing (8px grid)

### 5. Accessibility
- Color + text (not color alone)
- Touch targets 44px minimum
- High contrast text
- Focus indicators

---

## ✅ Figma File Structure Recommendation

```
📁 Frontend Design System
├── 📄 Cover Page
├── 🎨 Design Tokens
│   ├── Colors
│   ├── Typography
│   ├── Spacing
│   ├── Shadows
│   └── Breakpoints
├── 🧩 Components
│   ├── Buttons
│   ├── Inputs
│   ├── Cards
│   ├── Chips
│   ├── Tabs
│   ├── Icons
│   ├── Charts
│   └── Alerts
├── 📱 Pages
│   ├── Login
│   ├── Register
│   ├── Landing
│   ├── Dashboard - Chart
│   ├── Dashboard - AI
│   ├── Dashboard - News
│   └── Recommended News
├── 🔄 User Flows
│   └── Flow Diagrams
└── 📐 Responsive
    ├── Mobile Views
    ├── Tablet Views
    └── Desktop Views
```

---

## 📝 Notes for Figma Implementation

### Component Variants to Create
1. **Button**: [primary, secondary, text] × [default, hover, active, disabled, loading]
2. **TextField**: [default, focused, error, disabled]
3. **Card**: [default, primary, dark, outlined]
4. **Chip**: [filled, outlined] × [primary, error, warning, info]
5. **Tab**: [default, selected, hover]

### Auto Layout Usage
- All components should use auto-layout for responsive behavior
- Spacing between elements using auto-layout spacing values
- Padding consistent with spacing tokens

### Design System Plugin Recommendations
- **Material Design Kit** for MUI components
- **Iconify** for Material Icons
- **Chart** plugin for chart components
- **Content Reel** for realistic text content

---

## 🎯 Priority Components for Figma

### High Priority (Build First)
1. Design Tokens (colors, typography, spacing)
2. Button components (all variants)
3. Card components (all variants)
4. AppBar/Navigation
5. Input fields and Autocomplete
6. Main page layouts

### Medium Priority
1. Tabs component
2. Chips component
3. Charts (can use placeholder initially)
4. Icons library
5. Alerts and snackbars

### Low Priority (Polish)
1. Animations and transitions documentation
2. Hover states (can be added later)
3. Loading states
4. Empty states
5. Error states

---

**Document Version**: 1.0
**Last Updated**: 2025-10-28
**Created For**: Figma Design System Import
**Project**: I NEED RED - AI Financial Analysis Platform
