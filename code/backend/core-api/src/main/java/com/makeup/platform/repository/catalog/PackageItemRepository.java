package com.makeup.platform.repository.catalog;

import com.makeup.platform.entity.catalog.PackageItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PackageItemRepository extends JpaRepository<PackageItemEntity, Long> {

    List<PackageItemEntity> findByServicePackageIdOrderByStepOrderAsc(Long packageId);

    List<PackageItemEntity> findByServicePackageIdAndIsActiveTrueOrderByStepOrderAsc(Long packageId);

    Optional<PackageItemEntity> findByIdAndServicePackageId(Long id, Long packageId);
}
