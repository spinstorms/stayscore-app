export interface HotelScores {
  rooms: number;
  grounds: number;
  food: number;
  service: number;
  value: number;
}

export interface EditorialRating {
  sourceName: string;
  sourceUrl: string;
  rawScore?: string;
  normalized100: number;
  takeaway?: string;
  verifiedAt?: string;
}

export interface LinkedYoutubeReview {
  creatorName: string;
  sourceUrl: string;
  sentiment?: 'Recommended' | 'Mixed' | 'Pass' | string;
  takeaway?: string;
  publishedAt?: string;
}

export interface OfficialAward {
  label: string;
  sourceUrl: string;
  year?: string;
}

export interface VerifiedGuestSource {
  google?: {
    rating: number;
    reviewCount?: number | null;
    verifiedAt?: string;
  } | null;
  licensed?: {
    sourceName: string;
    rating?: number;
    scale?: number;
    reviewCount?: number | null;
    normalized100: number;
    attribution?: string;
    verifiedAt?: string;
  } | null;
}

export interface BookingLink {
  channelType: 'ota_affiliate' | 'direct_brand' | 'luxury_advisor_vip' | string;
  partnerName: string;
  url: string;
  perksSummary?: string;
  priority?: number;
}

export interface HotelShort {
  id: string;
  title: string;
  url: string;
  viewsText?: string;
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
  tier?: 'first_hand_verified' | 'short_preview' | 'global_directory' | string;
  thumbnail: string;
  scores: HotelScores | null;
  overall: number | null;
  verdict: string;
  standout: string;
  watchOut: string;
  bookingUrl: string;
  bookingLinks?: BookingLink[];
  shorts?: HotelShort[];
  verifiedGuest?: VerifiedGuestSource | null;
  editorialRatings?: EditorialRating[];
  youtubeReviews?: LinkedYoutubeReview[];
  officialAwards?: OfficialAward[];
  redFlags?: string[];
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
