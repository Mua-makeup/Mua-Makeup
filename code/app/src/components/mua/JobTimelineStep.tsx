import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookingStatusType } from '@/services/booking.service';

interface Props {
  currentStatus: BookingStatusType;
}

interface StepItem {
  key: BookingStatusType;
  label: string;
  icon: string;
  stepNum: number;
}

const STEPS: StepItem[] = [
  { key: 'ON_THE_WAY', label: 'Di chuyển', icon: 'navigate', stepNum: 1 },
  { key: 'ARRIVED', label: 'Tới nơi', icon: 'location', stepNum: 2 },
  { key: 'IN_PROGRESS', label: 'Trang điểm', icon: 'sparkles', stepNum: 3 },
  { key: 'COMPLETED', label: 'Hoàn thành', icon: 'checkmark-circle', stepNum: 4 },
];

export const JobTimelineStep: React.FC<Props> = ({ currentStatus }) => {
  const getStepIndex = (status: BookingStatusType): number => {
    switch (status) {
      case 'ACCEPTED':
      case 'AGENCY_ASSIGNED':
        return 0; // Chưa bắt đầu nấc 1
      case 'ON_THE_WAY':
        return 1;
      case 'ARRIVED':
        return 2;
      case 'IN_PROGRESS':
        return 3;
      case 'COMPLETED':
      case 'PAID_OUT':
        return 4;
      default:
        return 0;
    }
  };

  const activeIndex = getStepIndex(currentStatus);

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {STEPS.map((step, index) => {
          const isPassed = step.stepNum < activeIndex;
          const isCurrent = step.stepNum === activeIndex;
          const isUpcoming = step.stepNum > activeIndex;

          return (
            <React.Fragment key={step.key}>
              {/* Connector line between steps */}
              {index > 0 && (
                <View
                  style={[
                    styles.line,
                    isPassed || isCurrent ? styles.lineActive : styles.lineInactive,
                  ]}
                />
              )}

              {/* Step Circle & Label */}
              <View style={styles.stepNode}>
                <View
                  style={[
                    styles.circle,
                    isPassed && styles.circlePassed,
                    isCurrent && styles.circleCurrent,
                    isUpcoming && styles.circleUpcoming,
                  ]}
                >
                  <Ionicons
                    name={isPassed ? 'checkmark' : (step.icon as any)}
                    size={14}
                    color={isPassed || isCurrent ? '#FFFFFF' : '#94A3B8'}
                  />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isCurrent && styles.stepLabelCurrent,
                    isPassed && styles.stepLabelPassed,
                  ]}
                >
                  {step.label}
                </Text>
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
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginVertical: 10,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepNode: {
    alignItems: 'center',
    width: 68,
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  circlePassed: {
    backgroundColor: '#10B981',
  },
  circleCurrent: {
    backgroundColor: '#E11D48',
    borderWidth: 2,
    borderColor: '#FFE4E6',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  circleUpcoming: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  line: {
    flex: 1,
    height: 3,
    marginBottom: 20,
    borderRadius: 2,
  },
  lineActive: {
    backgroundColor: '#10B981',
  },
  lineInactive: {
    backgroundColor: '#E2E8F0',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
  },
  stepLabelCurrent: {
    fontWeight: '700',
    color: '#E11D48',
  },
  stepLabelPassed: {
    fontWeight: '600',
    color: '#059669',
  },
});
