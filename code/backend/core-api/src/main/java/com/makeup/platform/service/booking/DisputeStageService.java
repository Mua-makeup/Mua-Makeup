package com.makeup.platform.service.booking;

import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.repository.booking.BookingHistoryRepository;
import com.makeup.platform.repository.wallet.BookingSettlementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DisputeStageService {
    private final BookingHistoryRepository historyRepository;
    private final BookingSettlementRepository settlementRepository;

    public boolean isCompletedService(BookingEntity booking) {
        // Prices and uploaded photos do not prove a service was completed.
        return booking.getStatus() == BookingStatus.COMPLETED
                || booking.getStatus() == BookingStatus.PAID_OUT
                || settlementRepository.existsByBookingId(booking.getId())
                || historyRepository.existsByBookingIdAndToStatusIn(booking.getId(),
                    List.of(BookingStatus.COMPLETED, BookingStatus.PAID_OUT));
    }

    public boolean isSettled(Long bookingId) {
        return settlementRepository.existsByBookingId(bookingId);
    }
}
