'use client';

import { FiCalendar } from 'react-icons/fi';
import SchoolCalendarManagement from './SchoolCalendarManagement';
import { ADM } from './adminModuleLayout';

export default function SchoolCalendarAdminModule() {
  return (
    <div className={ADM.root}>
      <div>
        <h2 className={ADM.h2}>
          <span className="inline-flex items-center gap-2">
            <FiCalendar className="h-5 w-5 text-cptb-gold" />
            Calendrier scolaire
          </span>
        </h2>
        <p className={ADM.intro}>
          Jours fériés, vacances, périodes d’examens et réunions — le calendrier officiel de
          l’année, visible aussi depuis la gestion académique.
        </p>
      </div>
      <SchoolCalendarManagement />
    </div>
  );
}
