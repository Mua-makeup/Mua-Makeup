import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BrandColors } from '@/constants/theme';

interface MultiAnglePhotoStripProps {
  imageUris: string[];
  onChange: (uris: string[]) => void;
  maxPhotos?: number;
}

export const MultiAnglePhotoStrip: React.FC<MultiAnglePhotoStripProps> = ({
  imageUris,
  onChange,
  maxPhotos = 5,
}) => {
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền máy ảnh', 'Vui lòng cấp quyền truy cập máy ảnh để chụp góc tác phẩm.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map((a) => a.uri);
        onChange([...imageUris, ...newUris].slice(0, maxPhotos));
      }
    } catch (err: any) {
      console.error('Lỗi khi chụp ảnh:', err);
      Alert.alert('Lỗi', 'Không thể chụp ảnh: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handleChooseFromLibrary = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để tải lên tác phẩm.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: maxPhotos - imageUris.length,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map((a) => a.uri);
        onChange([...imageUris, ...newUris].slice(0, maxPhotos));
      }
    } catch (err: any) {
      console.error('Lỗi khi chọn ảnh góc chụp:', err);
      Alert.alert('Lỗi', 'Không thể chọn ảnh: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handlePickImage = () => {
    if (imageUris.length >= maxPhotos) {
      Alert.alert('Giới hạn ảnh', `Bạn chỉ có thể tải lên tối đa ${maxPhotos} ảnh góc chụp chi tiết.`);
      return;
    }

    Alert.alert(
      'Thêm Góc Chụp Chi Tiết',
      'Bạn muốn chụp ảnh góc mới hay chọn từ thư viện ảnh?',
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

  const handleRemoveImage = (indexToRemove: number) => {
    onChange(imageUris.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>
          Ảnh Góc Chụp Chi Tiết ({imageUris.length}/{maxPhotos})
        </Text>
        <Text style={styles.sublabel}>Nghiêng 45°, Cận mắt, Lớp nền, Kiểu tóc</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}>
        {imageUris.map((uri, index) => (
          <View key={index} style={styles.thumbnailWrapper}>
            <Image source={{ uri }} style={styles.thumbnailImage} resizeMode="cover" />
            <View style={styles.indexBadge}>
              <Text style={styles.indexBadgeText}>Góc {index + 1}</Text>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemoveImage(index)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}>
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}

        {imageUris.length < maxPhotos && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handlePickImage}
            activeOpacity={0.7}>
            <Ionicons name="camera-outline" size={24} color={BrandColors.primary} />
            <Text style={styles.addBtnText}>Thêm Góc</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.slateBody,
  },
  sublabel: {
    fontSize: 11,
    color: BrandColors.slateMuted,
  },
  scrollList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  thumbnailWrapper: {
    width: 86,
    height: 86,
    borderRadius: 14,
    backgroundColor: BrandColors.canvasBg,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BrandColors.borderInput,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  indexBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  indexBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BrandColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 86,
    height: 86,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: BrandColors.softBorder,
    backgroundColor: BrandColors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.primary,
  },
});
