package com.makeup.platform.repository;

import com.makeup.platform.entity.auth.CustomerSavedAddressEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerSavedAddressRepository extends JpaRepository<CustomerSavedAddressEntity, Long> {

    List<CustomerSavedAddressEntity> findByUserIdOrderByIsDefaultDescCreatedAtDesc(Long userId);

    List<CustomerSavedAddressEntity> findByUserIdAndIsDeletedFalseOrderByIsDefaultDescCreatedAtDesc(Long userId);

    Optional<CustomerSavedAddressEntity> findByIdAndUserId(Long id, Long userId);

    Optional<CustomerSavedAddressEntity> findByIdAndUserIdAndIsDeletedFalse(Long id, Long userId);

    Optional<CustomerSavedAddressEntity> findByUserIdAndIsDefaultTrue(Long userId);

    Optional<CustomerSavedAddressEntity> findByUserIdAndIsDefaultTrueAndIsDeletedFalse(Long userId);

    long countByUserId(Long userId);

    long countByUserIdAndIsDeletedFalse(Long userId);
}
