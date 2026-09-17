package com.makeup.platform.repository;

import com.makeup.platform.entity.auth.RoleEntity;
import com.makeup.platform.entity.auth.RolePermissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermissionEntity, Integer> {

    List<RolePermissionEntity> findByRole(RoleEntity role);

    List<RolePermissionEntity> findByRoleId(Integer roleId);

    @Query("SELECT DISTINCT rp.permissionCode FROM RolePermissionEntity rp WHERE rp.role.id = :roleId")
    List<String> findPermissionCodesByRoleId(@Param("roleId") Integer roleId);

    @Query("SELECT DISTINCT rp.permissionCode FROM RolePermissionEntity rp WHERE rp.role.id IN :roleIds")
    List<String> findPermissionCodesByRoleIdIn(@Param("roleIds") Collection<Integer> roleIds);
}
