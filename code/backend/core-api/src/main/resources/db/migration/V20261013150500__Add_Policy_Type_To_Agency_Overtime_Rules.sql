
ALTER TABLE agency_schema.agency_overtime_rules 
ADD COLUMN IF NOT EXISTS policy_type VARCHAR(30) DEFAULT 'ALLOWANCE' NOT NULL;
