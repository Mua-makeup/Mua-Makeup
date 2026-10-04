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
};
