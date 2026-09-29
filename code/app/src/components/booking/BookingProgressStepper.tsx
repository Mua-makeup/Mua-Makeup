import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { websocketService } from '@/services/websocket.service';

interface Props {
  bookingId: number;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  isCompact?: boolean;
}

interface StepItem {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeColor: string;
  activeBg: string;
}

const STEPS: StepItem[] = [
  {
    key: 'ON_THE_WAY',
    title: 'Đang Tới',
    icon: 'bicycle',
    activeColor: '#2563EB',
    activeBg: '#DBEAFE',
  },
  {
    key: 'ARRIVED',
    title: 'Đã Đến',
    icon: 'location',
    activeColor: '#D97706',
    activeBg: '#FEF3C7',
  },
  {
    key: 'IN_PROGRESS',
    title: 'Trang Điểm',
    icon: 'sparkles',
    activeColor: '#E11D48',
    activeBg: '#FFE4E6',
  },
  {
    key: 'COMPLETED',
    title: 'Hoàn Tất',
    icon: 'checkmark-circle',
    activeColor: '#059669',
    activeBg: '#D1FAE5',
  },
];

const STATUS_RANK: Record<string, number> = {
  REQUESTED: 0,
  CONFIRMED: 0,
  ACCEPTED: 0,
  ON_THE_WAY: 1,
  ARRIVED: 2,
  IN_PROGRESS: 3,
  COMPLETED: 4,
};

export const BookingProgressStepper: React.FC<Props> = ({
  bookingId,
  currentStatus: initialStatus,
  onStatusChange,
  isCompact = false,
}) => {
  const [status, setStatus] = useState<string>(initialStatus);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (!bookingId) return;

    let isSubscribed = true;
    const topic = `/topic/booking-status/${bookingId}`;

    const setupSubscription = async () => {
      try {
        await websocketService.connect();
        if (!isSubscribed) return;

        websocketService.subscribe(topic, (msg: any) => {
          const nextStatus = msg?.currentStatus || msg?.status;
          if (nextStatus) {
            setStatus(nextStatus);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (onStatusChange) {
              onStatusChange(nextStatus);
            }
          }
        });
      } catch (err) {
        console.warn('[BookingProgressStepper] Lỗi subscribe STOMP:', err);
      }
    };

    setupSubscription();

    return () => {
      isSubscribed = false;
      websocketService.unsubscribe(topic);
    };
  }, [bookingId]);

  const currentRank = STATUS_RANK[status] || 0;

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      <View style={styles.stepRow}>
        {STEPS.map((step, index) => {
          const stepRank = index + 1;
          const isDone = currentRank > stepRank;
          const isCurrent = currentRank === stepRank;
          const isPending = currentRank < stepRank;

          const circleColor = isDone
            ? '#059669'
            : isCurrent
            ? step.activeColor
            : '#94A3B8';

          const circleBg = isDone
            ? '#D1FAE5'
            : isCurrent
            ? step.activeBg
            : '#F1F5F9';

          return (
            <React.Fragment key={step.key}>
              {/* Connector line between steps */}
              {index > 0 && (
                <View
                  style={[
                    styles.connectorLine,
                    isDone || isCurrent ? styles.connectorActive : styles.connectorInactive,
                  ]}
                />
              )}

              {/* Step Icon Node */}
              <View style={styles.stepNode}>
                <View
                  style={[
                    styles.stepCircle,
                    { borderColor: circleColor, backgroundColor: circleBg },
                    isCurrent && styles.stepCircleActive,
                  ]}
                >
                  <Ionicons
                    name={isDone ? 'checkmark' : step.icon}
                    size={isCompact ? 12 : 15}
                    color={circleColor}
                  />
                </View>
                {!isCompact && (
                  <Text
                    style={[
                      styles.stepLabel,
                      isCurrent && { color: step.activeColor, fontWeight: '800' },
                      isDone && { color: '#059669', fontWeight: '700' },
                      isPending && { color: '#94A3B8' },
                    ]}
                  >
                    {step.title}
                  </Text>
                )}
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 6,
  },
  containerCompact: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 0,
    backgroundColor: 'transparent',
    marginVertical: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectorLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  connectorActive: {
    backgroundColor: '#10B981',
  },
  connectorInactive: {
    backgroundColor: '#E2E8F0',
  },
  stepNode: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    transform: [{ scale: 1.1 }],
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  stepLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
});
