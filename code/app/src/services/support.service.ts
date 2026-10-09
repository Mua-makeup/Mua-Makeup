import { apiClient } from './api';

export interface AiChatRequest {
  message: string;
  sessionCode?: string;
}

export interface AiChatResponse {
  sessionCode: string;
  reply: string;
  role: string;
  timestamp: string;
  relevantTopics?: string[];
}

export interface AiChatMessage {
  id?: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export interface AiChatSessionHistoryResponse {
  sessionCode: string;
  createdAt: string;
  messages: AiChatMessage[];
}

export const supportService = {
  /**
   * Gửi tin nhắn hỏi đáp tới Trợ lý AI CSKH Mua-Makeup
   */
  async sendMessage(request: AiChatRequest): Promise<AiChatResponse> {
    const res = await apiClient.post<{ success: boolean; data: AiChatResponse }>('/support/chat', request);
    return res.data.data;
  },

  /**
   * Lấy lịch sử trò chuyện theo mã phiên
   */
  async getHistory(sessionCode: string): Promise<AiChatSessionHistoryResponse> {
    const res = await apiClient.get<{ success: boolean; data: AiChatSessionHistoryResponse }>(`/support/history/${sessionCode}`);
    return res.data.data;
  },
};
