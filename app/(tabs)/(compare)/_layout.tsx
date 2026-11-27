import React from 'react';
import { TabStack } from '../../../components/TabStack';
import { t } from '../../../lib/i18n';

export default function Layout() {
  return <TabStack screen="compare" title={t("Head-to-Head")} tone="sand" />;
}
