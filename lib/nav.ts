// On iPhone, Watch, Deals and Holiday dates open as pages from the rail's shortcut group (the
// tab group holds five); on Android they are tabs in the rail. These give the right address.
const IOS = process.env.EXPO_OS === 'ios';

export const routes = {
  map: (scope?: string) => `/map${scope ? `?scope=${scope}` : ''}`,
  holidays: () => (IOS ? '/holiday-dates' : '/holidays'),
  insights: () => '/insights',
  deals: () => (IOS ? '/offers' : '/deals'),
  watch: () => (IOS ? '/videos' : '/watch'),
};
