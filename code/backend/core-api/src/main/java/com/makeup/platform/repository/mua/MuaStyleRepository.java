package com.makeup.platform.repository.mua;

import com.makeup.platform.entity.mua.MuaStyleEntity;
import com.makeup.platform.entity.mua.MuaStyleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MuaStyleRepository extends JpaRepository<MuaStyleEntity, MuaStyleId> {

    @Query("SELECT m FROM MuaStyleEntity m WHERE m.id.muaId = :muaId")
    List<MuaStyleEntity> findAllByMuaProfileId(@Param("muaId") Long muaId);


    @Modifying
    @Query("DELETE FROM MuaStyleEntity m WHERE m.id.muaId = :muaId")
    void deleteAllByMuaId(@Param("muaId") Long muaId);

    boolean existsByIdMuaIdAndIdStyleId(Long muaId, Integer styleId);
}
