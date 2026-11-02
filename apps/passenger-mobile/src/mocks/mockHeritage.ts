import { HeritageSite } from '../types';

export const mockHeritageSites: HeritageSite[] = [
  {
    id: 'hrt_lalibela',
    name: 'Rock-Hewn Churches of Lalibela',
    region: 'Amhara Region',
    unescoDesignated: true,
    unescoYear: 1978,
    shortDescription: '11 monolithic medieval cave churches carved entirely from living volcanic rock in the 12th-13th century.',
    historicalOverview:
      'King Lalibela commissioned these monolithic churches as a "New Jerusalem" after Muslim conquests halted Christian pilgrimages to the Holy Land. The crowning architectural masterpiece is Bet Giyorgis (Church of St. George), carved in the shape of a cruciform.',
    culturalSignificance:
      'An active living site of Ethiopian Orthodox pilgrimage, hosting Timkat and Genna religious festivals celebrated with centuries-old sacred chants.',
    recommendedDuration: '2 - 3 Days',
    visitingHours: '06:00 - 12:00, 14:00 - 17:30 Daily',
    heroImage: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=800&auto=format&fit=crop&q=80',
    ],
    location: {
      id: 'loc_lalibela',
      title: 'Lalibela Town',
      subtitle: 'North Wollo, Amhara',
      address: 'Lalibela, Amhara, Ethiopia',
      coordinates: { latitude: 12.0319, longitude: 39.0413 },
      city: 'Lalibela',
    },
    keyHighlights: [
      'Bet Giyorgis (Cross-shaped St. George church)',
      'Bet Medhane Alem (Largest monolithic rock church in the world)',
      'Subterranean tunnels and ceremonial trenches',
    ],
    entryFeeETB: 3500,
  },
  {
    id: 'hrt_fasil_gondar',
    name: 'Fasil Ghebbi & Royal Enclosure',
    region: 'Gondar, Amhara Region',
    unescoDesignated: true,
    unescoYear: 1979,
    shortDescription: 'The Camelot of Africa — 17th-century fortified palace compound built by Emperor Fasilides.',
    historicalOverview:
      'In 1636 Emperor Fasilides broke with tradition of wandering mobile royal camps and established Gondar as Ethiopia’s imperial capital. The fortress compound encompasses six stone castles, libraries, banquet halls, and stables showcasing unique Portuguese, Moorish, and Indian architectural influences.',
    culturalSignificance:
      'Home to Fasilides Bath, the center of Ethiopia’s most spectacular Timkat (Epiphany) celebrations where thousands submerge in blessed waters.',
    recommendedDuration: '1 - 2 Days',
    visitingHours: '08:30 - 12:30, 13:30 - 17:30 Daily',
    heroImage: 'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=800&auto=format&fit=crop&q=80',
    ],
    location: {
      id: 'loc_gondar',
      title: 'Fasil Ghebbi',
      subtitle: 'Gondar City Center',
      address: 'Imperial Enclosure, Gondar, Amhara',
      coordinates: { latitude: 12.6078, longitude: 37.4705 },
      city: 'Gondar',
    },
    keyHighlights: [
      'Emperor Fasilides Castle and Archive Tower',
      'Empress Mentewab Palace',
      'Fasilides Bathing Pavilion',
    ],
    entryFeeETB: 2000,
  },
  {
    id: 'hrt_axum',
    name: 'Axumite Obelisks & Kingdom Ruins',
    region: 'Tigray Region',
    unescoDesignated: true,
    unescoYear: 1980,
    shortDescription: 'Ancient naval and trading superpower obelisks, royal tombs, and the resting place of the Ark of the Covenant.',
    historicalOverview:
      'The heart of the Axumite Empire, one of the four great powers of the ancient world alongside Rome, Persia, and China. Giant carved granite stelae mark royal underground tombs, with the Great Stele standing over 33 meters tall.',
    culturalSignificance:
      'Church of Our Lady Mary of Zion in Axum is believed by Ethiopian Orthodox tradition to guard the original Biblical Ark of the Covenant.',
    recommendedDuration: '2 Days',
    visitingHours: '08:00 - 17:00 Daily',
    heroImage: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&auto=format&fit=crop&q=80',
    ],
    location: {
      id: 'loc_axum',
      title: 'Axum Obelisk Park',
      subtitle: 'Axum Historical District',
      address: 'Axum, Tigray, Ethiopia',
      coordinates: { latitude: 14.1306, longitude: 38.7188 },
      city: 'Axum',
    },
    keyHighlights: [
      'Obelisk of Axum (Repatriated from Rome in 2005)',
      'Queen of Sheba Palace ruins (Dungur)',
      'King Ezana Stone Inscription in Sabaean, Ge\'ez, and Greek',
    ],
    entryFeeETB: 2500,
  },
  {
    id: 'hrt_simien',
    name: 'Simien Mountains National Park',
    region: 'Amhara Region',
    unescoDesignated: true,
    unescoYear: 1978,
    shortDescription: 'Spectacular jagged mountain plateaus, 1,000m sheer precipices, and endemic wildlife including the Walia Ibex.',
    historicalOverview:
      'Massive volcanic erosion over millions of years created one of Africa’s most dramatic landscapes, featuring Ras Dashen, the highest peak in Ethiopia (4,550m).',
    culturalSignificance:
      'Sanctuary for rare endemic species found nowhere else on earth: the Gelada Baboon (Bleeding Heart), Walia Ibex, and Ethiopian Wolf.',
    recommendedDuration: '3 - 5 Days',
    visitingHours: 'Open sunrise to sunset (Guided entry required)',
    heroImage: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&auto=format&fit=crop&q=80',
    ],
    location: {
      id: 'loc_simien',
      title: 'Simien Mountains Gate',
      subtitle: 'Debark Headquarters',
      address: 'Debark, Amhara, Ethiopia',
      coordinates: { latitude: 13.1833, longitude: 38.0667 },
      city: 'Debark',
    },
    keyHighlights: [
      'Jinbar Waterfall plunge into Geech Abyss',
      'Wild Gelada Baboon troops grazing on highlands',
      'Imet Gogo 360-degree panoramic lookout',
    ],
    entryFeeETB: 3000,
  },
  {
    id: 'hrt_harar',
    name: 'Harar Jugol — Fortified Historic City',
    region: 'Harari Region',
    unescoDesignated: true,
    unescoYear: 2006,
    shortDescription: 'The 4th holy city of Islam with 82 mosques, 102 shrines, vibrant colored alleys, and night hyena feeding rituals.',
    historicalOverview:
      'Surrounded by a fortified wall built between the 13th and 16th centuries, Harar was an independent trade emirate linking the Horn of Africa, the Red Sea, and the Arabian Peninsula.',
    culturalSignificance:
      'Renowned for its unique Harari townhouse architecture, peace between diverse religious communities, and the legendary generational "Hyena Men" who feed wild spotted hyenas by hand at dusk.',
    recommendedDuration: '2 Days',
    visitingHours: 'All day (Hyena feeding starts 19:00)',
    heroImage: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=800&auto=format&fit=crop&q=80',
    ],
    location: {
      id: 'loc_harar',
      title: 'Harar Jugol',
      subtitle: 'Harar Old Walled City',
      address: 'Harar, Harari Region, Ethiopia',
      coordinates: { latitude: 9.3139, longitude: 42.1311 },
      city: 'Harar',
    },
    keyHighlights: [
      'Jugol City Walls and 5 Historic Gates',
      'Traditional Harari Cultural Center & Arthur Rimbaud House',
      'Night-time wild Hyena feeding spectacle',
    ],
    entryFeeETB: 1800,
  },
  {
    id: 'hrt_konso',
    name: 'Konso Cultural Landscape',
    region: 'South Ethiopia Region',
    unescoDesignated: true,
    unescoYear: 2011,
    shortDescription: 'Ancient stone-walled agricultural terracing and wooden funeral statues (Waga) dating back over 400 years.',
    historicalOverview:
      'An arid highland landscape shaped by the Konso people into intricate stone-walled terraces that capture scarce rain and prevent erosion. The walled settlements (Paleta) reflect unique communal social hierarchy.',
    culturalSignificance:
      'Living tribute to indigenous engineering and wood-carved memorial statues celebrating hero warriors and community elders.',
    recommendedDuration: '1 - 2 Days',
    visitingHours: '08:00 - 18:00 Daily',
    heroImage: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&auto=format&fit=crop&q=80',
    ],
    location: {
      id: 'loc_konso',
      title: 'Konso Cultural Village',
      subtitle: 'Karat-Konso',
      address: 'Konso, South Ethiopia, Ethiopia',
      coordinates: { latitude: 5.3333, longitude: 37.4833 },
      city: 'Konso',
    },
    keyHighlights: [
      'Four-century old stone walled agricultural terraces',
      'Ancestral Waga wooden sculptures',
      'New York Natural Sand Formation canyon',
    ],
    entryFeeETB: 1500,
  },
  {
    id: 'hrt_tiya',
    name: 'Tiya Megalithic Carved Stelae',
    region: 'Central Ethiopia Region',
    unescoDesignated: true,
    unescoYear: 1980,
    shortDescription: 'Prehistoric cemetery featuring 36 stone monuments carved with enigmatic swords and anthropomorphic symbols.',
    historicalOverview:
      'Dating from the 12th to 14th centuries, Tiya marks an ancient protohistoric burial site. The stelae are carved with mysterious symbols, particularly curved swords, whose complete meaning remains an archaeological intrigue.',
    culturalSignificance:
      'Crucial proof of ancient burial traditions and metal-crafting societies in central Ethiopia before the modern era.',
    recommendedDuration: 'Half Day (Day trip from Addis Ababa)',
    visitingHours: '08:30 - 17:30 Daily',
    heroImage: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=800&auto=format&fit=crop&q=80',
    ],
    location: {
      id: 'loc_tiya',
      title: 'Tiya Archeological Site',
      subtitle: 'Gurage Zone',
      address: 'Tiya, Soddo, Central Ethiopia',
      coordinates: { latitude: 8.4350, longitude: 38.6111 },
      city: 'Tiya',
    },
    keyHighlights: [
      '36 prehistoric engraved megaliths',
      'Swords and ceremonial iconography carvings',
      'On-site historical interpretation museum',
    ],
    entryFeeETB: 1200,
  },
  {
    id: 'hrt_debre_berhan',
    name: 'Debre Berhan Selassie Church',
    region: 'Gondar, Amhara Region',
    unescoDesignated: false,
    shortDescription: 'World-famous ceiling adorned with 135 winged Ethiopian angel faces, the only church to survive the 1880s Dervish sacking.',
    historicalOverview:
      'Built in the late 17th century by Emperor Iyasu I, this rectangular stone church with thatched roof houses Ethiopia’s most celebrated religious frescoes painted by master artist Haile Meskel.',
    culturalSignificance:
      'Legend holds that when Sudanese Mahdist invaders tried to burn it down, a massive swarm of bees chased them away, preserving the sacred artwork intact.',
    recommendedDuration: '2 - 3 Hours',
    visitingHours: '08:00 - 12:00, 14:00 - 17:00 Daily',
    heroImage: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&auto=format&fit=crop&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&auto=format&fit=crop&q=80',
    ],
    location: {
      id: 'loc_debre_berhan_selassie',
      title: 'Debre Berhan Selassie',
      subtitle: 'East of Gondar Town',
      address: 'Gondar, Amhara, Ethiopia',
      coordinates: { latitude: 12.6125, longitude: 37.4811 },
      city: 'Gondar',
    },
    keyHighlights: [
      '135 hand-painted angel faces on wooden beam ceiling',
      'Original 17th-century wall murals depicting biblical narratives',
      'Sacred circular stone outer enclosure',
    ],
    entryFeeETB: 1500,
  },
];
