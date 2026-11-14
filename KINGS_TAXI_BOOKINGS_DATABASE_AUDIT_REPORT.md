# KINGS TAXI — READ-ONLY DATABASE AUDIT REPORT
**Service Category Persistence & History Retrieval Investigation**

- **Date:** 2026-11-13
- **Environment:** Dedicated VPS PostgreSQL Database (`kings_taxi_dev` via local SSH tunnel on port 5433)
- **Target OS / Engine:** PostgreSQL 18.6 on x86_64-pc-linux-musl (Alpine Linux)
- **Auditor:** Kings Taxi Automated Systems Engineer

---

## 1. Executive Summary

A comprehensive, read-only audit of the Kings Taxi database and backend architecture was performed to investigate reported persistence failures across all four platform service categories:
1. **Rides** (Ride Hailing)
2. **Hotels** (Hospitality Accommodations & Airport Transfers)
3. **Lounges** (VIP & Luxury Lounge Reservations)
4. **Heritage Tours** (Historical & Cultural Guided Tours)

### Key Audit Finding
The primary root cause of booking disappearance is **architectural and schema-level**:
1. **Unapplied Relational Migrations**: While `schema.prisma` and versioned SQL migration files exist for all 4 services, only the first two migrations (`20261106000000_init` and `20261110000000_add_ride_booking_gps_and_fare_models`) were applied to the PostgreSQL database. The tables for `hotels`, `hotel_bookings`, `lounges`, `lounge_reservations`, `heritage_sites`, and `heritage_tour_bookings` **do not exist** in PostgreSQL.
2. **Silent In-Memory Fallback Masking**: For Hotels and Heritage Tours, booking services caught the database error (`P2021: relation does not exist`) and silently stored new bookings in Node.js process memory (`Map`). When the server restarted, this memory was purged, causing all records to vanish.
3. **Cross-Service Query Cascade Failure Hiding Real Rides**: Real ride bookings and trips **do exist** in PostgreSQL (8 records). However, `PassengerBookingHistoryService.getUnifiedBookings()` executed parallel counts (`Promise.all`) including `prisma.hotelBooking.count()` and `prisma.heritageTourBooking.count()`. Because those tables did not exist, `prisma` threw a `P2021` exception, causing the entire endpoint to fail and fall back to `getFallbackUnifiedBookings()`. That fallback function **had zero support for rides**, completely suppressing real PostgreSQL ride records from the mobile application.
4. **Lounge Category Disconnection**: The `lounge_reservations` model was completely omitted from `PassengerBookingHistoryService`, and the mobile `Bookings` page tabs omitted `Lounges` entirely.
5. **Client-Side Failure Masking**: The passenger mobile app's `PassengerBookingsService` caught API errors and returned `{ success: true, data: { items: [] } }`, masking database/API crashes as empty state rather than showing error or retry controls.

---

## 2. Database Identity & Metadata

Live inspection via query execution against the target database confirmed:

| Property | Verified Value |
|---|---|
| **Database Name** | `kings_taxi_dev` |
| **Current Schema** | `public` |
| **PostgreSQL Version** | `PostgreSQL 18.6 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit` |
| **Connection Target** | `postgresql://kings_taxi_dev_user:****@127.0.0.1:5433/kings_taxi_dev?schema=public` |
| **Applied Prisma Migrations** | 2 applied migrations recorded in `_prisma_migrations` |

### Migration Ledger (`_prisma_migrations`)
- `20261106000000_init` (Applied at: `2026-11-10T12:11:20.732Z`, steps: 1)
- `20261110000000_add_ride_booking_gps_and_fare_models` (Applied at: `2026-11-10T13:01:06.852Z`, steps: 1)
- *Pending / Unapplied locally present migrations:*
  - `20261110200000_add_hospitality_and_lounge_module` (Contains tables for hotels, lounges, room rates, reservations)
  - `20261111100000_add_heritage_tour_module` (Contains tables for heritage sites, packages, certified guides, tour bookings)

---

## 3. Table Existence Verification

Live check against `information_schema.tables` in schema `public`:

| Table Name | Schema Status | Authoritative Model | Notes |
|---|---|---|---|
| `passengers` | **EXISTS ✅** | `Passenger` | 5 registered passenger accounts |
| `bookings` | **EXISTS ✅** | `Booking` | Ride hail booking requests |
| `trips` | **EXISTS ✅** | `Trip` | Active and completed trips |
| `payments` | **EXISTS ✅** | `Payment` | Ride and service payments |
| `hotels` | **DOES NOT EXIST ❌** | `Hotel` | Table never created in DB |
| `hotel_bookings` | **DOES NOT EXIST ❌** | `HotelBooking` | Table never created in DB |
| `hotel_booking_rooms` | **DOES NOT EXIST ❌** | `HotelBookingRoom` | Table never created in DB |
| `hotel_transfer_bookings` | **DOES NOT EXIST ❌** | `HotelTransferBooking` | Table never created in DB |
| `lounges` | **DOES NOT EXIST ❌** | `Lounge` | Table never created in DB |
| `lounge_reservations` | **DOES NOT EXIST ❌** | `LoungeReservation` | Table never created in DB |
| `heritage_sites` | **DOES NOT EXIST ❌** | `HeritageSite` | Table never created in DB |
| `heritage_tour_packages` | **DOES NOT EXIST ❌** | `HeritageTourPackage` | Table never created in DB |
| `heritage_tour_bookings` | **DOES NOT EXIST ❌** | `HeritageTourBooking` | Table never created in DB |

---

## 4. Service-by-Service Audit & Metrics

| Service | Actual Database Model / Table | Total Records | Recent Records (7d) | Passenger Relationship | Persistence Result |
|---|---|---:|---:|---|---|
| **Rides** | `Booking` (`bookings`) + `Trip` (`trips`) | **8** | **8** | Verified (Valid `passenger_id` FK to `passengers`) | **PERSISTED IN POSTGRESQL**, but hidden from UI due to query crash |
| **Hotels** | `HotelBooking` (`hotel_bookings`) | **0** | **0** | Missing table in DB | **NOT PERSISTED IN DB** (Stored in-memory Map; lost on restart) |
| **Lounges** | `LoungeReservation` (`lounge_reservations`) | **0** | **0** | Missing table in DB | **NOT PERSISTED IN DB** (Omitted from history service & UI) |
| **Heritage Tours** | `HeritageTourBooking` (`heritage_tour_bookings`) | **0** | **0** | Missing table in DB | **NOT PERSISTED IN DB** (Stored in-memory Map; lost on restart) |

### Registered Passenger Accounts (Total: 5)
1. `8516e9b3-e7a1-4892-bc8a-b92b2ee85c71` | Abebe Bikila | `abebe.test@kingstaxi.et`
2. `2c76f965-cc3f-47f3-819f-7a36b3949fd6` | Abebe Bikila | `test_1794319897308@kingstaxi.et`
3. `86f1c735-9e48-4ff8-b3ec-22fba232e157` | Dawit Haile | `dawit@kingstaxi.et`
4. `55e44211-7723-4df7-872d-4b1e2e6d7f8e` | Ashenafi mesele | `ashurack664@gmail.com`
5. `62b75ce2-35a2-413d-9a3a-2431f4cecc21` | Ashenafi gizaw | `spliflove67@gmail.com`

### Ride Booking Breakdown
- Total Ride Bookings: 8
- Status Distribution:
  - `REQUESTED`: 5
  - `TRIP_COMPLETED`: 3
- Trips Total: 8 (1:1 relationship with ride requests)
- Orphaned Records: 0 (All 8 bookings link to valid passenger IDs)

---

## 5. Root Cause Analysis by Category

### A. Rides
- **Database Status:** Fully intact in PostgreSQL `bookings` and `trips` tables.
- **Why records disappeared from UI:**
  In `backend/src/modules/passengers/passengerBookingHistory.service.ts`:
  ```typescript
  const [ridesCount, hotelCount, heritageCount] = await Promise.all([
    prisma.booking.count({ where: ... }),
    prisma.hotelBooking.count({ where: ... }), // THROWS P2021 table does not exist!
    prisma.heritageTourBooking.count({ where: ... })
  ]);
  ```
  When `prisma.hotelBooking.count()` threw `P2021`, the whole method aborted into the `catch` block:
  ```typescript
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch unified bookings from database, falling back to memory caches');
    return this.getFallbackUnifiedBookings(query, passengerId);
  }
  ```
  And `getFallbackUnifiedBookings()`:
  - Read from `fallbackHotelBookingsCache` and `fallbackBookingsCache`
  - Had **zero** logic to fetch from `prisma.booking` or `bookings` table.
  - Result: Real, persistent PostgreSQL rides were completely suppressed!

### B. Hotels
- **Database Status:** Table `hotel_bookings` missing from PostgreSQL.
- **Why records disappeared from UI:**
  In `backend/src/modules/hospitality/booking.service.ts`:
  `createBooking` caught database write errors and fell back to:
  ```typescript
  fallbackHotelBookingsCache.set(booking.id, booking);
  ```
  The user received a `200 OK` response with a temporary booking confirmation, but the booking was only stored in a JavaScript `Map`. Upon server restart or container restart, all hotel bookings vanished.

### C. Lounges
- **Database Status:** Table `lounge_reservations` missing from PostgreSQL.
- **Why records disappeared from UI:**
  1. No lounge records were persisted in PostgreSQL.
  2. `PassengerBookingHistoryService` did not query `prisma.loungeReservation`.
  3. `apps/passenger-mobile/app/(tabs)/bookings.tsx` only had 4 tabs: `ALL`, `RIDE`, `HOTEL`, `HERITAGE`. `LOUNGE` was missing entirely.

### D. Heritage Tours
- **Database Status:** Table `heritage_tour_bookings` missing from PostgreSQL.
- **Why records disappeared from UI:**
  In `backend/src/modules/heritage/booking.service.ts`:
  `createBooking` caught database write errors and stored records in `fallbackBookingsCache` (`Map`), which vanished on server restart.

### E. Passenger Mobile Client
- In `apps/passenger-mobile/src/services/passengerBookings.service.ts`:
  Network or 500/503 errors from `/api/v1/passenger/bookings` were caught and returned:
  `{ success: true, data: { items: [], pagination: ... } }`.
  This prevented the mobile app from displaying an error state with a retry button, confusing users into thinking they had zero bookings.

---

## 6. Action Plan for Phase 3 - Phase 6

1. **Apply Migrations to PostgreSQL:**
   Execute migrations to create:
   - Hospitality models: `hotels`, `hotel_images`, `hotel_amenities`, `hotel_amenity_relations`, `hotel_room_types`, `hotel_rates`, `airport_transfer_rates`, `hotel_bookings`, `hotel_booking_rooms`, `hotel_transfer_bookings`.
   - Lounge models: `lounges`, `lounge_images`, `lounge_reservations`.
   - Heritage models: `heritage_sites`, `heritage_tour_packages`, `heritage_tour_package_sites`, `heritage_tour_price_components`, `heritage_tour_guides`, `heritage_tour_vehicle_options`, `heritage_tour_bookings`, `heritage_tour_booking_sites`, `heritage_tour_booking_price_items`, `heritage_tour_guide_requests`.
   - Update `PaymentType` enum and add `hotel_booking_id`, `heritage_tour_booking_id` foreign keys to `payments`.
2. **Remove In-Memory Masking in Backend Services:**
   - Require authoritative PostgreSQL persistence for `HospitalityBookingService`, `LoungeReservationService`, and `HeritageTourBookingService`.
   - Ensure transactions commit before returning 200/201 responses.
3. **Upgrade Unified Booking History API:**
   - Include all 4 domains (`RIDE`, `HOTEL`, `LOUNGE`, `HERITAGE`).
   - Query `booking`, `hotelBooking`, `loungeReservation`, and `heritageTourBooking`.
   - Implement true global sorting and pagination.
   - Separate booking status from payment status.
4. **Upgrade Passenger Mobile Bookings Screen:**
   - Add `Lounges` tab (`ALL`, `RIDES`, `HOTELS`, `LOUNGES`, `HERITAGE`).
   - Render error state with Retry button on API failure.
   - Maintain cache isolation per authenticated passenger.
5. **Run Comprehensive Verification:**
   - Execute 25 automated persistence test scenarios.
   - Verify retrieval across server restarts and fresh logins.

