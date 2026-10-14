import { apiClient } from './api';
import { ApiResponse } from './auth.service';
import { createImageFormData } from '@/utils/form-data';

export interface ReportEmergencyBusyReq {
  emergencyReason: string;
  proofDocumentUrl?: string;
  proofImageUri?: string;
}

export type OvertimeReasonType = 'PRESET_RULE' | 'OTHER_CUSTOM_REASON';

export interface SubmitOvertimeReportReq {
  bookingId: number;
  overtimeMinutes: number;
  reasonType: OvertimeReasonType;
  ruleId?: number;
  explanationText: string;
  proofImageUrl?: string;
}

export interface OvertimeRuleItem {
  id: number;
  ruleName: string;
  minOvertimeMinutes: number;
  maxOvertimeMinutes?: number;
  penaltyType: 'PERCENT_COMMISSION' | 'FIXED_AMOUNT' | 'WARNING_ONLY';
  penaltyValue: number;
  isActive: boolean;
}

export interface OvertimeReportItem {
  id: number;
  bookingId: number;
  bookingCode?: string;
  staffId: number;
  agencyId: number;
  overtimeMinutes: number;
  reasonType: OvertimeReasonType;
  ruleId?: number;
  explanationText: string;
  proofImageUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adjudicationNote?: string;
  penaltyTypeApplied?: string;
  penaltyAmountApplied?: number;
  createdAt: string;
}

export interface StaffShiftItem {
  id: number;
  agencyId: number;
  staffId: number;
  dayOfWeek?: number;
  workDate?: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  isActive: boolean;
}

export const agencyStaffService = {
  /**
   * Thợ xác nhận tiếp nhận ca điều phối (hỗ trợ theo bookingId hoặc assignmentId)
   */
  async confirmAssignment(id: number, by: 'booking' | 'assignment' = 'booking'): Promise<void> {
    const endpoint = by === 'assignment'
      ? `/agency/dispatch/assignments/${id}/confirm`
      : `/agency/dispatch/bookings/${id}/confirm-assignment`;
    await apiClient.post(endpoint);
  },

  /** Alias xác nhận theo mã đơn đặt lịch */
  async confirmAssignmentByBooking(bookingId: number): Promise<void> {
    return this.confirmAssignment(bookingId, 'booking');
  },

  /**
   * Thợ từ chối tiếp nhận ca điều phối hoặc từ chối đôn lên làm thợ chính
   */
  async declineAssignmentByBooking(bookingId: number, reason?: string): Promise<void> {
    await apiClient.post(`/agency/dispatch/bookings/${bookingId}/decline-assignment`, null, {
      params: reason ? { reason } : undefined,
    });
  },

  /**
   * Thợ báo bận khẩn cấp (tai nạn, ốm đau) kèm lý do và ảnh minh chứng qua FormData
   */
  async reportEmergencyBusy(bookingId: number, req: ReportEmergencyBusyReq | FormData): Promise<void> {
    if (req instanceof FormData || (req && typeof (req as any).append === 'function')) {
      await apiClient.post(`/agency/dispatch/bookings/${bookingId}/report-emergency-busy`, req);
      return;
    }

    const formData = req.proofImageUri
      ? await createImageFormData(req.proofImageUri, 'file', `emergency_${Date.now()}.jpg`)
      : new FormData();

    formData.append('emergencyReason', req.emergencyReason);
    if (req.proofDocumentUrl) {
      formData.append('proofDocumentUrl', req.proofDocumentUrl);
    }

    await apiClient.post(`/agency/dispatch/bookings/${bookingId}/report-emergency-busy`, formData);
  },

  /**
   * Nộp báo cáo giải trình ca làm bị kéo dài quá thời lượng dự kiến
   */
  async submitOvertimeReport(req: SubmitOvertimeReportReq): Promise<OvertimeReportItem> {
    const res = await apiClient.post<ApiResponse<OvertimeReportItem>>('/agency/overtime-reports', req);
    return res.data.data;
  },

  /**
   * Tra cứu danh sách quy chế làm thêm giờ của Studio
   */
  async getAgencyOvertimeRules(): Promise<OvertimeRuleItem[]> {
    try {
      const res = await apiClient.get<ApiResponse<OvertimeRuleItem[]>>('/agency/overtime-rules');
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Xem danh sách các báo cáo giải trình quá giờ của mình
   */
  async getMyOvertimeReports(): Promise<OvertimeReportItem[]> {
    try {
      const res = await apiClient.get<ApiResponse<{ content?: OvertimeReportItem[] } | OvertimeReportItem[]>>(
        '/agency/overtime-reports'
      );
      const data = res.data?.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as any).content)) return (data as any).content;
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Lấy danh sách ca làm việc theo tuần của nhân viên Studio
   */
  async getMyStaffShifts(staffId: number): Promise<StaffShiftItem[]> {
    try {
      const res = await apiClient.get<ApiResponse<StaffShiftItem[]>>(`/agencies/shifts/staff/${staffId}`);
      return res.data?.data || [];
    } catch {
      return [];
    }
  },
};
