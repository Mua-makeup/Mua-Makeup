package com.makeup.platform.repository;

import com.makeup.platform.entity.mua.MuaProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MuaProfileRepository extends JpaRepository<MuaProfileEntity, Long> {

    Optional<MuaProfileEntity> findByUserId(Long userId);

    Optional<MuaProfileEntity> findByMuaCode(String muaCode);

    boolean existsByMuaCode(String muaCode);
}
