'use client';

import { FiTarget } from 'react-icons/fi';
import MockExamsManagementPanel from './MockExamsManagementPanel';
import OfficialExamShowcasePanel from './OfficialExamShowcasePanel';
import { ADM } from './adminModuleLayout';

export default function ExamsAdminModule() {
  return (
    <div className={ADM.root}>
      <div>
        <h2 className={ADM.h2}>
          <span className="inline-flex items-center gap-2">
            <FiTarget className="h-5 w-5 text-cptb-gold" />
            Examens blancs & officiels
          </span>
        </h2>
        <p className={ADM.intro}>
          Préparez les épreuves (BEPC, BAC et autres), publiez les questionnaires et suivez les
          sessions. Les notes peuvent compter dans l’évaluation si vous l’activez. Les taux
          d’admission officiels et le palmarès de l’accueil se règlent ci-dessous.
        </p>
      </div>
      <OfficialExamShowcasePanel />
      <MockExamsManagementPanel mode="admin" />
    </div>
  );
}
