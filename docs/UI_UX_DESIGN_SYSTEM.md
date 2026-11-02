# Kings Taxi — UI/UX Design System Specification

## 1. Brand Identity & Visual Principles

Kings Taxi conveys royal reliability, safety, and modern African elegance. The visual identity avoids noisy decoration in favor of clear typography, generous touch targets, high contrast, and smooth transitions.

### Key Pillars:
- **Royal Precision**: Warm, confident tones (Imperial Gold & Deep Royal Navy) blended with crisp neutral slates.
- **Immediate Legibility**: Optimized for high glare sunlight during daytime taxi bookings and low-light night-time hailing.
- **Predictable Feedback**: Every touch interaction triggers tactile/visual feedback, with zero ambiguous loading states.

---

## 2. Color Palette & Design Tokens

### 2.1 Primary Brand Colors
- **Primary / Imperial Gold**: `#D4AF37` (Brand accent, active states, key CTAs, premium indicators)
- **Primary Dark**: `#AA820A` (Pressed states, deep gold borders)
- **Primary Light**: `#FFF9E6` (Subtle backgrounds, selected category chips)

### 2.2 Neutral & Surface Palette
- **Background Main**: `#F8F9FA` (Soft neutral surface that reduces eye fatigue)
- **Surface / Card**: `#FFFFFF` (Pure white containers, elevated cards)
- **Surface Secondary**: `#F1F3F5` (Input fields, disabled controls, subtle dividers)
- **Dark Neutral / Charcoal**: `#1A1D20` (Primary headers, high-emphasis text)
- **Body Text / Muted**: `#495057` (Readable secondary descriptions)
- **Border / Divider**: `#E9ECEF` (Delicate separators)

### 2.3 Semantic Feedback Colors
- **Success**: `#198754` (Ride completed, payment confirmed, driver arrived)
- **Warning**: `#FF9800` (Searching for driver, payment pending, action required)
- **Danger**: `#DC3545` (Ride cancelled, payment failed, validation error)
- **Info**: `#0D6EFD` (System notifications, historical footnotes)

---

## 3. Typography Scale

Built with the system font family (`System` / `-apple-system`, `Roboto`, `San Francisco`) to maintain native fidelity and instant load times.

| Token | Size | Line Height | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `h1` | 28px | 34px | Bold (700) | Welcome titles, major screen headers |
| `h2` | 22px | 28px | Bold (700) | Section titles, hotel & destination names |
| `h3` | 18px | 24px | SemiBold (600) | Card headings, vehicle category titles |
| `body` | 15px | 22px | Regular (400) | General descriptions, addresses, policy text |
| `bodyBold`| 15px | 22px | SemiBold (600) | Emphasized body text, field labels |
| `caption` | 12px | 16px | Regular (400) | Timestamps, secondary vehicle details |
| `badge` | 11px | 14px | SemiBold (600) | Status pill indicators |

---

## 4. Spacing, Radii & Elevations

### 4.1 Spacing Tokens
- `xs`: 4px
- `sm`: 8px
- `md`: 16px (Base layout margin)
- `lg`: 24px (Section separation)
- `xl`: 32px
- `xxl`: 48px

### 4.2 Border Radii
- `sm`: 6px (Badges, tags)
- `md`: 12px (Form inputs, smaller action cards)
- `lg`: 16px (Cards, modal sheets, vehicle selector tiles)
- `pill`: 999px (Circular avatar, CTA buttons)

### 4.3 Elevation & Shadows
- **Card Shadow**: `offset: { width: 0, height: 2 }`, `opacity: 0.08`, `radius: 8`, `elevation: 3`
- **Elevated Action Bar**: `offset: { width: 0, height: -4 }`, `opacity: 0.10`, `radius: 12`, `elevation: 8`

---

## 5. Standard Component Guidelines

1. **`PrimaryButton`**:
   - Minimum tap target height: 52px.
   - Distinct disabled, loading (with spinner), and pressed states.
   - High contrast text (`#1A1D20` on Gold or `#FFFFFF` on Navy).

2. **`StatusBadge`**:
   - Standardized status chip displaying ride/booking states:
   - Green for `COMPLETED` / `DRIVER_ARRIVED`
   - Amber for `SEARCHING_DRIVER` / `PENDING`
   - Red for `CANCELLED` / `FAILED`
   - Blue for `DRIVER_ASSIGNED` / `TRIP_STARTED`

3. **`DestinationCard` & `HotelCard`**:
   - Image ratio 16:9 with smooth rounded corners.
   - Upfront pricing displayed in ETB (Ethiopian Birr).
   - Clear rating indicator with star count and review total.
