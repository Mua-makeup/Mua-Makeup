import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  PanResponder,
  Keyboard,
} from 'react-native';
import { usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { supportService, AiChatMessage } from '@/services/support.service';
import { parseApiError } from '@/utils/error';

const BUBBLE_SIZE = 54;

const QUICK_PROMPTS = [
  'Đặt lịch khẩn cấp 30s',
  'Chính sách tiền cọc',
  'Quy định hoàn tiền',
  'Quy trình khiếu nại',
];

export function FloatingAiAssistantBubble() {
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | undefined>(undefined);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      role: 'ASSISTANT',
      content:
        'Xin chào! Tôi có thể hỗ trợ gì cho bạn về cách sử dụng ứng dụng, đặt lịch hẹn, chính sách tiền cọc và hoàn tiền?',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Vị trí kéo trượt của bong bóng chat
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const isDragging = useRef(false);

  // Lắng nghe bàn phím để tự động đẩy khung pop-up lên không bị che khuất
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Tự động cuộn xuống cuối khi có tin nhắn mới hoặc khi bàn phím bật lên
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 120);
    }
  }, [messages, isLoading, isOpen, keyboardHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3;
      },
      onPanResponderGrant: () => {
        isDragging.current = false;
        pan.extractOffset();
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4) {
          isDragging.current = true;
        }
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        // Nếu chỉ chạm nhẹ (< 6px) thì đó là thao tác mở chat
        if (!isDragging.current || (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6)) {
          setIsOpen(true);
        }
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
      },
    })
  ).current;

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
        content: `Kết nối gián đoạn (${parsed.message || 'Lỗi mạng'}). Vui lòng thử lại.`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Không hiển thị khi ở màn hình auth
  if (
    !pathname ||
    pathname.includes('support-chat') ||
    pathname.includes('(auth)') ||
    pathname.includes('login') ||
    pathname.includes('register')
  ) {
    return null;
  }

  const popupWidth = Math.min(width - 32, 350);
  const currentPopupHeight =
    keyboardHeight > 0
      ? Math.min(height - keyboardHeight - 90, 390)
      : Math.min(height * 0.65, 480);
  const currentBottom =
    keyboardHeight > 0
      ? keyboardHeight + 12
      : Platform.OS === 'ios'
      ? 95
      : 80;

  return (
    <>
      {isOpen ? (
        /* Cửa sổ Pop-up Chat ở góc (Tự nâng lên khi mở bàn phím) */
        <View
          style={[
            styles.popupWrapper,
            {
              bottom: currentBottom,
              width: popupWidth,
              height: currentPopupHeight,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.popupCard}>
            {/* Header Basic */}
            <View style={styles.popupHeader}>
              <View>
                <Text style={styles.headerTitle}>Hỗ trợ trực tuyến</Text>
                <Text style={styles.headerSubtitle}>Trực tuyến 24/7</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setIsOpen(false);
                }}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Text style={styles.closeBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>

            {/* Danh sách tin nhắn */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messageList}
              contentContainerStyle={styles.messageListContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {/* Gợi ý câu hỏi nhanh (Basic) */}
              <View style={styles.quickPromptsContainer}>
                <Text style={styles.quickPromptTitle}>Chủ đề gợi ý:</Text>
                <View style={styles.quickPromptsWrap}>
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.quickPromptChip}
                      onPress={() => handleSend(prompt)}
                      disabled={isLoading}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickPromptChipText}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {messages.map((item, index) => {
                const isUser = item.role === 'USER';
                return (
                  <View
                    key={index}
                    style={[
                      styles.messageRow,
                      isUser ? styles.messageRowUser : styles.messageRowAssistant,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
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

              {isLoading && (
                <View style={[styles.messageRow, styles.messageRowAssistant]}>
                  <View style={[styles.messageBubble, styles.bubbleAssistant]}>
                    <Text style={styles.loadingText}>Đang trả lời...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Ô nhập tin nhắn */}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Nhập câu hỏi..."
                placeholderTextColor="#94A3B8"
                editable={!isLoading}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
                ]}
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendBtnText}>Gửi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        /* Bong bóng chat tròn, kéo trượt di chuyển mượt mà khắp màn hình */
        <Animated.View
          style={[
            styles.bubbleContainer,
            {
              transform: pan.getTranslateTransform(),
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.bubbleButton}>
            <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
          </View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bubbleContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 95 : 80,
    right: 18,
    zIndex: 9999,
    elevation: 10,
  },
  bubbleButton: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  popupWrapper: {
    position: 'absolute',
    right: 16,
    zIndex: 9999,
    elevation: 10,
    alignItems: 'flex-end',
  },
  popupCard: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  messageList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messageListContent: {
    padding: 12,
    paddingBottom: 16,
  },
  quickPromptsContainer: {
    marginBottom: 12,
  },
  quickPromptTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  quickPromptsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickPromptChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  quickPromptChipText: {
    fontSize: 11,
    color: '#334155',
  },
  messageRow: {
    marginBottom: 10,
    maxWidth: '85%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  messageRowAssistant: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleUser: {
    backgroundColor: '#0F172A',
  },
  bubbleAssistant: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTextAssistant: {
    color: '#1E293B',
  },
  loadingText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748B',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#0F172A',
    maxHeight: 80,
  },
  sendBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
