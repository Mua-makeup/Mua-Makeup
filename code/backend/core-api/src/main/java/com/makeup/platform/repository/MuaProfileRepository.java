package com.makeup.platform.repository;

import com.makeup.platform.entity.mua.MuaProfileEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Collection;
import java.util.List;

@Repository
public interface MuaProfileRepository extends JpaRepository<MuaProfileEntity, Long> {

    Optional<MuaProfileEntity> findByUserId(Long userId);

    Optional<MuaProfileEntity> findByMuaCode(String muaCode);

    boolean existsByMuaCode(String muaCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MuaProfileEntity m WHERE m.id = :id")
    Optional<MuaProfileEntity> findByIdForUpdate(@Param("id") Long id);
    @Query("SELECT m FROM MuaProfileEntity m LEFT JOIN FETCH m.user u LEFT JOIN FETCH u.role WHERE m.id IN :ids")
    List<MuaProfileEntity> findDispatchCandidatesByIdIn(@Param("ids") Collection<Long> ids);

    @Query("""
            SELECT DISTINCT m FROM MuaProfileEntity m
            LEFT JOIN FETCH m.user u
            LEFT JOIN FETCH u.role
            WHERE m.id IN :ids
              AND EXISTS (
                SELECT 1 FROM ServicePackageEntity sp
                WHERE sp.mua.id = m.id
                  AND sp.masterCategory.id = :categoryId
                  AND sp.isAvailable = true
              )
            """)
    List<MuaProfileEntity> findDispatchCandidatesByIdInAndCategory(
            @Param("ids") Collection<Long> ids,
            @Param("categoryId") Long categoryId);

    @Query("SELECT m FROM MuaProfileEntity m LEFT JOIN FETCH m.user WHERE m.id = :id")
    Optional<MuaProfileEntity> findWithUserById(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MuaProfileEntity m WHERE m.user.id = :userId")
    Optional<MuaProfileEntity> findByUserIdForUpdate(@Param("userId") Long userId);
}
