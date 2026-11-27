import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { lazyTab } from '../../../components/LazyTab';
import { SectionSwitch } from '../../../components/SectionSwitch';
import { HolidaysScreen } from '../(holidays)/holidays';
import { InsightsScreen } from '../(insights)/insights';

/** iPhone and Duo: Holidays and Insights share the Plan button in the rail. */
function PlanScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const [section, setSection] = useState<'holidays' | 'insights'>(
    params.section === 'insights' ? 'insights' : 'holidays'
  );
  React.useEffect(() => {
    if (params.section === 'holidays' || params.section === 'insights') setSection(params.section);
  }, [params.section]);
  return (
    <SectionSwitch
      value={section}
      onChange={setSection}
      sections={[
        { key: 'holidays', label: 'Holiday dates', render: () => <HolidaysScreen /> },
        { key: 'insights', label: 'Guest insights', render: () => <InsightsScreen /> },
      ]}
    />
  );
}

export default lazyTab(PlanScreen);
