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
        WITH valid_reviews AS (
            SELECT r.* FROM interaction_schema.reviews r
            JOIN booking_schema.bookings b ON b.id = r.booking_id
            WHERE r.agency_id = :agencyId AND b.agency_id = :agencyId
              AND b.status IN ('COMPLETED', 'PAID_OUT')
              AND r.status = 'APPROVED' AND r.is_deleted = false
              AND (CAST(:startDate AS TIMESTAMP) IS NULL OR r.created_at >= CAST(:startDate AS TIMESTAMP))
              AND (CAST(:endDate AS TIMESTAMP) IS NULL OR r.created_at <= CAST(:endDate AS TIMESTAMP))
        ), credits AS (
            SELECT DISTINCT r.id, r.rating, a.staff_id
            FROM valid_reviews r
            JOIN booking_schema.booking_staff_assignments a ON a.booking_id = r.booking_id AND a.status = 'ACTIVE'
            UNION
            SELECT r.id, r.rating, s.id FROM valid_reviews r
            JOIN agency_schema.agency_staff s ON s.mua_id = r.mua_id AND s.agency_id = :agencyId
            WHERE NOT EXISTS (SELECT 1 FROM booking_schema.booking_staff_assignments a
                              WHERE a.booking_id = r.booking_id AND a.status = 'ACTIVE')
        ), ratings AS (
            SELECT staff_id, AVG(rating) AS rating_avg, COUNT(*) AS total_reviews,
                   COUNT(*) FILTER (WHERE rating = 5) AS five_star_count
            FROM credits GROUP BY staff_id
        ), jobs AS (
            SELECT a.staff_id, COUNT(DISTINCT b.id) AS completed,
                   COUNT(DISTINCT b.id) FILTER (WHERE a.assignment_role = 'PRIMARY_MUA') AS primary_jobs,
                   COUNT(DISTINCT b.id) FILTER (WHERE a.assignment_role = 'ASSISTANT_MUA') AS assistant_jobs
            FROM booking_schema.bookings b
            JOIN booking_schema.booking_staff_assignments a ON a.booking_id = b.id AND a.status = 'ACTIVE'
            WHERE b.agency_id = :agencyId AND b.status IN ('COMPLETED', 'PAID_OUT')
              AND (CAST(:startDate AS TIMESTAMP) IS NULL OR b.booking_date >= CAST(CAST(:startDate AS TIMESTAMP) AS DATE))
              AND (CAST(:endDate AS TIMESTAMP) IS NULL OR b.booking_date <= CAST(CAST(:endDate AS TIMESTAMP) AS DATE))
            GROUP BY a.staff_id
        )
        SELECT s.id AS staffId, mp.id AS muaId, mp.mua_code AS staffCode,
               u.full_name AS fullName, u.phone_number AS phone, u.avatar_url AS avatarUrl,
               s.joined_at AS joinedAt, r.rating_avg AS ratingAvg,
               COALESCE(r.total_reviews, 0) AS totalReviews,
               COALESCE(r.five_star_count, 0) AS fiveStarCount,
               COALESCE(j.completed, 0) AS totalCompletedJobs,
               COALESCE(j.primary_jobs, 0) AS primaryJobs,
               COALESCE(j.assistant_jobs, 0) AS assistantJobs,
               (SELECT AVG(rating) FROM valid_reviews) AS agencyRating
        FROM agency_schema.agency_staff s
        JOIN mua_schema.mua_profiles mp ON mp.id = s.mua_id
        JOIN auth_schema.users u ON u.id = mp.user_id
        LEFT JOIN ratings r ON r.staff_id = s.id
        LEFT JOIN jobs j ON j.staff_id = s.id
        WHERE s.agency_id = :agencyId AND s.is_active = true AND s.status = 'ACTIVE'
        ORDER BY s.id
        """, nativeQuery = true)
    List<StaffLeaderboardProjection> findStaffLeaderboard(
            @Param("agencyId") Long agencyId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}
