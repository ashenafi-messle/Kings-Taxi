# KINGS TAXI — CLOUDINARY PASSENGER PROFILE IMAGE UPLOAD & PERSISTENCE FIX REPORT

**Document ID:** `KT-CLOUDINARY-FIX-2026-11-13`  
**Application:** Kings Taxi Passenger Mobile & Central Backend  
**Target Environment:** Development & Production (VPS / Cloudinary / PostgreSQL)  
**Status:** **RESOLVED & VERIFIED** (100% Pass Rate: 67/67 Automated Acceptance Tests)  

---

## 1. Executive Summary

During testing of the Kings Taxi passenger mobile application, passenger profile picture uploads were failing with the following browser console error:

```text
POST https://api.cloudinary.com/v1_1/oxzqogef/image/upload 403 Forbidden
Request forbidden due to missing permissions (actions=["create"])
[PassengerProfileService] Cloudinary direct upload returned HTTP 403. Activating backend direct upload fallback.
[Profile] Remote avatar image failed to load, falling back to local cache
```

Furthermore, upon page refresh or app restart, the profile image would fail to load (Cloudinary HTTP 404) and disappear from the profile screen, displaying only the generic placeholder icon.

### Root Cause Analysis

1. **Scoped Cloudinary API Key Permissions:**  
   The backend environment configuration (`backend/.env`) contained `CLOUDINARY_API_KEY=823153612149712`. In the Cloudinary Console, this Access Key had been provisioned with restricted permissions that omitted the `create` action. When the mobile client attempted a signed multipart upload with `api_key`, `timestamp`, and `signature`, Cloudinary's security layer evaluated the API key permissions first and rejected the request with HTTP 403 `missing permissions (actions=["create"])`.

2. **Unsigned Upload Preset Was Available but Unused:**  
   The Cloudinary cloud `oxzqogef` had an active unsigned upload preset named `kings_passenger_avatars` configured in `backend/.env`. However, the mobile client's `uploadProfilePicture` method was not using this preset; it was forcing a signed upload using the scoped API key.

3. **React Native Web Blob Handling:**  
   In Expo / React Native Web, `ImagePicker` produces `blob:http://...` URIs. When passing `imageUri` as a plain string inside `formData.append('file', imageUri)`, the browser sends the literal string `"blob:..."` rather than the binary image payload. Cloudinary attempts to fetch this string as an external URL, resulting in an upload failure.

4. **Persistence of Mock / Fictitious URLs:**  
   When the previous fallback logic encountered an upload failure, it generated a fictitious mock Cloudinary URL (`https://res.cloudinary.com/oxzqogef/image/upload/kings-taxi/passengers/...`) and stored it in PostgreSQL. When the user refreshed the app, `GET /api/v1/passenger/profile` returned this non-existent URL. The React Native `<Image source={{ uri }}>` component requested it, received HTTP 404 Not Found from Cloudinary, fired `onError()`, and cleared or failed the avatar display.

---

## 2. Solutions Implemented

### A. Frontend: Unsigned Upload Preset & Web Blob Conversion
In [passengerProfile.service.ts](file:///c:/Users/USER/kings-taxi/apps/passenger-mobile/src/services/passengerProfile.service.ts):
- Updated `uploadProfilePicture` to inspect `sig.uploadPreset`. When `uploadPreset` is provided (`kings_passenger_avatars`), the client uploads using `upload_preset` directly without appending the scoped `api_key` and `signature`, avoiding the Cloudinary 403 error.
- Implemented binary `Blob` extraction on Web: if `imageUri` is a `blob:` or `data:` URI, `fetch(imageUri).then(r => r.blob())` converts it into an actual binary `Blob` before attaching to `FormData`.
- Updated `uploadDirectProfileImage` fallback: if running on Web and given a `blob:` URI, it converts the blob to a base64 Data URL via `FileReader` before transmitting to the backend.

### B. Backend: Cloudinary Signature & Resilient Server Fallback
In [passengerProfile.service.ts](file:///c:/Users/USER/kings-taxi/backend/src/modules/passengers/passengerProfile.service.ts):
- Updated `generateCloudinarySignature` (`POST /api/v1/passenger/profile-image/upload-signature`) to include `uploadPreset: env.CLOUDINARY_UPLOAD_PRESET || 'kings_passenger_avatars'` in the returned authorization payload.
- Added `uploadDirectProfileImage` (`POST /api/v1/passenger/profile-image/upload-direct`) to accept base64 image data, attempt Cloudinary SDK upload with preset, and fall back to local disk storage in `public/uploads/avatars/`.
- Mounted static directory `/uploads` in [app.ts](file:///c:/Users/USER/kings-taxi/backend/src/app.ts) and expanded JSON payload limit to `10mb`.
- Enhanced `updateProfileImage` security validation to accept verified Cloudinary URLs (`res.cloudinary.com`) as well as local media paths.

### C. Profile Screen: Reliable Local & Remote Display
In [profile.tsx](file:///c:/Users/USER/kings-taxi/apps/passenger-mobile/app/(tabs)/profile.tsx):
- Integrated `AsyncStorage.getItem('@kings_taxi_local_avatar')` into the initial load sequence to guarantee instantaneous display while network calls complete.
- Reset `avatarLoadError` upon receiving fresh profile data from `getProfile()` or after a successful photo pick.
- Persisted genuine Cloudinary asset URLs to PostgreSQL so `GET /passenger/profile` always returns an accessible HTTP 200 image.

---

## 3. Live Cloudinary Verification

A live diagnostic upload test was executed against Cloudinary cloud `oxzqogef` using the unsigned upload preset `kings_passenger_avatars`:

```json
{
  "asset_id": "fdbe279e3e39a629cf627076d1be8788",
  "public_id": "fffd6ged22dyt9xeobed",
  "version": 1794564183,
  "format": "png",
  "secure_url": "https://res.cloudinary.com/oxzqogef/image/upload/v1794564183/fffd6ged22dyt9xeobed.png"
}
```

HTTP status verification:
```text
HTTP/1.1 200 OK
Content-Type: image/png
Server: Cloudinary
Access-Control-Allow-Origin: *
Cache-Control: public, max-age=31536000
```

The asset is live, publicly viewable, and verified.

---

## 4. Verification & Automated Test Results

All TypeScript compilations and automated test suites passed with **0 errors**:

| Test Suite | Tests Passed | Status |
| :--- | :---: | :---: |
| **Backend TypeScript Build** (`rimraf dist && tsc -p tsconfig.json`) | Clean | ✅ PASS |
| **Mobile TypeScript Typecheck** (`npx tsc --noEmit`) | Clean | ✅ PASS |
| **Branding, Auth & Carousel Suite** (`scripts/test-branding-auth-carousel.js`) | 6 / 6 | ✅ PASS |
| **Passenger Booking History Suite** (`scripts/test-passenger-booking-history.js`) | 8 / 8 | ✅ PASS |
| **Passenger Profile & Biometrics Suite** (`scripts/test-passenger-profile-and-biometrics.js`) | 13 / 13 | ✅ PASS |
| **Production Security Hardening Suite** (`scripts/test-production-security-hardening.js`) | 40 / 40 | ✅ PASS |
| **Total Automated Tests** | **67 / 67** | ✅ **100% PASS** |

---

## 5. Summary of Files Changed

1. `backend/src/modules/passengers/passengerProfile.service.ts` — Added `uploadPreset` to `generateCloudinarySignature`, implemented `uploadDirectProfileImage`, and updated URL validation.
2. `backend/src/modules/passengers/passengerProfile.controller.ts` — Added direct upload endpoint controller handler and validation schema.
3. `backend/src/modules/passengers/index.ts` — Mounted `POST /profile-image/upload-direct`.
4. `backend/src/app.ts` — Configured `express.static` for `/uploads` and `10mb` JSON body limit.
5. `apps/passenger-mobile/src/services/passengerProfile.service.ts` — Implemented unsigned preset upload, web blob conversion, and base64 fallback.
6. `apps/passenger-mobile/src/types/auth.types.ts` — Added `uploadPreset?: string;` to `CloudinarySignatureData`.
7. `apps/passenger-mobile/src/config/api.ts` — Registered `passengerUploadDirect` endpoint.
8. `apps/passenger-mobile/app/(tabs)/profile.tsx` — Added local avatar cache fallback and resilient image loading.
9. `apps/passenger-mobile/src/stores/auth.store.ts` — Synchronized avatar updates to `@kings_taxi_local_avatar`.

