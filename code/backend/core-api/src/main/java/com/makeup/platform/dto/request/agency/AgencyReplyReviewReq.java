package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgencyReplyReviewReq {

    @NotBlank(message = "{review.reply_not_blank}")
    @Size(max = 1000, message = "{review.reply_max_length}")
    private String replyContent;
}
