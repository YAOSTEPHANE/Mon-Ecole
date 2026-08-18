import type { AppBrandingPayload } from '@/contexts/AppBrandingContext';
import { resolveUploadFetchUrl } from '@/lib/uploadsPublicUrl';
import {
  generateSchoolReportCardPdf,
  SCHOOL_REPORT_CARD_DEFAULT_BRANDING,
  type ReportCardStudentPayload,
} from '@/lib/schoolReportCardPdf';

export type OfficialReportCardResponse = {
  student: ReportCardStudentPayload;
  periodKey: string;
  periodLabel: string;
  academicYear: string;
  comments: string | null;
  logoDataUrl: string | null;
  reportCardId: string;
};

export function pdfBrandingFromApp(
  branding: AppBrandingPayload,
  opts: {
    logoDataUrl?: string | null;
    navigationLogoAbsolute?: string | null;
    loginLogoAbsolute?: string | null;
  },
) {
  return {
    schoolName:
      branding.schoolDisplayName?.trim() || SCHOOL_REPORT_CARD_DEFAULT_BRANDING.schoolName,
    schoolPhone:
      branding.schoolPhone?.trim() || SCHOOL_REPORT_CARD_DEFAULT_BRANDING.schoolPhone,
    schoolAddress:
      branding.schoolAddress?.trim() || SCHOOL_REPORT_CARD_DEFAULT_BRANDING.schoolAddress,
    schoolEmail:
      branding.schoolEmail?.trim() || SCHOOL_REPORT_CARD_DEFAULT_BRANDING.schoolEmail,
    schoolCode:
      branding.schoolCode?.trim() || SCHOOL_REPORT_CARD_DEFAULT_BRANDING.schoolCode,
    principalName: branding.schoolPrincipal?.trim() || '',
    studiesDirectorName: branding.studiesDirectorName?.trim() || '',
    logoDataUrl: opts.logoDataUrl ?? null,
    logoAbsoluteUrl:
      resolveUploadFetchUrl(opts.navigationLogoAbsolute || opts.loginLogoAbsolute) ??
      opts.navigationLogoAbsolute ??
      opts.loginLogoAbsolute ??
      null,
    city:
      branding.schoolAddress?.trim().split(',')[0]?.trim() ||
      SCHOOL_REPORT_CARD_DEFAULT_BRANDING.city,
  };
}

export async function downloadOfficialReportCardPdf(
  payload: OfficialReportCardResponse,
  branding: AppBrandingPayload,
  logos: { navigationLogoAbsolute: string | null; loginLogoAbsolute: string | null },
): Promise<void> {
  await generateSchoolReportCardPdf(payload.student, {
    periodLabel: payload.periodLabel,
    periodKey: payload.periodKey,
    academicYear: payload.academicYear,
    branding: pdfBrandingFromApp(branding, {
      logoDataUrl: payload.logoDataUrl,
      navigationLogoAbsolute: logos.navigationLogoAbsolute,
      loginLogoAbsolute: logos.loginLogoAbsolute,
    }),
  });
}
