'use client';

import ReenrollmentRequestsPanel from '../enrollment/ReenrollmentRequestsPanel';
import { parentApi } from '../../services/api';
import Card from '../ui/Card';

type Props = {
  studentId: string;
};

export default function ChildReenrollment({ studentId }: Props) {
  return (
    <Card className="border border-violet-200/80 p-4 sm:p-5">
      <ReenrollmentRequestsPanel
        mode="parent"
        queryKey={['parent-reenrollment-requests', studentId]}
        fetchRequests={() => parentApi.getChildReenrollmentRequests(studentId)}
        fetchOptions={() => parentApi.getChildReenrollmentOptions(studentId)}
        createRequest={(payload) => parentApi.createChildReenrollmentRequest(studentId, payload)}
        cancelRequest={(id) => parentApi.cancelChildReenrollmentRequest(studentId, id)}
      />
    </Card>
  );
}
