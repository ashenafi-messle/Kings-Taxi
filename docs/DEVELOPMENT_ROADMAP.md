# Kings Taxi — Development Roadmap

## Phase Overview & Progress Tracking

| Phase | Milestone Name | Status | Key Deliverables |
| :---: | :--- | :---: | :--- |
| **1** | **Project Foundation & Setup** | 🟡 In Progress | Architecture docs, monorepo init, Expo Router foundation, TypeScript, design tokens, core UI primitives. |
| **2** | **Authentication & App Shell** | ⚪ Pending | Welcome, Login, Register, OTP Verification, Tabs Navigator layout, Root layout with guards. |
| **3** | **Home & Explore Experience** | ⚪ Pending | Dashboard with service shortcuts, search, recommended destinations, discovery catalog. |
| **4** | **Ride-Hailing & Realtime UI** | ⚪ Pending | Pickup/Dropoff selection, vehicle category tiles, live fare estimation, simulated driver dispatch and trip state machine. |
| **5** | **Hotel Booking Engine** | ⚪ Pending | Hotel catalog, detail view, room selection, guest/date selectors, reservation summary. |
| **6** | **Heritage & Tourism Experience** | ⚪ Pending | Landmark directory (Lalibela, Axum, Gondar, etc.), custom multi-stop contract transportation builder. |
| **7** | **Secure Payment Infrastructure** | ⚪ Pending | Payment method selector (Telebirr, Chapa, CBE Birr, Cash), processing state, digital receipt. |
| **8** | **Profile, Notifications & Support** | ⚪ Pending | Account management, notification center, booking history tabs, FAQs, emergency contacts. |
| **9** | **Testing, Verification & Polish** | ⚪ Pending | Type checking, accessibility verification, responsive design checks across screen sizes. |
| **10** | **Backend Integration Preparation** | ⚪ Pending | REST contract definitions, WebSocket schema, production environment configuration. |

---

## Detailed Phase Acceptance Criteria

### Phase 1: Project Foundation (Current)
- [x] Workspace inspected and environment documented.
- [x] Comprehensive architectural and design specifications established in `/docs`.
- [ ] Working Expo project created under `apps/passenger-mobile`.
- [ ] TypeScript configuration validated with strict typing.
- [ ] Theme tokens and reusable atomic primitives created.
- [ ] Zero TypeScript or lint errors.

### Phase 2: Authentication & Navigation Shell
- Complete phone-number and password login screen.
- 6-digit OTP verification screen with countdown resend timer.
- Bottom tab navigation configured with 5 core tabs (Home, Explore, Bookings, Notifications, Profile).

### Phase 3: Home & Explore Hub
- Dynamic greeting and current location detection.
- Service category grid (Rides, Hotels, Heritage, Full-Contract Tours).
- Explore page with category filters and search bar.

### Phase 4: Ride-Hailing Booking & Tracking Flow
- Interactive map container with pickup and destination pins.
- 4 vehicle categories: Economy (Corolla/Sedan), Comfort, Van / Minibus, Luxury VIP.
- Live simulated state machine moving from `SEARCHING_DRIVER` to `TRIP_COMPLETED`.

### Phase 5: Hotel Booking Engine
- Hotel list with Ethiopian cities filter (Addis Ababa, Bahir Dar, Hawassa, Lalibela).
- Room selection with bed configurations, amenities, and ETB pricing.
- Reservation summary with tax and total breakdown.

### Phase 6: Heritage & Multi-Stop Tour Contract
- Landmark showcase for UNESCO sites.
- Custom full-contract itinerary builder with reorderable stops, vehicle selection, and day-rate calculations.

### Phase 7: Payment Engine
- Ethiopian payment channels: Telebirr, CBE Birr, Chapa, Cash.
- Idempotent submission safeguard with animated processing screen.
- Shareable digital receipt.

### Phase 8: Profile, Bookings & Notifications
- Categorized booking history (Rides / Hotels / Tours).
- Notification list with read/unread statuses.
- Multi-language preference selector (English / Amharic).

### Phase 9: Testing & Quality Assurance
- Automated type-checking and lint checks.
- Form validation tests with edge cases.
- Screen dimension scaling on standard Android and iOS aspect ratios.
