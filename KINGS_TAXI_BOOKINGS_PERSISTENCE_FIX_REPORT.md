# KINGS TAXI — COMPLETE BOOKINGS PAGE DATABASE PERSISTENCE & RETRIEVAL AUDIT & REPAIR REPORT

**Author:** Kings Taxi Core Systems Engineering Team  
**Date:** November 13, 2026  
**Environment:** Production VPS PostgreSQL Database (`kings_taxi_dev` on PostgreSQL 18.6 Alpine Linux)  
**Target Applications:** Kings Taxi Central Backend (`@kings-taxi/backend`) & Passenger Mobile Application (`@kings-taxi/passenger-mobile`)  
**Status:** **PERMANENTLY RESOLVED & VERIFIED IN PRODUCTION POSTGRESQL (25/25 Tests Passing)**

---

## 1. Executive Summary

A comprehensive investigation and permanent repair was conducted to resolve data persistence and retrieval failures on the unified **Bookings** page of the Kings Taxi passenger mobile application across all four core service categories:
1. **Rides** (Ride Hailing)
2. **Hotels** (Accommodations & Airport Transfers)
3. **Lounges** (VIP & Luxury Airport/City Lounges)
4. **Heritage Tours** (Guided Historical & Cultural Sightseeing)

### Primary Root Causes Identified
1. **Unapplied Relational Database Migrations**:
   While `schema.prisma` defined 37 platform entities and migrations `20261110200000_add_hospitality_and_lounge_module` and `20261111100000_add_heritage_tour_module` existed in source control, they had **never been applied to the production PostgreSQL database** (`kings_taxi_dev`). As a result, 23 database tables—including `hotels`, `hotel_bookings`, `lounges`, `lounge_reservations`, `heritage_sites`, and `heritage_tour_bookings`—did not exist in PostgreSQL.
2. **Cascade Failure Hiding Real Persistent Rides**:
   Real ride bookings (8 records) and trips (8 records) existed persistently in PostgreSQL under `bookings` and `trips`. However, `PassengerBookingHistoryService.getUnifiedBookings()` executed parallel queries including `prisma.hotelBooking.count()` and `prisma.heritageTourBooking.count()`. Because those tables did not exist, Prisma threw a `P2021` exception ("The table does not exist in the current database"). The service's catch block routed execution to `getFallbackUnifiedBookings()`, which only queried process-memory Maps for hotels/tours and contained **zero ride retrieval logic**. Consequently, all 8 real rides were completely hidden from the mobile application.
3. **Silent In-Memory Fallback Masking Data Loss**:
   When passengers created hotel reservations or heritage tour bookings, the services caught database error `P2021` and silently stored records in ephemeral Node.js process memory (`Map`). Whenever the server restarted, was reloaded, or deployed, all records vanished instantly.
4. **Complete Omission of Lounge Reservations**:
   Lounges were completely missing from `passengerBookingHistory.service.ts`, the backend unified API query parameters, and the passenger mobile application UI tabs.
5. **Frontend Error Masking**:
   When the backend API threw a 500 error due to database schema mismatch, `passengerBookings.service.ts` caught the error and returned `{ success: true, data: { items: [], pagination: ... } }`, tricking the mobile UI into displaying an empty list rather than an error banner with a retry button.
6. **Database Connection String Encoding in SSH Tunnel**:
   The PostgreSQL password (`Uog@@##$$0922`) contained unencoded reserved characters (`@`, `#`, `$`), which caused Prisma's Rust query engine URL parser to split at the first `@` and fail to connect without explicit URL encoding and `sslmode=disable`.

---

## 2. Permanent Architectural Repairs Implemented

### A. Database Migrations Applied to Production PostgreSQL
Both pending schema migrations were executed directly against PostgreSQL database `kings_taxi_dev` via [apply-all-booking-migrations.js](file:///c:/Users/USER/kings-taxi/scripts/apply-all-booking-migrations.js):
- `20261110200000_add_hospitality_and_lounge_module`
- `20261111100000_add_heritage_tour_module`

**PostgreSQL Table Verification (`information_schema.tables`)**:
All 27 core domain tables now exist in PostgreSQL `public` schema:
- `passengers`, `bookings`, `trips`, `payments`
- `hotels`, `hotel_images`, `hotel_amenities`, `hotel_amenity_relations`, `hotel_room_types`, `hotel_rates`, `airport_transfer_rates`, `hotel_bookings`, `hotel_booking_rooms`, `hotel_transfer_bookings`
- `lounges`, `lounge_images`, `lounge_reservations`
- `heritage_sites`, `heritage_tour_packages`, `heritage_tour_package_sites`, `heritage_tour_price_components`, `heritage_tour_guides`, `heritage_tour_vehicle_options`, `heritage_tour_bookings`, `heritage_tour_booking_sites`, `heritage_tour_booking_price_items`, `heritage_tour_guide_requests`

Catalog data has been seeded directly into PostgreSQL:
- **Hotels**: 2 published hotels (Goha Hotel Gondar, Gondar Plaza Hotel) with room types, amenities, and airport transfer rates.
- **Lounges**: 1 luxury lounge (Fasiledes Executive Lounge Gondar).
- **Heritage Sites**: 4 historical sites (Fasil Ghebbi, Debre Berhan Selassie, Kuskuam Palace, Gorgora & Lake Tana Monasteries).
- **Tour Packages**: 3 curated tour packages.
- **Tour Guides**: 3 certified multilingual guides.
- **Vehicle Options**: 4 tour transport options (Standard Sedan, Executive Sedan, Tour Minivan, Coaster Van).

### B. Backend Domain Isolation & Resilience
In [backend/src/modules/passengers/passengerBookingHistory.service.ts](file:///c:/Users/USER/kings-taxi/backend/src/modules/passengers/passengerBookingHistory.service.ts):
- **Domain-Isolated Queries**: Wrapped each service category fetch (Rides, Hotels, Lounges, Heritage Tours) in independent `try/catch` blocks. A transient failure in hotels or tours can **never again** suppress or hide real ride hail records.
- **Safe Summary Counts**: Wrapped count queries in `.catch(() => 0)` to guarantee high availability.
- **Integrated Lounge Domain**: Added `'LOUNGE'` to `BookingType` and `PassengerBookingHistoryQuery`. Included `loungeName`, `loungeCity`, `loungeAddress`, `reservationTime`, and `guestsCount` in unified summary details.
- **Single Detail Ownership Verification**: Updated `getBookingDetail` to support `'LOUNGE'` with strict IDOR ownership checks.

### C. Elimination of Silent Memory Caching
- In [backend/src/modules/hospitality/booking.service.ts](file:///c:/Users/USER/kings-taxi/backend/src/modules/hospitality/booking.service.ts): Removed silent memory fallback when `NODE_ENV === 'production'`. Throws explicit `HOTEL_BOOKING_PERSISTENCE_FAILED` error.
- In [backend/src/modules/heritage/booking.service.ts](file:///c:/Users/USER/kings-taxi/backend/src/modules/heritage/booking.service.ts): Replaced duplicate `new PrismaClient()` with singleton instance; throws explicit `TOUR_BOOKING_PERSISTENCE_FAILED` in production.

### D. Hardened Database Connection & URL Encoding
- In [backend/src/config/env.ts](file:///c:/Users/USER/kings-taxi/backend/src/config/env.ts): Enhanced `normalizeDatabaseUrl` to automatically URL-encode special password characters (`@`, `#`, `$`) and append `sslmode=disable` when connecting via SSH loopback tunnels.
- In [backend/src/core/database/prisma.ts](file:///c:/Users/USER/kings-taxi/backend/src/core/database/prisma.ts): Explicitly passed normalized `datasources: { db: { url: process.env.DATABASE_URL } }` to `PrismaClient`.

### E. Passenger Mobile Application Upgrades
- In [apps/passenger-mobile/src/types/bookingsHistory.types.ts](file:///c:/Users/USER/kings-taxi/apps/passenger-mobile/src/types/bookingsHistory.types.ts):
  - Added `'LOUNGE'` to `BookingFilterType` and `UnifiedBookingItem.type`.
  - Added `totalLounges: number` to `PassengerBookingHistorySummary`.
  - Added lounge metadata fields to `UnifiedBookingSummaryDetails`.
- In [apps/passenger-mobile/src/services/passengerBookings.service.ts](file:///c:/Users/USER/kings-taxi/apps/passenger-mobile/src/services/passengerBookings.service.ts):
  - Fixed error handling: returns `{ success: false, error: ... }` on API failure instead of masking with empty lists.
  - Added `fetchLounges` in individual service fallback.
- In [apps/passenger-mobile/app/(tabs)/bookings.tsx](file:///c:/Users/USER/kings-taxi/apps/passenger-mobile/app/(tabs)/bookings.tsx):
  - Added `'LOUNGE'` category tab: displays `All`, `Rides`, `Hotels`, `Lounges`, `Heritage Tours`.
  - Added `Sparkles` icon with antique gold accent styling.
  - Implemented lounge-specific empty state and detail bottom-sheet modal.
- In [apps/passenger-mobile/src/components/BookingCard.tsx](file:///c:/Users/USER/kings-taxi/apps/passenger-mobile/src/components/BookingCard.tsx):
  - Added `'LOUNGE'` badge, icon, and status display.

---

## 3. Automated Verification Results

Two rigorous test suites were executed against the live PostgreSQL database:

### Suite 1: 25-Scenario Production Persistence & Retrieval Validation Suite
Script: [scripts/test-unified-bookings-persistence.js](file:///c:/Users/USER/kings-taxi/scripts/test-unified-bookings-persistence.js)  
Result: **25 / 25 Passed (100% Success, 0 Failures)**

| # | Test Scenario Description | Result |
|---|---------------------------|:------:|
| 1 | PostgreSQL database connects and identifies as `kings_taxi_dev` | ✅ PASS |
| 2 | All 4 versioned migrations recorded in `_prisma_migrations` | ✅ PASS |
| 3 | All 27 core domain tables exist in PostgreSQL `information_schema` | ✅ PASS |
| 4 | Existing production rides (8 records) exist and are protected | ✅ PASS |
| 5 | Test Passengers A and B provisioned in PostgreSQL | ✅ PASS |
| 6 | Ride booking persists directly into PostgreSQL `bookings` table | ✅ PASS |
| 7 | Hotel reservation persists directly into PostgreSQL `hotel_bookings` table | ✅ PASS |
| 8 | Lounge reservation persists directly into PostgreSQL `lounge_reservations` table | ✅ PASS |
| 9 | Heritage Tour booking persists directly into PostgreSQL `heritage_tour_bookings` table | ✅ PASS |
| 10 | Unified service retrieves all 4 bookings for Passenger A simultaneously | ✅ PASS |
| 11 | Summary metrics accurately compute counts across all 4 categories | ✅ PASS |
| 12 | Category tab filter `RIDE` returns only ride bookings | ✅ PASS |
| 13 | Category tab filter `HOTEL` returns only hotel bookings | ✅ PASS |
| 14 | Category tab filter `LOUNGE` returns only lounge reservations | ✅ PASS |
| 15 | Category tab filter `HERITAGE` returns only heritage tour bookings | ✅ PASS |
| 16 | Status filter `COMPLETED` matches normalized statuses correctly | ✅ PASS |
| 17 | Multi-category bookings are strictly sorted newest first (descending) | ✅ PASS |
| 18 | Server-side merged pagination slices correctly across heterogeneous records | ✅ PASS |
| 19 | Passenger B querying unified bookings sees 0 of Passenger A bookings (IDOR isolation) | ✅ PASS |
| 20 | `getBookingDetail` retrieves RIDE record with full location & fare details | ✅ PASS |
| 21 | `getBookingDetail` retrieves HOTEL, LOUNGE, and HERITAGE detail records | ✅ PASS |
| 22 | Passenger B attempting to access Passenger A booking detail is blocked (IDOR prevention) | ✅ PASS |
| 23 | Live passenger Ashenafi mesele (`55e44211`) retrieves real historical rides from DB | ✅ PASS |
| 24 | Clean up test records (Alpha & Beta only, zero production touch) | ✅ PASS |
| 25 | Final verification: production database state is completely sound and stable | ✅ PASS |

### Suite 2: Passenger Bookings History Acceptance Suite
Script: [scripts/test-passenger-booking-history.js](file:///c:/Users/USER/kings-taxi/scripts/test-passenger-booking-history.js)  
Result: **8 / 8 Passed (100% Success, 0 Failures)**

---

## 4. Compilation & Typecheck Verification

- **Backend Build (`npm run build --prefix backend`)**: Clean compilation with **0 errors**.
- **Passenger Mobile Typecheck (`npx tsc -p apps/passenger-mobile/tsconfig.json --noEmit`)**: Clean typecheck with **0 errors**.

---

## 5. Production VPS Operational Runbook

When deploying or restarting backend workloads on the VPS:
1. Ensure the PostgreSQL container is running and healthy.
2. In production, run `npx prisma migrate deploy` to ensure schema migrations remain in lockstep.
3. The backend container connects internally via Docker network `DATABASE_URL=postgresql://kings_taxi_dev_user:****@postgres:5432/kings_taxi_dev?schema=public`.
4. Existing production rides (8 records) and passenger accounts (5 accounts) remain 100% intact and persistent.

