package com.makeup.platform.repository.interaction;

import com.makeup.platform.entity.interaction.NotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {

    Page<NotificationEntity> findByAgencyIdOrderByCreatedAtDesc(Long agencyId, Pageable pageable);

    Page<NotificationEntity> findByAgencyIdAndIsDeletedFalseOrderByCreatedAtDesc(Long agencyId, Pageable pageable);

    Page<NotificationEntity> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<NotificationEntity> findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByAgencyIdAndIsReadFalse(Long agencyId);

    long countByAgencyIdAndIsReadFalseAndIsDeletedFalse(Long agencyId);

    long countByUserIdAndIsReadFalse(Long userId);

    long countByUserIdAndIsReadFalseAndIsDeletedFalse(Long userId);

    @Modifying
    @Query("UPDATE NotificationEntity n SET n.isRead = true WHERE n.agency.id = :agencyId AND n.isRead = false AND n.isDeleted = false")
    void markAllAsReadByAgencyId(@Param("agencyId") Long agencyId);

    @Modifying
    @Query("UPDATE NotificationEntity n SET n.isRead = true WHERE n.user.id = :userId AND n.isRead = false AND n.isDeleted = false")
    void markAllAsReadByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE NotificationEntity n SET n.isDeleted = true WHERE n.agency.id = :agencyId")
    void deleteAllByAgencyId(@Param("agencyId") Long agencyId);

    @Modifying
    @Query("UPDATE NotificationEntity n SET n.isDeleted = true WHERE n.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);

    @Query("""
            SELECT n FROM NotificationEntity n
            WHERE ((:agencyId IS NOT NULL AND n.agency.id = :agencyId) OR (:agencyId IS NULL AND n.user.id = :userId))
              AND n.isDeleted = false
              AND (:isRead IS NULL OR n.isRead = :isRead)
              AND (:type IS NULL OR n.type = :type)
            ORDER BY n.createdAt DESC
            """)
    Page<NotificationEntity> findFilteredNotifications(
            @Param("userId") Long userId,
            @Param("agencyId") Long agencyId,
            @Param("isRead") Boolean isRead,
            @Param("type") String type,
            Pageable pageable);
}
