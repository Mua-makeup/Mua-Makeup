package com.makeup.platform.mapper.agency;

import com.makeup.platform.dto.response.agency.AgencyReviewRes;
import com.makeup.platform.dto.response.agency.AgencyReviewRes.StaffInfo;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.entity.interaction.ReviewEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class AgencyReviewMapper {

    public AgencyReviewRes toRes(ReviewEntity review) {
        if (review == null) {
            return null;
        }

        BookingEntity booking = review.getBooking();

        String bookingCode = null;
        LocalDate bookingDate = null;
        String packageName = null;
        String categoryName = null;
        String styleName = null;
        String completionPhotoUrl = null;

        if (booking != null) {
            bookingCode = booking.getBookingCode();
            bookingDate = booking.getBookingDate();
            completionPhotoUrl = booking.getCompletionPhotoUrl();

            if (booking.getServicePackage() != null) {
                packageName = booking.getServicePackage().getPackageName();
                if (booking.getServicePackage().getMasterCategory() != null) {
                    categoryName = booking.getServicePackage().getMasterCategory().getCategoryName();
                }
            }

            if (booking.getStyle() != null) {
                styleName = booking.getStyle().getStyleName();
                if (packageName == null) {
                    packageName = styleName;
                }
            }
        }

        Long customerId = null;
        String customerName = null;
        String customerPhone = null;
        String customerAvatar = null;

        if (review.getCustomer() != null) {
            customerId = review.getCustomer().getId();
            customerName = review.getCustomer().getFullName();
            customerPhone = review.getCustomer().getPhoneNumber();
            customerAvatar = review.getCustomer().getAvatarUrl();
        } else if (booking != null && booking.getCustomer() != null) {
            customerId = booking.getCustomer().getId();
            customerName = booking.getCustomer().getFullName();
            customerPhone = booking.getCustomer().getPhoneNumber();
            customerAvatar = booking.getCustomer().getAvatarUrl();
        }

        StaffInfo primaryStaff = null;
        List<StaffInfo> assistantStaff = new ArrayList<>();

        if (booking != null && booking.getStaffAssignments() != null && !booking.getStaffAssignments().isEmpty()) {
            for (BookingStaffAssignmentEntity sa : booking.getStaffAssignments()) {
                if (sa.getStatus() == AssignmentStatus.ACTIVE || sa.getStatus() == AssignmentStatus.REPLACED) {
                    StaffInfo info = buildStaffInfo(sa.getStaff(), sa.getAssignmentRole());
                    if (sa.getAssignmentRole() == AssignmentRole.PRIMARY_MUA) {
                        if (primaryStaff == null) {
                            primaryStaff = info;
                        }
                    } else if (sa.getAssignmentRole() == AssignmentRole.ASSISTANT_MUA) {
                        assistantStaff.add(info);
                    }
                }
            }
        }

        if (primaryStaff == null) {
            MuaProfileEntity mua = review.getMua() != null ? review.getMua() : (booking != null ? booking.getMua() : null);
            if (mua != null) {
                String name = mua.getUser() != null ? mua.getUser().getFullName() : null;
                String phone = mua.getUser() != null ? mua.getUser().getPhoneNumber() : null;
                String avatar = mua.getUser() != null ? mua.getUser().getAvatarUrl() : null;
                primaryStaff = StaffInfo.builder()
                        .staffId(mua.getId())
                        .name(name != null ? name : "Thợ chính Studio")
                        .phone(phone)
                        .avatarUrl(avatar)
                        .role("Thợ chính")
                        .build();
            }
        }

        List<String> imageUrls = review.getImageUrls() != null
                ? new ArrayList<>(review.getImageUrls())
                : Collections.emptyList();

        return AgencyReviewRes.builder()
                .id(review.getId())
                .bookingId(booking != null ? booking.getId() : null)
                .bookingCode(bookingCode)
                .bookingDate(bookingDate)
                .packageName(packageName)
                .categoryName(categoryName)
                .styleName(styleName)
                .customerId(customerId)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .customerAvatar(customerAvatar)
                .primaryStaff(primaryStaff)
                .assistantStaff(assistantStaff)
                .rating(review.getRating())
                .comment(review.getComment())
                .imageUrls(imageUrls)
                .completionPhotoUrl(completionPhotoUrl)
                .status(review.getStatus() != null ? review.getStatus().name() : "APPROVED")
                .createdAt(review.getCreatedAt())
                .build();
    }

    private StaffInfo buildStaffInfo(AgencyStaffEntity staff, AssignmentRole role) {
        if (staff == null) {
            return StaffInfo.builder()
                    .role(role == AssignmentRole.PRIMARY_MUA ? "Thợ chính" : "Thợ phụ")
                    .build();
        }

        Long staffId = staff.getId();
        String name = null;
        String phone = null;
        String avatar = null;

        if (staff.getMua() != null && staff.getMua().getUser() != null) {
            name = staff.getMua().getUser().getFullName();
            phone = staff.getMua().getUser().getPhoneNumber();
            avatar = staff.getMua().getUser().getAvatarUrl();
        }

        return StaffInfo.builder()
                .staffId(staffId)
                .name(name != null ? name : (role == AssignmentRole.PRIMARY_MUA ? "Thợ chính" : "Thợ phụ"))
                .phone(phone)
                .avatarUrl(avatar)
                .role(role == AssignmentRole.PRIMARY_MUA ? "Thợ chính" : "Thợ phụ")
                .build();
    }
}
