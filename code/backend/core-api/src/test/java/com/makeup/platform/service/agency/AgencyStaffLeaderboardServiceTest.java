package com.makeup.platform.service.agency;

import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.custom.projection.StaffLeaderboardProjection;
import com.makeup.platform.service.agency.impl.AgencyStaffLeaderboardServiceImpl;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class AgencyStaffLeaderboardServiceTest {
    private StaffLeaderboardProjection row(long id, int reviews, String rating, int jobs) {
        var p = mock(StaffLeaderboardProjection.class);
        when(p.getStaffId()).thenReturn(id);
        when(p.getTotalReviews()).thenReturn(reviews);
        when(p.getTotalCompletedJobs()).thenReturn(jobs);
        when(p.getRatingAvg()).thenReturn(rating == null ? null : new BigDecimal(rating));
        when(p.getAgencyRating()).thenReturn(new BigDecimal("4.5"));
        return p;
    }
    private com.makeup.platform.dto.response.agency.StaffLeaderboardRes result(StaffLeaderboardProjection... rows) {
        var agencies = mock(AgencyProfileRepository.class);
        var staff = mock(AgencyStaffRepository.class);
        var agency = new AgencyProfileEntity(); agency.setId(7L);
        when(agencies.findByOwnerId(1L)).thenReturn(Optional.of(agency));
        when(staff.findStaffLeaderboard(eq(7L), isNull(), isNull())).thenReturn(List.of(rows));
        return new AgencyStaffLeaderboardServiceImpl(agencies, staff).getStaffLeaderboard(1L, "ALL_TIME");
    }
    @Test void unratedWorkerCannotWinDespiteMoreJobs() {
        var r = result(row(1, 0, null, 9), row(2, 3, "5", 7));
        assertEquals(2L, r.getItems().get(0).getStaffId());
        assertTrue(r.getItems().stream().allMatch(i -> i.getRank() == null));
        assertNull(r.getItems().get(1).getFiveStarRate());
        assertEquals(4.5, r.getAgencyAverageRating());
    }
    @Test void onlyEligibleWorkersRankAndExactTiesShareRank() {
        var r = result(row(1, 0, null, 99), row(2, 5, "5", 1), row(3, 5, "5", 3), row(4, 6, "4", 20));
        assertEquals(List.of(1, 1, 3), r.getItems().subList(0, 3).stream().map(i -> i.getRank()).toList());
        assertEquals(4.75, r.getItems().get(0).getRankingScore());
        assertNull(r.getItems().get(3).getRank());
    }
    @Test void noReviewsDoesNotInventFiveStars() {
        var p = row(1, 0, null, 0);
        when(p.getAgencyRating()).thenReturn(null);
        var r = result(p);
        assertNull(r.getAgencyAverageRating());
        assertNull(r.getItems().get(0).getAverageRating());
        assertNull(r.getItems().get(0).getRankingScore());
    }
}
