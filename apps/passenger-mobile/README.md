# Kings Taxi — Passenger Mobile Application

Production-oriented React Native (Expo) mobile passenger application for Kings Taxi, supporting urban ride-hailing, verified hotel reservations, historical heritage tourism, full-contract transportation, and secure Ethiopian digital payments.

## Architecture & Technology Stack

- **Framework**: React Native with Expo SDK 52
- **Routing**: Expo Router v4 (file-based navigation with route groups)
- **Language**: TypeScript Strict Mode
- **State Management**: Zustand
- **Server Cache & Async**: TanStack Query v5
- **Design System**: Kings Taxi Imperial Gold & Deep Navy design tokens
- **Local Payment Gateways**: Telebirr, CBE Birr, Chapa, Cash handling

## Folder Structure

```text
apps/passenger-mobile/
├── app/
│   ├── _layout.tsx           # Global providers (TanStack Query, Safe Area, StatusBar)
│   ├── index.tsx             # Entry auth guard & redirection
│   ├── (auth)/               # Authentication flow (Welcome, Login, Register, Verify OTP)
│   ├── (tabs)/               # Bottom tabs (Home, Explore, Bookings, Notifications, Profile)
│   ├── rides/                # Ride booking, active tracking, and digital receipt
│   ├── hotels/               # Hotel details and room reservation
│   ├── heritage/             # Heritage sites catalog & UNESCO guides
│   ├── tours/                # Full-contract multi-stop itinerary builder
│   ├── payments/             # Multi-gateway checkout & verification
│   ├── support/              # 24/7 help desk, FAQs & emergency SOS
│   └── settings/             # Language preferences (English, Amharic, Oromiffa)
├── src/
│   ├── components/           # Reusable UI primitives (Buttons, Cards, Inputs, Map)
│   ├── theme/                # Design tokens (Colors, Typography, Spacing, Shadows)
│   ├── types/                # Strict domain types & interfaces
│   ├── stores/               # Zustand client state slices (Auth, Ride, Booking, Settings)
│   ├── services/             # Concrete API-ready service layer
│   ├── mocks/                # High-fidelity Ethiopian mobility & hospitality data
│   └── utils/                # ETB formatting, date parsing, Haversine geo calculations
├── app.json
└── package.json
```

## Running the Application

From repository root:
```bash
# Start development server
npm start

# Run TypeScript typecheck
npm run typecheck
```
