import api from './client';
import { normalizeRole, type AppRole } from '../lib/roles';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export type PaymentRow = {
  id: string;
  status: PaymentStatus | string;
  amount: number;
  paymentMethod: string;
  paymentProvider?: string | null;
  checkoutUrl?: string | null;
  receiptUrl?: string | null;
  receiptNumber?: string | null;
  paymentReference?: string | null;
  paidAt?: string | null;
  transactionId?: string | null;
  ussdHint?: string | null;
};

export type TuitionFeeRow = {
  id: string;
  period?: string | null;
  academicYear?: string | null;
  amount: number;
  totalPaid?: number;
  remainingAmount: number;
  dueDate?: string | Date;
  paymentProgress?: number;
  isPaid?: boolean;
};

export type PaymentSettings = {
  defaultCountryCode: string;
};

function getPaymentRolePrefix(role: AppRole): '/parent' | '/student' {
  const r = normalizeRole(role);
  if (r === 'PARENT') return '/parent';
  if (r === 'STUDENT') return '/student';
  throw new Error(`Rôle non supporté pour Paiements: ${role}`);
}

export async function getPaymentSettings(role: AppRole): Promise<PaymentSettings> {
  const prefix = getPaymentRolePrefix(role);
  const { data } = await api.get(`${prefix}/payment-settings`);
  const defaultCountryCode =
    typeof data?.defaultCountryCode === 'string' ? data.defaultCountryCode : '225';
  return { defaultCountryCode };
}

export type ParentChildRow = {
  studentId: string;
  relation?: string;
  student?: {
    user?: { firstName?: string; lastName?: string };
  };
} & Record<string, unknown>;

export async function listChildren(): Promise<ParentChildRow[]> {
  const { data } = await api.get('/parent/children');
  return Array.isArray(data) ? (data as ParentChildRow[]) : [];
}

export async function listTuitionFeesForChild(studentId: string): Promise<TuitionFeeRow[]> {
  const { data } = await api.get(`/parent/children/${encodeURIComponent(studentId)}/tuition-fees`);
  return Array.isArray(data) ? (data as TuitionFeeRow[]) : [];
}

export async function listTuitionFeesForStudent(): Promise<TuitionFeeRow[]> {
  const { data } = await api.get('/student/tuition-fees');
  return Array.isArray(data) ? (data as TuitionFeeRow[]) : [];
}

export type MobileMoneyOperator = 'WAVE' | 'ORANGE' | 'MTN';

export async function createMobileMoneyPaymentForParent(params: {
  studentId: string;
  tuitionFeeId: string;
  amount: number;
  phoneNumber: string;
  operator: MobileMoneyOperator;
}) {
  const { studentId, tuitionFeeId, amount, phoneNumber, operator } = params;
  const { data } = await api.post(`/parent/children/${encodeURIComponent(studentId)}/payments`, {
    tuitionFeeId,
    paymentMethod: 'MOBILE_MONEY',
    amount,
    phoneNumber,
    operator,
  });
  return data as {
    payment: PaymentRow & { id: string };
    checkoutUrl?: string | null;
    provider?: string | null;
    mode?: 'live' | 'sandbox' | string;
    ussdHint?: string | null;
    message?: string;
  };
}

export async function createMobileMoneyPaymentForStudent(params: {
  tuitionFeeId: string;
  amount: number;
  phoneNumber: string;
  operator: MobileMoneyOperator;
}) {
  const { tuitionFeeId, amount, phoneNumber, operator } = params;
  const { data } = await api.post('/student/payments', {
    tuitionFeeId,
    paymentMethod: 'MOBILE_MONEY',
    amount,
    phoneNumber,
    operator,
  });
  return data as {
    payment: PaymentRow & { id: string };
    checkoutUrl?: string | null;
    provider?: string | null;
    mode?: 'live' | 'sandbox' | string;
    ussdHint?: string | null;
    message?: string;
  };
}

export async function getPaymentForParent(params: { studentId: string; paymentId: string }) {
  const { studentId, paymentId } = params;
  const { data } = await api.get(
    `/parent/children/${encodeURIComponent(studentId)}/payments/${encodeURIComponent(paymentId)}`,
  );
  return data as PaymentRow;
}

export async function getPaymentForStudent(params: { paymentId: string }) {
  const { paymentId } = params;
  const { data } = await api.get(`/student/payments/${encodeURIComponent(paymentId)}`);
  return data as PaymentRow;
}

