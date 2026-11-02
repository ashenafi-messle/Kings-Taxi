# Kings Taxi — Mobile Application Security Guidelines

## 1. Security Architecture Principles

As a high-volume transportation and financial transaction application, Kings Taxi adheres to strict mobile application security best practices aligned with OWASP Mobile Security Project (MASVS) standards.

---

## 2. Credential & Token Protection

1. **Secure Storage Only**:
   - Authentication tokens (`accessToken`, `refreshToken`) and sensitive user credentials must be stored exclusively via `expo-secure-store` (backed by iOS Keychain and Android KeyStore with hardware encryption).
   - `AsyncStorage` is restricted strictly to non-sensitive UI preferences (such as theme choice or recent destination search terms).

2. **Zero Sensitive In-App Logs**:
   - Passwords, OTP codes, authorization tokens, full phone numbers, and payment details must NEVER be printed to `console.log` or error reporting services.
   - Production logger wrapper strips any object keys matching sensitive fields before dispatching telemetry.

3. **Session Expiry & Token Invalidation**:
   - The application automatically clears in-memory state and securely deletes tokens upon receiving `401 Unauthorized` responses from the API.

---

## 3. Financial & Payment Safety

1. **Zero Card Storage**:
   - The mobile client NEVER collects, processes, or stores primary account numbers (PAN), CVV/CVC, or bank card credentials.
   - All digital payment flows (Telebirr, Chapa, CBE Birr) are executed via official tokenized SDKs, secure webviews, or backend-directed payment intents.

2. **Server-Side Authoritative Verification**:
   - No payment is ever treated as completed solely because of a client-side redirect or user dismissal of a payment modal.
   - Status transitions to `PAYMENT_COMPLETED` require cryptographically verified server-side callbacks or explicit polling of the Kings Taxi backend verification endpoint.

3. **Idempotency Safeguards**:
   - Double-tapping buttons or momentary network stutter must never initiate duplicate financial transactions.
   - All booking and payment requests generate and transmit an immutable client UUID header (`Idempotency-Key`).
   - Action buttons are immediately disabled upon submission until the transaction reaches a terminal state.

---

## 4. Location & Privacy Handling

1. **Minimal Privilege Model**:
   - The app only requests foreground location permission (`ACCESS_FINE_LOCATION`) when actively picking up or hailing a vehicle.
   - No background location tracking is permitted on the passenger application without explicit user initiation of an active emergency trip sharing feature.

2. **Graceful Permission Degradation**:
   - If the user denies GPS permissions, the application does not block user progress or crash.
   - Instead, the app smoothly transitions to manual address search or map pin placement.

---

## 5. Input Validation & Network Hardening

1. **Runtime Type & Schema Validation**:
   - All user inputs (phone numbers, names, passenger counts, dates) are validated client-side using `Zod` schemas before submission.
2. **TLS 1.3 & Certificate Pinning**:
   - In production builds, network requests will mandate TLS 1.3 with certificate pinning to prevent Man-in-the-Middle (MitM) inspection.
