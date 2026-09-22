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

    Page<NotificationEntity> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    long countByAgencyIdAndIsReadFalse(Long agencyId);

    long countByUserIdAndIsReadFalse(Long userId);

    @Modifying
    @Query("UPDATE NotificationEntity n SET n.isRead = true WHERE n.agency.id = :agencyId AND n.isRead = false")
    void markAllAsReadByAgencyId(@Param("agencyId") Long agencyId);

    @Modifying
    @Query("UPDATE NotificationEntity n SET n.isRead = true WHERE n.user.id = :userId AND n.isRead = false")
    void markAllAsReadByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM NotificationEntity n WHERE n.agency.id = :agencyId")
    void deleteAllByAgencyId(@Param("agencyId") Long agencyId);

    @Modifying
    @Query("DELETE FROM NotificationEntity n WHERE n.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}
