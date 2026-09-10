package com.makeup.platform.repository.catalog;

import com.makeup.platform.entity.catalog.MasterCategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MasterCategoryRepository extends JpaRepository<MasterCategoryEntity, Integer> {

    List<MasterCategoryEntity> findAllByIsActiveTrueOrderByCategoryNameAsc();

    Optional<MasterCategoryEntity> findByCategoryCode(String categoryCode);

    boolean existsByCategoryCode(String categoryCode);
}
