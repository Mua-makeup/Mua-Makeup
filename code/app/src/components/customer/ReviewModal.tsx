import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { BrandColors } from '@/constants/theme';
import { reviewService, ReviewItem } from '@/services/review.service';
import { parseApiError } from '@/utils/error';

interface Props {
  visible: boolean;
  bookingId: number;
  muaName?: string;
  initialData?: ReviewItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const RATING_LABELS = [
  '',
  'Rất không hài lòng',
  'Không hài lòng',
  'Bình thường',
  'Hài lòng',
  'Tuyệt vời, rất ưng ý!',
];

const MAX_IMAGES = 5;

export const ReviewModal: React.FC<Props> = ({
  visible,
  bookingId,
  muaName = 'Chuyên viên trang điểm',
  initialData,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setRating(initialData.rating || 5);
        setComment(initialData.comment || '');
        setImages(initialData.imageUrls ? Array.from(new Set(initialData.imageUrls)) : []);
      } else {
        setRating(5);
        setComment('');
        setImages([]);
      }
      setUploadStatusText('');
    }
  }, [visible, initialData]);

  const handleSelectRating = (star: number) => {
    setRating(star);
    Haptics.selectionAsync();
  };

  const handlePickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Giới hạn ảnh', `Bạn chỉ có thể tải lên tối đa ${MAX_IMAGES} bức ảnh.`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Vui lòng cấp quyền truy cập thư viện ảnh để gửi kèm hình ảnh đánh giá.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: MAX_IMAGES - images.length,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map((a) => a.uri);
        const combined = [...images, ...newUris].slice(0, MAX_IMAGES);
        setImages(combined);
        Haptics.selectionAsync();
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh.');
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      Alert.alert('Thông báo', 'Vui lòng chọn số sao đánh giá (1 - 5 sao).');
      return;
    }

    try {
      setIsSubmitting(true);

      // Phân tách ảnh cục bộ cần upload và ảnh đã có sẵn trên cloud
      const localUris = images.filter((uri) => !uri.startsWith('http://') && !uri.startsWith('https://'));
      const remoteUrls = images.filter((uri) => uri.startsWith('http://') || uri.startsWith('https://'));

      let finalUrls: string[] = [...remoteUrls];

      if (localUris.length > 0) {
        setUploadStatusText(`Đang tải lên ${localUris.length} ảnh...`);
        const newlyUploaded = await reviewService.uploadReviewImages(localUris);
        finalUrls = Array.from(new Set([...finalUrls, ...newlyUploaded]));
      }

      finalUrls = Array.from(new Set(finalUrls));

      setUploadStatusText('Đang lưu đánh giá...');

      if (initialData && initialData.id) {
        // Mode cập nhật đánh giá
        await reviewService.updateReview(initialData.id, {
          rating,
          comment: comment.trim(),
          imageUrls: finalUrls,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
        if (onSuccess) onSuccess();
        Alert.alert(
          'Thành công',
          'Đánh giá của bạn đã được cập nhật thành công!'
        );
      } else {
        // Mode tạo mới đánh giá
        await reviewService.submitReview({
          bookingId,
          rating,
          comment: comment.trim(),
          imageUrls: finalUrls,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
        if (onSuccess) onSuccess();
        Alert.alert(
          'Thành công',
          'Cảm ơn bạn đã gửi đánh giá! Ý kiến của bạn giúp nâng cao chất lượng cộng đồng làm đẹp.'
        );
      }
    } catch (err: any) {
      const parsed = parseApiError(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Không thể lưu đánh giá', parsed.message || 'Đã có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
      setUploadStatusText('');
    }
  };

  const isEditMode = Boolean(initialData && initialData.id);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>
                {isEditMode ? 'Chỉnh Sửa Đánh Giá' : 'Đánh Giá Dịch Vụ'}
              </Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {muaName}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {/* Stars selection */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingSectionTitle}>Bạn cảm thấy dịch vụ thế nào?</Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => handleSelectRating(star)}
                    style={styles.starTouch}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={36}
                      color={star <= rating ? '#F59E0B' : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.ratingLabelText}>{RATING_LABELS[rating]}</Text>
            </View>

            {/* Comment Input */}
            <View style={styles.commentSection}>
              <Text style={styles.inputLabel}>Nhận xét chi tiết (tùy chọn)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Chia sẻ trải nghiệm về tay nghề, phong cách trang điểm, thái độ phục vụ và đúng giờ..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
                maxLength={2000}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{comment.length}/2000</Text>
            </View>

            {/* Image Upload Section */}
            <View style={styles.imageSection}>
              <View style={styles.imageSectionHeader}>
                <Text style={styles.inputLabel}>Ảnh đính kèm ({images.length}/{MAX_IMAGES})</Text>
                <Text style={styles.imageHint}>Tối đa 5 ảnh thực tế</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageStrip}
              >
                {/* Nút thêm ảnh */}
                {images.length < MAX_IMAGES && (
                  <TouchableOpacity
                    style={styles.addPhotoBtn}
                    onPress={handlePickImages}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera-outline" size={22} color={BrandColors.primary} />
                    <Text style={styles.addPhotoText}>Thêm ảnh</Text>
                  </TouchableOpacity>
                )}

                {/* Danh sách ảnh đã chọn */}
                {images.map((imgUri, idx) => (
                  <View key={idx} style={styles.imagePreviewWrap}>
                    <Image source={{ uri: imgUri }} style={styles.imageThumbnail} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => handleRemoveImage(idx)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Status loading text */}
            {uploadStatusText ? (
              <Text style={styles.uploadStatusText}>{uploadStatusText}</Text>
            ) : null}

            {/* Policy Notice */}
            <View style={styles.policyNoticeBox}>
              <Text style={styles.policyNoticeText}>
                {isEditMode
                  ? 'Bạn có thể chỉnh sửa đánh giá này trong vòng 48 giờ kể từ khi tạo. Sau đó hệ thống sẽ chuyển sang trạng thái chỉ xem.'
                  : 'Sau khi gửi, bạn có 48 giờ để chỉnh sửa lại đánh giá trước khi chuyển sang trạng thái chỉ xem.'}
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.88}
            >
              {isSubmitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.submitBtnText}>
                    {uploadStatusText || 'Đang xử lý...'}
                  </Text>
                </View>
              ) : (
                <>
                  <Ionicons name={isEditMode ? 'checkmark-circle' : 'send'} size={16} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>
                    {isEditMode ? 'Lưu Thay Đổi Đánh Giá' : 'Gửi Đánh Giá Ngay'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingSection: {
    alignItems: 'center',
    marginVertical: 18,
  },
  ratingSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starTouch: {
    padding: 4,
  },
  ratingLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 4,
  },
  commentSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    fontSize: 13.5,
    color: '#0F172A',
    minHeight: 85,
    marginTop: 6,
  },
  charCount: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  imageSection: {
    marginBottom: 20,
  },
  imageSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageHint: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  imageStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  addPhotoBtn: {
    width: 70,
    height: 70,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BrandColors.primary,
    borderStyle: 'dashed',
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  imagePreviewWrap: {
    width: 70,
    height: 70,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadStatusText: {
    fontSize: 12,
    color: BrandColors.primary,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  policyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  policyNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
