package com.makeup.platform.repository;

import com.makeup.platform.entity.agency.AgencyInvitationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AgencyInvitationRepository extends JpaRepository<AgencyInvitationEntity, Long> {

    Optional<AgencyInvitationEntity> findByInviteCodeAndStatus(String inviteCode, String status);

    Optional<AgencyInvitationEntity> findByInviteCode(String inviteCode);

    List<AgencyInvitationEntity> findByAgencyIdOrderByCreatedAtDesc(Long agencyId);

    Optional<AgencyInvitationEntity> findByIdAndAgencyId(Long id, Long agencyId);
}
