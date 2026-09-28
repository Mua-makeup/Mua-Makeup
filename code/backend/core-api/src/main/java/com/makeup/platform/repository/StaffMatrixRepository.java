package com.makeup.platform.repository;

import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.repository.custom.projection.StaffMatrixProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface StaffMatrixRepository extends JpaRepository<AgencyStaffEntity, Long> {

    @Query(value = """
        SELECT 
            s.id AS staffId,
            mp.id AS muaId,
            u.full_name AS staffName,
            u.phone_number AS staffPhone,
            u.avatar_url AS staffAvatarUrl,
            EXISTS (
                SELECT 1 FROM agency_schema.agency_staff_shifts sh
                WHERE sh.staff_id = s.id 
                  AND (sh.work_date = CAST(:bookingDate AS DATE) 
                       OR (sh.work_date IS NULL AND sh.day_of_week = (EXTRACT(DOW FROM CAST(:bookingDate AS DATE)) + 1)))
                  AND sh.start_time <= CAST(:startTime AS TIME)
                  AND sh.end_time >= CAST(:endTime AS TIME)
                  AND sh.is_active = true
            ) AS hasShift,
            EXISTS (
                SELECT 1 FROM agency_schema.agency_staff_services ss
                WHERE ss.staff_id = s.id 
                  AND ss.package_id = :packageId
                  AND ss.is_qualified = true
            ) AS hasPackage,
            CASE 
                WHEN :styleId IS NULL THEN true
                ELSE EXISTS (
                    SELECT 1 FROM agency_schema.agency_staff_styles st
                    WHERE st.staff_id = s.id 
                      AND st.style_id = :styleId
                      AND st.is_qualified = true
                )
            END AS hasStyle,
            NOT EXISTS (
                SELECT 1 FROM mua_schema.mua_calendars c
                WHERE c.mua_id = s.mua_id 
                  AND c.is_locked = true
                  AND (c.booking_id IS NULL OR c.booking_id != :bookingId)
                  AND tstzrange(c.start_at, c.end_at, '[)') && tstzrange(CAST(:startTs AS TIMESTAMPTZ), CAST(:endTs AS TIMESTAMPTZ), '[)')
            ) AS hasCalendarFree,
            EXISTS (
                SELECT 1 FROM booking_schema.booking_staff_assignments bsa_canc
                WHERE bsa_canc.staff_id = s.id 
                  AND bsa_canc.booking_id = :bookingId 
                  AND bsa_canc.status = 'EMERGENCY_CANCELLED'
            ) AS hasReportedBusy,
            bsa.assignment_role AS currentRole
        FROM agency_schema.agency_staff s
        JOIN mua_schema.mua_profiles mp ON s.mua_id = mp.id
        JOIN auth_schema.users u ON mp.user_id = u.id
        LEFT JOIN booking_schema.booking_staff_assignments bsa 
            ON bsa.staff_id = s.id AND bsa.booking_id = :bookingId AND bsa.status = 'ACTIVE'
        WHERE s.agency_id = :agencyId AND s.status = 'ACTIVE'
        ORDER BY 
            (
                EXISTS (
                    SELECT 1 FROM agency_schema.agency_staff_shifts sh
                    WHERE sh.staff_id = s.id 
                      AND (sh.work_date = CAST(:bookingDate AS DATE) 
                           OR (sh.work_date IS NULL AND sh.day_of_week = (EXTRACT(DOW FROM CAST(:bookingDate AS DATE)) + 1)))
                      AND sh.start_time <= CAST(:startTime AS TIME)
                      AND sh.end_time >= CAST(:endTime AS TIME)
                      AND sh.is_active = true
                ) 
                AND EXISTS (
                    SELECT 1 FROM agency_schema.agency_staff_services ss
                    WHERE ss.staff_id = s.id 
                      AND ss.package_id = :packageId
                      AND ss.is_qualified = true
                )
                AND (
                    CASE 
                        WHEN :styleId IS NULL THEN true
                        ELSE EXISTS (
                            SELECT 1 FROM agency_schema.agency_staff_styles st
                            WHERE st.staff_id = s.id 
                              AND st.style_id = :styleId
                              AND st.is_qualified = true
                        )
                    END
                )
                AND NOT EXISTS (
                    SELECT 1 FROM mua_schema.mua_calendars c
                    WHERE c.mua_id = s.mua_id 
                      AND c.is_locked = true
                      AND (c.booking_id IS NULL OR c.booking_id != :bookingId)
                      AND tstzrange(c.start_at, c.end_at, '[)') && tstzrange(CAST(:startTs AS TIMESTAMPTZ), CAST(:endTs AS TIMESTAMPTZ), '[)')
                )
                AND NOT EXISTS (
                    SELECT 1 FROM booking_schema.booking_staff_assignments bsa_canc
                    WHERE bsa_canc.staff_id = s.id 
                      AND bsa_canc.booking_id = :bookingId 
                      AND bsa_canc.status = 'EMERGENCY_CANCELLED'
                )
            ) DESC,
            u.full_name ASC
    """, nativeQuery = true)
    List<StaffMatrixProjection> getStaffAvailabilityMatrix(
            @Param("agencyId") Long agencyId,
            @Param("bookingId") Long bookingId,
            @Param("packageId") Long packageId,
            @Param("styleId") Long styleId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("startTs") OffsetDateTime startTs,
            @Param("endTs") OffsetDateTime endTs
    );
}
