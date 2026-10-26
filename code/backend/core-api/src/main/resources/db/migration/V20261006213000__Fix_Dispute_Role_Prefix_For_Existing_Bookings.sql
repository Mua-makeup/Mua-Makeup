-- Đồng bộ tiền tố vai trò người báo cáo khiếu nại cho các đơn hàng trong quá khứ chưa được gắn role tag
UPDATE booking_schema.bookings
SET emergency_reason = '[Chuyên viên MUA]: ' || emergency_reason,
    cancellation_reason = '[Chuyên viên MUA]: ' || COALESCE(cancellation_reason, emergency_reason)
WHERE status = 'DISPUTED'
  AND emergency_reason IS NOT NULL
  AND emergency_reason NOT LIKE '[%'
  AND (
      emergency_reason ILIKE '%khách hàng%' 
      OR emergency_reason ILIKE '%với khách%' 
      OR emergency_reason ILIKE '%vắng mặt%' 
      OR emergency_reason ILIKE '%No-show%'
  );

-- Đối với các đơn do khách hàng báo cáo sự cố về thợ trong quá khứ
UPDATE booking_schema.bookings
SET emergency_reason = '[Khách hàng]: ' || emergency_reason,
    cancellation_reason = '[Khách hàng]: ' || COALESCE(cancellation_reason, emergency_reason)
WHERE status = 'DISPUTED'
  AND emergency_reason IS NOT NULL
  AND emergency_reason NOT LIKE '[%'
  AND (
      emergency_reason ILIKE '%chuyên viên%' 
      OR emergency_reason ILIKE '%thợ không%' 
      OR emergency_reason ILIKE '%đến trễ%'
  );
