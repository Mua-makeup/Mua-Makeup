package com.makeup.platform.repository;

import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.repository.custom.projection.StaffLeaderboardProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Collection;
import java.util.Optional;

@Repository
public interface AgencyStaffRepository extends JpaRepository<AgencyStaffEntity, Long> {

    Optional<AgencyStaffEntity> findByAgencyIdAndMuaId(Long agencyId, Long muaId);

    boolean existsByAgencyIdAndMuaId(Long agencyId, Long muaId);

    Page<AgencyStaffEntity> findByAgencyId(Long agencyId, Pageable pageable);

    Page<AgencyStaffEntity> findByAgencyIdAndStatus(Long agencyId, String status, Pageable pageable);

    List<AgencyStaffEntity> findByAgencyIdAndIsActiveTrue(Long agencyId);

    List<AgencyStaffEntity> findByAgencyIdAndStatus(Long agencyId, String status);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END " +
           "FROM AgencyStaffEntity s WHERE s.mua.id = :muaId AND s.isActive = true AND s.status = 'ACTIVE'")
    boolean existsActiveMembershipByMuaId(@Param("muaId") Long muaId);

    @Query("SELECT s FROM AgencyStaffEntity s " +
           "JOIN FETCH s.agency " +
           "JOIN FETCH s.mua m " +
           "JOIN FETCH m.user " +
           "WHERE s.id = :staffId AND s.agency.id = :agencyId")
    Optional<AgencyStaffEntity> findByIdAndAgencyIdWithMuaAndUser(@Param("staffId") Long staffId,
                                                                   @Param("agencyId") Long agencyId);

    @Query("SELECT s FROM AgencyStaffEntity s " +
           "JOIN FETCH s.agency " +
           "LEFT JOIN FETCH s.mua m " +
           "LEFT JOIN FETCH m.user " +
           "WHERE s.mua.user.id = :userId AND s.isActive = true")
    Optional<AgencyStaffEntity> findActiveStaffByUserId(@Param("userId") Long userId);

    @Query("SELECT s FROM AgencyStaffEntity s " +
           "JOIN FETCH s.agency " +
           "LEFT JOIN FETCH s.mua m " +
           "LEFT JOIN FETCH m.user " +
           "WHERE s.mua.user.id = :userId AND (s.status = 'ACTIVE' OR s.status = 'PENDING') " +
           "ORDER BY s.joinedAt DESC")
    List<AgencyStaffEntity> findActiveOrPendingStaffByUserId(@Param("userId") Long userId);

    @Query("SELECT s FROM AgencyStaffEntity s " +
           "JOIN FETCH s.agency a " +
           "LEFT JOIN FETCH a.owner o " +
           "LEFT JOIN FETCH s.mua m " +
           "LEFT JOIN FETCH m.user u " +
           "WHERE s.mua.id = :muaId AND s.isActive = true AND s.status = 'ACTIVE'")
    Optional<AgencyStaffEntity> findActiveStaffByMuaId(@Param("muaId") Long muaId);
    @Query("SELECT s FROM AgencyStaffEntity s JOIN FETCH s.mua WHERE s.agency.id = :agencyId AND s.mua.id IN :muaIds")
    List<AgencyStaffEntity> findCommissionRates(@Param("agencyId") Long agencyId,
            @Param("muaIds") Collection<Long> muaIds);

    @Query("SELECT s.mua.id FROM AgencyStaffEntity s WHERE s.isActive = true AND s.status = 'ACTIVE'")
    List<Long> findAllActiveStaffMuaIds();

    @Query(value = """
        SELECT 
            s.id AS staffId,
            mp.id AS muaId,
            mp.mua_code AS staffCode,
            u.full_name AS fullName,
            u.phone_number AS phone,
            u.avatar_url AS avatarUrl,
            s.joined_at AS joinedAt,
            COALESCE(sub_rev.rating_avg, mp.rating_avg, 5.0) AS ratingAvg,
            COALESCE(sub_rev.total_reviews, 0) AS totalReviews,
            COALESCE(sub_rev.five_star_count, 0) AS fiveStarCount,
            COALESCE(sub_bk.total_completed_jobs, 0) AS totalCompletedJobs
        FROM agency_schema.agency_staff s
        JOIN mua_schema.mua_profiles mp ON mp.id = s.mua_id
        JOIN auth_schema.users u ON u.id = mp.user_id
        LEFT JOIN (
            SELECT 
                r.mua_id,
                ROUND(AVG(r.rating)::numeric, 1) AS rating_avg,
                COUNT(r.id)::int AS total_reviews,
                COUNT(CASE WHEN r.rating = 5 THEN 1 END)::int AS five_star_count
            FROM interaction_schema.reviews r
            WHERE r.agency_id = :agencyId
              AND (CAST(:startDate AS TIMESTAMP) IS NULL OR r.created_at >= CAST(:startDate AS TIMESTAMP))
              AND (CAST(:endDate AS TIMESTAMP) IS NULL OR r.created_at <= CAST(:endDate AS TIMESTAMP))
            GROUP BY r.mua_id
        ) sub_rev ON sub_rev.mua_id = mp.id
        LEFT JOIN (
            SELECT 
                bsa.staff_id,
                COUNT(b.id)::int AS total_completed_jobs
            FROM booking_schema.bookings b
            JOIN booking_schema.booking_staff_assignments bsa ON bsa.booking_id = b.id
            WHERE b.agency_id = :agencyId
              AND bsa.status = 'ACTIVE'
              AND b.status IN ('COMPLETED', 'PAID_OUT')
              AND (CAST(:startDate AS TIMESTAMP) IS NULL OR b.booking_date >= CAST(CAST(:startDate AS TIMESTAMP) AS DATE))
              AND (CAST(:endDate AS TIMESTAMP) IS NULL OR b.booking_date <= CAST(CAST(:endDate AS TIMESTAMP) AS DATE))
            GROUP BY bsa.staff_id
        ) sub_bk ON sub_bk.staff_id = s.id
        WHERE s.agency_id = :agencyId
          AND s.is_active = true
          AND s.status = 'ACTIVE'
        ORDER BY 
            COALESCE(sub_rev.rating_avg, mp.rating_avg, 5.0) DESC,
            COALESCE(sub_rev.five_star_count, 0) DESC,
            COALESCE(sub_bk.total_completed_jobs, 0) DESC,
            COALESCE(sub_rev.total_reviews, 0) DESC
        """, nativeQuery = true)
    List<StaffLeaderboardProjection> findStaffLeaderboard(
            @Param("agencyId") Long agencyId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}
