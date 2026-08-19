'use client';

import ReenrollmentRequestsPanel from '../enrollment/ReenrollmentRequestsPanel';
import { studentApi } from '../../services/api';
import Card from '../ui/Card';

export default function StudentReenrollment() {
  return (
    <Card className="border border-violet-200/80 p-4 sm:p-5">
      <ReenrollmentRequestsPanel
        mode="student"
        queryKey={['student-reenrollment-requests']}
        fetchRequests={studentApi.getReenrollmentRequests}
        fetchOptions={studentApi.getReenrollmentOptions}
        createRequest={studentApi.createReenrollmentRequest}
        cancelRequest={studentApi.cancelReenrollmentRequest}
      />
    </Card>
  );
}
