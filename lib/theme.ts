export const Colors = {
  accent: '#FF5D22',
  accentDark: '#E04D17',
  accentSoft: '#FFF4EE',
  accentBorder: '#FBD7C4',

  charcoal: '#191B1F',
  charcoalCard: '#23262C',

  bgWhite: '#FFFFFF',
  bgCanvas: '#F5F3EF',
  bgWarm: '#FFF8F3',
  border: '#E6E1D9',
  borderSoft: '#EFECE6',

  inkPrimary: '#191A1A',
  inkSecondary: '#4E5156',
  inkMuted: '#7B7F86',

  teal: '#0F766E',
  tealSoft: '#F0FDFA',
  tealBorder: '#B7ECE4',

  amber: '#B45309',
  amberRing: '#D97706',
  amberSoft: '#FFFBEB',
  amberBorder: '#FDE08A',

  slate: '#334155',
  slateSoft: '#F1F5F9',
  slateBorder: '#CBD5E1',

  bookingBlue: '#1D4ED8',
  bookingSoft: '#EFF6FF',
  googleGreen: '#15803D',
  googleSoft: '#F0FDF4',
  emerald: '#047857',
  emeraldSoft: '#ECFDF5',
};

export function getVerdictPalette(agreement?: string, rated?: boolean) {
  if (agreement === 'Contrarian Verdict') {
    return {
      color: Colors.amber,
      ring: Colors.amberRing,
      soft: Colors.amberSoft,
      border: Colors.amberBorder,
    };
  }
  if (!rated || agreement === 'Global StayScore' || agreement === 'External Consensus') {
    return {
      color: Colors.slate,
      ring: '#475569',
      soft: Colors.slateSoft,
      border: Colors.slateBorder,
    };
  }
  if (agreement === 'Strong Consensus') {
    return {
      color: Colors.accent,
      ring: Colors.accent,
      soft: Colors.accentSoft,
      border: Colors.accentBorder,
    };
  }
  return {
    color: Colors.teal,
    ring: Colors.teal,
    soft: Colors.tealSoft,
    border: Colors.tealBorder,
  };
}
