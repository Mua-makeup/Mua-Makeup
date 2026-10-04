package com.makeup.platform.mapper.customer;

import com.makeup.platform.dto.request.customer.SaveCustomerAddressReq;
import com.makeup.platform.dto.response.customer.CustomerAddressRes;
import com.makeup.platform.entity.auth.CustomerSavedAddressEntity;
import com.makeup.platform.entity.auth.UserEntity;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class CustomerAddressMapper {

    public CustomerSavedAddressEntity toEntity(SaveCustomerAddressReq req, UserEntity user) {
        if (req == null) {
            return null;
        }
        return CustomerSavedAddressEntity.builder()
                .user(user)
                .label(req.getLabel())
                .addressLine(req.getAddressLine())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .recipientName(req.getRecipientName())
                .recipientPhone(req.getRecipientPhone())
                .isDefault(Boolean.TRUE.equals(req.getIsDefault()))
                .build();
    }

    public void updateEntity(CustomerSavedAddressEntity entity, SaveCustomerAddressReq req) {
        if (entity == null || req == null) {
            return;
        }
        entity.setLabel(req.getLabel());
        entity.setAddressLine(req.getAddressLine());
        entity.setLatitude(req.getLatitude());
        entity.setLongitude(req.getLongitude());
        entity.setRecipientName(req.getRecipientName());
        entity.setRecipientPhone(req.getRecipientPhone());
        if (req.getIsDefault() != null) {
            entity.setIsDefault(req.getIsDefault());
        }
    }

    public CustomerAddressRes toRes(CustomerSavedAddressEntity entity) {
        if (entity == null) {
            return null;
        }
        return CustomerAddressRes.builder()
                .id(entity.getId())
                .label(entity.getLabel())
                .addressLine(entity.getAddressLine())
                .latitude(entity.getLatitude())
                .longitude(entity.getLongitude())
                .recipientName(entity.getRecipientName())
                .recipientPhone(entity.getRecipientPhone())
                .isDefault(entity.getIsDefault())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    public List<CustomerAddressRes> toResList(List<CustomerSavedAddressEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }
        return entities.stream().map(this::toRes).collect(Collectors.toList());
    }
}
