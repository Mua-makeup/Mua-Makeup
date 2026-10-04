package com.makeup.platform.controller.customer;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.utils.SecurityContextUtils;
import com.makeup.platform.dto.request.customer.SaveCustomerAddressReq;
import com.makeup.platform.dto.response.customer.CustomerAddressRes;
import com.makeup.platform.service.customer.CustomerAddressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/customer/addresses")
@RequiredArgsConstructor
public class CustomerAddressController extends BaseController {

    private final CustomerAddressService customerAddressService;

    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<List<CustomerAddressRes>>> getSavedAddresses() {
        Long userId = SecurityContextUtils.getCurrentUserId();
        List<CustomerAddressRes> addresses = customerAddressService.getSavedAddresses(userId);
        return ok(addresses, "customer_address.fetch_success");
    }

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<CustomerAddressRes>> createAddress(
            @Valid @RequestBody SaveCustomerAddressReq req) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        CustomerAddressRes res = customerAddressService.createAddress(userId, req);
        return created(res, "customer_address.create_success");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<CustomerAddressRes>> updateAddress(
            @PathVariable("id") Long id,
            @Valid @RequestBody SaveCustomerAddressReq req) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        CustomerAddressRes res = customerAddressService.updateAddress(userId, id, req);
        return ok(res, "customer_address.update_success");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<Void>> deleteAddress(
            @PathVariable("id") Long id) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        customerAddressService.deleteAddress(userId, id);
        return ok(null, "customer_address.delete_success");
    }

    @PatchMapping("/{id}/default")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<CustomerAddressRes>> setDefaultAddress(
            @PathVariable("id") Long id) {
        Long userId = SecurityContextUtils.getCurrentUserId();
        CustomerAddressRes res = customerAddressService.setDefaultAddress(userId, id);
        return ok(res, "customer_address.set_default_success");
    }
}
