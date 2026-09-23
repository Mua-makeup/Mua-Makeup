package com.makeup.platform.dto.response.maps;

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
public class PlaceSuggestionRes {

    private String description;
    private String placeId;
    private String mainText;
    private String secondaryText;
}
