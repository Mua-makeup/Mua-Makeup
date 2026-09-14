package com.makeup.platform.service.agency.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.agency.AgencyInvitationRedisDto;
import com.makeup.platform.dto.request.agency.AcceptInvitationReq;
import com.makeup.platform.dto.request.agency.CreateInvitationReq;
import com.makeup.platform.dto.request.agency.ReviewStaffApplicationReq;
import com.makeup.platform.dto.request.agency.UpdateStaffCommissionReq;
import com.makeup.platform.dto.request.agency.UpdateStaffStatusReq;
import com.makeup.platform.dto.response.agency.AgencyInvitationRes;
import com.makeup.platform.dto.response.agency.AgencyStaffDetailRes;
import com.makeup.platform.dto.response.agency.AgencyStaffRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.agency.AgencyInvitationMapper;
import com.makeup.platform.mapper.agency.AgencyStaffMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.service.agency.AgencyStaffService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyStaffServiceImpl implements AgencyStaffService {

    private static final String REDIS_INVITATION_KEY_PREFIX = "agency:invitation:";
    private static final String REDIS_AGENCY_INVITATIONS_PREFIX = "agency:%d:invitations";

    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyStaffRepository agencyStaffRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final AgencyStaffMapper agencyStaffMapper;
    private final AgencyInvitationMapper agencyInvitationMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public AgencyInvitationRes createInvitation(Long userId, CreateInvitationReq req) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);

        int expireHours = (req.getExpireHours() != null && req.getExpireHours() > 0) ? req.getExpireHours() : 72;
        String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase(Locale.ROOT);
        String inviteCode = "INV-" + agency.getAgencyCode() + "-" + randomSuffix;
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusHours(expireHours);

        AgencyInvitationRedisDto redisDto = AgencyInvitationRedisDto.builder()
                .inviteCode(inviteCode)
                .agencyId(agency.getId())
                .agencyName(agency.getAgencyName())
                .invitedByUserId(userId)
                .note(req.getNote())
                .proposedCommissionRate(req.getProposedCommissionRate())
                .createdAt(now)
                .expiresAt(expiresAt)
                .build();

        try {
            String json = objectMapper.writeValueAsString(redisDto);
            String key = REDIS_INVITATION_KEY_PREFIX + inviteCode;
            redisTemplate.opsForValue().set(key, json, Duration.ofHours(expireHours));
            redisTemplate.opsForSet().add(String.format(REDIS_AGENCY_INVITATIONS_PREFIX, agency.getId()), inviteCode);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize invitation dto to json: code={}", inviteCode, e);
            throw new CustomBusinessException(ErrorCodes.ERR_INTERNAL, "Không thể tạo mã mời", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        log.info("Created Studio invite code in Redis: code={}, agencyId={}, ownerId={}, expireHours={}",
                inviteCode, agency.getId(), userId, expireHours);
        return agencyInvitationMapper.toRes(redisDto);
    }

    @Override
    public List<AgencyInvitationRes> getInvitations(Long userId) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);
        String setKey = String.format(REDIS_AGENCY_INVITATIONS_PREFIX, agency.getId());
        Set<Object> inviteCodes = redisTemplate.opsForSet().members(setKey);
        if (inviteCodes == null || inviteCodes.isEmpty()) {
            return List.of();
        }

        List<AgencyInvitationRes> list = new ArrayList<>();
        for (Object codeObj : inviteCodes) {
            String inviteCode = codeObj.toString();
            String key = REDIS_INVITATION_KEY_PREFIX + inviteCode;
            Object val = redisTemplate.opsForValue().get(key);
            if (val == null) {
                // Đã hết hạn TTL trong Redis, dọn dẹp khỏi Set
                redisTemplate.opsForSet().remove(setKey, inviteCode);
            } else {
                try {
                    AgencyInvitationRedisDto dto = objectMapper.readValue(val.toString(), AgencyInvitationRedisDto.class);
                    list.add(agencyInvitationMapper.toRes(dto));
                } catch (JsonProcessingException e) {
                    log.warn("Failed to deserialize invitation from Redis: key={}", key, e);
                }
            }
        }
        list.sort(Comparator.comparing(AgencyInvitationRes::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return list;
    }

    @Override
    public void cancelInvitation(Long userId, String inviteCode) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);
        String key = REDIS_INVITATION_KEY_PREFIX + inviteCode.trim();
        String setKey = String.format(REDIS_AGENCY_INVITATIONS_PREFIX, agency.getId());

        Object val = redisTemplate.opsForValue().get(key);
        if (val == null) {
            redisTemplate.opsForSet().remove(setKey, inviteCode.trim());
            throw new ResourceNotFoundException(
                    ErrorCodes.ERR_INVITATION_NOT_FOUND,
                    "ERR_INVITATION_NOT_FOUND"
            );
        }

        try {
            AgencyInvitationRedisDto dto = objectMapper.readValue(val.toString(), AgencyInvitationRedisDto.class);
            if (!dto.getAgencyId().equals(agency.getId())) {
                throw new CustomBusinessException(
                        ErrorCodes.ERR_AGENCY_ACCESS_DENIED,
                        "ERR_AGENCY_ACCESS_DENIED",
                        HttpStatus.FORBIDDEN
                );
            }
        } catch (JsonProcessingException e) {
            log.warn("Error reading invitation json on cancel: key={}", key, e);
        }

        redisTemplate.delete(key);
        redisTemplate.opsForSet().remove(setKey, inviteCode.trim());
        log.info("Cancelled invite code from Redis: code={}, agencyId={}", inviteCode, agency.getId());
    }

    @Override
    @Transactional
    public AgencyStaffRes acceptInvitation(Long muaUserId, AcceptInvitationReq req) {
        MuaProfileEntity mua = muaProfileRepository.findByUserId(muaUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "ERR_MUA_PROFILE_NOT_FOUND"
                ));

        String inviteCode = req.getInviteCode().trim();
        String key = REDIS_INVITATION_KEY_PREFIX + inviteCode;
        Object val = redisTemplate.opsForValue().get(key);
        if (val == null) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVITATION_NOT_FOUND,
                    "ERR_INVITATION_NOT_FOUND",
                    HttpStatus.BAD_REQUEST
            );
        }

        AgencyInvitationRedisDto invitationDto;
        try {
            invitationDto = objectMapper.readValue(val.toString(), AgencyInvitationRedisDto.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to parse invitation from Redis: key={}", key, e);
            throw new CustomBusinessException(ErrorCodes.ERR_INTERNAL, "ERR_INTERNAL", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (invitationDto.getExpiresAt() != null && invitationDto.getExpiresAt().isBefore(LocalDateTime.now())) {
            redisTemplate.delete(key);
            redisTemplate.opsForSet().remove(String.format(REDIS_AGENCY_INVITATIONS_PREFIX, invitationDto.getAgencyId()), inviteCode);
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVITATION_EXPIRED,
                    "ERR_INVITATION_EXPIRED",
                    HttpStatus.BAD_REQUEST
            );
        }

        Long agencyId = invitationDto.getAgencyId();
        AgencyProfileEntity agency = agencyProfileRepository.findById(agencyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "ERR_AGENCY_NOT_FOUND"
                ));

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
            if ("PENDING".equalsIgnoreCase(existing.getStatus())) {
                throw new CustomBusinessException(
                        ErrorCodes.ERR_STAFF_ALREADY_EXISTS,
                        "Đơn xin gia nhập của bạn đang chờ Studio xét duyệt",
                        HttpStatus.BAD_REQUEST
                );
            }
            // Thợ từng nghỉ việc hoặc bị từ chối trước đó -> nộp đơn lại vào trạng thái PENDING chờ duyệt
            existing.setIsActive(false);
            existing.setStatus("PENDING");
            existing.setAgreedCommissionRate(invitationDto.getProposedCommissionRate());
            existing.setJoinedAt(LocalDateTime.now());
            existing.setNote("Nộp lại đơn xin gia nhập qua mã mời: " + inviteCode);
            staff = agencyStaffRepository.save(existing);
        } else {
            // Đơn mới: lưu trạng thái PENDING, isActive = false chờ Studio duyệt
            AgencyStaffEntity newStaff = AgencyStaffEntity.builder()
                    .agency(agency)
                    .mua(mua)
                    .agreedCommissionRate(invitationDto.getProposedCommissionRate())
                    .isActive(false)
                    .status("PENDING")
                    .note("Chờ duyệt - Nộp đơn xin gia nhập qua mã mời: " + inviteCode)
                    .joinedAt(LocalDateTime.now())
                    .build();
            staff = agencyStaffRepository.save(newStaff);
        }

        // Giữ mã mời trong Redis để nhiều thợ có thể cùng nộp đơn gia nhập cho đến khi hết hạn TTL hoặc bị chủ Studio hủy
        log.info("MUA successfully applied to Studio via Redis invite (PENDING): muaId={}, agencyId={}, inviteCode={}",
                mua.getId(), agencyId, inviteCode);

        return agencyStaffMapper.toRes(staff);
    }

    @Override
    @Transactional
    public AgencyStaffRes reviewStaffApplication(Long userId, Long staffId, ReviewStaffApplicationReq req) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);
        AgencyStaffEntity staff = agencyStaffRepository.findById(staffId)
                .filter(s -> s.getAgency().getId().equals(agency.getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "ERR_STAFF_NOT_FOUND"
                ));

        String decision = req.getDecision().toUpperCase(Locale.ROOT);
        if ("APPROVE".equals(decision)) {
            staff.setStatus("ACTIVE");
            staff.setIsActive(true);
            if (req.getAgreedCommissionRate() != null) {
                staff.setAgreedCommissionRate(req.getAgreedCommissionRate());
            }
            staff.setNote(StringUtils.hasText(req.getNote()) ? req.getNote().trim() : "Đã được Studio phê duyệt");
            log.info("Studio APPROVED staff application: staffId={}, agencyId={}, agreedCommission={}%",
                    staffId, agency.getId(), staff.getAgreedCommissionRate());
        } else if ("REJECT".equals(decision)) {
            staff.setStatus("REJECTED");
            staff.setIsActive(false);
            staff.setNote(StringUtils.hasText(req.getNote()) ? req.getNote().trim() : "Đơn gia nhập bị Studio từ chối");
            log.info("Studio REJECTED staff application: staffId={}, agencyId={}", staffId, agency.getId());
        } else {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_VALIDATION,
                    "Quyết định không hợp lệ. Chỉ chấp nhận APPROVE hoặc REJECT",
                    HttpStatus.BAD_REQUEST
            );
        }

        AgencyStaffEntity saved = agencyStaffRepository.save(staff);
        return agencyStaffMapper.toRes(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AgencyStaffRes> getStaffList(Long userId, String status, Pageable pageable) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);
        Page<AgencyStaffEntity> page;
        if (StringUtils.hasText(status)) {
            page = agencyStaffRepository.findByAgencyIdAndStatus(agency.getId(), status.trim().toUpperCase(Locale.ROOT), pageable);
        } else {
            page = agencyStaffRepository.findByAgencyId(agency.getId(), pageable);
        }
        return page.map(agencyStaffMapper::toRes);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AgencyStaffRes> getStaffList(Long userId, Pageable pageable) {
        return getStaffList(userId, null, pageable);
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
