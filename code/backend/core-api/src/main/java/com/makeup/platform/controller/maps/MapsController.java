package com.makeup.platform.controller.maps;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.response.maps.GeocodeRes;
import com.makeup.platform.service.pricing.MapsClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/maps")
@RequiredArgsConstructor
public class MapsController extends BaseController {

    private final MapsClientService mapsClientService;

    @GetMapping("/reverse-geocode")
    public ResponseEntity<ApiResponse<GeocodeRes>> reverseGeocode(
            @RequestParam("lat") BigDecimal latitude,
            @RequestParam("lng") BigDecimal longitude
    ) {
        GeocodeRes res = mapsClientService.reverseGeocode(latitude, longitude);
        return ok(res, "maps.reverse_geocode_success");
    }

    @GetMapping("/geocode")
    public ResponseEntity<ApiResponse<GeocodeRes>> geocode(
            @RequestParam("address") String address
    ) {
        GeocodeRes res = mapsClientService.geocode(address);
        return ok(res, "maps.geocode_success");
    }

    @GetMapping("/places/autocomplete")
    public ResponseEntity<ApiResponse<java.util.List<com.makeup.platform.dto.response.maps.PlaceSuggestionRes>>> getPlaceAutoComplete(
            @RequestParam("input") String input,
            @RequestParam(value = "lat", required = false) BigDecimal latitude,
            @RequestParam(value = "lng", required = false) BigDecimal longitude
    ) {
        java.util.List<com.makeup.platform.dto.response.maps.PlaceSuggestionRes> res =
                mapsClientService.getPlaceAutoComplete(input, latitude, longitude);
        return ok(res, "maps.autocomplete_success");
    }

    @GetMapping("/places/detail")
    public ResponseEntity<ApiResponse<GeocodeRes>> getPlaceDetail(
            @RequestParam("placeId") String placeId
    ) {
        GeocodeRes res = mapsClientService.getPlaceDetail(placeId);
        return ok(res, "maps.place_detail_success");
    }
}
