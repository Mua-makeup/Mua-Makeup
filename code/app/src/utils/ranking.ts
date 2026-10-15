/**
 * Thuật toán tính Điểm Xếp Hạng Tìm Kiếm Đa Chiều (Search Ranking Score)
 * Áp dụng trên Mobile App và Web Client cho Mua-Makeup.
 * 
 * Rank Score = (0.4 * Rating) + (0.3 * Khoảng cách) + (0.2 * Số đơn hoàn thành) + (0.1 * Đang Online)
 */

export interface MuaRankingInput {
  ratingAverage?: number | null;
  bayesianRating?: number | null;
  rollingRating?: number | null;
  totalCompletedJobs?: number | null;
  totalReviews?: number | null;
  isOnline?: boolean | null;
  baseAddressLat?: number | null;
  baseAddressLng?: number | null;
  badgeTier?: string | null;
}

/**
 * Tính khoảng cách Haversine giữa 2 tọa độ GPS (km)
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Tính điểm Xếp Hạng tổng hợp (Thang điểm 0 - 100)
 */
export function calculateMuaRankScore(
  mua: MuaRankingInput,
  userLat?: number | null,
  userLng?: number | null,
  maxRadiusKm = 15.0
): number {
  // 1. Điểm Rating chuẩn hóa (40%)
  const effectiveRating = mua.bayesianRating ?? mua.ratingAverage ?? 5.0;
  const ratingScore = Math.min(100, Math.max(0, (effectiveRating / 5.0) * 100));

  // 2. Điểm Khoảng cách GPS chuẩn hóa (30%)
  let distanceScore = 50.0; // Fallback khi chưa có vị trí GPS
  if (
    userLat != null &&
    userLng != null &&
    mua.baseAddressLat != null &&
    mua.baseAddressLng != null
  ) {
    const dist = calculateDistanceKm(
      userLat,
      userLng,
      mua.baseAddressLat,
      mua.baseAddressLng
    );
    distanceScore = Math.max(0, (1 - dist / maxRadiusKm) * 100);
  }

  // 3. Điểm Kinh nghiệm & Số ca hoàn thành chuẩn hóa qua Logarithm (20%)
  const completedJobs = Math.max(0, mua.totalCompletedJobs ?? 0);
  const benchmarkJobs = 100; // Mốc chuẩn 100 ca hoàn thành
  const experienceScore = Math.min(
    100,
    (Math.log10(completedJobs + 1) / Math.log10(benchmarkJobs + 1)) * 100
  );

  // 4. Điểm Trực tuyến (10%)
  const onlineScore = mua.isOnline ? 100.0 : 0.0;

  // Tổng hợp theo trọng số chuẩn
  const finalRankScore =
    0.4 * ratingScore +
    0.3 * distanceScore +
    0.2 * experienceScore +
    0.1 * onlineScore;

  return Math.round(finalRankScore * 10) / 10;
}
