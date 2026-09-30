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
    public List<CustomerAddressRes> getSavedAddresses(Long userId) {
        log.info("Fetching saved addresses for user ID: {}", userId);
        List<CustomerSavedAddressEntity> addresses = customerSavedAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
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
            customerSavedAddressRepository.findByUserIdAndIsDefaultTrue(userId)
                    .ifPresent(currDefault -> {
                        currDefault.setIsDefault(false);
                        customerSavedAddressRepository.save(currDefault);
                    });
        }

        CustomerSavedAddressEntity entity = customerAddressMapper.toEntity(req, user);
        if (shouldBeDefault) {
            entity.setIsDefault(true);
        }

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

        final Long currentAddressId = address.getId();
        if (Boolean.TRUE.equals(req.getIsDefault()) && !Boolean.TRUE.equals(address.getIsDefault())) {
            customerSavedAddressRepository.findByUserIdAndIsDefaultTrue(userId)
                    .ifPresent(currDefault -> {
                        if (!currDefault.getId().equals(currentAddressId)) {
                            currDefault.setIsDefault(false);
                            customerSavedAddressRepository.save(currDefault);
                        }
                    });
        }

        customerAddressMapper.updateEntity(address, req);
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

        if (wasDefault) {
            List<CustomerSavedAddressEntity> remaining = customerSavedAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
            if (!remaining.isEmpty()) {
                CustomerSavedAddressEntity nextDefault = remaining.get(0);
                nextDefault.setIsDefault(true);
                customerSavedAddressRepository.save(nextDefault);
                log.info("Promoted address ID: {} as new default address for user ID: {}", nextDefault.getId(), userId);
            }
        }
    }

    @Override
    @Transactional
    public CustomerAddressRes setDefaultAddress(Long userId, Long addressId) {
        log.info("Setting address ID: {} as default for user ID: {}", addressId, userId);
        CustomerSavedAddressEntity address = customerSavedAddressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_ADDRESS_NOT_FOUND,
                        "customer_address.not_found", HttpStatus.NOT_FOUND));

        final Long targetAddressId = address.getId();
        if (!Boolean.TRUE.equals(address.getIsDefault())) {
            customerSavedAddressRepository.findByUserIdAndIsDefaultTrue(userId)
                    .ifPresent(currDefault -> {
                        if (!currDefault.getId().equals(targetAddressId)) {
                            currDefault.setIsDefault(false);
                            customerSavedAddressRepository.save(currDefault);
                        }
                    });
            address.setIsDefault(true);
            CustomerSavedAddressEntity saved = customerSavedAddressRepository.save(address);
            log.info("Address ID: {} is now default for user ID: {}", targetAddressId, userId);
            return customerAddressMapper.toRes(saved);
        }

        log.info("Address ID: {} was already default for user ID: {}", addressId, userId);
        return customerAddressMapper.toRes(address);
    }
}
