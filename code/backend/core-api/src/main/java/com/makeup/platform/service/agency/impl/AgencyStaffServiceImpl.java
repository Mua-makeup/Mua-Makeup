package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.agency.AcceptInvitationReq;
import com.makeup.platform.dto.request.agency.CreateInvitationReq;
import com.makeup.platform.dto.request.agency.UpdateStaffCommissionReq;
import com.makeup.platform.dto.request.agency.UpdateStaffStatusReq;
import com.makeup.platform.dto.response.agency.AgencyInvitationRes;
import com.makeup.platform.dto.response.agency.AgencyStaffDetailRes;
import com.makeup.platform.dto.response.agency.AgencyStaffRes;
import com.makeup.platform.entity.agency.AgencyInvitationEntity;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.agency.AgencyInvitationMapper;
import com.makeup.platform.mapper.agency.AgencyStaffMapper;
import com.makeup.platform.repository.AgencyInvitationRepository;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.service.agency.AgencyStaffService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyStaffServiceImpl implements AgencyStaffService {

    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyStaffRepository agencyStaffRepository;
    private final AgencyInvitationRepository agencyInvitationRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final UserRepository userRepository;
    private final AgencyStaffMapper agencyStaffMapper;
    private final AgencyInvitationMapper agencyInvitationMapper;

    @Override
    @Transactional
    public AgencyInvitationRes createInvitation(Long userId, CreateInvitationReq req) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_USER_NOT_FOUND,
                        "ERR_USER_NOT_FOUND"
                ));

        int validDays = (req.getExpiresInDays() != null && req.getExpiresInDays() > 0) ? req.getExpiresInDays() : 7;
        String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase(Locale.ROOT);
        String inviteCode = "INV-" + agency.getAgencyCode() + "-" + randomSuffix;

        AgencyInvitationEntity invitation = AgencyInvitationEntity.builder()
                .agency(agency)
                .inviteCode(inviteCode)
                .invitedBy(user)
                .status("PENDING")
                .note(req.getNote())
                .expiresAt(LocalDateTime.now().plusDays(validDays))
                .build();

        AgencyInvitationEntity saved = agencyInvitationRepository.save(invitation);
        log.info("Created Studio invite code: code={}, agencyId={}, invitedBy={}", inviteCode, agency.getId(), userId);
        return agencyInvitationMapper.toRes(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AgencyInvitationRes> getInvitations(Long userId) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);
        List<AgencyInvitationEntity> list = agencyInvitationRepository.findByAgencyIdOrderByCreatedAtDesc(agency.getId());
        return list.stream().map(agencyInvitationMapper::toRes).toList();
    }

    @Override
    @Transactional
    public void cancelInvitation(Long userId, Long invitationId) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);
        AgencyInvitationEntity invitation = agencyInvitationRepository.findByIdAndAgencyId(invitationId, agency.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_INVITATION_NOT_FOUND,
                        "ERR_INVITATION_NOT_FOUND"
                ));

        if (!"PENDING".equalsIgnoreCase(invitation.getStatus())) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVITATION_ALREADY_USED,
                    "ERR_INVITATION_ALREADY_USED",
                    HttpStatus.BAD_REQUEST
            );
        }

        invitation.setStatus("CANCELLED");
        agencyInvitationRepository.save(invitation);
        log.info("Cancelled invite code: id={}, agencyId={}", invitationId, agency.getId());
    }

    @Override
    @Transactional
    public AgencyStaffRes acceptInvitation(Long muaUserId, AcceptInvitationReq req) {
        MuaProfileEntity mua = muaProfileRepository.findByUserId(muaUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "ERR_MUA_PROFILE_NOT_FOUND"
                ));

        AgencyInvitationEntity invitation = agencyInvitationRepository.findByInviteCode(req.getInviteCode().trim())
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_INVITATION_NOT_FOUND,
                        "ERR_INVITATION_NOT_FOUND"
                ));

        if (!"PENDING".equalsIgnoreCase(invitation.getStatus())) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVITATION_ALREADY_USED,
                    "ERR_INVITATION_ALREADY_USED",
                    HttpStatus.BAD_REQUEST
            );
        }

        if (invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            invitation.setStatus("EXPIRED");
            agencyInvitationRepository.save(invitation);
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVITATION_EXPIRED,
                    "ERR_INVITATION_EXPIRED",
                    HttpStatus.BAD_REQUEST
            );
        }

        Long agencyId = invitation.getAgency().getId();
        Optional<AgencyStaffEntity> existingStaffOpt = agencyStaffRepository.findByAgencyIdAndMuaId(agencyId, mua.getId());

        AgencyStaffEntity staff;
        if (existingStaffOpt.isPresent()) {
            AgencyStaffEntity existing = existingStaffOpt.get();
            if (Boolean.TRUE.equals(existing.getIsActive()) && "ACTIVE".equalsIgnoreCase(existing.getStatus())) {
                throw new CustomBusinessException(
                        ErrorCodes.ERR_STAFF_ALREADY_EXISTS,
                        "ERR_STAFF_ALREADY_EXISTS",
                        HttpStatus.BAD_REQUEST
                );
            }
            // Tái kích hoạt nhân viên đã từng rời Studio
            existing.setIsActive(true);
            existing.setStatus("ACTIVE");
            existing.setJoinedAt(LocalDateTime.now());
            existing.setNote("Re-joined via invite code: " + invitation.getInviteCode());
            staff = agencyStaffRepository.save(existing);
        } else {
            AgencyStaffEntity newStaff = AgencyStaffEntity.builder()
                    .agency(invitation.getAgency())
                    .mua(mua)
                    .agreedCommissionRate(null) // Dùng hoa hồng mặc định của Studio
                    .isActive(true)
                    .status("ACTIVE")
                    .note("Joined via invite code: " + invitation.getInviteCode())
                    .joinedAt(LocalDateTime.now())
                    .build();
            staff = agencyStaffRepository.save(newStaff);
        }

        // Đánh dấu mã mời đã được chấp nhận
        invitation.setStatus("ACCEPTED");
        invitation.setAcceptedByMua(mua);
        agencyInvitationRepository.save(invitation);

        log.info("MUA successfully joined Studio: muaId={}, agencyId={}, inviteCode={}",
                mua.getId(), agencyId, invitation.getInviteCode());

        return agencyStaffMapper.toRes(staff);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AgencyStaffRes> getStaffList(Long userId, Pageable pageable) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);
        Page<AgencyStaffEntity> page = agencyStaffRepository.findByAgencyId(agency.getId(), pageable);
        return page.map(agencyStaffMapper::toRes);
    }

    @Override
    @Transactional(readOnly = true)
    public AgencyStaffDetailRes getStaffDetail(Long userId, Long staffId) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);
        AgencyStaffEntity staff = agencyStaffRepository.findByIdAndAgencyIdWithMuaAndUser(staffId, agency.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "ERR_STAFF_NOT_FOUND"
                ));
        return agencyStaffMapper.toDetailRes(staff);
    }

    @Override
    @Transactional
    public AgencyStaffRes updateStaffStatus(Long userId, Long staffId, UpdateStaffStatusReq req) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);
        AgencyStaffEntity staff = agencyStaffRepository.findById(staffId)
                .filter(s -> s.getAgency().getId().equals(agency.getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "ERR_STAFF_NOT_FOUND"
                ));

        String newStatus = req.getStatus().toUpperCase(Locale.ROOT);
        staff.setStatus(newStatus);
        staff.setIsActive("ACTIVE".equals(newStatus));
        if (StringUtils.hasText(req.getNote())) {
            staff.setNote(req.getNote().trim());
        }

        AgencyStaffEntity saved = agencyStaffRepository.save(staff);
        log.info("Updated staff status: staffId={}, agencyId={}, status={}", staffId, agency.getId(), newStatus);
        return agencyStaffMapper.toRes(saved);
    }

    @Override
    @Transactional
    public AgencyStaffRes updateStaffCommission(Long userId, Long staffId, UpdateStaffCommissionReq req) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);
        AgencyStaffEntity staff = agencyStaffRepository.findById(staffId)
                .filter(s -> s.getAgency().getId().equals(agency.getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "ERR_STAFF_NOT_FOUND"
                ));

        staff.setAgreedCommissionRate(req.getAgreedCommissionRate());
        AgencyStaffEntity saved = agencyStaffRepository.save(staff);
        log.info("Updated individual staff commission: staffId={}, agencyId={}, commission={}%",
                staffId, agency.getId(), req.getAgreedCommissionRate());
        return agencyStaffMapper.toRes(saved);
    }

    @Override
    @Transactional
    public void removeStaff(Long userId, Long staffId) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);
        AgencyStaffEntity staff = agencyStaffRepository.findById(staffId)
                .filter(s -> s.getAgency().getId().equals(agency.getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "ERR_STAFF_NOT_FOUND"
                ));

        staff.setIsActive(false);
        staff.setStatus("LEFT");
        agencyStaffRepository.save(staff);
        log.info("Removed staff from Studio: staffId={}, agencyId={}", staffId, agency.getId());
    }

    private AgencyProfileEntity getAgencyByOwnerId(Long userId) {
        return agencyProfileRepository.findByOwnerId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "ERR_AGENCY_NOT_FOUND"
                ));
    }
}
