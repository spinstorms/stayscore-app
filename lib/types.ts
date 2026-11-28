export interface HotelScores {
  rooms?: number | null;
  grounds?: number | null;
  food?: number | null;
  service?: number | null;
  value?: number | null;
}

export interface KeyFacts {
  poolHeating?: string;
  beachOrReef?: string;
  renovationYear?: number | null;
  transferLogistics?: string;
}

export interface PropertyStatus {
  operatingStatus?: string;
  renovationsExtensions?: string;
  nearbyConstruction?: string;
  sourceUrl?: string;
  sourceNote?: string;
  verifiedAt?: string;
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
  awardBody?: string;
  label: string;
  sourceUrl: string;
  year?: string;
  normalized100?: number | null;
}

export interface VerifiedGuestSource {
  google?: {
    rating: number;
    reviewCount?: number | null;
    googleMapsUri?: string | null;
    verifiedAt?: string;
  } | null;
  licensed?: {
    sourceName: string;
    rating?: number;
    scale?: number;
    reviewCount?: number | null;
    normalized100: number;
    attribution?: string;
    verifiedAt?: string | null;
    /** each real guest rating behind the combined score (booking guests /10, Tripadvisor /5) */
    sources?: {
      name: string;
      rating: number;
      scale: number;
      normalized100: number;
      reviewCount?: number | null;
      verifiedAt?: string;
    }[];
  } | null;
}

export interface BookingLink {
  channelType: 'ota_affiliate' | 'direct_brand' | 'luxury_advisor_vip' | string;
  partnerName: string;
  url: string;
  mobileAllowed?: boolean;
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
  /** extra photos of the hotel itself (website gallery), when there are any */
  gallery?: string[];
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
  googlePlaceId?: string | null;
  thumbnail: string;
  /** Credit line for openly licensed (Wikimedia Commons) photos. */
  photoCredit?: { text: string; url: string } | null;
  scores: HotelScores | null;
  overall: number | null;
  verdict: string;
  whereWeDiffer?: string;
  standout: string;
  watchOut: string;
  keyFacts?: KeyFacts;
  propertyStatus?: PropertyStatus | null;
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
