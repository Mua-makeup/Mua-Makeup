package com.makeup.platform.service.customer;

import com.makeup.platform.dto.request.customer.SaveCustomerAddressReq;
import com.makeup.platform.dto.response.customer.CustomerAddressRes;

import java.util.List;

public interface CustomerAddressService {

    List<CustomerAddressRes> getSavedAddresses(Long userId);

    CustomerAddressRes createAddress(Long userId, SaveCustomerAddressReq req);

    CustomerAddressRes updateAddress(Long userId, Long addressId, SaveCustomerAddressReq req);

    void deleteAddress(Long userId, Long addressId);

    CustomerAddressRes setDefaultAddress(Long userId, Long addressId);
}
