package com.makeup.platform.dto.response.booking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingHistoryRes {

    private Long bookingId;
    private String bookingCode;
    private String currentStatus;
    private List<BookingHistoryLogRes> historyLogs;
}
