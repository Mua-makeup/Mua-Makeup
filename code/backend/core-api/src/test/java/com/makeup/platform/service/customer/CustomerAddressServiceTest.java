package com.makeup.platform.service.customer;

import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.customer.SaveCustomerAddressReq;
import com.makeup.platform.entity.auth.*;
import com.makeup.platform.mapper.customer.CustomerAddressMapper;
import com.makeup.platform.repository.*;
import com.makeup.platform.service.customer.impl.CustomerAddressServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerAddressServiceTest {
    @Mock CustomerSavedAddressRepository addresses;
    @Mock UserRepository users;
    @Spy CustomerAddressMapper mapper = new CustomerAddressMapper();
    @InjectMocks CustomerAddressServiceImpl service;

    @ParameterizedTest @ValueSource(strings={"update", "delete", "default"})
    void cannotModifyAnAddressNotOwnedByUser(String action) {
        assertThrows(CustomBusinessException.class, () -> {
            switch(action) {
                case "update" -> service.updateAddress(1L, 99L, new SaveCustomerAddressReq());
                case "delete" -> service.deleteAddress(1L, 99L);
                default -> service.setDefaultAddress(1L, 99L);
            }
        });
        verify(addresses).findByIdAndUserIdAndIsDeletedFalse(99L, 1L);
        verify(addresses, never()).save(any());
    }
    @Test void deletingDefaultPromotesOneRemainingAddress() {
        var target = address(1L, true); var second = address(2L, false); var third = address(3L, false);
        when(addresses.findByIdAndUserIdAndIsDeletedFalse(1L, 7L)).thenReturn(Optional.of(target));
        when(addresses.findByUserIdAndIsDeletedFalseOrderByIsDefaultDescCreatedAtDesc(7L)).thenReturn(List.of(second, third));
        service.deleteAddress(7L, 1L);
        assertTrue(target.getIsDeleted()); assertFalse(target.getIsDefault());
        assertTrue(second.getIsDefault()); assertFalse(third.getIsDefault());
        verify(addresses, never()).delete(any(CustomerSavedAddressEntity.class));
    }
    @Test void choosingDefaultClearsOldDefault() {
        var old = address(1L, true); var target = address(2L, false);
        when(addresses.findByIdAndUserIdAndIsDeletedFalse(2L, 7L)).thenReturn(Optional.of(target));
        when(addresses.findByUserIdAndIsDeletedFalseOrderByIsDefaultDescCreatedAtDesc(7L)).thenReturn(List.of(old, target));
        service.setDefaultAddress(7L, 2L);
        assertFalse(old.getIsDefault()); assertTrue(target.getIsDefault());
    }
    @Test void firstAddressIsDefaultEvenWhenRequestDoesNotSelectIt() {
        var user = new UserEntity(); user.setId(7L);
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(addresses.save(any())).thenAnswer(i -> i.getArgument(0));
        var req = new SaveCustomerAddressReq(); req.setIsDefault(false);
        service.createAddress(7L, req);
        var captor = ArgumentCaptor.forClass(CustomerSavedAddressEntity.class);
        verify(addresses).save(captor.capture());
        assertTrue(captor.getValue().getIsDefault());
        assertSame(user, captor.getValue().getUser());
    }
    private CustomerSavedAddressEntity address(long id, boolean isDefault) {
        var address = new CustomerSavedAddressEntity(); address.setId(id); address.setIsDefault(isDefault); return address;
    }
}
