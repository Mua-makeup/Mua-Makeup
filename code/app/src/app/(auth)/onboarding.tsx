import React, { useState } from 'react';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BaseButton } from '@/components/base/BaseButton';
import { BrandColors } from '@/constants/theme';
import { markOnboardingSeen } from '@/utils/storage';

interface SlideItem {
  id: number;
  badge: string;
  title: string;
  description: string;
  imageUrl: string;
}

const ONBOARDING_SLIDES: SlideItem[] = [
  {
    id: 1,
    badge: 'ĐẶT LỊCH THẦN TỐC',
    title: 'Tìm Thợ Make-up Gần Bạn Trong 30 Giây',
    description:
      'Hệ thống quét thợ rảnh qua định vị GPS thời gian thực. Thợ di chuyển đến tận nhà hoặc phục vụ tại studio.',
    imageUrl:
      'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 2,
    badge: 'ĐA DẠNG PHONG CÁCH',
    title: 'Hàng Trăm Tone Make-up Chuẩn Salon',
    description:
      'Tone Tây sắc sảo, Douyin phát sáng, Cô dâu hoàng gia đến Kỷ yếu thanh xuân. Thoải mái lựa chọn theo sở thích.',
    imageUrl:
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 3,
    badge: 'AN TÂM TUYỆT ĐỐI',
    title: 'Quỹ Cọc Escrow & 100% Thợ Có Chứng Chỉ',
    description:
      'Toàn bộ thợ make-up được kiểm duyệt tay nghề nghiêm ngặt. Tiền cọc giữ trong ví Escrow, chỉ giải ngân khi khách hài lòng.',
    imageUrl:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=800&auto=format&fit=crop',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentSlide = ONBOARDING_SLIDES[currentIndex];
  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  const handleNext = async () => {
    if (isLastSlide) {
      await markOnboardingSeen();
      router.replace('/(auth)/login');
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSkip = async () => {
    await markOnboardingSeen();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header Row */}
        <View style={styles.topRow}>
          <View style={styles.brandGroup}>
            <View style={styles.miniIconBox}>
              <Ionicons name="sparkles" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.brandText}>MUA MAKEUP</Text>
          </View>
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipButtonText}>Bỏ qua →</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Slide Card */}
        <View style={styles.cardContainer}>
          <Image source={{ uri: currentSlide.imageUrl }} style={styles.slideImage} />
          <View style={styles.overlay}>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{currentSlide.badge}</Text>
            </View>
            <Text style={styles.slideTitle}>{currentSlide.title}</Text>
            <Text style={styles.slideDescription}>{currentSlide.description}</Text>
          </View>
        </View>

        {/* Indicators (Dots) */}
        <View style={styles.indicatorRow}>
          {ONBOARDING_SLIDES.map((slide, index) => {
            const isActive = index === currentIndex;
            return (
              <TouchableOpacity
                key={slide.id}
                onPress={() => setCurrentIndex(index)}
                activeOpacity={0.8}
                style={[styles.dot, isActive && styles.activeDot]}
              />
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <BaseButton
            title={isLastSlide ? 'Bắt Đầu Ngay' : 'Tiếp Tục'}
            onPress={handleNext}
          />
          <BaseButton
            title="Tạo Tài Khoản Mới"
            variant="outline"
            showArrow={false}
            onPress={() => router.push('/(auth)/register')}
          />
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.guestLink}>
            <Text style={styles.guestText}>Khám phá trang chủ không cần tài khoản →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.slateHeading,
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.slateMuted,
  },
  cardContainer: {
    flex: 1,
    maxHeight: 440,
    borderRadius: 26,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
    backgroundColor: '#0F172A',
  },
  slideImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 6,
  },
  slideDescription: {
    fontSize: 12.5,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  activeDot: {
    width: 26,
    backgroundColor: BrandColors.primary,
  },
  actionsContainer: {
    gap: 8,
  },
  guestLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  guestText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: BrandColors.primary,
  },
});
