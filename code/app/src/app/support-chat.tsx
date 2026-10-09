import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandColors } from '@/constants/theme';
import { supportService, AiChatMessage } from '@/services/support.service';
import { parseApiError } from '@/utils/error';

const QUICK_PROMPTS = [
  '⚡ Đặt lịch khẩn cấp 30s',
  '💰 Chính sách tiền cọc Escrow',
  '🔄 Quy định hủy & hoàn tiền',
  '⚠️ Quy trình khiếu nại dịch vụ',
  '💄 Các phong cách make-up hot',
];

export default function SupportChatScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const [sessionCode, setSessionCode] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      role: 'ASSISTANT',
      content:
        'Dạ em chào anh/chị! Em là Trợ lý AI chuyên trách của Mua-Makeup ✨ Em có thể hỗ trợ giải đáp mọi thắc mắc về cách sử dụng app, đặt lịch hẹn trước, đặt ca khẩn cấp 30s, biểu phí và chính sách cọc hoàn tiền ạ. Anh/chị cần em hỗ trợ gì hôm nay ạ?',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Tự động scroll xuống cuối khi có tin nhắn mới
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMessage: AiChatMessage = {
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await supportService.sendMessage({
        message: text,
        sessionCode: sessionCode,
      });

      if (response.sessionCode) {
        setSessionCode(response.sessionCode);
      }

      const assistantMessage: AiChatMessage = {
        role: 'ASSISTANT',
        content: response.reply,
        createdAt: response.timestamp || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const parsed = parseApiError(err);
      const errorMessage: AiChatMessage = {
        role: 'ASSISTANT',
        content: `Dạ kết nối với hệ thống AI gặp gián đoạn (${parsed.message || 'Lỗi mạng'}). Anh/chị vui lòng thử lại nhé!`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Cao Cấp */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={BrandColors.slateHeading} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="sparkles" size={16} color={BrandColors.primary} />
            <Text style={styles.headerTitle}>Trợ Lý Mua-Makeup</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Trực tuyến 24/7 • Tra cứu chính sách</Text>
          </View>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Danh Sách Tin Nhắn */}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageScroll}
          contentContainerStyle={styles.messageScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Gợi Ý Nhanh Ban Đầu */}
          <View style={styles.suggestionContainer}>
            <Text style={styles.suggestionTitle}>Gợi ý chủ đề thường gặp:</Text>
            <View style={styles.chipRow}>
              {QUICK_PROMPTS.map((prompt, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.chip}
                  onPress={() => handleSend(prompt.replace(/^[^\s]+\s/, ''))}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <Text style={styles.chipText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Render Tin Nhắn */}
          {messages.map((item, index) => {
            const isUser = item.role === 'USER';
            return (
              <View
                key={index}
                style={[
                  styles.messageWrapper,
                  isUser ? styles.messageWrapperUser : styles.messageWrapperAssistant,
                ]}
              >
                {!isUser && (
                  <View style={styles.botAvatarCircle}>
                    <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                  </View>
                )}

                <View
                  style={[
                    styles.bubble,
                    isUser ? styles.bubbleUser : styles.bubbleAssistant,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isUser ? styles.messageTextUser : styles.messageTextAssistant,
                    ]}
                  >
                    {item.content}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <View style={[styles.messageWrapper, styles.messageWrapperAssistant]}>
              <View style={styles.botAvatarCircle}>
                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              </View>
              <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
                <ActivityIndicator size="small" color={BrandColors.primary} />
                <Text style={styles.typingText}>Trợ lý AI đang tra cứu chính sách...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Thanh Nhập Liệu */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Hỏi về đặt lịch, hoàn cọc, dịch vụ..."
            placeholderTextColor={BrandColors.slatePlaceholder}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.success,
  },
  statusText: {
    fontSize: 11,
    color: BrandColors.slateMuted,
  },
  container: {
    flex: 1,
    backgroundColor: BrandColors.canvasBg,
  },
  messageScroll: {
    flex: 1,
  },
  messageScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  suggestionContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  suggestionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.slateMuted,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: BrandColors.subtle,
    borderWidth: 1,
    borderColor: BrandColors.softBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: BrandColors.primary,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  messageWrapperUser: {
    justifyContent: 'flex-end',
  },
  messageWrapperAssistant: {
    justifyContent: 'flex-start',
  },
  botAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: BrandColors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTextAssistant: {
    color: BrandColors.slateHeading,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: BrandColors.slateHeading,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
