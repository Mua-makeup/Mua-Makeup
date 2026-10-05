package com.makeup.platform.service.customer.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.customer.SaveCustomerAddressReq;
import com.makeup.platform.dto.response.customer.CustomerAddressRes;
import com.makeup.platform.entity.auth.CustomerSavedAddressEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.mapper.customer.CustomerAddressMapper;
import com.makeup.platform.repository.CustomerSavedAddressRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.service.customer.CustomerAddressService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CustomerAddressServiceImpl implements CustomerAddressService {

    private final CustomerSavedAddressRepository customerSavedAddressRepository;
    private final UserRepository userRepository;
    private final CustomerAddressMapper customerAddressMapper;

    @Override
    @Transactional
    public List<CustomerAddressRes> getSavedAddresses(Long userId) {
        log.info("Fetching saved addresses for user ID: {}", userId);
        List<CustomerSavedAddressEntity> addresses = customerSavedAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
        if (addresses.isEmpty()) {
            return Collections.emptyList();
        }

        // Đảm bảo DUY NHẤT 1 địa chỉ mặc định
        long defaultCount = addresses.stream().filter(a -> Boolean.TRUE.equals(a.getIsDefault())).count();
        if (defaultCount != 1) {
            boolean first = true;
            for (CustomerSavedAddressEntity addr : addresses) {
                addr.setIsDefault(first);
                customerSavedAddressRepository.save(addr);
                first = false;
            }
        }
        return customerAddressMapper.toResList(addresses);
    }

    @Override
    @Transactional
    public CustomerAddressRes createAddress(Long userId, SaveCustomerAddressReq req) {
        log.info("Creating new saved address for user ID: {}, label: {}", userId, req.getLabel());
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND,
                        "auth.user_not_found", HttpStatus.NOT_FOUND));

        long count = customerSavedAddressRepository.countByUserId(userId);
        boolean shouldBeDefault = Boolean.TRUE.equals(req.getIsDefault()) || count == 0;

        if (shouldBeDefault) {
            List<CustomerSavedAddressEntity> existing = customerSavedAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
            for (CustomerSavedAddressEntity curr : existing) {
                if (Boolean.TRUE.equals(curr.getIsDefault())) {
                    curr.setIsDefault(false);
                    customerSavedAddressRepository.save(curr);
                }
            }
        }

        CustomerSavedAddressEntity entity = customerAddressMapper.toEntity(req, user);
        entity.setIsDefault(shouldBeDefault);

        entity = customerSavedAddressRepository.save(entity);
        log.info("Successfully created saved address ID: {} for user ID: {}", entity.getId(), userId);
        return customerAddressMapper.toRes(entity);
    }

    @Override
    @Transactional
    public CustomerAddressRes updateAddress(Long userId, Long addressId, SaveCustomerAddressReq req) {
        log.info("Updating saved address ID: {} for user ID: {}", addressId, userId);
        CustomerSavedAddressEntity address = customerSavedAddressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_ADDRESS_NOT_FOUND,
                        "customer_address.not_found", HttpStatus.NOT_FOUND));

        long count = customerSavedAddressRepository.countByUserId(userId);
        boolean shouldBeDefault = count == 1 || Boolean.TRUE.equals(req.getIsDefault());

        if (shouldBeDefault) {
            List<CustomerSavedAddressEntity> existing = customerSavedAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
            for (CustomerSavedAddressEntity curr : existing) {
                if (!curr.getId().equals(addressId) && Boolean.TRUE.equals(curr.getIsDefault())) {
                    curr.setIsDefault(false);
                    customerSavedAddressRepository.save(curr);
                }
            }
        }

        customerAddressMapper.updateEntity(address, req);
        address.setIsDefault(shouldBeDefault);

        CustomerSavedAddressEntity savedAddress = customerSavedAddressRepository.save(address);
        log.info("Successfully updated saved address ID: {} for user ID: {}", savedAddress.getId(), userId);
        return customerAddressMapper.toRes(savedAddress);
    }

    @Override
    @Transactional
    public void deleteAddress(Long userId, Long addressId) {
        log.info("Deleting saved address ID: {} for user ID: {}", addressId, userId);
        CustomerSavedAddressEntity address = customerSavedAddressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_ADDRESS_NOT_FOUND,
                        "customer_address.not_found", HttpStatus.NOT_FOUND));

        boolean wasDefault = Boolean.TRUE.equals(address.getIsDefault());
        customerSavedAddressRepository.delete(address);
        log.info("Successfully deleted saved address ID: {} for user ID: {}", addressId, userId);

        List<CustomerSavedAddressEntity> remaining = customerSavedAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
        if (!remaining.isEmpty()) {
            long defaultRemaining = remaining.stream().filter(a -> Boolean.TRUE.equals(a.getIsDefault())).count();
            if (wasDefault || defaultRemaining != 1) {
                boolean first = true;
                for (CustomerSavedAddressEntity rem : remaining) {
                    rem.setIsDefault(first);
                    customerSavedAddressRepository.save(rem);
                    first = false;
                }
                log.info("Promoted first remaining address as new default address for user ID: {}", userId);
            }
        }
    }

    @Override
    @Transactional
    public CustomerAddressRes setDefaultAddress(Long userId, Long addressId) {
        log.info("Setting address ID: {} as default for user ID: {}", addressId, userId);
        CustomerSavedAddressEntity target = customerSavedAddressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_ADDRESS_NOT_FOUND,
                        "customer_address.not_found", HttpStatus.NOT_FOUND));

        List<CustomerSavedAddressEntity> all = customerSavedAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
        for (CustomerSavedAddressEntity addr : all) {
            boolean isTarget = addr.getId().equals(addressId);
            if (!Boolean.valueOf(isTarget).equals(addr.getIsDefault())) {
                addr.setIsDefault(isTarget);
                customerSavedAddressRepository.save(addr);
            }
        }

        target.setIsDefault(true);
        log.info("Address ID: {} is now the sole default address for user ID: {}", addressId, userId);
        return customerAddressMapper.toRes(target);
    }
}
