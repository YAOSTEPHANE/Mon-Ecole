'use client';

import AttendanceClassPeriodDashboard from './AttendanceClassPeriodDashboard';

type AttendanceStatisticsPanelProps = {
  onOpenAbsences?: () => void;
};

/** Panneau statistiques — délègue au tableau de bord par classe et période. */
export default function AttendanceStatisticsPanel(props: AttendanceStatisticsPanelProps) {
  return <AttendanceClassPeriodDashboard {...props} />;
}
