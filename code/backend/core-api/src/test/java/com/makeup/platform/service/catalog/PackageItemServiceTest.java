package com.makeup.platform.service.catalog;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.catalog.CreatePackageItemReq;
import com.makeup.platform.entity.catalog.*;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.catalog.PackageItemMapper;
import com.makeup.platform.repository.catalog.*;
import com.makeup.platform.service.catalog.helper.CatalogOwnerHelper;
import com.makeup.platform.service.catalog.impl.PackageItemServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PackageItemServiceTest {
    @Mock PackageItemRepository items;
    @Mock ServicePackageRepository packages;
    @Mock CatalogOwnerHelper owners;
    @Spy PackageItemMapper mapper = new PackageItemMapper();
    @InjectMocks PackageItemServiceImpl service;
    void ownPackage() {
        var mua = new MuaProfileEntity(); mua.setId(2L);
        var pkg = ServicePackageEntity.builder().mua(mua).estimatedDurationMinutes(60).build(); pkg.setId(1L);
        when(packages.findById(1L)).thenReturn(Optional.of(pkg));
        when(owners.resolveOwner(7L)).thenReturn(new CatalogOwnerHelper.OwnerContext(null, mua));
    }
    CreatePackageItemReq request(int duration) {
        return CreatePackageItemReq.builder().itemType(PackageItemType.COMPONENT).itemName(" Step ")
            .stepOrder(2).itemPrice(BigDecimal.ZERO).durationMinutes(duration).build();
    }
    @ParameterizedTest @CsvSource({"30,true", "31,false"})
    void componentsCannotExceedPackageDuration(int extra, boolean allowed) {
        ownPackage();
        when(items.findByServicePackageIdAndIsDeletedFalseOrderByStepOrderAsc(1L)).thenReturn(List.of(
            PackageItemEntity.builder().itemType(PackageItemType.COMPONENT).stepOrder(1).durationMinutes(30).build()));
        if (allowed) {
            when(items.save(any())).thenAnswer(i -> i.getArgument(0));
            var result = service.addItem(7L, 1L, request(extra));
            assertEquals("Step", result.getItemName());
        } else {
            assertEquals("ERR_PACKAGE_DURATION_EXCEEDED", assertThrows(CustomBusinessException.class,
                () -> service.addItem(7L, 1L, request(extra))).getErrorCode());
            verify(items, never()).save(any());
        }
    }
    @Test void duplicateStepOrderIsRejected() {
        ownPackage();
        when(items.findByServicePackageIdAndIsDeletedFalseOrderByStepOrderAsc(1L)).thenReturn(List.of(
            PackageItemEntity.builder().stepOrder(2).build()));
        assertEquals("ERR_DUPLICATE_STEP_ORDER", assertThrows(CustomBusinessException.class,
            () -> service.addItem(7L, 1L, request(10))).getErrorCode());
        verify(items, never()).save(any());
    }
    @Test void negativePriceIsRejectedBeforeWriting() {
        ownPackage(); var req = request(10); req.setItemPrice(new BigDecimal("-1"));
        assertThrows(CustomBusinessException.class, () -> service.addItem(7L, 1L, req));
        verifyNoInteractions(items);
    }
    @Test void packageOwnerCannotBeSpoofed() {
        var owner = new MuaProfileEntity(); owner.setId(2L);
        var intruder = new MuaProfileEntity(); intruder.setId(3L);
        when(packages.findById(1L)).thenReturn(Optional.of(ServicePackageEntity.builder().mua(owner).build()));
        when(owners.resolveOwner(7L)).thenReturn(new CatalogOwnerHelper.OwnerContext(null, intruder));
        assertEquals("ERR_PACKAGE_ACCESS_DENIED", assertThrows(CustomBusinessException.class,
            () -> service.addItem(7L, 1L, request(10))).getErrorCode());
        verifyNoInteractions(items);
    }
    @Test void deleteIsSoftAndDisablesItem() {
        ownPackage(); var item = PackageItemEntity.builder().isActive(true).build();
        when(items.findByIdAndServicePackageIdAndIsDeletedFalse(3L, 1L)).thenReturn(Optional.of(item));
        service.deleteItem(7L, 1L, 3L);
        assertTrue(item.getIsDeleted()); assertFalse(item.getIsActive()); verify(items).save(item);
    }
}
