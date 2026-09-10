package com.makeup.platform.service;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.catalog.CreatePackageItemReq;
import com.makeup.platform.dto.request.catalog.CreatePackageReq;
import com.makeup.platform.dto.request.catalog.UpdatePackageReq;
import com.makeup.platform.dto.response.catalog.PackageDetailRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.catalog.MasterCategoryEntity;
import com.makeup.platform.entity.catalog.PackageItemType;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.catalog.MakeupStyleRepository;
import com.makeup.platform.repository.catalog.MasterCategoryRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.service.catalog.helper.CatalogOwnerHelper;
import com.makeup.platform.service.catalog.impl.ServicePackageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServicePackageServiceImplTest {

    @Mock
    private ServicePackageRepository packageRepository;

    @Mock
    private MasterCategoryRepository masterCategoryRepository;

    @Mock
    private MakeupStyleRepository makeupStyleRepository;

    @Mock
    private CatalogOwnerHelper ownerHelper;

    @InjectMocks
    private ServicePackageServiceImpl packageService;

    private UserEntity testUser;
    private MuaProfileEntity testMua;
    private MasterCategoryEntity testCategory;
    private CatalogOwnerHelper.OwnerContext ownerContext;

    @BeforeEach
    void setUp() {
        testUser = UserEntity.builder().fullName("Nguyễn Thị Lan").build();
        testUser.setId(10L);

        testMua = MuaProfileEntity.builder()
                .user(testUser)
                .muaCode("MUA_LAN_01")
                .maxServiceRadiusKm(new BigDecimal("15.0"))
                .build();
        testMua.setId(5L);

        testCategory = MasterCategoryEntity.builder()
                .id(1)
                .categoryCode("MAKE_CO_DAU")
                .categoryName("Trang điểm Cô Dâu")
                .isActive(true)
                .build();

        ownerContext = new CatalogOwnerHelper.OwnerContext(null, testMua);
    }

    @Test
    @DisplayName("Tạo gói dịch vụ thành công cho Freelance MUA")
    void testCreatePackage_Success() {
        CreatePackageReq req = CreatePackageReq.builder()
                .masterCategoryId(1)
                .packageName("Gói Trang Điểm Cô Dâu VIP")
                .description("Trọn gói kèm làm tóc và dặm phấn")
                .price(new BigDecimal("1500000.00"))
                .estimatedDurationMinutes(90)
                .styleIds(List.of(1))
                .items(List.of(
                        CreatePackageItemReq.builder()
                                .itemType(PackageItemType.COMPONENT)
                                .itemName("Làm sạch da & Dưỡng ẩm cao cấp")
                                .stepOrder(1)
                                .itemPrice(BigDecimal.ZERO)
                                .isRequired(true)
                                .isActive(true)
                                .build()
                ))
                .build();

        when(masterCategoryRepository.findById(1)).thenReturn(Optional.of(testCategory));
        when(ownerHelper.resolveOwner(10L)).thenReturn(ownerContext);
        when(makeupStyleRepository.findAllById(any())).thenReturn(List.of());

        when(packageRepository.save(any(ServicePackageEntity.class))).thenAnswer(invocation -> {
            ServicePackageEntity saved = invocation.getArgument(0);
            saved.setId(100L);
            return saved;
        });

        PackageDetailRes res = packageService.createPackage(10L, req);

        assertNotNull(res);
        assertEquals(100L, res.getId());
        assertEquals("Gói Trang Điểm Cô Dâu VIP", res.getPackageName());
        assertEquals(new BigDecimal("1500000.00"), res.getPrice());
        assertEquals(5L, res.getMuaId());
        assertTrue(res.getIsAvailable());
        verify(packageRepository).save(any(ServicePackageEntity.class));
    }

    @Test
    @DisplayName("Tạo gói dịch vụ thất bại khi giá dưới 50.000 VNĐ")
    void testCreatePackage_PriceTooLow_ThrowsException() {
        CreatePackageReq req = CreatePackageReq.builder()
                .masterCategoryId(1)
                .packageName("Gói Trang Điểm Giá Rẻ")
                .price(new BigDecimal("30000.00"))
                .estimatedDurationMinutes(60)
                .build();

        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () ->
                packageService.createPackage(10L, req));

        assertEquals(ErrorCodes.ERR_INVALID_PACKAGE_PRICE, ex.getErrorCode());
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("Cập nhật gói dịch vụ bị từ chối nếu không phải chủ sở hữu (IDOR prevention)")
    void testUpdatePackage_AccessDenied() {
        MuaProfileEntity otherMua = MuaProfileEntity.builder().build();
        otherMua.setId(99L);
        ServicePackageEntity otherPackage = ServicePackageEntity.builder()
                .masterCategory(testCategory)
                .mua(otherMua)
                .packageName("Gói của thợ khác")
                .price(new BigDecimal("500000.00"))
                .build();
        otherPackage.setId(200L);

        when(packageRepository.findById(200L)).thenReturn(Optional.of(otherPackage));
        when(ownerHelper.resolveOwner(10L)).thenReturn(ownerContext);

        UpdatePackageReq updateReq = UpdatePackageReq.builder()
                .masterCategoryId(1)
                .packageName("Cố tình sửa gói người khác")
                .price(new BigDecimal("800000.00"))
                .estimatedDurationMinutes(60)
                .build();

        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () ->
                packageService.updatePackage(10L, 200L, updateReq));

        assertEquals(ErrorCodes.ERR_PACKAGE_ACCESS_DENIED, ex.getErrorCode());
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    @DisplayName("Bật/tắt trạng thái nhận khách của gói dịch vụ")
    void testToggleAvailability_Success() {
        ServicePackageEntity myPackage = ServicePackageEntity.builder()
                .masterCategory(testCategory)
                .mua(testMua)
                .packageName("Gói tiệc")
                .price(new BigDecimal("300000.00"))
                .isAvailable(true)
                .packageItems(new ArrayList<>())
                .styles(new HashSet<>())
                .build();
        myPackage.setId(100L);

        when(packageRepository.findById(100L)).thenReturn(Optional.of(myPackage));
        when(ownerHelper.resolveOwner(10L)).thenReturn(ownerContext);
        when(packageRepository.save(any(ServicePackageEntity.class))).thenAnswer(i -> i.getArgument(0));

        PackageDetailRes res = packageService.toggleAvailability(10L, 100L, false);

        assertNotNull(res);
        assertFalse(res.getIsAvailable());
        verify(packageRepository).save(myPackage);
    }
}
