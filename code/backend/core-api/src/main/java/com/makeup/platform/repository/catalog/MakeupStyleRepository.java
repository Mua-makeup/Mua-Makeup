package com.makeup.platform.repository.catalog;

import com.makeup.platform.entity.catalog.MakeupStyleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MakeupStyleRepository extends JpaRepository<MakeupStyleEntity, Integer> {

    List<MakeupStyleEntity> findAllByIsActiveTrueOrderByStyleNameAsc();

    Optional<MakeupStyleEntity> findByStyleCode(String styleCode);

    boolean existsByStyleCode(String styleCode);
}
