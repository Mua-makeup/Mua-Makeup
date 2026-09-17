package com.makeup.platform.repository;

import com.makeup.platform.entity.mua.MuaProfileEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MuaProfileRepository extends JpaRepository<MuaProfileEntity, Long> {

    Optional<MuaProfileEntity> findByUserId(Long userId);

    Optional<MuaProfileEntity> findByMuaCode(String muaCode);

    boolean existsByMuaCode(String muaCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MuaProfileEntity m WHERE m.id = :id")
    Optional<MuaProfileEntity> findByIdForUpdate(@Param("id") Long id);
}

