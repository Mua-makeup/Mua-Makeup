package com.makeup.platform.service.pricing.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.PricingConstants;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.catalog.CalculateSurchargeReq;
import com.makeup.platform.dto.request.pricing.CalculateDistanceReq;
import com.makeup.platform.dto.request.pricing.PreviewInvoiceReq;
import com.makeup.platform.dto.response.catalog.SurchargeCalculationRes;
import com.makeup.platform.dto.response.catalog.SurchargeDetailRes;
import com.makeup.platform.dto.response.pricing.DistanceMatrixRes;
import com.makeup.platform.dto.response.pricing.InvoicePreviewRes;
import com.makeup.platform.dto.response.pricing.SurchargeBreakdownItemRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.catalog.PackageItemEntity;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.entity.catalog.SurchargeEntity;
import com.makeup.platform.entity.catalog.SurchargeType;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.telemetry.AgencyBranchEntity;
import com.makeup.platform.entity.telemetry.TelemetryLogEntity;
import com.makeup.platform.mapper.pricing.InvoicePreviewMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.catalog.PackageItemRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.repository.catalog.SurchargeRepository;
import com.makeup.platform.repository.telemetry.AgencyBranchRepository;
import com.makeup.platform.repository.telemetry.TelemetryLogRepository;
import com.makeup.platform.service.catalog.SurchargeService;
import com.makeup.platform.service.pricing.DistanceFeeService;
import com.makeup.platform.service.pricing.DynamicPricingService;
import com.makeup.platform.service.pricing.MapsClientService;
import com.makeup.platform.service.pricing.SurgePricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DynamicPricingServiceImpl implements DynamicPricingService {

    private final ServicePackageRepository servicePackageRepository;
    private final PackageItemRepository packageItemRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final AgencyProfileRepository agencyProfileRepository;
    private final SurchargeRepository surchargeRepository;
    private final SurchargeService surchargeService;
    private final MapsClientService mapsClientService;
    private final DistanceFeeService distanceFeeService;
    private final SurgePricingService surgePricingService;
    private final InvoicePreviewMapper invoicePreviewMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final TelemetryLogRepository telemetryLogRepository;
    private final AgencyBranchRepository agencyBranchRepository;

    public record ResolvedLocation(BigDecimal latitude, BigDecimal longitude, String source) {}

    @Override
    public InvoicePreviewRes calculatePreviewInvoice(PreviewInvoiceReq req) {
        // 1. Kiểm tra gói dịch vụ
        ServicePackageEntity pkg = servicePackageRepository.findById(req.getPackageId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_PACKAGE_NOT_FOUND,
                        "catalog.package_not_found",
                        req.getPackageId()
                ));

        if (Boolean.FALSE.equals(pkg.getIsAvailable())) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_PACKAGE_NOT_AVAILABLE,
                    "pricing.package_not_available",
                    HttpStatus.BAD_REQUEST
            );
        }

        // 2. Tính tiền dịch vụ cơ bản và các add-on
        List<PackageItemEntity> addOns = new ArrayList<>();
        BigDecimal addOnsTotal = BigDecimal.ZERO;

        if (req.getAddOnItemIds() != null && !req.getAddOnItemIds().isEmpty()) {
            addOns = packageItemRepository.findAllById(req.getAddOnItemIds());
            for (PackageItemEntity item : addOns) {
                if (item.getServicePackage() == null || !item.getServicePackage().getId().equals(pkg.getId())) {
                    throw new CustomBusinessException(
                            ErrorCodes.ERR_ADDON_NOT_IN_PACKAGE,
                            "pricing.addon_not_in_package",
                            HttpStatus.BAD_REQUEST
                    );
                }
                addOnsTotal = addOnsTotal.add(item.getItemPrice());
            }
        }

        BigDecimal serviceSubtotal = pkg.getPrice().add(addOnsTotal).setScale(2, RoundingMode.HALF_UP);

        // 3. Phân giải tọa độ & bán kính Provider theo chuẩn 4 Tầng Ưu tiên (Hierarchy of Fallback)
        boolean isAgency = "AGENCY".equalsIgnoreCase(req.getProviderType());
        BigDecimal maxServiceRadiusKm = PricingConstants.DEFAULT_MAX_SERVICE_RADIUS_KM;
        BigDecimal freeRadiusKm = PricingConstants.DEFAULT_FREE_RADIUS_KM;
        BigDecimal pricePerKm = PricingConstants.DEFAULT_PRICE_PER_KM;

        MuaProfileEntity mua = null;
        AgencyProfileEntity agency = null;

        if (isAgency) {
            agency = agencyProfileRepository.findById(req.getProviderId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCodes.ERR_AGENCY_NOT_FOUND,
                            "ERR_AGENCY_NOT_FOUND",
                            req.getProviderId()
                    ));

            List<SurchargeDetailRes> agencySurcharges = surchargeService.listSurchargesByOwner(agency.getId(), null);
            if (agencySurcharges != null) {
                for (SurchargeDetailRes s : agencySurcharges) {
                    if (s.getSurchargeType() == SurchargeType.OUT_OF_RADIUS && s.getAmount() != null) {
                        pricePerKm = s.getAmount();
                        break;
                    }
                }
            }
        } else {
            mua = muaProfileRepository.findById(req.getProviderId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                            "ERR_MUA_PROFILE_NOT_FOUND",
                            req.getProviderId()
                    ));

            if (mua.getMaxServiceRadiusKm() != null) {
                maxServiceRadiusKm = mua.getMaxServiceRadiusKm();
            }

            List<SurchargeDetailRes> muaSurcharges = surchargeService.listSurchargesByOwner(null, mua.getId());
            if (muaSurcharges != null) {
                for (SurchargeDetailRes s : muaSurcharges) {
                    if (s.getSurchargeType() == SurchargeType.OUT_OF_RADIUS && s.getAmount() != null) {
                        pricePerKm = s.getAmount();
                        break;
                    }
                }
            }
        }

        ResolvedLocation providerLocation = resolveProviderLocation(isAgency, req.getProviderId(), mua, agency);
        log.info("Resolved provider location: [{}, {}] via source: {}",
                providerLocation.latitude(), providerLocation.longitude(), providerLocation.source());

        // 4. Đo khoảng cách & tính phí di chuyển (Distance Fee)
        DistanceMatrixRes matrix = mapsClientService.getDistanceAndDuration(
                providerLocation.latitude(), providerLocation.longitude(),
                req.getCustomerLatitude(), req.getCustomerLongitude()
        );

        InvoicePreviewRes.DistanceInfo distanceInfo = distanceFeeService.calculateDistanceFee(
                matrix.getDistanceKm(),
                matrix.getDurationMinutes(),
                matrix.getRoutingProvider(),
                maxServiceRadiusKm,
                freeRadiusKm,
                pricePerKm
        );

        // 5. Đánh giá phụ trội cao điểm (Surge Pricing & Realtime Demand/Supply)
        boolean isProviderSurgeEnabled = isAgency
                ? (agency.getIsSurgeEnabled() == null || agency.getIsSurgeEnabled())
                : (mua.getIsSurgeEnabled() == null || mua.getIsSurgeEnabled());

        InvoicePreviewRes.SurgePricingInfo surgeInfo;
        if (isProviderSurgeEnabled) {
            surgeInfo = surgePricingService.calculateSurge(
                    serviceSubtotal,
                    req.getBookingTime(),
                    "ALL",
                    req.getCustomerLatitude(),
                    req.getCustomerLongitude()
            );
        } else {
            surgeInfo = InvoicePreviewRes.SurgePricingInfo.builder()
                    .isSurgeApplied(false)
                    .multiplier(BigDecimal.valueOf(1.00).setScale(2, RoundingMode.HALF_UP))
                    .surgeReason("Nhà cung cấp không áp dụng tăng giá cao điểm")
                    .surgeAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                    .demandCount(0)
                    .supplyCount(0)
                    .demandRatio(BigDecimal.ONE)
                    .surgeType("DISABLED_BY_PROVIDER")
                    .build();
        }

        // 6. Tính phụ phí làm sớm (EARLY_MORNING) & ngày lễ (HOLIDAY) qua SurchargeService
        CalculateSurchargeReq surchargeReq = CalculateSurchargeReq.builder()
                .agencyId(isAgency ? req.getProviderId() : null)
                .muaId(!isAgency ? req.getProviderId() : null)
                .bookingTime(req.getBookingTime())
                .distanceKm(matrix.getDistanceKm())
                .build();

        SurchargeCalculationRes surchargeCalc = surchargeService.calculateSurcharges(surchargeReq);
        List<SurchargeBreakdownItemRes> surchargesBreakdown = new ArrayList<>();
        BigDecimal totalSurchargesAmount = BigDecimal.ZERO;

        if (surchargeCalc != null && surchargeCalc.getAppliedSurcharges() != null) {
            for (SurchargeCalculationRes.AppliedSurchargeItem item : surchargeCalc.getAppliedSurcharges()) {
                if (item.getSurchargeType() != SurchargeType.OUT_OF_RADIUS) {
                    surchargesBreakdown.add(SurchargeBreakdownItemRes.builder()
                            .type(item.getSurchargeType())
                            .description(item.getDescription())
                            .amount(item.getAmount())
                            .build());
                    totalSurchargesAmount = totalSurchargesAmount.add(item.getAmount());
                }
            }
        }

        // 7. Xử lý Voucher / Khuyến mãi nếu có
        InvoicePreviewRes.DiscountInfo discountInfo = null;
        BigDecimal discountAmount = BigDecimal.ZERO;

        if (req.getVoucherCode() != null && !req.getVoucherCode().isBlank()) {
            String code = req.getVoucherCode().trim().toUpperCase();
            if ("NEWYEAR2027".equals(code)) {
                discountAmount = BigDecimal.valueOf(100000.00);
                discountInfo = InvoicePreviewRes.DiscountInfo.builder()
                        .voucherCode(code)
                        .discountAmount(discountAmount)
                        .description("Ưu đãi đón xuân 2027 (-100,000đ)")
                        .build();
            } else {
                discountInfo = InvoicePreviewRes.DiscountInfo.builder()
                        .voucherCode(code)
                        .discountAmount(BigDecimal.ZERO)
                        .description("Mã giảm giá không áp dụng được cho đơn này")
                        .build();
            }
        }

        // 8. Tính tổng tiền & Tiền đặt cọc Escrow 30%
        BigDecimal totalAmount = serviceSubtotal
                .add(surgeInfo.getSurgeAmount())
                .add(distanceInfo.getDistanceFee())
                .add(totalSurchargesAmount)
                .subtract(discountAmount);

        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            totalAmount = BigDecimal.ZERO;
        }
        totalAmount = totalAmount.setScale(2, RoundingMode.HALF_UP);

        BigDecimal rawDeposit = totalAmount.multiply(PricingConstants.ESCROW_DEPOSIT_RATIO);
        BigDecimal depositRequiredAmount = rawDeposit.divide(BigDecimal.valueOf(1000), 0, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(1000))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal remainingPayableAmount = totalAmount.subtract(depositRequiredAmount).setScale(2, RoundingMode.HALF_UP);

        InvoicePreviewRes.FinancialSummary financialSummary = invoicePreviewMapper.toFinancialSummary(
                totalAmount,
                PricingConstants.ESCROW_DEPOSIT_RATIO,
                depositRequiredAmount,
                remainingPayableAmount
        );

        return invoicePreviewMapper.buildInvoice(
                pkg,
                addOns,
                serviceSubtotal,
                distanceInfo,
                surgeInfo,
                surchargesBreakdown,
                totalSurchargesAmount,
                discountInfo,
                financialSummary
        );
    }

    @Override
    public DistanceMatrixRes calculateDistance(CalculateDistanceReq req) {
        return mapsClientService.getDistanceAndDuration(
                req.getOriginLatitude(),
                req.getOriginLongitude(),
                req.getDestinationLatitude(),
                req.getDestinationLongitude()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.makeup.platform.dto.response.pricing.ProviderOptionRes> getAvailableProviders() {
        List<com.makeup.platform.dto.response.pricing.ProviderOptionRes> list = new ArrayList<>();

        // 1. Studios
        List<AgencyProfileEntity> agencies = agencyProfileRepository.findAll();
        for (AgencyProfileEntity a : agencies) {
            String addr = (a.getAddressStreet() != null ? a.getAddressStreet() : "") +
                    (a.getDistrict() != null ? (", " + a.getDistrict()) : "") +
                    (a.getCity() != null ? (", " + a.getCity()) : "");

            BigDecimal lat = null;
            BigDecimal lng = null;
            List<AgencyBranchEntity> branches = agencyBranchRepository.findByAgencyIdAndIsActiveTrue(a.getId());
            if (branches != null && !branches.isEmpty()) {
                lat = branches.get(0).getLatitude();
                lng = branches.get(0).getLongitude();
            }

            list.add(com.makeup.platform.dto.response.pricing.ProviderOptionRes.builder()
                    .id(a.getId())
                    .type("AGENCY")
                    .name(a.getAgencyName())
                    .address(addr.isBlank() ? "Trụ sở chính" : addr)
                    .latitude(lat)
                    .longitude(lng)
                    .isSurgeEnabled(a.getIsSurgeEnabled() == null || a.getIsSurgeEnabled())
                    .ratingAvg(a.getRatingAvg())
                    .build());
        }

        // 2. Freelance MUAs
        List<MuaProfileEntity> muas = muaProfileRepository.findAll();
        for (MuaProfileEntity m : muas) {
            String name = (m.getUser() != null && m.getUser().getFullName() != null)
                    ? m.getUser().getFullName()
                    : ("Chuyên viên MUA #" + m.getId());

            BigDecimal lat = m.getLastKnownLat() != null ? m.getLastKnownLat() : m.getBaseAddressLat();
            BigDecimal lng = m.getLastKnownLng() != null ? m.getLastKnownLng() : m.getBaseAddressLng();

            list.add(com.makeup.platform.dto.response.pricing.ProviderOptionRes.builder()
                    .id(m.getId())
                    .type("FREELANCER")
                    .name(name)
                    .address(m.getBaseAddressText() != null ? m.getBaseAddressText() : "Khu vực TP.HCM")
                    .latitude(lat)
                    .longitude(lng)
                    .isSurgeEnabled(m.getIsSurgeEnabled() == null || m.getIsSurgeEnabled())
                    .ratingAvg(m.getRatingAvg())
                    .build());
        }

        return list;
    }

    /**
     * Mô hình Phễu 4 Tầng Ưu tiên (Hierarchy of Fallback) chuẩn xác của On-Demand Booking:
     * - Ưu tiên 1 (Realtime): Redis GEO (geo:muas:active)
     * - Ưu tiên 2 (Database Last Known Location): last_known_lat/lng trong profile hoặc telemetry_logs
     * - Ưu tiên 3 (Base Address): base_address_lat/lng của MUA hoặc chi nhánh chính của Agency
     * - Ưu tiên 4 (Hard Reject): Ném ngoại lệ ERR_PROVIDER_LOCATION_MISSING, tuyệt đối không giả lập tọa độ.
     */
    private ResolvedLocation resolveProviderLocation(
            boolean isAgency,
            Long providerId,
            MuaProfileEntity mua,
            AgencyProfileEntity agency
    ) {
        if (!isAgency && mua != null) {
            // TẦNG 1: Realtime Stream trong Redis GEO
            try {
                List<Point> positions = redisTemplate.opsForGeo().position("geo:muas:active", String.valueOf(mua.getId()));
                if (positions != null && !positions.isEmpty() && positions.get(0) != null) {
                    return new ResolvedLocation(
                            BigDecimal.valueOf(positions.get(0).getY()),
                            BigDecimal.valueOf(positions.get(0).getX()),
                            "REDIS_GEO_REALTIME"
                    );
                }
            } catch (Exception e) {
                log.warn("Redis GEO lookup failed for MUA {}: {}", mua.getId(), e.getMessage());
            }

            // TẦNG 2: Last Known Location trong DB
            if (mua.getLastKnownLat() != null && mua.getLastKnownLng() != null) {
                return new ResolvedLocation(mua.getLastKnownLat(), mua.getLastKnownLng(), "DB_PROFILE_LAST_KNOWN");
            }

            List<TelemetryLogEntity> logs = telemetryLogRepository.findByMuaIdOrderByRecordedAtDesc(mua.getId());
            if (logs != null && !logs.isEmpty() && logs.get(0).getLatitude() != null && logs.get(0).getLongitude() != null) {
                return new ResolvedLocation(logs.get(0).getLatitude(), logs.get(0).getLongitude(), "DB_TELEMETRY_LOG_LAST_KNOWN");
            }

            // TẦNG 3: Base Working Address của MUA
            if (mua.getBaseAddressLat() != null && mua.getBaseAddressLng() != null) {
                return new ResolvedLocation(mua.getBaseAddressLat(), mua.getBaseAddressLng(), "MUA_BASE_ADDRESS");
            }
        } else if (isAgency && agency != null) {
            // TẦNG 3 (Đối với Agency): Lấy tọa độ chi nhánh chính đang hoạt động
            List<AgencyBranchEntity> branches = agencyBranchRepository.findByAgencyIdAndIsActiveTrue(agency.getId());
            if (branches != null && !branches.isEmpty()) {
                AgencyBranchEntity branch = branches.get(0);
                if (branch.getLatitude() != null && branch.getLongitude() != null) {
                    return new ResolvedLocation(branch.getLatitude(), branch.getLongitude(), "AGENCY_BRANCH_BASE_ADDRESS");
                }
            }
        }

        // TẦNG 4: Hard Reject - Không có bất kỳ dữ liệu vị trí nào
        log.warn("Unable to resolve location for provider type: {}, id: {}. Rejecting preview calculation.",
                isAgency ? "AGENCY" : "MUA", providerId);

        throw new CustomBusinessException(
                ErrorCodes.ERR_PROVIDER_LOCATION_MISSING,
                "pricing.provider_location_missing",
                HttpStatus.BAD_REQUEST
        );
    }
}
