package com.makeup.platform.service.catalog.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.utils.HolidayUtils;
import com.makeup.platform.dto.request.catalog.CalculateSurchargeReq;
import com.makeup.platform.dto.request.catalog.ConfigureSurchargeReq;
import com.makeup.platform.dto.response.catalog.SurchargeCalculationRes;
import com.makeup.platform.dto.response.catalog.SurchargeDetailRes;
import com.makeup.platform.entity.catalog.SurchargeEntity;
import com.makeup.platform.entity.catalog.SurchargeType;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.catalog.SurchargeRepository;
import com.makeup.platform.service.catalog.SurchargeService;
import com.makeup.platform.service.catalog.helper.CatalogOwnerHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class SurchargeServiceImpl implements SurchargeService {

    private final SurchargeRepository surchargeRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final CatalogOwnerHelper ownerHelper;

    private static final LocalTime EARLY_MORNING_START = LocalTime.of(3, 0);
    private static final LocalTime EARLY_MORNING_END = LocalTime.of(5, 0);
    private static final BigDecimal DEFAULT_AGENCY_RADIUS_KM = new BigDecimal("10.0");
    private static final BigDecimal DEFAULT_MUA_RADIUS_KM = new BigDecimal("15.0");

    @Override
    public SurchargeDetailRes configureSurcharge(Long userId, ConfigureSurchargeReq req) {
        if (req.getAmount() != null && req.getAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_SURCHARGE_AMOUNT,
                    "Mức phụ phí không được nhỏ hơn 0 VNĐ", HttpStatus.BAD_REQUEST);
        }

        CatalogOwnerHelper.OwnerContext owner = ownerHelper.resolveOwner(userId);

        Optional<SurchargeEntity> existingOpt = owner.isAgency()
                ? surchargeRepository.findByAgencyIdAndSurchargeTypeAndIsActiveTrue(owner.getAgency().getId(), req.getSurchargeType())
                : surchargeRepository.findByMuaIdAndSurchargeTypeAndIsActiveTrue(owner.getMua().getId(), req.getSurchargeType());

        SurchargeEntity surcharge;
        if (existingOpt.isPresent()) {
            surcharge = existingOpt.get();
            surcharge.setSurchargeName(req.getSurchargeName().trim());
            surcharge.setAmount(req.getAmount());
            surcharge.setIsActive(req.getIsActive() != null ? req.getIsActive() : true);
        } else {
            surcharge = SurchargeEntity.builder()
                    .agency(owner.getAgency())
                    .mua(owner.getMua())
                    .surchargeName(req.getSurchargeName().trim())
                    .surchargeType(req.getSurchargeType())
                    .amount(req.getAmount())
                    .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                    .build();
        }

        SurchargeEntity saved = surchargeRepository.save(surcharge);
        return mapToRes(saved);
    }

    @Override
    public SurchargeDetailRes updateSurcharge(Long userId, Long surchargeId, ConfigureSurchargeReq req) {
        SurchargeEntity surcharge = checkSurchargeOwnership(userId, surchargeId);

        if (req.getAmount() != null && req.getAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_SURCHARGE_AMOUNT,
                    "Mức phụ phí không được nhỏ hơn 0 VNĐ", HttpStatus.BAD_REQUEST);
        }

        surcharge.setSurchargeName(req.getSurchargeName().trim());
        surcharge.setSurchargeType(req.getSurchargeType());
        surcharge.setAmount(req.getAmount());
        if (req.getIsActive() != null) {
            surcharge.setIsActive(req.getIsActive());
        }

        SurchargeEntity saved = surchargeRepository.save(surcharge);
        return mapToRes(saved);
    }

    @Override
    public void deleteSurcharge(Long userId, Long surchargeId) {
        SurchargeEntity surcharge = checkSurchargeOwnership(userId, surchargeId);
        surchargeRepository.delete(surcharge);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SurchargeDetailRes> listMySurcharges(Long userId) {
        CatalogOwnerHelper.OwnerContext owner = ownerHelper.resolveOwner(userId);
        List<SurchargeEntity> list;
        if (owner.isAgency()) {
            list = surchargeRepository.findByAgencyId(owner.getAgency().getId());
        } else {
            list = surchargeRepository.findByMuaId(owner.getMua().getId());
        }
        return list.stream().map(this::mapToRes).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SurchargeDetailRes> listSurchargesByOwner(Long agencyId, Long muaId) {
        if (agencyId != null) {
            return surchargeRepository.findByAgencyIdAndIsActiveTrue(agencyId).stream()
                    .map(this::mapToRes).toList();
        } else if (muaId != null) {
            return surchargeRepository.findByMuaIdAndIsActiveTrue(muaId).stream()
                    .map(this::mapToRes).toList();
        }
        return List.of();
    }

    @Override
    @Transactional(readOnly = true)
    public SurchargeCalculationRes calculateSurcharges(CalculateSurchargeReq req) {
        boolean hasAgency = req.getAgencyId() != null;
        boolean hasMua = req.getMuaId() != null;

        if ((hasAgency && hasMua) || (!hasAgency && !hasMua)) {
            throw new CustomBusinessException(ErrorCodes.ERR_INVALID_SURCHARGE_CALCULATION,
                    "Yêu cầu phải chỉ định chính xác một trong hai: agencyId hoặc muaId", HttpStatus.BAD_REQUEST);
        }

        List<SurchargeEntity> surcharges = hasAgency
                ? surchargeRepository.findByAgencyIdAndIsActiveTrue(req.getAgencyId())
                : surchargeRepository.findByMuaIdAndIsActiveTrue(req.getMuaId());

        List<SurchargeCalculationRes.AppliedSurchargeItem> appliedItems = new ArrayList<>();
        BigDecimal totalSurcharge = BigDecimal.ZERO;

        LocalTime time = req.getBookingTime().toLocalTime();
        LocalDate date = req.getBookingTime().toLocalDate();

        for (SurchargeEntity s : surcharges) {
            switch (s.getSurchargeType()) {
                case EARLY_MORNING -> {
                    // Check if within 03:00 - 05:00
                    if (!time.isBefore(EARLY_MORNING_START) && !time.isAfter(EARLY_MORNING_END)) {
                        appliedItems.add(SurchargeCalculationRes.AppliedSurchargeItem.builder()
                                .surchargeType(s.getSurchargeType())
                                .surchargeName(s.getSurchargeName())
                                .amount(s.getAmount())
                                .description("Phụ phí làm sớm (Khung giờ đặt: " + time + " nằm trong khoảng 03:00 - 05:00)")
                                .build());
                        totalSurcharge = totalSurcharge.add(s.getAmount());
                    }
                }
                case OUT_OF_RADIUS -> {
                    BigDecimal maxRadius = DEFAULT_AGENCY_RADIUS_KM;
                    if (hasMua) {
                        maxRadius = muaProfileRepository.findById(req.getMuaId())
                                .map(MuaProfileEntity::getMaxServiceRadiusKm)
                                .orElse(DEFAULT_MUA_RADIUS_KM);
                    }
                    if (req.getDistanceKm() != null && req.getDistanceKm().compareTo(maxRadius) > 0) {
                        BigDecimal excessKm = req.getDistanceKm().subtract(maxRadius);
                        BigDecimal travelFee = s.getAmount().multiply(excessKm).setScale(2, RoundingMode.HALF_UP);
                        appliedItems.add(SurchargeCalculationRes.AppliedSurchargeItem.builder()
                                .surchargeType(s.getSurchargeType())
                                .surchargeName(s.getSurchargeName())
                                .amount(travelFee)
                                .description("Phụ phí di chuyển vượt bán kính (" + excessKm + " km vượt quá bán kính " + maxRadius + " km)")
                                .build());
                        totalSurcharge = totalSurcharge.add(travelFee);
                    }
                }
                case HOLIDAY -> {
                    if (HolidayUtils.isHoliday(date)) {
                        String holidayName = HolidayUtils.getHolidayName(date);
                        appliedItems.add(SurchargeCalculationRes.AppliedSurchargeItem.builder()
                                .surchargeType(s.getSurchargeType())
                                .surchargeName(s.getSurchargeName())
                                .amount(s.getAmount())
                                .description("Phụ phí phục vụ ngày Lễ/Tết (" + (holidayName != null ? holidayName : date) + ")")
                                .build());
                        totalSurcharge = totalSurcharge.add(s.getAmount());
                    }
                }
                case CUSTOM -> {
                    // Custom surcharges can be included as fixed add-ons if needed
                }
            }
        }

        return SurchargeCalculationRes.builder()
                .totalSurcharge(totalSurcharge.setScale(2, RoundingMode.HALF_UP))
                .appliedSurcharges(appliedItems)
                .build();
    }

    private SurchargeEntity checkSurchargeOwnership(Long userId, Long surchargeId) {
        SurchargeEntity surcharge = surchargeRepository.findById(surchargeId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_SURCHARGE_NOT_FOUND,
                        "Không tìm thấy phụ phí với ID: " + surchargeId, HttpStatus.NOT_FOUND));

        CatalogOwnerHelper.OwnerContext owner = ownerHelper.resolveOwner(userId);

        boolean isAgencyOwner = surcharge.getAgency() != null && owner.isAgency()
                && surcharge.getAgency().getId() != null
                && surcharge.getAgency().getId().equals(owner.getAgency().getId());
        boolean isMuaOwner = surcharge.getMua() != null && owner.isMua()
                && surcharge.getMua().getId() != null
                && surcharge.getMua().getId().equals(owner.getMua().getId());

        if (!isAgencyOwner && !isMuaOwner) {
            throw new CustomBusinessException(ErrorCodes.ERR_SURCHARGE_ACCESS_DENIED,
                    "Bạn không có quyền quản lý phụ phí này", HttpStatus.FORBIDDEN);
        }

        return surcharge;
    }

    private SurchargeDetailRes mapToRes(SurchargeEntity entity) {
        return SurchargeDetailRes.builder()
                .id(entity.getId())
                .agencyId(entity.getAgency() != null ? entity.getAgency().getId() : null)
                .muaId(entity.getMua() != null ? entity.getMua().getId() : null)
                .surchargeName(entity.getSurchargeName())
                .surchargeType(entity.getSurchargeType())
                .amount(entity.getAmount())
                .isActive(entity.getIsActive())
                .build();
    }
}
