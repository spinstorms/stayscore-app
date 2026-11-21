export interface HotelScores {
  rooms: number;
  grounds: number;
  food: number;
  service: number;
  value: number;
}

export interface BookingSubscores {
  staff: number;
  cleanliness: number;
  comfort: number;
  facilities: number;
  location: number;
  value: number;
}

export interface ChannelBenchmark {
  source: string;
  category: string;
  score: string;
  normalized100: number | null;
  takeaway: string;
}

export interface HotelShort {
  id: string;
  title: string;
  url: string;
  viewsText?: string;
}

export interface HotelConsensus {
  overallIndex: number;
  greatStayChance: number;
  agreement: string;
  spread: number | null;
  oursIncluded?: boolean;
  googleRating: number;
  googleReviews: number;
  criticScore: number;
  bookingOverall: number;
  tripadvisorRating?: number;
  award?: string;
  sources?: string[];
  otherReviewersSay?: string;
  whereWeDiffer?: string;
  bookingSubscores?: BookingSubscores;
  channelBenchmarks?: ChannelBenchmark[];
}

export interface Hotel {
  id: string;
  name: string;
  location: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  brand: string;
  priceRange?: string;
  reviewedDate?: string;
  videoId?: string;
  inLiveFeed?: boolean;
  visitedByUs?: boolean;
  coverageType: 'Full Review' | 'Short Tour' | 'Global Directory' | string;
  thumbnail: string;
  scores: HotelScores | null;
  overall: number | null;
  verdict: string;
  standout: string;
  watchOut: string;
  bookingUrl: string;
  shorts?: HotelShort[];
  consensus: HotelConsensus;
}

export interface VideoItem {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  views?: number;
  viewsText?: string;
  thumbnail: string;
  fallbackThumbnail?: string;
  category?: string;
  location?: string;
  isShort?: boolean;
  chapters?: { time: string; seconds: number; label: string }[];
  summary?: {
    tldr?: string;
    highlights?: string[];
    bestFor?: string;
  };
}

export interface AffiliateDeal {
  id: string;
  source?: string;
  section: 'Promotions & Codes' | 'Shopping & Gear' | string;
  featured?: boolean;
  category: string;
  title: string;
  badge?: string;
  description?: string;
  promoCode?: string;
  url: string;
  buttonLabel?: string;
}
