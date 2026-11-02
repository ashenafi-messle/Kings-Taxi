# Kings Taxi — Project Overview

## 1. Executive Summary

**Kings Taxi** is a professional, multi-vertical digital mobility and hospitality platform specifically engineered for the Ethiopian market and international visitors. Unlike single-purpose ride-hailing applications, Kings Taxi unites four core pillars into a cohesive, high-performance mobile passenger experience:

1. **On-Demand Urban Ride-Hailing**: Real-time point-to-point and scheduled transportation with multi-tier vehicle categories, live GPS tracking, and transparent upfront Ethiopian Birr (ETB) fare estimates.
2. **Integrated Hotel Reservations**: Verified accommodations across Ethiopian cities and tourist gateways, featuring structured room types, transparent cancellation policies, and unified booking management.
3. **Heritage and Tourism Expeditions**: Curated and custom cultural exploration covering UNESCO World Heritage and national landmarks (Lalibela, Axum, Gondar, Simien Mountains, Harar Jugol, Konso, Tiya, and Fasil Ghebbi).
4. **Full-Contract Multi-Destination Transportation**: Dedicated chauffeured multi-stop itineraries with day-rate and distance-based quotes, enabling travelers and corporate delegations to book custom routes seamlessly.

---

## 2. Target Market & Strategic Focus

- **Primary Geography**: Ethiopia (Addis Ababa, Bahir Dar, Gondar, Hawassa, Lalibela, Dire Dawa, Axum, Arba Minch).
- **Primary Currency**: Ethiopian Birr (ETB).
- **Languages**: English (default) with an architectural localization foundation ready for Amharic (አማርኛ), Oromiffa, and Tigrinya.
- **Customer Segments**:
  - Daily urban commuters requiring predictable fares and verified drivers.
  - Domestic and regional business travelers needing reliable airport transfers and hotel stays.
  - International tourists exploring Ethiopia's cultural landmarks with guaranteed safety and verified transport contracts.

---

## 3. Technology Stack & Strategy

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | React Native with Expo SDK 52 | Rapid cross-platform iOS and Android delivery, reliable native bridges, and active community ecosystem. |
| **Routing** | Expo Router (File-based) | Type-safe, intuitive deep linking, seamless tab/modal hierarchy, and route guards. |
| **Language** | TypeScript (Strict Mode) | Full type safety across domain models, API contracts, and UI components. |
| **Styling & Design Tokens** | Custom Theme Engine & StyleSheet | Zero-overhead, highly maintainable design token system tailored to Kings Taxi's brand identity. |
| **State Management** | Zustand & React Context | Lightweight, high performance state slices for Auth, Ride Booking, and App Settings without Redux boilerplate. |
| **Data Fetching** | TanStack Query v5 & Axios | Declarative caching, optimistic updates, request deduplication, and resilient offline handling. |
| **Form Handling** | React Hook Form + Zod | Schema-validated user input with zero unnecessary re-renders. |
| **Location & Maps** | Expo Location & React Native Maps | Cross-platform geolocation handling with graceful fallback for denied GPS permissions. |

---

## 4. Architectural Boundaries

- **Modular Workspaces**: Structured under `apps/passenger-mobile` with shared domain types under `apps/shared/`.
- **API Isolation**: All external communication is routed through abstract service adapters, allowing full offline mocking during frontend phases and plug-and-play backend integration in Phase 10.
- **Zero Raw Payment Data**: Payment operations interface with tokenized gateway flows (Chapa, Telebirr, CBE Birr) without storing sensitive instruments on device.
