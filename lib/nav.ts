// Some screens sit inside another tab on iPhone (five rail tabs) but have their own tab on
// Android. These give the right address for each.
const IOS = process.env.EXPO_OS === 'ios';

export const routes = {
  map: (scope?: string) =>
    IOS ? `/explore?view=map${scope ? `&scope=${scope}` : ''}` : `/map${scope ? `?scope=${scope}` : ''}`,
  holidays: () => (IOS ? '/plan?section=holidays' : '/holidays'),
  insights: () => (IOS ? '/plan?section=insights' : '/insights'),
  deals: () => (IOS ? '/watch?section=deals' : '/deals'),
  watch: () => (IOS ? '/watch?section=watch' : '/watch'),
};
