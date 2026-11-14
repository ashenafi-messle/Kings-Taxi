import { LegalDocument } from './termsOfService';

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  subtitle: 'Passenger Data Protection & Privacy Notice',
  lastUpdated: 'November 14, 2026',
  version: '1.2.0-ET',
  operatingEntity: '[LEGAL_PLACEHOLDER: Kings Mobility Technologies Private Limited Company / Kings Taxi Ethiopia]',
  jurisdiction: '[LEGAL_PLACEHOLDER: Federal Democratic Republic of Ethiopia, Proclamation on Personal Data Protection]',
  sections: [
    {
      id: 'commitment',
      title: '1. Our Commitment to Your Privacy',
      paragraphs: [
        'Kings Taxi ("we", "us", or "our") deeply respects your personal privacy. We are committed to safeguarding the personal data of our passengers, drivers, and guests who utilize our digital mobility platform in Gondar City and throughout Ethiopia.',
        'This Privacy Policy outlines transparently how we collect, process, store, share, and protect your personal information when you access our mobile application, web portals, customer support channels, or ride-hailing services.',
      ],
    },
    {
      id: 'data-controller',
      title: '2. Data Controller & Contact Information',
      paragraphs: [
        'The designated data controller responsible for personal data processed through Kings Taxi is [LEGAL_PLACEHOLDER: Kings Mobility Technologies P.L.C., Registered under the Laws of Ethiopia, P.O. Box 412, Gondar, Ethiopia].',
        'Our Data Protection Officer (DPO) may be contacted for any privacy inquiry or data subject request at [LEGAL_PLACEHOLDER: privacy@kingstaxi.et / dpo@kingstaxi.et].',
      ],
    },
    {
      id: 'data-collected',
      title: '3. Personal Data We Collect',
      paragraphs: [
        'We collect only the minimum personal information necessary to deliver safe, reliable, and legally compliant mobility and hospitality services:',
      ],
      subsections: [
        {
          title: 'Categories of Collected Data',
          items: [
            'Identity & Profile Information: Legal full name, mobile telephone number, email address, preferred language (English, Amharic, Oromo, Tigrinya), and account status.',
            'Profile Avatar Images: Optional photograph uploaded to personalize your passenger profile, stored in dedicated Cloudinary cloud storage and linked to your individual account ID.',
            'Geolocation & Travel Telemetry: Precise real-time GPS coordinates of your pickup location, dropoff destination, intermediate trip waypoints, and route trajectory.',
            'Payment & Financial Records: Transaction reference IDs, selected gateway (Telebirr, Chapa, CBE Birr, Cash), payment amounts, transaction timestamps, and settlement status. Kings Taxi NEVER collects or stores your private mobile banking PINs or raw bank passwords.',
            'Customer Support & In-App Communications: Ticket subject lines, category classifications, and conversational message threads exchanged with our customer support team.',
            'Device & Technical Telemetry: Mobile operating system (Android, iOS, Web), device model, unique push notification token, IP address, app build version, and network connection status.',
          ],
        },
      ],
    },
    {
      id: 'profile-images',
      title: '4. Profile Pictures & Cloudinary Storage Architecture',
      paragraphs: [
        'When you choose to upload a profile picture, the image is securely processed and stored in an account-isolated Cloudinary media storage bucket. Each passenger account maintains a unique, independent asset identifier (Public ID) and HTTPS secure URL.',
        'Your profile image is only displayed to you on your profile and to the assigned driver during active trip coordination to help confirm passenger identity at pickup. Changing or deleting your profile picture permanently updates or removes the asset from Cloudinary and clears the reference in our PostgreSQL database.',
      ],
    },
    {
      id: 'gps-telemetry',
      title: '5. Location Data & Trip Navigation',
      paragraphs: [
        'Precise location information is essential for dispatching nearby drivers, calculating fair route distances, estimating arrival times, and ensuring passenger safety.',
        'Location tracking operates strictly while the app is active in the foreground during pickup selection or during an ongoing trip. We do not track your passive background location when the app is closed. If GPS permissions are disabled on your phone, Kings Taxi allows you to manually select known landmarks across Gondar City without blocking service access.',
      ],
    },
    {
      id: 'payment-gateways',
      title: '6. Payment Gateways & Banking Data Protection',
      paragraphs: [
        'Electronic transactions are executed securely through authorized Ethiopian financial technology partners:',
      ],
      subsections: [
        {
          title: 'Authorized Payment Partners',
          items: [
            'Telebirr (Ethio Telecom Mobile Money): Authorizations occur securely through Telebirr payment prompts; Kings Taxi stores only the transaction reference code and payment status.',
            'Chapa Financial Technologies: Bank card and mobile payment processing compliant with PCI-DSS security standards.',
            'CBE Birr (Commercial Bank of Ethiopia): Secure mobile banking integration.',
          ],
        },
      ],
    },
    {
      id: 'legal-basis',
      title: '7. Legal Basis & Purposes for Data Processing',
      paragraphs: [
        'We process your personal information under the following lawful bases: (a) Performance of Contract to provide mobility, airport transfer, hotel booking, and heritage tour services; (b) Legitimate Interests to protect passenger and driver safety, prevent fraud, and improve application reliability; (c) Compliance with Legal Obligations under Ethiopian transport and commercial regulations; and (d) Consent for optional features such as marketing promotions.',
      ],
    },
    {
      id: 'data-sharing',
      title: '8. Data Sharing & Third-Party Disclosures',
      paragraphs: [
        'We strictly respect your data confidentiality. We NEVER sell, rent, or monetize your personal information to third-party data brokers. Information is shared only with:',
      ],
      subsections: [
        {
          title: 'Permitted Disclosures',
          items: [
            'Dispatched Drivers: Passenger first name, profile picture, and pickup/destination coordinates are shared with the assigned driver solely for the duration of the trip.',
            'Partner Hotels & Tour Operators: Guest name and reservation dates shared with verified Gondar hotels or heritage tour guides to honor bookings.',
            'Cloud Infrastructure Providers: Encrypted cloud hosting on our secured VPS and managed media storage on Cloudinary.',
            'Law Enforcement & Safety Authorities: Where strictly required by a valid Ethiopian court order or in urgent life-safety emergencies (e.g. SOS dispatch).',
          ],
        },
      ],
    },
    {
      id: 'data-security',
      title: '9. Security Measures & Cryptographic Standards',
      paragraphs: [
        'Kings Taxi deploys rigorous multi-layered technical and organizational safeguards:',
        '• Passwords hashed with Argon2id cryptographic key-derivation functions.',
        '• Transport Layer Security (TLS 1.3 / HTTPS) encrypting all client-server communications.',
        '• Rotating JSON Web Tokens (JWT) with strict 15-minute access expiration and secure refresh token rotation.',
        '• Role-Based Access Control (RBAC) ensuring only authorized Super Admin personnel can review support tickets.',
      ],
    },
    {
      id: 'retention',
      title: '10. Data Retention & Archival Policies',
      paragraphs: [
        'We retain personal account information for as long as your account remains active. Completed booking records and payment receipts are retained for a statutory period of [LEGAL_PLACEHOLDER: 5 to 7 years] to comply with Ethiopian tax, accounting, and commercial transport record-keeping regulations.',
      ],
    },
    {
      id: 'user-rights',
      title: '11. Your Privacy Rights & Choices',
      paragraphs: [
        'Under applicable data protection laws, you enjoy significant rights over your personal data:',
      ],
      subsections: [
        {
          title: 'Passenger Rights',
          items: [
            'Right of Access: Request a copy of the personal information we hold about you.',
            'Right of Rectification: Update or correct your profile details directly in the mobile application.',
            'Right to Erasure (Account Deletion): Request permanent deletion of your account and personal data, subject to legal retention obligations.',
            'Right to Restrict Processing: Request limitation of certain data processing activities.',
            'Right to Data Portability: Receive your personal trip history in a machine-readable JSON format.',
          ],
        },
      ],
    },
    {
      id: 'cookies-storage',
      title: '12. Local Device Storage & Biometrics',
      paragraphs: [
        'The mobile application uses secure local storage (AsyncStorage) to store encrypted authentication session tokens and cached UI preferences.',
        'If enabled on your device, biometric authentication (Face ID / Fingerprint) operates entirely within your smartphone’s secure hardware enclave. Kings Taxi never accesses, receives, or stores your biometric templates.',
      ],
    },
    {
      id: 'children',
      title: '13. Children’s Privacy',
      paragraphs: [
        'The Kings Taxi Platform is not intended for use by individuals under the age of 18 without adult supervision. We do not knowingly collect personal data from minors. If we discover that a child has provided us with personal information, we promptly delete such data.',
      ],
    },
    {
      id: 'policy-updates',
      title: '14. Updates to this Privacy Policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time to reflect operational advancements or legal requirements. Material updates will be highlighted in the application. Your continued use of Kings Taxi following notice constitutes acceptance of the updated policy.',
      ],
    },
  ],
};

