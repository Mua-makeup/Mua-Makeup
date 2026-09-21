import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Search, Navigation, Loader2, Info, X, Building, Compass } from 'lucide-react';
import { Button } from '../../base/Button';
import { useI18nStore } from '../../../store/useI18nStore';

export const LocationMapPicker = ({
  latitude,
  longitude,
  addressStreet,
  district,
  city,
  onChange,
  readOnly = false,
}) => {
  const { t } = useI18nStore();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const hasInitializedInputRef = useRef(false);
  const dropdownRef = useRef(null);
  const isTypingRef = useRef(false);
  const debounceTimerRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Smart Default coordinate based on city or address:
  const normalizedAddress = `${addressStreet || ''} ${district || ''} ${city || ''}`.toLowerCase();
  let defaultLat = 10.776889;
  let defaultLng = 106.700806;

  if (
    normalizedAddress.includes('hà nội') ||
    normalizedAddress.includes('ha noi') ||
    normalizedAddress.includes('hn')
  ) {
    defaultLat = 21.028511;
    defaultLng = 105.854167; // Hà Nội
  } else if (
    normalizedAddress.includes('đà nẵng') ||
    normalizedAddress.includes('da nang')
  ) {
    defaultLat = 16.054407;
    defaultLng = 108.202167; // Đà Nẵng
  }

  const currentLat = latitude && !isNaN(Number(latitude)) ? Number(latitude) : defaultLat;
  const currentLng = longitude && !isNaN(Number(longitude)) ? Number(longitude) : defaultLng;

  // Pre-fill / sync search query when address props arrive or change externally
  const prevAddressPropsRef = useRef('');
  useEffect(() => {
    const full = [addressStreet, district, city].filter(Boolean).join(', ');
    if (full && full !== prevAddressPropsRef.current) {
      prevAddressPropsRef.current = full;
      if (!isTypingRef.current) {
        setSearchQuery(full);
      }
      hasInitializedInputRef.current = true;
    }
  }, [addressStreet, district, city]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Initialize Leaflet Map with Esri World Street Map (100% Reliable, NO watermark, zero errors)
  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      const map = window.L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: 15,
        zoomControl: true,
      });

      // Esri World Street Map (Primary, ultra-reliable, crystal clear Vietnamese street names)
      window.L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri, DeLorme, NAVTEQ, TomTom',
          maxZoom: 19,
        }
      ).addTo(map);

      // Custom Rose/Gold Pin Icon
      const customIcon = window.L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="
          background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 4px 14px rgba(225, 29, 72, 0.45);
        ">
          <span style="transform: rotate(45deg); color: white; font-size: 14px; font-weight: bold;">🏢</span>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = window.L.marker([currentLat, currentLng], {
        draggable: !readOnly,
        icon: customIcon,
      }).addTo(map);

      // Event: Marker dragged
      if (!readOnly) {
        marker.on('dragend', (event) => {
          const position = event.target.getLatLng();
          handlePositionChange(position.lat, position.lng);
        });

        // Event: Click on map
        map.on('click', (event) => {
          const { lat, lng } = event.latlng;
          marker.setLatLng([lat, lng]);
          handlePositionChange(lat, lng);
        });
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Invalidate size on initial mount
      map.invalidateSize();
      const t1 = setTimeout(() => map.invalidateSize(), 150);
      const t2 = setTimeout(() => map.invalidateSize(), 400);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      // Update existing map and marker
      const map = mapInstanceRef.current;
      const marker = markerRef.current;
      if (map && marker) {
        marker.setLatLng([currentLat, currentLng]);
        map.flyTo([currentLat, currentLng], 16, { duration: 1.2 });
        map.invalidateSize();
      }
    }
  }, [currentLat, currentLng, readOnly]);

  // ResizeObserver to ensure tiles render when container dimension changes
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Clean up map instance on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  const handlePositionChange = (lat, lng) => {
    const formattedLat = Number(lat.toFixed(6));
    const formattedLng = Number(lng.toFixed(6));

    if (onChange) {
      onChange({
        latitude: formattedLat,
        longitude: formattedLng,
      });
    }

    // Reverse geocode to fetch human readable address
    reverseGeocode(formattedLat, formattedLng);
  };

  // Reverse Geocoding via Photon (Reliable, fast, returns POIs & Street Names)
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        const p = data.features[0].properties || {};
        const street = p.street || p.name || '';
        const districtName = p.district || p.suburb || p.locality || '';
        const cityName = p.city || p.state || 'Thành phố Hồ Chí Minh';

        if (onChange) {
          onChange({
            latitude: lat,
            longitude: lng,
            addressStreet: street.trim(),
            district: districtName.trim(),
            city: cityName.trim(),
          });
        }

        const autoDisplay = [p.name || street, districtName, cityName].filter(Boolean).join(', ');
        if (autoDisplay && !isTypingRef.current) {
          setSearchQuery(autoDisplay);
        }
      }
    } catch {
      // Ignore network failures for reverse geocode
    }
  };

  // Fetch address & POI suggestions from Photon (Google Maps style places, universities, landmarks)
  const fetchAddressSuggestions = useCallback(
    async (query) => {
      if (!query || query.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoadingSuggestions(true);
      try {
        // Bias towards current map center to prioritize nearby landmarks/streets
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          query.trim()
        )}&lat=${currentLat}&lon=${currentLng}&limit=8`;

        const res = await fetch(url);
        const data = await res.json();

        if (data && Array.isArray(data.features)) {
          const items = data.features
            .map((feat) => {
              const p = feat.properties || {};
              const geom = feat.geometry || {};
              const lng = geom.coordinates?.[0];
              const lat = geom.coordinates?.[1];
              const name = p.name || p.street || '';
              const street = p.street || (p.osm_key === 'highway' ? p.name : '') || '';
              const districtName = p.district || p.suburb || p.locality || '';
              const cityName = p.city || p.state || '';
              const country = p.country || '';

              const subtitleParts = [street !== name ? street : '', districtName, cityName, country].filter(
                Boolean
              );
              const subtitle = subtitleParts.join(', ');
              const fullLabel = [name, districtName, cityName].filter(Boolean).join(', ');

              return {
                id: `${lat}-${lng}-${p.osm_id || Math.random()}`,
                name,
                subtitle,
                label: fullLabel || name,
                street: street || name,
                district: districtName,
                city: cityName || 'Thành phố Hồ Chí Minh',
                lat: Number(lat),
                lng: Number(lng),
                type: p.osm_value || p.type || 'place',
              };
            })
            .filter((it) => it.lat && it.lng);

          setSuggestions(items);
          setShowSuggestions(items.length > 0);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [currentLat, currentLng]
  );

  // Handle typing in search input with proper debouncing
  const handleInputChange = (e) => {
    const val = e.target.value;
    isTypingRef.current = true;
    setSearchQuery(val);
    setSearchError('');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchAddressSuggestions(val);
      }, 250);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle selecting an address suggestion from dropdown
  const handleSelectSuggestion = (item) => {
    isTypingRef.current = false;
    setSearchQuery(item.label);
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchError('');

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([item.lat, item.lng], 16, { duration: 1.2 });
      markerRef.current.setLatLng([item.lat, item.lng]);
    }

    if (onChange) {
      onChange({
        latitude: item.lat,
        longitude: item.lng,
        addressStreet: item.street.trim() || item.name.trim(),
        district: item.district.trim(),
        city: item.city.trim() || 'Thành phố Hồ Chí Minh',
      });
    }
  };

  // Direct Address Search (when clicking "Find on Map" or pressing Enter)
  const handleSearchAddress = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!searchQuery.trim()) return;

    // If dropdown already has suggestions, pick the first one
    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setShowSuggestions(false);

    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        searchQuery.trim()
      )}&lat=${currentLat}&lon=${currentLng}&limit=5`;

      const res = await fetch(url);
      const data = await res.json();

      if (data && data.features && data.features.length > 0) {
        const feat = data.features[0];
        const p = feat.properties || {};
        const geom = feat.geometry || {};
        const newLng = Number(geom.coordinates?.[0]);
        const newLat = Number(geom.coordinates?.[1]);

        if (newLat && newLng) {
          const street = p.street || p.name || searchQuery.trim();
          const districtName = p.district || p.suburb || p.locality || '';
          const cityName = p.city || p.state || 'Thành phố Hồ Chí Minh';
          const fullLabel = [p.name, districtName, cityName].filter(Boolean).join(', ');

          setSearchQuery(fullLabel || searchQuery);
          isTypingRef.current = false;

          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.flyTo([newLat, newLng], 16, { duration: 1.2 });
            markerRef.current.setLatLng([newLat, newLng]);
          }

          if (onChange) {
            onChange({
              latitude: newLat,
              longitude: newLng,
              addressStreet: street.trim(),
              district: districtName.trim(),
              city: cityName.trim(),
            });
          }
          return;
        }
      }
      setSearchError(t('map_error_not_found'));
    } catch {
      setSearchError(t('map_error_not_found'));
    } finally {
      setIsSearching(false);
    }
  };

  // Device GPS Location (Reliable timeout & clear permission error)
  const handleLocateCurrentDevice = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!navigator.geolocation) {
      setSearchError(t('map_error_geolocation'));
      return;
    }

    setIsLocating(true);
    setSearchError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        const newLat = Number(lat.toFixed(6));
        const newLng = Number(lng.toFixed(6));

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([newLat, newLng], 16, { duration: 1.2 });
          markerRef.current.setLatLng([newLat, newLng]);
        }

        handlePositionChange(newLat, newLng);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setSearchError(t('map_permission_denied'));
        } else {
          setSearchError(`${t('map_error_geolocation')} (${err.message || ''})`);
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  return (
    <div className="space-y-3">
      {/* Top Search & Controls Toolbar (NO nested form tag to avoid form reloading) */}
      {!readOnly && (
        <div className="flex flex-col sm:flex-row gap-2.5 relative z-30" ref={dropdownRef}>
          <div className="flex-1 flex gap-2 relative">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSearchAddress(e);
                  } else if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder={t('map_search_placeholder')}
                className="w-full pl-9 pr-9 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-colors shadow-sm"
              />

              {/* Quick Clear Input Button */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    isTypingRef.current = false;
                    setSearchQuery('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Autocomplete Suggestions Dropdown (Like Google Maps) */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>{t('map_suggestion_title')}</span>
                    <span className="text-[10px] lowercase text-slate-400">
                      {suggestions.length} địa điểm
                    </span>
                  </div>
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-start gap-2.5 group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 group-hover:bg-rose-500 group-hover:text-white transition-all">
                        {item.type === 'university' || item.type === 'hospital' || item.type === 'building' ? (
                          <Building className="w-3.5 h-3.5" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.subtitle || item.label}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSearchAddress}
              disabled={isSearching || isLoadingSuggestions}
              icon={isSearching || isLoadingSuggestions ? Loader2 : Search}
              isLoading={isSearching || isLoadingSuggestions}
              className="shrink-0"
            >
              {isSearching ? t('map_btn_searching') : t('map_btn_search')}
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLocateCurrentDevice}
            disabled={isLocating}
            icon={isLocating ? Loader2 : Navigation}
            isLoading={isLocating}
            className="shrink-0 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 rounded-lg"
          >
            {isLocating ? t('map_btn_locating') : t('map_btn_my_location')}
          </Button>
        </div>
      )}

      {searchError && (
        <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>{searchError}</span>
        </p>
      )}

      {/* Map Container */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-900">
        <div ref={mapContainerRef} className="h-72 sm:h-96 w-full z-10" />

        {/* Floating Coordinates Tag */}
        <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-mono border border-slate-700/60 shadow-lg flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span>
            {currentLat.toFixed(5)}, {currentLng.toFixed(5)}
          </span>
          <span className="text-[10px] text-emerald-400 uppercase font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            {t('map_badge_gps_standard')}
          </span>
        </div>
      </div>

      {/* Instruction Helper */}
      {!readOnly && (
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5 leading-relaxed">
          <Compass className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
          <span>{t('map_tip_help')}</span>
        </p>
      )}
    </div>
  );
};
