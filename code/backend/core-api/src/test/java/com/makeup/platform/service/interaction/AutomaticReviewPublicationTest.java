package com.makeup.platform.service.interaction;

import com.makeup.platform.service.interaction.impl.ReviewServiceImpl;
import com.makeup.platform.repository.interaction.ReviewRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.mapper.interaction.ReviewMapper;
import com.makeup.platform.service.media.MediaStorageService;
import com.makeup.platform.entity.booking.*;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.interaction.*;
import com.makeup.platform.dto.request.interaction.*;
import com.makeup.platform.common.event.interaction.ReviewSubmittedEvent;
import com.makeup.platform.common.exception.CustomBusinessException;
import org.springframework.context.ApplicationEventPublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import java.util.Optional;
import java.time.LocalDateTime;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class AutomaticReviewPublicationTest {
    final ReviewRepository reviews = mock(ReviewRepository.class);
    final BookingRepository bookings = mock(BookingRepository.class);
    final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    final ReviewServiceImpl service = new ReviewServiceImpl(reviews, bookings, mock(MuaProfileRepository.class), mock(ReviewMapper.class), events, mock(MediaStorageService.class));
    BookingEntity booking(BookingStatus status) {
        var b = new BookingEntity(); b.setId(1L); b.setStatus(status); b.setUpdatedAt(LocalDateTime.now());
        var customer = new UserEntity(); customer.setId(2L); b.setCustomer(customer);
        var mua = new MuaProfileEntity(); mua.setId(3L); b.setMua(mua);
        return b;
    }
    @ParameterizedTest @EnumSource(value=BookingStatus.class, names={"COMPLETED", "PAID_OUT"})
    void repeatedCustomerAndDevicePublishLowRatingImmediately(BookingStatus status) {
        when(bookings.findById(1L)).thenReturn(Optional.of(booking(status)));
        when(reviews.save(any())).thenAnswer(i -> i.getArgument(0));
        service.submitReview(2L, CreateReviewReq.builder().bookingId(1L).rating(2).deviceId("repeat-device").build(), "127.0.0.1");
        verify(reviews).save(argThat(r -> r.getStatus() == ReviewStatus.APPROVED && r.getRating() == 2 && r.getFraudRiskScore() == 0));
        verify(reviews, never()).countReviewsByDeviceIdAndMua(anyString(), anyLong());
        verify(reviews, never()).countReviewsBetweenCustomerAndMuaSince(anyLong(), anyLong(), any());
        verify(events).publishEvent(any(ReviewSubmittedEvent.class));
    }
    @Test void editingHeldReviewPublishesSameRecordAndRecalculates() {
        var b = booking(BookingStatus.PAID_OUT);
        var r = ReviewEntity.builder().booking(b).customer(b.getCustomer()).mua(b.getMua()).status(ReviewStatus.PENDING_AUDIT).rating(5).build();
        r.setId(9L); r.setCreatedAt(LocalDateTime.now());
        when(reviews.findById(9L)).thenReturn(Optional.of(r));
        when(reviews.save(r)).thenReturn(r);
        service.updateReview(2L, 9L, UpdateReviewReq.builder().rating(2).build());
        assertEquals(ReviewStatus.APPROVED, r.getStatus()); assertEquals(2, r.getRating()); assertEquals(9L, r.getId());
        verify(events).publishEvent(any(ReviewSubmittedEvent.class));
    }
    @Test void duplicateAndWrongOwnerStillRejected() {
        when(bookings.findById(1L)).thenReturn(Optional.of(booking(BookingStatus.COMPLETED)));
        var request = CreateReviewReq.builder().bookingId(1L).rating(4).build();
        assertThrows(CustomBusinessException.class, () -> service.submitReview(99L, request, null));
        when(reviews.existsByBookingId(1L)).thenReturn(true);
        assertThrows(CustomBusinessException.class, () -> service.submitReview(2L, request, null));
        verify(reviews, never()).save(any()); verifyNoInteractions(events);
    }
    @Test void deletedReviewCannotBeRepublished() {
        var b = booking(BookingStatus.PAID_OUT);
        var r = ReviewEntity.builder().booking(b).customer(b.getCustomer()).isDeleted(true).build();
        when(reviews.findById(9L)).thenReturn(Optional.of(r));
        assertThrows(CustomBusinessException.class, () -> service.updateReview(2L, 9L, UpdateReviewReq.builder().rating(5).build()));
        verify(reviews, never()).save(any());
    }
}
