
CREATE TABLE IF NOT EXISTS agency_schema.agency_staff_leave_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id BIGINT NOT NULL REFERENCES agency_schema.agency_profiles(id) ON DELETE CASCADE,
    staff_id BIGINT NOT NULL REFERENCES agency_schema.agency_staff(id) ON DELETE CASCADE,
    leave_date DATE NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    rejection_reason VARCHAR(255),
    reviewed_by_user_id BIGINT REFERENCES auth_schema.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agency_staff_leave_requests_agency 
    ON agency_schema.agency_staff_leave_requests(agency_id, status, leave_date);

CREATE INDEX IF NOT EXISTS idx_agency_staff_leave_requests_staff 
    ON agency_schema.agency_staff_leave_requests(staff_id, leave_date);
