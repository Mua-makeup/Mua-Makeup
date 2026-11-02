import { Platform } from 'react-native';

/**
 * Tiện ích chuẩn hóa chuyển đổi URI ảnh (cả Web & Native) sang FormData
 */
export async function createImageFormData(
  imageUri: string,
  fieldName: string = 'file',
  defaultFilename: string = 'image.jpg'
): Promise<FormData> {
  const formData = new FormData();
  let filename = imageUri.split('/').pop() || defaultFilename;
  if (filename.includes('?')) {
    filename = filename.split('?')[0];
  }
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  if (!filename.includes('.')) {
    filename = `${filename}.${ext}`;
  }

  if (Platform.OS === 'web') {
      const fetchRes = await fetch(imageUri);
      if (!fetchRes.ok) throw new Error('Không đọc được ảnh đã chọn. Vui lòng chọn lại ảnh.');
      const blob = await fetchRes.blob();
      formData.append(fieldName, blob, filename);
  } else {
    formData.append(fieldName, {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as any);
  }

  return formData;
}
