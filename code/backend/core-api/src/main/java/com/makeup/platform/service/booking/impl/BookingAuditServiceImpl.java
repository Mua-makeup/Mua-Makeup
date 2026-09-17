package com.makeup.platform.service.booking.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingHistoryEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.booking.BookingHistoryRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.booking.BookingAuditService;
import com.makeup.platform.dto.response.booking.BookingHistoryRes;
import com.makeup.platform.mapper.booking.BookingHistoryMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingAuditServiceImpl implements BookingAuditService {

    private final BookingHistoryRepository bookingHistoryRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final BookingHistoryMapper bookingHistoryMapper;

    @Override
    @Transactional
    public BookingHistoryEntity logTransition(BookingEntity booking, BookingStatus fromStatus, BookingStatus toStatus, Long changedByUserId, String note) {
        UserEntity changedByUser = null;
        if (changedByUserId != null) {
            changedByUser = userRepository.findById(changedByUserId).orElse(null);
        }

        BookingHistoryEntity history = BookingHistoryEntity.builder()
                .booking(booking)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .changedByUser(changedByUser)
                .note(note)
                .build();

        log.info("[BookingAudit] Transition logged for bookingId={}, fromStatus={}, toStatus={}, userId={}",
                booking.getId(), fromStatus, toStatus, changedByUserId);

        return bookingHistoryRepository.save(history);
    }

    @Override
    @Transactional
    public BookingHistoryEntity logTransition(Long bookingId, BookingStatus fromStatus, BookingStatus toStatus, Long changedByUserId, String note) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND, "booking.not_found", HttpStatus.NOT_FOUND));

        return logTransition(booking, fromStatus, toStatus, changedByUserId, note);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingHistoryRes getBookingHistory(Long bookingId) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_BOOKING_NOT_FOUND, "booking.not_found", HttpStatus.NOT_FOUND));

        List<BookingHistoryEntity> historyList = bookingHistoryRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);
        return bookingHistoryMapper.toHistoryRes(booking, historyList);
    }
}
