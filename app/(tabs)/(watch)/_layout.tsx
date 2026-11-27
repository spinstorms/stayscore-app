import React from 'react';
import { TabStack } from '../../../components/TabStack';

export default function Layout() {
  return <TabStack screen="watch" title={process.env.EXPO_OS === 'ios' ? 'Watch & Deals' : 'Episodes & Shorts'} />;
}
