import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { BrandColors } from '@/constants/theme';
import { packageService, PackageDetail } from '@/services/package.service';
import { muaShowcaseService } from '@/services/mua-showcase.service';
import { taxonomyService, MakeupStyle } from '@/services/taxonomy.service';
import { DismissibleModal } from '@/components/common/DismissibleModal';
import { MultiAnglePhotoStrip } from '@/components/mua/showcase/MultiAnglePhotoStrip';
import { createShowcaseSchema } from '@/schemas/showcase.schema';
import { parseApiError } from '@/utils/error';

export default function AddShowcaseScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const packageId = Number(id);

  const [packageDetail, setPackageDetail] = useState<PackageDetail | null>(null);
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [coverImageName, setCoverImageName] = useState<string | undefined>(undefined);
  const [additionalUris, setAdditionalUris] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedStyleId, setSelectedStyleId] = useState<number | undefined>(undefined);
  const [stylesList, setStylesList] = useState<MakeupStyle[]>([]);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [styleSearchQuery, setStyleSearchQuery] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (packageId) {
      loadPackage();
    }
  }, [packageId]);

  const loadPackage = async () => {
    try {
      const [pkg, allStyles] = await Promise.all([
        packageService.getPackageById(packageId),
        taxonomyService.getActiveStyles().catch(() => []),
      ]);
      setPackageDetail(pkg);
      const available = pkg.styles && pkg.styles.length > 0 ? pkg.styles : allStyles;
      setStylesList(available);
      if (available.length > 0 && !selectedStyleId) {
        setSelectedStyleId(available[0].id);
      }
    } catch (err) {
      console.error('Lỗi tải gói:', err);
    }
  };

  const selectedStyle = stylesList.find((s) => s.id === selectedStyleId) || 
    (packageDetail?.styles || []).find((s) => s.id === selectedStyleId);

  const filteredStyles = stylesList.filter((s) => {
    const name = s.styleName || (s as any).name || '';
    return name.toLowerCase().includes(styleSearchQuery.toLowerCase());
  });

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền máy ảnh', 'Vui lòng cấp quyền truy cập máy ảnh để chụp ảnh tác phẩm.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setCoverImageUri(res.assets[0].uri);
        setCoverImageName(res.assets[0].fileName || `photo_${Date.now()}.jpg`);
        if (errors.coverImageUri) {
          setErrors((prev) => ({ ...prev, coverImageUri: '' }));
        }
      }
    } catch (err: any) {
      console.error('Lỗi chụp ảnh:', err);
    }
  };

  const handleChooseFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền thư viện', 'Vui lòng cấp quyền truy cập thư viện để chọn ảnh tác phẩm.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setCoverImageUri(res.assets[0].uri);
        setCoverImageName(res.assets[0].fileName || undefined);
        if (errors.coverImageUri) {
          setErrors((prev) => ({ ...prev, coverImageUri: '' }));
        }
      }
    } catch (err: any) {
      console.error('Lỗi chọn ảnh thư viện:', err);
    }
  };

  const handlePickCoverImage = () => {
    Alert.alert(
      'Chọn Ảnh Tác Phẩm',
      'Bạn muốn chụp ảnh mới hay chọn ảnh từ thư viện?',
      [
        {
          text: 'Chụp ảnh mới',
          onPress: handleTakePhoto,
        },
        {
          text: 'Chọn từ thư viện',
          onPress: handleChooseFromLibrary,
        },
        {
          text: 'Hủy',
          style: 'cancel',
        },
      ]
    );
  };

  const handleSave = async () => {
    const rawData = {
      title,
      packageId,
      styleId: selectedStyleId,
      description,
      coverImageUri: coverImageUri || '',
      isFeatured,
    };

    const result = createShowcaseSchema.safeParse(rawData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      await muaShowcaseService.createPortfolioShowcase({
        packageId,
        styleId: selectedStyleId,
        title: result.data.title,
        description: result.data.description,
        isFeatured,
        coverImageUri: result.data.coverImageUri,
        coverImageName,
        additionalImageUris: additionalUris,
      });

      Alert.alert('Thành Công', 'Đã đăng tác phẩm vào album gói dịch vụ!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const parsed = parseApiError(err);
      if (parsed.fieldErrors) {
        setErrors(parsed.fieldErrors);
      } else {
        setErrors({ form: parsed.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace(`/mua/packages` as any))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={BrandColors.slateHeading} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Đăng Tác Phẩm Mới</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {packageDetail?.packageName || 'Album Dịch Vụ'}
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {errors.form ? (
            <View style={styles.formErrorBox}>
              <Text style={styles.formErrorText}>{errors.form}</Text>
            </View>
          ) : null}

          {/* 1. Ảnh chính diện (Square 1:1) */}
          <Text style={styles.sectionLabel}>Ảnh Tác Phẩm Chính Diện (Tỉ lệ 1:1) *</Text>
          <Text style={styles.fieldHint}>Bức ảnh chụp góc chính diện rõ nét khuôn mặt sau khi hoàn thiện make-up</Text>
          <TouchableOpacity
            style={[styles.mainPhotoBox, errors.coverImageUri && styles.inputError]}
            onPress={handlePickCoverImage}
            activeOpacity={0.8}>
            {coverImageUri ? (
              <>
                <Image source={{ uri: coverImageUri }} style={styles.coverPreview} resizeMode="cover" />
                <View style={styles.changeBadge}>
                  <Ionicons name="camera-reverse" size={16} color="#FFFFFF" />
                  <Text style={styles.changeBadgeText}>Đổi Ảnh</Text>
                </View>
              </>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="camera-outline" size={40} color={BrandColors.primary} />
                <Text style={styles.uploadText}>Chạm để chọn ảnh hoàn thiện chính</Text>
                <Text style={styles.uploadSubtext}>Kích thước vuông tỉ lệ 1:1</Text>
              </View>
            )}
          </TouchableOpacity>
          {errors.coverImageUri ? (
            <Text style={styles.errorText}>{errors.coverImageUri}</Text>
          ) : null}

          {/* 2. Dãy ảnh góc chụp chi tiết */}
          <MultiAnglePhotoStrip
            imageUris={additionalUris}
            onChange={setAdditionalUris}
            maxPhotos={5}
          />

          {/* 3. Tiêu đề tác phẩm */}
          <Text style={styles.sectionLabel}>Tiêu Đề Tác Phẩm *</Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="Ví dụ: Tone Hồng Đào Trong Trẻo - Khách Đi Tiệc Tối"
            placeholderTextColor={BrandColors.slatePlaceholder}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (errors.title) {
                setErrors((prev) => ({ ...prev, title: '' }));
              }
            }}
          />
          {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

          {/* 4. Phong cách áp dụng: Selector Card mở BottomSheet chuẩn chỉ */}
          <Text style={styles.sectionLabel}>Phong Cách Make-up Của Tác Phẩm</Text>
          <TouchableOpacity
            style={styles.selectorCard}
            onPress={() => {
              setStyleSearchQuery('');
              setShowStyleModal(true);
            }}
            activeOpacity={0.75}
          >
            <View style={styles.selectorLeft}>
              <View style={[styles.selectorIconBox, selectedStyle ? styles.selectorIconBoxActive : null]}>
                <Ionicons
                  name="color-palette-outline"
                  size={20}
                  color={selectedStyle ? BrandColors.primary : '#64748B'}
                />
              </View>
              <View style={styles.selectorTextCol}>
                <Text style={[styles.selectorTitle, selectedStyle ? styles.selectorTitleActive : null]}>
                  {selectedStyle ? selectedStyle.styleName || (selectedStyle as any).name : 'Chọn phong cách make-up...'}
                </Text>
                <Text style={styles.selectorSubtitle}>
                  {selectedStyle ? 'Chạm để thay đổi phong cách tác phẩm' : 'Phù hợp với đường nét & tone trang điểm'}
                </Text>
              </View>
            </View>
            <View style={styles.selectorRight}>
              {selectedStyle && (
                <View style={styles.activePill}>
                  <Ionicons name="sparkles" size={12} color={BrandColors.primary} />
                  <Text style={styles.activePillText}>Đã chọn</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          {/* 5. Ghi chú kỹ thuật / Dòng mỹ phẩm */}
          <Text style={styles.sectionLabel}>Ghi Chú Kỹ Thuật & Dòng Mỹ Phẩm Sử Dụng</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Ví dụ: Sử dụng kem nền NARS All Day Luminous, phấn bắt sáng Dior, son MAC Chili..."
            placeholderTextColor={BrandColors.slatePlaceholder}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />

          {/* 6. Switch Ghim Nổi Bật */}
          <View style={styles.featuredSwitchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.featuredLabel}>Đặt Làm Ảnh Tiêu Biểu (Ảnh Bìa Gói)</Text>
              <Text style={styles.featuredSublabel}>
                Tác phẩm sẽ được ghim nổi bật và tự động làm ảnh bìa đại diện cho gói dịch vụ khi hiển thị trên hệ thống.
              </Text>
            </View>
            <Switch
              value={isFeatured}
              onValueChange={setIsFeatured}
              trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
              thumbColor={isFeatured ? BrandColors.success : '#94A3B8'}
            />
          </View>

          {/* Nút Đăng Tác Phẩm */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSave}
            disabled={submitting}
            activeOpacity={0.85}>
            {submitting ? (
              <View style={styles.loadingSubmit}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Đang tải ảnh lên ...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Đăng Tác Phẩm Lên Album Gói</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal BottomSheet chọn phong cách trang điểm */}
      <DismissibleModal
        visible={showStyleModal}
        onClose={() => setShowStyleModal(false)}
        overlayStyle={styles.modalOverlay}
        contentStyle={styles.bottomSheet}
      >
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>Chọn Phong Cách Make-up</Text>
            <Text style={styles.modalSubtitle}>
              Chọn phong cách phù hợp nhất với tác phẩm thực tế này
            </Text>
          </View>
        </View>

        {stylesList.length > 6 && (
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm phong cách..."
              placeholderTextColor="#94A3B8"
              value={styleSearchQuery}
              onChangeText={setStyleSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>
        )}

        <ScrollView
          style={styles.modalList}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 36) }}
          showsVerticalScrollIndicator={false}
        >
          {filteredStyles.map((st) => {
            const isSelected = selectedStyleId === st.id;
            return (
              <TouchableOpacity
                key={st.id}
                style={[styles.modalItemRow, isSelected && styles.modalItemRowSelected]}
                onPress={() => {
                  setSelectedStyleId(st.id);
                  setShowStyleModal(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalItemIconBox, isSelected && styles.modalItemIconBoxSelected]}>
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color={isSelected ? BrandColors.primary : '#94A3B8'}
                  />
                </View>
                <View style={styles.modalItemTextCol}>
                  <Text style={[styles.modalItemName, isSelected && styles.modalItemNameSelected]}>
                    {st.styleName || (st as any).name}
                  </Text>
                  {st.description ? (
                    <Text style={styles.modalItemDesc} numberOfLines={1}>
                      {st.description}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
          {filteredStyles.length === 0 && (
            <View style={styles.emptySearchBox}>
              <Text style={styles.emptySearchText}>Không tìm thấy phong cách nào phù hợp</Text>
            </View>
          )}
        </ScrollView>
      </DismissibleModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    borderBottomColor: BrandColors.borderInput,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: BrandColors.canvasBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  headerSubtitle: {
    fontSize: 12,
    color: BrandColors.primary,
    fontWeight: '600',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  formErrorBox: {
    backgroundColor: BrandColors.light,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  formErrorText: {
    color: BrandColors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.slateHeading,
    marginTop: 14,
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    marginBottom: 8,
  },
  mainPhotoBox: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 280,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: BrandColors.canvasBg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: BrandColors.softBorder,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  coverPreview: {
    width: '100%',
    height: '100%',
  },
  changeBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  changeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  uploadSubtext: {
    fontSize: 12,
    color: BrandColors.slateMuted,
  },
  input: {
    height: 50,
    backgroundColor: BrandColors.canvasBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
    fontSize: 14,
    color: BrandColors.slateHeading,
  },
  multilineInput: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: BrandColors.danger,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    fontSize: 12,
    color: BrandColors.danger,
    marginTop: 4,
  },
  // Trigger Selector Card
  selectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  selectorIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorIconBoxActive: {
    backgroundColor: '#FFF1F2',
  },
  selectorTextCol: {
    flex: 1,
  },
  selectorTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  selectorTitleActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  selectorSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  selectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },

  // Modal BottomSheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  modalList: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    gap: 12,
  },
  modalItemRowSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF1F2',
  },
  modalItemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemIconBoxSelected: {
    backgroundColor: '#FFE4E6',
  },
  modalItemTextCol: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  modalItemNameSelected: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  modalItemDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleSelected: {
    borderColor: BrandColors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: BrandColors.primary,
  },
  emptySearchBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySearchText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  featuredSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BrandColors.canvasBg,
    padding: 16,
    borderRadius: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
  },
  featuredLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  featuredSublabel: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    marginTop: 2,
    paddingRight: 10,
  },
  submitButton: {
    height: 52,
    backgroundColor: BrandColors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loadingSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
