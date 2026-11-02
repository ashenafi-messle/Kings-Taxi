# Kings Taxi — Project Folder Structure Specification

## 1. Monorepo & Directory Organization

The repository is organized to support the passenger mobile application as the flagship client, while reserving clean architecture boundaries for shared code, future driver apps, and admin portals.

```text
kings-taxi/
│
├── apps/
│   │
│   ├── passenger-mobile/             # Main Passenger React Native (Expo) Application
│   │   ├── app/                      # Expo Router File-Based Routing System
│   │   │   ├── _layout.tsx           # Root provider stack (QueryClient, Auth, Theme, Gestures)
│   │   │   ├── index.tsx             # Entry gate & auth redirect logic
│   │   │   │
│   │   │   ├── (auth)/               # Authentication & Onboarding Route Group
│   │   │   │   ├── _layout.tsx       # Auth stack navigator configuration
│   │   │   │   ├── welcome.tsx       # Brand introduction & value proposition
│   │   │   │   ├── login.tsx         # Phone/Password authentication
│   │   │   │   ├── register.tsx      # Passenger account creation
│   │   │   │   ├── verify-otp.tsx    # SMS/Telegram OTP verification
│   │   │   │   └── forgot-password.tsx # Credential recovery flow
│   │   │   │
│   │   │   ├── (tabs)/               # Bottom Tab Navigation Route Group
│   │   │   │   ├── _layout.tsx       # Bottom tab bar with customized brand icons
│   │   │   │   ├── index.tsx         # Home screen (Primary dashboard)
│   │   │   │   ├── explore.tsx       # Discovery hub (Hotels, Tours, Destinations)
│   │   │   │   ├── bookings.tsx      # Unified booking history (Rides, Hotels, Tours)
│   │   │   │   ├── notifications.tsx # Live status updates & platform messages
│   │   │   │   └── profile.tsx       # Account settings, security, languages
│   │   │   │
│   │   │   ├── rides/                # Ride-Hailing Dedicated Sub-Routes
│   │   │   │   ├── _layout.tsx       # Stack layout for ride flows
│   │   │   │   ├── book.tsx          # Ride selection & pickup/destination map
│   │   │   │   ├── active.tsx        # Live ride tracking & driver communication
│   │   │   │   ├── receipt.tsx       # Completed ride digital receipt & rating
│   │   │   │   └── cancel.tsx        # Cancellation reason picker
│   │   │   │
│   │   │   ├── hotels/               # Hotel Booking Sub-Routes
│   │   │   │   ├── index.tsx         # Hotel catalog & destination search
│   │   │   │   ├── [id].tsx          # Hotel details, gallery, amenities, rooms
│   │   │   │   └── reserve.tsx       # Room booking summary & guest configuration
│   │   │   │
│   │   │   ├── heritage/             # Heritage & Tourism Sub-Routes
│   │   │   │   ├── index.tsx         # Heritage destination catalog (Lalibela, Axum, etc.)
│   │   │   │   └── [id].tsx          # Destination historical context & visiting guides
│   │   │   │
│   │   │   ├── tours/                # Full-Contract Transportation Sub-Routes
│   │   │   │   ├── index.tsx         # Pre-packaged tour expeditions
│   │   │   │   └── contract-builder.tsx # Custom multi-destination itinerary builder
│   │   │   │
│   │   │   ├── payments/             # Centralized Payment Flow Sub-Routes
│   │   │   │   ├── checkout.tsx      # Method selection (Telebirr, Chapa, CBE Birr, Cash)
│   │   │   │   ├── processing.tsx    # Transaction polling & processing state
│   │   │   │   └── status.tsx        # Success/Failure confirmation screen
│   │   │   │
│   │   │   ├── support/              # Customer Support & Help Center
│   │   │   │   └── index.tsx         # FAQs, live chat trigger, emergency contacts
│   │   │   │
│   │   │   └── settings/             # User Preferences
│   │   │       ├── language.tsx      # Language selector (English, Amharic, etc.)
│   │   │       └── security.tsx      # Biometrics, change PIN/password
│   │   │
│   │   ├── src/                      # Application Implementation Core
│   │   │   ├── components/           # Reusable UI Primitives (Design System)
│   │   │   │   ├── AppHeader.tsx
│   │   │   │   ├── PrimaryButton.tsx
│   │   │   │   ├── SecondaryButton.tsx
│   │   │   │   ├── FormInput.tsx
│   │   │   │   ├── SearchInput.tsx
│   │   │   │   ├── LocationSelector.tsx
│   │   │   │   ├── DestinationCard.tsx
│   │   │   │   ├── HotelCard.tsx
│   │   │   │   ├── HeritageCard.tsx
│   │   │   │   ├── VehicleCard.tsx
│   │   │   │   ├── BookingCard.tsx
│   │   │   │   ├── PriceBreakdown.tsx
│   │   │   │   ├── PaymentMethodCard.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── LoadingState.tsx
│   │   │   │   ├── ErrorState.tsx
│   │   │   │   ├── ConfirmationModal.tsx
│   │   │   │   ├── DateSelector.tsx
│   │   │   │   ├── GuestSelector.tsx
│   │   │   │   ├── RatingComponent.tsx
│   │   │   │   └── InteractiveMap.tsx
│   │   │   │
│   │   │   ├── features/             # Business Domain Views & Sub-Components
│   │   │   │   ├── authentication/   # Auth forms, validators, OTP inputs
│   │   │   │   ├── home/             # Home banners, service tiles, quick actions
│   │   │   │   ├── rides/            # Vehicle category selectors, driver badges, fare cards
│   │   │   │   ├── hotels/           # Room cards, date range picker, amenity chips
│   │   │   │   ├── heritage/         # Cultural landmark detail cards, audio/guide badges
│   │   │   │   ├── tours/            # Multi-stop itinerary reordering, fleet selection
│   │   │   │   ├── payments/         # Payment provider lists, digital receipts
│   │   │   │   ├── bookings/         # Filterable tab views for active & past bookings
│   │   │   │   ├── notifications/    # Notification item cards with category badges
│   │   │   │   └── profile/          # Profile form, emergency contacts, saved places
│   │   │   │
│   │   │   ├── services/             # Concrete Services & API Connectors
│   │   │   │   ├── api/              # Axios instance, token interceptors, endpoints
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── ride.service.ts
│   │   │   │   ├── hotel.service.ts
│   │   │   │   ├── heritage.service.ts
│   │   │   │   ├── tour.service.ts
│   │   │   │   ├── payment.service.ts
│   │   │   │   ├── location.service.ts
│   │   │   │   └── storage.service.ts
│   │   │   │
│   │   │   ├── stores/               # Zustand Client State Stores
│   │   │   │   ├── auth.store.ts
│   │   │   │   ├── ride.store.ts
│   │   │   │   ├── booking.store.ts
│   │   │   │   └── settings.store.ts
│   │   │   │
│   │   │   ├── hooks/                # Custom React Hooks
│   │   │   │   ├── useCurrentLocation.ts
│   │   │   │   ├── useDebounce.ts
│   │   │   │   └── useKeyboard.ts
│   │   │   │
│   │   │   ├── theme/                # Design Tokens & Styling Primitives
│   │   │   │   ├── colors.ts
│   │   │   │   ├── typography.ts
│   │   │   │   ├── spacing.ts
│   │   │   │   ├── shadows.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── types/                # TypeScript Interfaces & Types
│   │   │   │   ├── auth.types.ts
│   │   │   │   ├── ride.types.ts
│   │   │   │   ├── hotel.types.ts
│   │   │   │   ├── heritage.types.ts
│   │   │   │   ├── payment.types.ts
│   │   │   │   └── common.types.ts
│   │   │   │
│   │   │   ├── mocks/                # High-Fidelity Mock Fixtures
│   │   │   │   ├── mockAuth.ts
│   │   │   │   ├── mockRides.ts
│   │   │   │   ├── mockHotels.ts
│   │   │   │   ├── mockHeritage.ts
│   │   │   │   ├── mockPayments.ts
│   │   │   │   └── mockNotifications.ts
│   │   │   │
│   │   │   ├── validation/           # Zod Validation Schemas
│   │   │   │   ├── auth.schema.ts
│   │   │   │   ├── ride.schema.ts
│   │   │   │   └── booking.schema.ts
│   │   │   │
│   │   │   └── utils/                # Pure Utilities (ETB currency, dates, geocoding)
│   │   │       ├── currency.ts
│   │   │       ├── date.ts
│   │   │       └── geo.ts
│   │   │
│   │   ├── app.json                  # Expo Project Configuration
│   │   ├── package.json              # App Dependencies & Scripts
│   │   ├── tsconfig.json             # TypeScript Configuration
│   │   ├── babel.config.js           # Babel Plugin Configuration
│   │   ├── .env.example              # Environment Variable Template
│   │   └── README.md                 # App Instructions
│   │
│   └── shared/                       # Cross-Platform Types and Utilities
│       ├── types/
│       ├── constants/
│       └── utils/
│
├── docs/                             # Engineering & Product Documentation
│   ├── PROJECT_OVERVIEW.md
│   ├── ARCHITECTURE.md
│   ├── FOLDER_STRUCTURE.md
│   ├── UI_UX_DESIGN_SYSTEM.md
│   ├── DEVELOPMENT_ROADMAP.md
│   ├── API_INTEGRATION_PLAN.md
│   ├── SECURITY_GUIDELINES.md
│   └── IMPLEMENTATION_PROGRESS.md
│
├── .gitignore
├── package.json
└── README.md
```
