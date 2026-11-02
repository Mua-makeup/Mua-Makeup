package com.makeup.platform.repository;

import com.makeup.platform.entity.auth.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByPhoneNumber(String phoneNumber);

    Optional<UserEntity> findByEmail(String email);

    boolean existsByPhoneNumber(String phoneNumber);

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, Long id);

    List<UserEntity> findAllByRoleName(String roleName);

    @Modifying
    @Query(value = "UPDATE auth_schema.user_roles SET role_id = :roleId WHERE user_id = :userId", nativeQuery = true)
    int updateUserRole(@Param("userId") Long userId, @Param("roleId") Integer roleId);

    @Modifying
    @Query(value = "INSERT INTO auth_schema.user_roles (user_id, role_id) VALUES (:userId, :roleId) ON CONFLICT (user_id, role_id) DO NOTHING", nativeQuery = true)
    void insertUserRole(@Param("userId") Long userId, @Param("roleId") Integer roleId);
}
