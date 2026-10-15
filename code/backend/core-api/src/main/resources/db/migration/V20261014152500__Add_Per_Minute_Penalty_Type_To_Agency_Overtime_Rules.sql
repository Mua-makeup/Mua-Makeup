-- Cập nhật check constraint để hỗ trợ loại hình tính phụ cấp/chế tài theo phút (PER_MINUTE)
ALTER TABLE agency_schema.agency_overtime_rules 
DROP CONSTRAINT IF EXISTS agency_overtime_rules_penalty_type_check;

ALTER TABLE agency_schema.agency_overtime_rules 
ADD CONSTRAINT agency_overtime_rules_penalty_type_check 
CHECK (penalty_type IN ('PERCENT_COMMISSION', 'FIXED_AMOUNT', 'WARNING_ONLY', 'PER_MINUTE'));
