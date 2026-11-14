export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  subsections?: {
    title: string;
    items: string[];
  }[];
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  lastUpdated: string;
  version: string;
  operatingEntity: string;
  jurisdiction: string;
  sections: LegalSection[];
}

export const TERMS_OF_SERVICE: LegalDocument = {
  title: 'Terms of Service',
  subtitle: 'Passenger Platform & Mobility Agreement',
  lastUpdated: 'November 14, 2026',
  version: '1.2.0-ET',
  operatingEntity: '[LEGAL_PLACEHOLDER: Kings Mobility Technologies Private Limited Company / Kings Taxi Ethiopia]',
  jurisdiction: '[LEGAL_PLACEHOLDER: Federal Democratic Republic of Ethiopia, Amhara Regional State High Court, Gondar City]',
  sections: [
    {
      id: 'acceptance',
      title: '1. Introduction & Acceptance of Terms',
      paragraphs: [
        'Welcome to Kings Taxi. These Terms of Service ("Terms") constitute a legally binding contractual agreement between you ("Passenger", "User", or "You") and the platform operating entity regarding your access to and use of the Kings Taxi mobile application, dispatch services, website, and associated digital mobility tools (collectively, the "Platform").',
        'By downloading, installing, registering an account, or accessing any service provided through Kings Taxi, you unequivocally confirm that you have read, understood, and agreed to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms in their entirety, you must immediately cease accessing the Platform and uninstall the application.',
      ],
    },
    {
      id: 'entity',
      title: '2. Operating Entity & Licensing',
      paragraphs: [
        'The Kings Taxi digital mobility platform is owned and operated by [LEGAL_PLACEHOLDER: Kings Mobility Technologies P.L.C., Registered Commercial Entity under the Ministry of Trade and Regional Integration of Ethiopia, Commercial Registration Number: ET-TIN-98421004, Registered Office: Gondar City, Central Gondar Zone, Amhara Region, Ethiopia].',
        'All communications, formal notices, or regulatory inquiries regarding operational compliance should be directed to [LEGAL_PLACEHOLDER: legal@kingstaxi.et / corporate-affairs@kingstaxi.et, P.O. Box 412, Gondar, Ethiopia].',
      ],
    },
    {
      id: 'eligibility',
      title: '3. Eligibility & Account Registration',
      paragraphs: [
        'To create an account and book transportation, hospitality, or heritage services on the Platform, you must be at least 18 years of age (or the legal age of majority in your jurisdiction) and possess full civil capacity to enter into binding legal agreements under Ethiopian law.',
        'When creating an account, you must provide truthful, current, and accurate personal information, including your legal name, mobile phone number, and a valid email address. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities conducted under your registered account.',
      ],
    },
    {
      id: 'verification',
      title: '4. Authentication, Verification & Security',
      paragraphs: [
        'Kings Taxi employs multi-channel cryptographic authentication, including One-Time Passwords (OTP) transmitted via verified transactional email (Brevo SMTP Relay) or verified Telegram Bot (@KingstaxiBot).',
        'You agree never to disclose your verification codes to any third party, including individuals claiming to represent Kings Taxi customer support. Kings Taxi personnel will never request your account password, active OTP, or one-time verification tokens.',
      ],
    },
    {
      id: 'services',
      title: '5. Scope of Kings Taxi Services',
      paragraphs: [
        'The Platform connects passengers with a comprehensive suite of mobility and hospitality experiences across Gondar City and surrounding tourist destinations:',
      ],
      subsections: [
        {
          title: 'Covered Service Offerings',
          items: [
            'On-Demand Ride-Hailing: Instant point-to-point urban transport within Gondar subcities.',
            'Atse Tewodros Airport (GDQ) Transfers: Scheduled and immediate arrival and departure shuttles connecting Gondar Airport with hotels and residential zones.',
            'Hospitality & Hotel Reservations: Real-time room booking and accommodation arrangements at verified partner hotels in Gondar.',
            'VIP Lounges: Reserved lounge access and refreshments for business travelers and tourists.',
            'Multi-Day Heritage Tours: Curated vehicle contracts with experienced guides visiting Fasil Ghebbi (Royal Enclosure), Fasilides Bath, Debre Berhan Selassie Church, Kuskuam Palace, and Gorgora on Lake Tana.',
          ],
        },
      ],
    },
    {
      id: 'fares',
      title: '6. Fare Calculation, Pricing & Dynamic Rates',
      paragraphs: [
        'Fares for on-demand rides are calculated using a transparent pricing formula comprising: (a) base flag-fall fare, (b) distance-based rate per kilometer, (c) elapsed time rate per minute, and (d) where applicable, approved subcity or night-time operational surcharges.',
        'Before confirming a booking request, an upfront fare estimate is displayed on your screen. You acknowledge that fare estimates may be adjusted if the destination is modified mid-trip, if significant traffic diversions occur, or if waiting times exceed standard grace thresholds.',
      ],
    },
    {
      id: 'payments',
      title: '7. Payment Methods & Financial Processing',
      paragraphs: [
        'Kings Taxi integrates leading Ethiopian electronic payment gateways to facilitate secure transactions, including Telebirr, Chapa Financial Technologies, CBE Birr (Commercial Bank of Ethiopia), and authorized cash-on-drop arrangements.',
        'By selecting an electronic payment channel, you authorize the gateway partner to debit the designated fare amount from your digital wallet or bank account. All electronic payments are processed under the regulatory oversight of the National Bank of Ethiopia (NBE).',
      ],
    },
    {
      id: 'cancellations',
      title: '8. Cancellation & Refund Policies',
      paragraphs: [
        'Passengers may cancel an on-demand ride free of charge within 3 minutes of driver acceptance. Cancellations requested after this grace window, or instances where the driver arrives at the pickup point and the passenger fails to appear within 5 minutes, may incur a standard cancellation fee of [LEGAL_PLACEHOLDER: 50–100 ETB] to compensate the driver for fuel and travel time.',
        'Hotel reservations and heritage tour bookings are subject to specific partner cancellation rules detailed at the time of reservation. In the event of a verified billing error or technical duplicate charge, refund requests must be submitted through Help & Support within 7 business days.',
      ],
    },
    {
      id: 'conduct',
      title: '9. Passenger Code of Conduct & Safety',
      paragraphs: [
        'Kings Taxi is committed to creating a respectful and secure environment for all community members. As a passenger, you agree to treat drivers, hotel staff, and tour guides with courtesy and respect.',
        'Prohibited conduct includes: verbal or physical abuse, discriminatory harassment, carrying illegal substances or firearms, smoking or vaping inside vehicles, damaging vehicle property, or requesting drivers to violate traffic laws. Violation may result in immediate suspension or permanent ban from the Platform.',
      ],
    },
    {
      id: 'drivers',
      title: '10. Independent Contractor Relationship of Drivers',
      paragraphs: [
        'You acknowledge and agree that Kings Taxi provides a technology dispatch platform connecting passengers with independent commercial vehicle operators ("Drivers"). Drivers are independent third-party contractors and are not employees, agents, or representatives of Kings Taxi.',
        'Kings Taxi rigorously inspects vehicle roadworthiness and verifies driver licenses, clean criminal background records, and municipal taxi permits; however, each driver maintains direct responsibility for the operation of their vehicle and compliance with road safety laws.',
      ],
    },
    {
      id: 'airport',
      title: '11. Atse Tewodros Airport (GDQ) Transfer Terms',
      paragraphs: [
        'For scheduled airport pickups at Atse Tewodros Airport (GDQ), passengers are advised to provide their scheduled flight number. In case of commercial flight delays, drivers provide a complimentary grace waiting period of [LEGAL_PLACEHOLDER: 30 minutes] from the scheduled touchdown time before waiting fees apply.',
      ],
    },
    {
      id: 'hospitality',
      title: '12. Hospitality & Hotel Booking Specific Terms',
      paragraphs: [
        'When reserving hotel accommodations or lounge passes through Kings Taxi, Kings Taxi acts as a reservation facilitator. The contract for hospitality lodging is made directly between you and the participating hotel property. Check-in requirements, property policies, meal plans, and amenity terms are governed by the respective hotel.',
      ],
    },
    {
      id: 'heritage',
      title: '13. Multi-Day Heritage Tour Terms',
      paragraphs: [
        'Heritage tour contracts include private vehicle rental, licensed driver services, and designated itinerary routing within historical sites in Gondar and Amhara Region. National park entrance fees, church admission permits, and personal tour guide gratuities are subject to the specific tour package selected.',
      ],
    },
    {
      id: 'intellectual-property',
      title: '14. Intellectual Property & Trademark Protection',
      paragraphs: [
        'The Kings Taxi crown logo, brand design, visual identity, software code, graphic interfaces, trademarks, and documentation are the exclusive intellectual property of [LEGAL_PLACEHOLDER: Kings Mobility Technologies P.L.C.]. You are granted a limited, personal, non-transferable license to use the app for personal mobility.',
      ],
    },
    {
      id: 'disclaimers',
      title: '15. Disclaimers of Warranties',
      paragraphs: [
        'The Platform and all associated mobility services are provided on an "as is" and "as available" basis. While we strive for 99.9% uptime and reliable dispatch, Kings Taxi does not warrant that app functionality will be uninterrupted, error-free, or entirely free of temporary telecommunications downtime in regional network zones.',
      ],
    },
    {
      id: 'liability',
      title: '16. Limitation of Liability',
      paragraphs: [
        'To the maximum extent permitted by applicable law in the Federal Democratic Republic of Ethiopia, Kings Taxi and its directors, officers, and employees shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Platform.',
        'Kings Taxi maintains commercial liability insurance coverage for platform-dispatched rides in accordance with Ethiopian transport authority regulations.',
      ],
    },
    {
      id: 'emergency',
      title: '17. Emergency Helpline & Gondar 24/7 Dispatch',
      paragraphs: [
        'In the event of an urgent safety emergency during an active trip, passengers should utilize the in-app Emergency Hotline to directly dial the Ethiopian National Police (991) or Emergency Ambulance Services (907).',
        'Kings Taxi maintains a 24/7 Safety & Dispatch Operations Center reachable via the in-app support module or by calling +251 91 100 0000.',
      ],
    },
    {
      id: 'dispute-resolution',
      title: '18. Dispute Resolution & Governing Law',
      paragraphs: [
        'These Terms shall be governed by, construed, and enforced in accordance with the substantive laws of the Federal Democratic Republic of Ethiopia.',
        'Any dispute, controversy, or claim arising out of or relating to these Terms, which cannot be resolved amicably through the in-app Help & Support system within thirty (30) days, shall be submitted to the exclusive jurisdiction of the competent courts of [LEGAL_PLACEHOLDER: Gondar City / High Court of Amhara Regional State, Ethiopia].',
      ],
    },
    {
      id: 'termination',
      title: '19. Termination & Account Suspension',
      paragraphs: [
        'You may terminate your account at any time through the in-app Profile Settings or by submitting a ticket to Help & Support. Kings Taxi reserves the right to suspend or terminate accounts that breach these Terms, engage in fraudulent transactions, or compromise community safety.',
      ],
    },
    {
      id: 'amendments',
      title: '20. Amendments, Updates & Contact Information',
      paragraphs: [
        'We reserve the right to revise or update these Terms periodically to reflect changes in regulatory requirements or platform features. Material amendments will be communicated through in-app notifications.',
        'If you have questions regarding these Terms, please reach out to our Customer Care team via the Help & Support module or write to us at support@kingstaxi.et.',
      ],
    },
  ],
};

