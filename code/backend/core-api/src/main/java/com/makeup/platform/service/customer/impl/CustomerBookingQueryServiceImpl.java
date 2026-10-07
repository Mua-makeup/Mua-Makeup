package com.makeup.platform.service.customer.impl;

import com.makeup.platform.dto.response.booking.BookingHistoryLogRes;
import com.makeup.platform.dto.response.booking.CustomerActiveTrackingRes;
import com.makeup.platform.dto.response.booking.CustomerBookingItemRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingHistoryEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.mapper.booking.BookingHistoryMapper;
import com.makeup.platform.mapper.booking.BookingMapper;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.booking.BookingHistoryRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.service.customer.CustomerBookingQueryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerBookingQueryServiceImpl implements CustomerBookingQueryService {

    private final BookingRepository bookingRepository;
    private final BookingDepositRepository bookingDepositRepository;
    private final BookingHistoryRepository bookingHistoryRepository;
    private final MuaProfileRepository muaProfileRepository;
    private final BookingMapper bookingMapper;
    private final BookingHistoryMapper bookingHistoryMapper;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    @Override
    @Transactional(readOnly = true)
    public List<CustomerBookingItemRes> getMyBookings(Long customerId, String statusGroup) {
        List<BookingEntity> bookings = bookingRepository.findCustomerBookings(customerId);

        if (statusGroup != null && !statusGroup.isBlank() && !"ALL".equalsIgnoreCase(statusGroup)) {
            if ("UPCOMING".equalsIgnoreCase(statusGroup)) {
                Set<BookingStatus> upcomingStatuses = Set.of(
                        BookingStatus.REQUESTED,
                        BookingStatus.PENDING_AGENCY_DISPATCH,
                        BookingStatus.AGENCY_ASSIGNED,
                        BookingStatus.ACCEPTED,
                        BookingStatus.ON_THE_WAY,
                        BookingStatus.ARRIVED,
                        BookingStatus.IN_PROGRESS
                );
                bookings = bookings.stream()
                        .filter(b -> upcomingStatuses.contains(b.getStatus()))
                        .toList();
            } else if ("HISTORY".equalsIgnoreCase(statusGroup)) {
                Set<BookingStatus> historyStatuses = Set.of(
                        BookingStatus.COMPLETED,
                        BookingStatus.PAID_OUT,
                        BookingStatus.CANCELLED,
                        BookingStatus.CANCELLED_EXPIRED,
                        BookingStatus.DISPUTED
                );
                bookings = bookings.stream()
                        .filter(b -> historyStatuses.contains(b.getStatus()))
                        .toList();
            }
        }

        List<Long> bookingIds = bookings.stream().map(BookingEntity::getId).toList();
        Set<Long> paidBookingIds = bookingIds.isEmpty()
                ? Collections.emptySet()
                : new HashSet<>(bookingDepositRepository.findPaidBookingIds(bookingIds));

        return bookings.stream()
                .map(b -> bookingMapper.toCustomerBookingRes(b, paidBookingIds.contains(b.getId())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerActiveTrackingRes getActiveTrackingBooking(Long userId) {
        List<BookingEntity> bookings = bookingRepository.findCustomerBookings(userId);
        if (bookings.isEmpty()) {
            Optional<com.makeup.platform.entity.mua.MuaProfileEntity> muaOpt = muaProfileRepository.findByUserId(userId);
            if (muaOpt.isPresent()) {
                bookings = bookingRepository.findAllFreelancerBookings(muaOpt.get().getId());
            }
        }
        if (bookings.isEmpty()) {
            return null;
        }

        Set<BookingStatus> activeStatuses = Set.of(
                BookingStatus.REQUESTED,
                BookingStatus.PENDING_AGENCY_DISPATCH,
                BookingStatus.AGENCY_ASSIGNED,
                BookingStatus.ACCEPTED,
                BookingStatus.ON_THE_WAY,
                BookingStatus.ARRIVED,
                BookingStatus.IN_PROGRESS
        );

        // Ưu tiên đơn hàng đang trong tiến trình hoạt động (Active)
        BookingEntity targetBooking = bookings.stream()
                .filter(b -> activeStatuses.contains(b.getStatus()))
                .findFirst()
                .orElse(bookings.get(0)); // Nếu không có đơn active, fallback về đơn gần nhất

        List<BookingHistoryEntity> historyList = bookingHistoryRepository
                .findByBookingIdOrderByCreatedAtAsc(targetBooking.getId());
        List<BookingHistoryLogRes> historyLogs = bookingHistoryMapper.toResList(historyList, targetBooking);

        boolean isDepositPaid = bookingDepositRepository.findPaidBookingIds(List.of(targetBooking.getId()))
                .contains(targetBooking.getId());

        Long customerId = null;
        String customerName = null;
        String customerPhone = null;
        String customerAvatar = null;
        if (targetBooking.getCustomer() != null) {
            customerId = targetBooking.getCustomer().getId();
            customerName = targetBooking.getCustomer().getFullName();
            customerPhone = targetBooking.getCustomer().getPhoneNumber();
            customerAvatar = targetBooking.getCustomer().getAvatarUrl();
        }

        Long muaId = null;
        String muaName = null;
        String muaPhone = null;
        String muaAvatar = null;
        Double muaRating = null;

        if (targetBooking.getMua() != null) {
            muaId = targetBooking.getMua().getId();
            if (targetBooking.getMua().getUser() != null) {
                muaName = targetBooking.getMua().getUser().getFullName();
                muaPhone = targetBooking.getMua().getUser().getPhoneNumber();
                muaAvatar = targetBooking.getMua().getUser().getAvatarUrl();
            }
            if (targetBooking.getMua().getRatingAvg() != null) {
                muaRating = targetBooking.getMua().getRatingAvg().doubleValue();
            }
        }

        String agencyName = null;
        String agencyAddress = null;
        if (targetBooking.getAgency() != null) {
            agencyName = targetBooking.getAgency().getAgencyName();
            StringBuilder sb = new StringBuilder();
            if (targetBooking.getAgency().getAddressStreet() != null) sb.append(targetBooking.getAgency().getAddressStreet());
            if (targetBooking.getAgency().getDistrict() != null) {
                if (!sb.isEmpty()) sb.append(", ");
                sb.append(targetBooking.getAgency().getDistrict());
            }
            if (targetBooking.getAgency().getCity() != null) {
                if (!sb.isEmpty()) sb.append(", ");
                sb.append(targetBooking.getAgency().getCity());
            }
            agencyAddress = sb.isEmpty() ? agencyName : sb.toString();
        }

        String packageName = targetBooking.getServicePackage() != null
                ? targetBooking.getServicePackage().getPackageName()
                : null;
        String styleName = targetBooking.getStyle() != null
                ? targetBooking.getStyle().getStyleName()
                : null;

        BigDecimal totalAmount = targetBooking.getTotalAmount() != null
                ? targetBooking.getTotalAmount()
                : BigDecimal.ZERO;
        BigDecimal depositAmount = targetBooking.getDepositAmount() != null
                ? targetBooking.getDepositAmount()
                : BigDecimal.ZERO;
        BigDecimal remainingAmount = totalAmount.subtract(depositAmount).max(BigDecimal.ZERO);

        String bookingDateStr = targetBooking.getBookingDate() != null
                ? targetBooking.getBookingDate().format(DATE_FORMATTER)
                : null;
        String startTimeStr = targetBooking.getStartTime() != null
                ? targetBooking.getStartTime().format(TIME_FORMATTER)
                : null;

        return CustomerActiveTrackingRes.builder()
                .bookingId(targetBooking.getId())
                .bookingCode(targetBooking.getBookingCode())
                .currentStatus(targetBooking.getStatus() != null ? targetBooking.getStatus().name() : null)
                .bookingType(targetBooking.getBookingType() != null ? targetBooking.getBookingType().name() : null)
                .destinationAddress(targetBooking.getDestinationAddress())
                .destinationLatitude(targetBooking.getDestinationLatitude())
                .destinationLongitude(targetBooking.getDestinationLongitude())
                .bookingDate(bookingDateStr)
                .startTime(startTimeStr)
                .customerId(customerId)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .customerAvatar(customerAvatar)
                .muaId(muaId)
                .muaName(muaName)
                .muaPhone(muaPhone)
                .muaAvatar(muaAvatar)
                .muaRating(muaRating)
                .agencyName(agencyName)
                .agencyAddress(agencyAddress)
                .packageName(packageName)
                .styleName(styleName)
                .totalAmount(totalAmount)
                .depositAmount(depositAmount)
                .remainingAmount(remainingAmount)
                .isDepositPaid(isDepositPaid)
                .historyLogs(historyLogs)
                .build();
    }
}
