import { apiClient } from './api';

export interface CalendarDayOverview {
  date: string; // YYYY-MM-DD
  day_of_week: string; // Thứ 2, Thứ 3...
  is_fully_booked: boolean;
  available_slots_count: number;
}

export interface SurgeSlotInfo {
  has_surge: boolean;
  rule_name: string | null;
  multiplier: number;
  surcharge_type: string | null;
  surcharge_amount: number;
}

export interface TimeSlotItem {
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  is_available: boolean;
  is_buffer_blocked?: boolean;
  unavailable_reason?: string | null;
  is_recommended?: boolean;
  badge_label?: string | null;
  surge_info?: SurgeSlotInfo | null;
}

export interface AvailableSlotsResponse {
  mua_id: number;
  booking_date: string;
  duration_minutes: number;
  step_minutes: number;
  slots: TimeSlotItem[];
}

export const muaCalendarService = {
  /**
   * Lấy danh sách tổng quan 30 ngày (đánh dấu ngày kín lịch / số ca rảnh)
   */
  async getCalendarDays(
    muaId: number,
    startDate?: string,
    days: number = 30,
    durationMinutes: number = 60
  ): Promise<CalendarDayOverview[]> {
    const res = await apiClient.get<{ success: boolean; data: CalendarDayOverview[] }>(
      `/mua/${muaId}/calendar-days`,
      {
        params: {
          start_date: startDate,
          days,
          duration_minutes: durationMinutes,
        },
      }
    );
    return res.data.data;
  },

  /**
   * Lấy danh sách các khung giờ theo bước trượt 15 phút (kèm thông tin va chạm, liền ca, phụ phí DB)
   */
  async getAvailableSlots(
    muaId: number,
    date: string,
    durationMinutes: number = 60,
    stepMinutes: number = 15
  ): Promise<AvailableSlotsResponse> {
    const res = await apiClient.get<{ success: boolean; data: AvailableSlotsResponse }>(
      `/mua/${muaId}/available-slots`,
      {
        params: {
          date,
          duration_minutes: durationMinutes,
          step_minutes: stepMinutes,
        },
      }
    );
    return res.data.data;
  },

  /**
   * Lấy danh sách tổng quan ngày của Agency Studio
   */
  async getAgencyCalendarDays(
    agencyId: number,
    startDate?: string,
    days: number = 30,
    durationMinutes: number = 60
  ): Promise<CalendarDayOverview[]> {
    const res = await apiClient.get<{ success: boolean; data: CalendarDayOverview[] }>(
      `/agencies/${agencyId}/calendar-days`,
      {
        params: {
          start_date: startDate,
          days,
          duration_minutes: durationMinutes,
        },
      }
    );
    return res.data.data;
  },

  /**
   * Lấy danh sách khung giờ khả dụng theo năng lực của Studio
   */
  async getAgencyAvailableSlots(
    agencyId: number,
    date: string,
    durationMinutes: number = 60,
    stepMinutes: number = 15
  ): Promise<AvailableSlotsResponse> {
    const res = await apiClient.get<{ success: boolean; data: AvailableSlotsResponse }>(
      `/agencies/${agencyId}/available-slots`,
      {
        params: {
          date,
          duration_minutes: durationMinutes,
          step_minutes: stepMinutes,
        },
      }
    );
    return res.data.data;
  },

  /**
   * Khóa khung giờ bận cá nhân của thợ (chống bị gán đơn trùng giờ)
   */
  async blockPersonalSlot(req: { booking_date: string; start_time: string; end_time: string; reason?: string }): Promise<any> {
    const res = await apiClient.post('/freelancer/calendar/block', req);
    return res.data?.data;
  },

  /**
   * Lấy danh sách các khung giờ bận cá nhân thợ đã khóa
   */
  async getMyBlockedSlots(fromDate?: string): Promise<BlockedSlotItem[]> {
    const res = await apiClient.get<{ success: boolean; data: any[] }>(
      '/freelancer/calendar/my-blocks',
      {
        params: { fromDate },
      }
    );
    const rawList = res.data?.data || [];
    return rawList.map((item: any) => {
      const id = item.calendar_id ?? item.calendarId ?? item.id;
      const bDate = item.booking_date ?? item.bookingDate ?? '';
      const start = item.start_at ?? item.startAt ?? item.start_time ?? item.startTime ?? '';
      const end = item.end_at ?? item.endAt ?? item.end_time ?? item.endTime ?? '';
      const startTime = start.includes('T') ? start.slice(11, 16) : (start ? start.slice(0, 5) : '--:--');
      const endTime = end.includes('T') ? end.slice(11, 16) : (end ? end.slice(0, 5) : '--:--');

      return {
        id,
        calendar_id: id,
        muaId: item.mua_id ?? item.muaId,
        mua_id: item.mua_id ?? item.muaId,
        bookingId: item.booking_id ?? item.bookingId,
        bookingDate: bDate,
        booking_date: bDate,
        startAt: start,
        start_at: start,
        endAt: end,
        end_at: end,
        startTime,
        endTime,
        isLocked: item.is_locked ?? item.isLocked ?? true,
        is_locked: item.is_locked ?? item.isLocked ?? true,
        slotType: item.slot_type ?? item.slotType ?? 'PERSONAL_BLOCKED',
        slot_type: item.slot_type ?? item.slotType ?? 'PERSONAL_BLOCKED',
        reason: item.reason || 'Bận việc cá nhân',
      };
    });
  },

  /**
   * Mở lại khung giờ bận cá nhân đã khóa
   */
  async unblockPersonalSlot(calendarId: number): Promise<void> {
    await apiClient.delete(`/freelancer/calendar/block/${calendarId}`);
  },
};

export interface BlockedSlotItem {
  id: number;
  calendar_id: number;
  muaId?: number;
  mua_id?: number;
  bookingId?: number | null;
  slotType?: string;
  slot_type?: string;
  booking_date: string;
  bookingDate: string;
  start_at: string;
  startAt: string;
  end_at: string;
  endAt: string;
  startTime?: string;
  endTime?: string;
  isLocked: boolean;
  is_locked: boolean;
  reason: string;
}


