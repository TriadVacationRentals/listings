// ============================================
    // PHASE 2 & 3: FETCH PROPERTIES + MAP
    // ============================================
    
    const WORKER_URL = 'https://hostaway-proxy.triad-sync.workers.dev';
    
    // Global state
    let allProperties = [];
    let mapInstance = null;
    let mapMarkers = [];
    
    // Initialize
    async function init() {
      console.log('🚀 Phase 2 & 3: Initializing...');
      
      try {
        // Fetch all properties from Worker
        await fetchAllProperties();
        
        // Render property cards
        renderPropertyCards(allProperties);
        
        // Initialize map
        await initializeMap();
        
        console.log('✅ Phase 2 & 3 complete!');
        console.log(`📊 Loaded ${allProperties.length} properties`);
        console.log(`🗺️ Map initialized with ${mapMarkers.length} markers`);
        
      } catch (error) {
        console.error('❌ Initialization failed:', error);
        showError('Failed to load properties. Please refresh the page.');
      }
    }
    
    // Fetch all properties
    async function fetchAllProperties() {
      console.log('📡 Fetching properties from Worker...');
      
      const response = await fetch(`${WORKER_URL}/api/webflow/properties`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('📦 Total properties from API:', data.properties?.length);
      
      // Filter: only show properties that are live, booking active, and have pricing
      allProperties = (data.properties || []).filter(property => {
        return property.isLive && 
               property.bookingActive && 
               (property.priceMin > 0 || property.priceMax > 0);
      });
      
      // Debug: Log first property to verify images
      if (allProperties.length > 0) {
        console.log('📸 First property:', allProperties[0].name);
        console.log('📸 Image URL:', allProperties[0].featuredImage);
      }
      
      console.log(`✅ Fetched ${allProperties.length} live properties with booking active`);
      
      // Debug: Group properties by state
      const byState = {};
      allProperties.forEach(p => {
        const state = p.state || 'Unknown';
        if (!byState[state]) byState[state] = [];
        byState[state].push(p.name);
      });
      
      console.log('📍 Properties by state:');
      Object.keys(byState).sort().forEach(state => {
        console.log(`   ${state}: ${byState[state].length} properties`);
        if (state === 'NY') {
          console.log(`      NY Properties:`, byState[state]);
        }
      });
    }
    
    // Render property cards
    function renderPropertyCards(properties) {
      const container = document.getElementById('cards-container');
      
      if (properties.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <h3>No properties found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        `;
        return;
      }
      
      container.innerHTML = properties.map(property => createPropertyCard(property)).join('');
      
      console.log(`✅ Rendered ${properties.length} property cards`);
    }
    
    // Create single property card HTML
    function createPropertyCard(property) {
      const imageUrl = property.featuredImage || 'https://via.placeholder.com/400x240?text=No+Image';
      const location = `${property.city || ''}, ${property.state || ''}`.trim();
      const priceRange = formatPriceRange(property.priceMin, property.priceMax);
      const rating = property.averageRating;
      const hasRating = rating && rating > 0;
      
      // Build property URL
      const propertyUrl = `/listings/${property.listingId}`;
      
      return `
        <div class="property-card" data-listing-id="${property.listingId}" data-lat="${property.latitude}" data-lng="${property.longitude}">
          <a href="${propertyUrl}" style="text-decoration: none; color: inherit;">
            <div style="position: relative;">
              <img src="${imageUrl}" alt="${property.name}" class="card-image">
              <div class="property-type-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                ${property.propertyType || 'House'}
              </div>
            </div>
            <div class="card-content">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div class="card-location">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  ${location}
                </div>
                ${hasRating ? `
                  <div class="card-rating">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    ${rating}
                  </div>
                ` : ''}
              </div>
              
              <h3 class="card-title">${property.name}</h3>
              
              <div class="card-details">
                <span>Guests: ${property.guests || 0}</span>
                <span>•</span>
                <span>Bedrooms: ${property.bedrooms || 0}</span>
                <span>•</span>
                <span>Bathrooms: ${property.bathrooms || 0}</span>
              </div>
              
              <div class="card-price">
                ${priceRange}<span>/night</span>
              </div>
            </div>
          </a>
        </div>
      `;
    }
    
    // Format price range
    function formatPriceRange(minPrice, maxPrice) {
      if (minPrice && maxPrice && minPrice !== maxPrice) {
        return `$${minPrice}-$${maxPrice}`;
      } else if (maxPrice) {
        return `$${maxPrice}`;
      } else if (minPrice) {
        return `$${minPrice}`;
      }
      return 'Price on request';
    }
    
    // ============================================
    // PHASE 3: MAP INITIALIZATION
    // ============================================
    
    async function initializeMap() {
      console.log('🗺️ Initializing map...');
      
      // Calculate center point from all properties
      const validProperties = allProperties.filter(p => p.latitude && p.longitude);
      
      if (validProperties.length === 0) {
        console.warn('No properties with coordinates');
        return;
      }
      
      const avgLat = validProperties.reduce((sum, p) => sum + parseFloat(p.latitude), 0) / validProperties.length;
      const avgLng = validProperties.reduce((sum, p) => sum + parseFloat(p.longitude), 0) / validProperties.length;
      
      // Calculate bounds for all properties
      const lats = validProperties.map(p => parseFloat(p.latitude));
      const lngs = validProperties.map(p => parseFloat(p.longitude));
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      // Add padding to bounds (20% on each side)
      const latPadding = (maxLat - minLat) * 0.2;
      const lngPadding = (maxLng - minLng) * 0.2;
      
      const maxBounds = L.latLngBounds(
        [minLat - latPadding, minLng - lngPadding], // Southwest
        [maxLat + latPadding, maxLng + lngPadding]  // Northeast
      );
      
      // Initialize map with max bounds
      mapInstance = L.map('listings-map', {
        zoomControl: false,
        maxBounds: maxBounds, // Can't pan outside this
        maxBoundsViscosity: 1.0 // Hard boundary (can't drag outside at all)
      }).setView([avgLat, avgLng], 6);
      
      // Add tile layer (using CartoDB Voyager - clean, Airbnb-style)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO, OpenStreetMap',
        maxZoom: 14, // Limit zoom - can see neighborhood but not exact building
        minZoom: 4 // Can't zoom out too far
      }).addTo(mapInstance);
      
      // Add markers for each property
      validProperties.forEach(property => {
        addPropertyMarker(property);
      });
      
      // Fit map to show all markers
      if (mapMarkers.length > 0) {
        const group = L.featureGroup(mapMarkers);
        mapInstance.fitBounds(group.getBounds().pad(0.1));
      }
      
      // ============================================
      // PHASE 4: VIEWPORT FILTERING
      // ============================================
      console.log('🎯 Phase 4: Setting up viewport filtering...');
      
      // Add event listeners for map movement
      mapInstance.on('moveend', updateCardsFromMapBounds);
      mapInstance.on('zoomend', updateCardsFromMapBounds);
      
      // Initial filter
      setTimeout(() => {
        updateCardsFromMapBounds();
      }, 500);
      
      console.log(`✅ Map initialized with ${mapMarkers.length} markers`);
      console.log(`✅ Viewport filtering active`);
    }
    
    // ============================================
    // PHASE 4: UPDATE CARDS BASED ON MAP VIEWPORT
    // ============================================
    
    function updateCardsFromMapBounds() {
      if (!mapInstance) return;
      
      const bounds = mapInstance.getBounds();
      const center = mapInstance.getCenter();
      const zoom = mapInstance.getZoom();
      
      console.log('🔄 Filtering cards by map viewport and filters...');
      
      // Get current filter values
      const filterPriceMin = document.getElementById('price-min-slider') ? parseInt(document.getElementById('price-min-slider').value) : priceMin;
      const filterPriceMax = document.getElementById('price-max-slider') ? parseInt(document.getElementById('price-max-slider').value) : priceMax;
      
      // Filter properties by viewport AND filters
      const visibleProperties = allProperties.filter(property => {
        const lat = parseFloat(property.latitude);
        const lng = parseFloat(property.longitude);
        
        if (isNaN(lat) || isNaN(lng)) return false;
        
        // Must be in viewport
        const isInBounds = bounds.contains([lat, lng]);
        if (!isInBounds) return false;
        
        // Guest capacity filter
        if (property.guests < guestCount) {
          return false;
        }
        
        // Price filter
        if (property.priceMin < filterPriceMin || property.priceMax > filterPriceMax) {
          return false;
        }
        
        // Property type filter
        if (selectedPropertyTypes.length > 0 && !selectedPropertyTypes.includes(property.propertyType)) {
          return false;
        }
        
        // Bedrooms filter
        if (bedroomsFilter > 0 && property.bedrooms < bedroomsFilter) {
          return false;
        }
        
        // Beds filter
        if (bedsFilter > 0 && property.beds < bedsFilter) {
          return false;
        }
        
        // Bathrooms filter
        if (bathroomsFilter > 0 && property.bathrooms < bathroomsFilter) {
          return false;
        }
        
        // Pets filter
        if (petsAllowedFilter && !property.petsAllowed) {
          return false;
        }
        
        return true;
      });
      
      console.log(`📊 ${visibleProperties.length} of ${allProperties.length} properties match filters`);
      
      // Re-render cards with animation
      renderPropertyCardsWithAnimation(visibleProperties);
      
      // Update marker visibility
      updateMarkerVisibility(visibleProperties);
    }
    
    function renderPropertyCardsWithAnimation(properties) {
      const container = document.getElementById('cards-container');
      
      if (properties.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <h3>No properties in this area</h3>
            <p>Try zooming out or panning the map to see more properties.</p>
          </div>
        `;
        return;
      }
      
      // Smooth fade out
      container.style.transition = 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
      container.style.opacity = '0';
      
      setTimeout(() => {
        container.innerHTML = properties.map(property => createPropertyCard(property)).join('');
        
        // Smooth fade in
        requestAnimationFrame(() => {
          container.style.opacity = '1';
        });
      }, 250);
    }
    
    function updateMarkerVisibility(visibleProperties) {
      const visibleIds = new Set(visibleProperties.map(p => p.listingId));
      
      mapMarkers.forEach(marker => {
        const markerId = marker.options.listingId;
        
        // Hide markers that don't match filters (set opacity to 0 and disable interaction)
        if (visibleIds.has(markerId)) {
          marker.setOpacity(1);
          marker.getElement()?.style.setProperty('pointer-events', 'auto');
        } else {
          marker.setOpacity(0);
          marker.getElement()?.style.setProperty('pointer-events', 'none');
        }
      });
      
      console.log(`👁️ Showing ${visibleIds.size} markers, hiding ${mapMarkers.length - visibleIds.size}`);
    }
    
    function addPropertyMarker(property) {
      const lat = parseFloat(property.latitude);
      const lng = parseFloat(property.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;
      
      // Create price marker (Airbnb style) - show price range
      const priceText = (property.priceMin && property.priceMax && property.priceMin !== property.priceMax) 
        ? `$${property.priceMin}-$${property.priceMax}`
        : property.priceMax ? `$${property.priceMax}` : 'N/A';
      
      const markerIcon = L.divIcon({
        className: 'custom-marker-wrapper',
        html: `<div class="custom-marker">${priceText}</div>`,
        iconSize: [null, 28],
        iconAnchor: [null, 14]
      });
      
      // Create popup content
      const popupContent = `
        <a href="/listings/${property.listingId}" style="text-decoration: none; color: inherit; display: block;">
          <div style="font-family: 'Manrope', sans-serif;">
            ${property.featuredImage ? `<img src="${property.featuredImage}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 12px 12px 0 0; margin-bottom: 12px;" alt="${property.name}">` : ''}
            <div style="padding: 0 8px 8px;">
              <div style="font-size: 13px; color: #717171; margin-bottom: 4px;">
                ${property.city}, ${property.state}
              </div>
              <h3 style="font-size: 16px; font-weight: 600; color: #0F2C3A; margin: 0 0 8px 0;">
                ${property.name}
              </h3>
              <div style="font-size: 15px; font-weight: 600; color: #0F2C3A;">
                ${formatPriceRange(property.priceMin, property.priceMax)}<span style="font-weight: 400; font-size: 13px;">/night</span>
              </div>
            </div>
          </div>
        </a>
      `;
      
      // Create marker
      const marker = L.marker([lat, lng], {
        icon: markerIcon,
        listingId: property.listingId
      })
      .addTo(mapInstance)
      .bindPopup(popupContent, {
        maxWidth: 280,
        minWidth: 280,
        className: 'custom-popup'
      });
      
      mapMarkers.push(marker);
    }
    
    // Update map markers based on filtered properties
    function updateMapMarkers(filteredProperties) {
      if (!mapInstance) return;
      
      // Remove all existing markers
      mapMarkers.forEach(marker => {
        mapInstance.removeLayer(marker);
      });
      mapMarkers = [];
      
      // Add markers only for filtered properties
      const validProperties = filteredProperties.filter(p => p.latitude && p.longitude);
      validProperties.forEach(property => {
        addPropertyMarker(property);
      });
      
      console.log(`🗺️ Updated map: showing ${mapMarkers.length} markers`);
    }
    
    // ============================================
    // PHASE 5: SEARCH BAR FUNCTIONALITY
    // ============================================
    
    let selectedLocation = null;
    let checkinDate = null;
    let checkoutDate = null;
    let guestCount = 1;
    let currentCheckinMonth = new Date();
    let currentCheckoutMonth = new Date();
    let debounceTimer = null;
    
    function setupSearchBar() {
      console.log('🔍 Phase 5: Setting up search bar...');
      
      // Location autocomplete
      setupLocationSearch();
      
      // Date pickers
      setupDatePickers();
      
      // Guest selector
      setupGuestSelector();
      
      // Search button
      document.getElementById('search-btn').addEventListener('click', handleSearch);
      
      console.log('✅ Search bar ready');
    }
    
    // ============================================
    // LOCATION SEARCH
    // ============================================
    
    function setupLocationSearch() {
      const locationInput = document.getElementById('location-input');
      const locationField = document.getElementById('location-field');
      
      locationInput.addEventListener('input', function() {
        const query = this.value.trim();
        clearTimeout(debounceTimer);
        
        if (query.length < 3) {
          hideLocationDropdown();
          return;
        }
        
        debounceTimer = setTimeout(() => {
          fetchLocationSuggestions(query);
        }, 300);
      });
      
      locationField.addEventListener('click', function(e) {
        e.stopPropagation();
        locationInput.focus();
        locationField.classList.add('active');
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (!e.target.closest('#location-field')) {
          hideLocationDropdown();
          locationField.classList.remove('active');
        }
      });
    }
    
    async function fetchLocationSuggestions(query) {
      try {
        const response = await fetch(`${WORKER_URL}/api/places/autocomplete?input=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.predictions && data.predictions.length > 0) {
          displayLocationSuggestions(data.predictions);
        }
      } catch (error) {
        console.error('Location autocomplete error:', error);
      }
    }
    
    function displayLocationSuggestions(predictions) {
      const dropdown = document.createElement('div');
      dropdown.id = 'location-dropdown';
      dropdown.className = 'location-dropdown active';
      dropdown.style.cssText = `
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: 0;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
      `;
      
      dropdown.innerHTML = predictions.map(p => `
        <div class="location-dropdown-item" data-place-id="${p.place_id}" style="
          padding: 14px 20px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
          transition: background 0.15s;
        ">
          ${p.description}
        </div>
      `).join('');
      
      // Remove old dropdown if exists
      const oldDropdown = document.getElementById('location-dropdown');
      if (oldDropdown) oldDropdown.remove();
      
      // Add new dropdown
      document.getElementById('location-field').appendChild(dropdown);
      
      // Add click handlers
      dropdown.querySelectorAll('.location-dropdown-item').forEach(item => {
        item.addEventListener('mouseenter', function() {
          this.style.background = '#f5f5f5';
        });
        item.addEventListener('mouseleave', function() {
          this.style.background = 'white';
        });
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          document.getElementById('location-input').value = this.textContent.trim();
          selectedLocation = {
            description: this.textContent.trim(),
            place_id: this.dataset.placeId
          };
          hideLocationDropdown();
        });
      });
    }
    
    function hideLocationDropdown() {
      const dropdown = document.getElementById('location-dropdown');
      if (dropdown) dropdown.remove();
    }
    
    // ============================================
    // DATE PICKERS
    // ============================================
    
    function setupDatePickers() {
      // Check-in
      const checkinField = document.getElementById('checkin-field');
      checkinField.addEventListener('click', function(e) {
        e.stopPropagation();
        showDatePicker('checkin');
      });
      
      // Check-out
      const checkoutField = document.getElementById('checkout-field');
      checkoutField.addEventListener('click', function(e) {
        e.stopPropagation();
        if (!checkinDate) {
          alert('Please select check-in date first');
          return;
        }
        showDatePicker('checkout');
      });
      
      // Close pickers when clicking outside
      document.addEventListener('click', function(e) {
        if (!e.target.closest('.date-picker-popup')) {
          hideDatePickers();
        }
      });
    }
    
    function showDatePicker(type) {
      hideDatePickers();
      
      // Add active class to field (desktop only - mobile doesn't have these)
      const field = document.getElementById(`${type}-field`);
      if (field) {
        document.querySelectorAll('.search-field').forEach(f => f.classList.remove('active'));
        field.classList.add('active');
      }
      
      const popup = document.createElement('div');
      popup.id = `${type}-picker`;
      popup.className = 'date-picker-popup active';
      
      // On mobile, center the picker on screen
      const isMobile = window.innerWidth <= 768;
      popup.style.cssText = isMobile ? `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 20px;
        z-index: 2100;
        min-width: 320px;
        max-width: 90vw;
      ` : `
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 20px;
        z-index: 1000;
        min-width: 320px;
      `;
      
      const month = type === 'checkin' ? currentCheckinMonth : currentCheckoutMonth;
      
      popup.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <button class="calendar-nav" data-action="prev" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e5e7eb; background: white; cursor: pointer; font-size: 18px;">‹</button>
          <div style="font-size: 16px; font-weight: 600;">${month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          <button class="calendar-nav" data-action="next" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e5e7eb; background: white; cursor: pointer; font-size: 18px;">›</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 8px; text-align: center; font-size: 11px; font-weight: 600; color: #9ca3af;">
          <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
        </div>
        <div id="${type}-days" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; min-height: 240px;"></div>
      `;
      
      document.getElementById(`${type}-field`).appendChild(popup);
      
      // Navigation
      popup.querySelectorAll('.calendar-nav').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const direction = this.dataset.action === 'next' ? 1 : -1;
          if (type === 'checkin') {
            currentCheckinMonth.setMonth(currentCheckinMonth.getMonth() + direction);
          } else {
            currentCheckoutMonth.setMonth(currentCheckoutMonth.getMonth() + direction);
          }
          showDatePicker(type);
        });
      });
      
      renderCalendarDays(type, month);
    }
    
    function renderCalendarDays(type, month) {
      const container = document.getElementById(`${type}-days`);
      const year = month.getFullYear();
      const monthIndex = month.getMonth();
      const firstDay = new Date(year, monthIndex, 1).getDay();
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let html = '';
      
      // Empty cells
      for (let i = 0; i < firstDay; i++) {
        html += '<div></div>';
      }
      
      // Days
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthIndex, day);
        const isPast = date < today;
        const isSelected = (type === 'checkin' && checkinDate && date.getTime() === checkinDate.getTime()) ||
                          (type === 'checkout' && checkoutDate && date.getTime() === checkoutDate.getTime());
        
        let className = isPast ? 'past' : 'available';
        if (isSelected) className += ' selected';
        
        const style = `
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          border-radius: 8px;
          cursor: ${isPast ? 'not-allowed' : 'pointer'};
          transition: all 0.15s;
          ${isPast ? 'color: #d1d5db;' : 'color: #0F2C3A;'}
          ${isSelected ? 'background: #0F2C3A; color: white; font-weight: 600;' : ''}
        `;
        
        html += `<div class="calendar-day ${className}" data-date="${date.toISOString()}" style="${style}">${day}</div>`;
      }
      
      container.innerHTML = html;
      
      // Add click handlers
      container.querySelectorAll('.calendar-day.available').forEach(dayEl => {
        dayEl.addEventListener('mouseenter', function() {
          if (!this.classList.contains('selected')) {
            this.style.background = '#f3f4f6';
          }
        });
        dayEl.addEventListener('mouseleave', function() {
          if (!this.classList.contains('selected')) {
            this.style.background = 'transparent';
          }
        });
        dayEl.addEventListener('click', function(e) {
          e.stopPropagation();
          selectDate(type, new Date(this.dataset.date));
        });
      });
    }
    
    function selectDate(type, date) {
      if (type === 'checkin') {
        checkinDate = date;
        checkoutDate = null;
        document.getElementById('checkin-display').value = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        document.getElementById('checkout-display').value = 'Add date';
      } else {
        if (date <= checkinDate) {
          alert('Check-out must be after check-in');
          return;
        }
        checkoutDate = date;
        document.getElementById('checkout-display').value = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      
      hideDatePickers();
    }
    
    function hideDatePickers() {
      document.querySelectorAll('.date-picker-popup').forEach(picker => picker.remove());
      document.querySelectorAll('.search-field').forEach(f => f.classList.remove('active'));
    }
    
    // ============================================
    // GUEST SELECTOR
    // ============================================
    
    function setupGuestSelector() {
      const guestsField = document.getElementById('guests-field');
      
      guestsField.addEventListener('click', function(e) {
        e.stopPropagation();
        showGuestPicker();
      });
      
      document.addEventListener('click', function(e) {
        if (!e.target.closest('.guest-picker-popup')) {
          hideGuestPicker();
        }
      });
    }
    
    function showGuestPicker() {
      hideGuestPicker();
      
      // Add active class to field (desktop only)
      const field = document.getElementById('guests-field');
      if (field) {
        document.querySelectorAll('.search-field').forEach(f => f.classList.remove('active'));
        field.classList.add('active');
      }
      
      const popup = document.createElement('div');
      popup.className = 'guest-picker-popup active';
      
      // On mobile, center the picker on screen
      const isMobile = window.innerWidth <= 768;
      popup.style.cssText = isMobile ? `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 20px;
        z-index: 2100;
        min-width: 280px;
      ` : `
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 20px;
        z-index: 1000;
        min-width: 250px;
      `;
      
      popup.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
          <span style="font-size: 14px; font-weight: 500;">Guests</span>
          <div style="display: flex; align-items: center; gap: 12px;">
            <button id="guest-minus" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #d1d5db; background: white; cursor: pointer; font-size: 18px;">−</button>
            <span id="guest-number" style="min-width: 30px; text-align: center; font-weight: 600;">${guestCount}</span>
            <button id="guest-plus" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid #d1d5db; background: white; cursor: pointer; font-size: 18px;">+</button>
          </div>
        </div>
      `;
      
      document.getElementById('guests-field').appendChild(popup);
      
      document.getElementById('guest-minus').addEventListener('click', function(e) {
        e.stopPropagation();
        if (guestCount > 1) {
          guestCount--;
          updateGuestDisplay();
        }
      });
      
      document.getElementById('guest-plus').addEventListener('click', function(e) {
        e.stopPropagation();
        if (guestCount < 30) {
          guestCount++;
          updateGuestDisplay();
        }
      });
    }
    
    function updateGuestDisplay() {
      document.getElementById('guests-display').value = `${guestCount} ${guestCount === 1 ? 'guest' : 'guests'}`;
      const guestNumber = document.getElementById('guest-number');
      if (guestNumber) {
        guestNumber.textContent = guestCount;
      }
    }
    
    function hideGuestPicker() {
      document.querySelectorAll('.guest-picker-popup').forEach(picker => picker.remove());
      document.querySelectorAll('.search-field').forEach(f => f.classList.remove('active'));
    }
    
    // ============================================
    // SEARCH HANDLER
    // ============================================
    
    async function handleSearch() {
      console.log('🔍 Search clicked!');
      
      if (!selectedLocation) {
        alert('Please enter a location');
        return;
      }
      
      const searchParams = {
        location: selectedLocation.description,
        placeId: selectedLocation.place_id,
        checkin: checkinDate ? formatDate(checkinDate) : null,
        checkout: checkoutDate ? formatDate(checkoutDate) : null,
        guests: guestCount
      };
      
      console.log('🎯 Search params:', searchParams);
      
      // Show loading state
      showLoadingState();
      
      try {
        // Step 1: Get location coordinates
        console.log('📍 Getting location coordinates...');
        const placeDetails = await fetch(`${WORKER_URL}/api/places/details?place_id=${searchParams.placeId}`);
        const placeData = await placeDetails.json();
        
        if (!placeData.result || !placeData.result.geometry) {
          throw new Error('Could not get location coordinates');
        }
        
        const { lat, lng } = placeData.result.geometry.location;
        console.log(`✅ Location: ${lat}, ${lng}`);
        
        // Step 2: Progressive search with expanding radius
        let radius = 30; // Start with 30 miles
        const maxRadius = 200; // Max 200 miles
        let nearbyProperties = [];
        let finalProperties = [];
        
        while (radius <= maxRadius) {
          console.log(`🗺️ Searching within ${radius} mile radius...`);
          
          // Filter properties by current radius
          nearbyProperties = allProperties.filter(property => {
            const propLat = parseFloat(property.latitude);
            const propLng = parseFloat(property.longitude);
            
            if (isNaN(propLat) || isNaN(propLng)) return false;
            
            const distance = calculateDistance(lat, lng, propLat, propLng);
            return distance <= radius;
          });
          
          console.log(`📊 Found ${nearbyProperties.length} properties within ${radius} miles`);
          
          if (nearbyProperties.length === 0) {
            // No properties found, expand radius
            radius += 30; // Increase by 30 miles
            continue;
          }
          
          // Step 3: Check availability if dates are selected
          let availableProperties = nearbyProperties;
          
          if (searchParams.checkin && searchParams.checkout) {
            console.log('📅 Checking availability...');
            
            availableProperties = await checkAvailability(
              nearbyProperties,
              searchParams.checkin,
              searchParams.checkout,
              lat,
              lng
            );
            
            console.log(`✅ ${availableProperties.length} available properties`);
            
            if (availableProperties.length === 0) {
              // No available properties, expand radius
              radius += 30;
              continue;
            }
          }
          
          // Step 4: Apply current filters
          finalProperties = applyCurrentFilters(availableProperties);
          
          console.log(`🎯 ${finalProperties.length} properties match all criteria at ${radius} mile radius`);
          
          if (finalProperties.length > 0) {
            // Found properties! Break the loop
            break;
          }
          
          // No properties match filters, expand radius
          radius += 30;
        }
        
        // Check if we found any properties
        if (finalProperties.length === 0) {
          showNoResultsState(`No properties found within ${maxRadius} miles that match your search criteria. Try adjusting your filters or dates.`);
          // Still zoom to searched location
          mapInstance.setView([lat, lng], 8);
          return;
        }
        
        // Step 5: Update map to show the area where properties were found
        // Calculate the appropriate zoom level based on radius
        let zoomLevel = 10; // Default
        if (radius <= 30) zoomLevel = 10;
        else if (radius <= 60) zoomLevel = 9;
        else if (radius <= 100) zoomLevel = 8;
        else if (radius <= 150) zoomLevel = 7;
        else zoomLevel = 6;
        
        mapInstance.setView([lat, lng], zoomLevel);
        
        console.log(`✅ Showing ${finalProperties.length} properties at ${radius} mile radius (zoom: ${zoomLevel})`);
        
        // Update display
        renderPropertyCards(finalProperties);
        updateMapMarkers(finalProperties);
        
        // Update URL with search params (optional - for sharing)
        updateURLParams(searchParams);
        
        // Show success message if we had to expand the search
        if (radius > 30) {
          setTimeout(() => {
            const container = document.getElementById('cards-container');
            const message = document.createElement('div');
            message.style.cssText = `
              background: #16A8EE;
              color: white;
              padding: 12px 20px;
              border-radius: 12px;
              margin-bottom: 16px;
              font-size: 14px;
              text-align: center;
            `;
            message.textContent = `Expanded search to ${radius} miles to find properties matching your criteria`;
            container.insertBefore(message, container.firstChild);
            
            // Remove message after 5 seconds
            setTimeout(() => message.remove(), 5000);
          }, 100);
        }
        
      } catch (error) {
        console.error('❌ Search error:', error);
        showErrorState('Search failed. Please try again.');
      }
    }
    
    // Helper: Calculate distance between two points (Haversine formula)
    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 3959; // Earth radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }
    
    // Check availability for properties
    async function checkAvailability(properties, checkin, checkout, lat, lng) {
      console.log(`⏳ Checking availability for ${properties.length} properties...`);
      
      // Use the Worker's search endpoint WITH location to reduce properties checked
      try {
        const response = await fetch(
          `${WORKER_URL}/api/search?checkin=${checkin}&checkout=${checkout}&guests=${guestCount}&lat=${lat}&lng=${lng}`
        );
        
        if (!response.ok) {
          console.error('Availability check failed');
          return properties; // Return all if check fails
        }
        
        const data = await response.json();
        console.log(`✅ Worker returned ${data.available.length} available properties`);
        
        const availableIds = new Set(data.available.map(id => String(id)));
        
        // Filter to only the properties we already filtered by location
        const propertyIds = new Set(properties.map(p => String(p.listingId)));
        const relevantAvailable = data.available.filter(id => propertyIds.has(String(id)));
        
        console.log(`✅ ${relevantAvailable.length} are in our location radius`);
        
        // Filter properties to only available ones
        return properties.filter(p => availableIds.has(String(p.listingId)));
        
      } catch (error) {
        console.error('Availability check error:', error);
        return properties; // Return all if check fails
      }
    }
    
    // Apply current filters to properties
    function applyCurrentFilters(properties) {
      const filterPriceMin = document.getElementById('price-min-slider') ? parseInt(document.getElementById('price-min-slider').value) : 0;
      const filterPriceMax = document.getElementById('price-max-slider') ? parseInt(document.getElementById('price-max-slider').value) : 10000;
      
      return properties.filter(property => {
        // Guest capacity filter
        if (property.guests < guestCount) {
          return false;
        }
        
        // Price filter
        if (property.priceMin < filterPriceMin || property.priceMax > filterPriceMax) {
          return false;
        }
        
        // Property type filter
        if (selectedPropertyTypes.length > 0 && !selectedPropertyTypes.includes(property.propertyType)) {
          return false;
        }
        
        // Bedrooms filter
        if (bedroomsFilter > 0 && property.bedrooms < bedroomsFilter) {
          return false;
        }
        
        // Beds filter
        if (bedsFilter > 0 && property.beds < bedsFilter) {
          return false;
        }
        
        // Bathrooms filter
        if (bathroomsFilter > 0 && property.bathrooms < bathroomsFilter) {
          return false;
        }
        
        // Pets filter
        if (petsAllowedFilter && !property.petsAllowed) {
          return false;
        }
        
        return true;
      });
    }
    
    // Update URL with search parameters
    function updateURLParams(params) {
      const url = new URL(window.location);
      url.searchParams.set('location', params.location);
      if (params.checkin) url.searchParams.set('checkin', params.checkin);
      if (params.checkout) url.searchParams.set('checkout', params.checkout);
      url.searchParams.set('guests', params.guests);
      window.history.pushState({}, '', url);
    }
    
    // Show loading state with skeleton cards
    function showLoadingState() {
      const container = document.getElementById('cards-container');
      
      // Create 6 skeleton cards
      const skeletonCards = Array(6).fill(0).map(() => `
        <div class="property-card skeleton-card">
          <div class="skeleton-image"></div>
          <div class="card-content">
            <div class="skeleton-line" style="width: 60%; height: 14px; margin-bottom: 12px;"></div>
            <div class="skeleton-line" style="width: 90%; height: 20px; margin-bottom: 8px;"></div>
            <div class="skeleton-line" style="width: 70%; height: 14px; margin-bottom: 12px;"></div>
            <div class="skeleton-line" style="width: 40%; height: 18px;"></div>
          </div>
        </div>
      `).join('');
      
      container.innerHTML = skeletonCards;
      
      // Add skeleton animation styles if not already added
      if (!document.getElementById('skeleton-styles')) {
        const style = document.createElement('style');
        style.id = 'skeleton-styles';
        style.textContent = `
          .skeleton-card {
            pointer-events: none;
          }
          
          .skeleton-image {
            width: 100%;
            height: 240px;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 16px 16px 0 0;
          }
          
          .skeleton-line {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 4px;
          }
          
          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    // Show no results state
    function showNoResultsState(message) {
      const container = document.getElementById('cards-container');
      container.innerHTML = `
        <div class="empty-state">
          <h3>No properties found</h3>
          <p>${message}</p>
          <p style="margin-top: 12px; font-size: 14px; color: var(--text-muted);">Try adjusting your search location, dates, or filters.</p>
        </div>
      `;
    }
    
    // Show error state
    function showErrorState(message) {
      const container = document.getElementById('cards-container');
      container.innerHTML = `
        <div class="empty-state">
          <h3>⚠️ Error</h3>
          <p>${message}</p>
        </div>
      `;
    }
    
    function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // ============================================
    // PHASE 6: FILTER DROPDOWN
    // ============================================
    
    let priceMin = 0;
    let priceMax = 1000;
    let bedroomsFilter = 0;
    let bedsFilter = 0;
    let bathroomsFilter = 0;
    let selectedPropertyTypes = [];
    let petsAllowedFilter = false;
    
    function setupFilters() {
      console.log('🎛️ Phase 6: Setting up filters...');
      
      const filterBtn = document.getElementById('filter-btn');
      if (!filterBtn) {
        console.error('❌ Filter button not found!');
        return;
      }
      
      // Create and append dropdown
      const filterDropdown = createFilterDropdown();
      
      filterBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('🎛️ Filter button clicked');
        toggleFilterDropdown();
      });
      
      document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('filter-dropdown');
        if (dropdown && !dropdown.contains(e.target) && !filterBtn.contains(e.target)) {
          hideFilterDropdown();
        }
      });
      
      console.log('✅ Filters ready');
    }
    
    function createFilterDropdown() {
      // Remove old dropdown if exists
      const oldDropdown = document.getElementById('filter-dropdown');
      if (oldDropdown) oldDropdown.remove();
      
      const dropdown = document.createElement('div');
      dropdown.id = 'filter-dropdown';
      dropdown.className = 'filter-dropdown';
      dropdown.style.cssText = `
        position: absolute;
        top: calc(100% + 12px);
        right: 0;
        background: white;
        border-radius: 24px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        padding: 24px;
        width: 380px;
        display: none;
        z-index: 1001;
      `;
      
      // Set initial price range based on actual properties
      const actualMinPrice = allProperties.length > 0 
        ? Math.floor(Math.min(...allProperties.map(p => p.priceMin).filter(p => p > 0)))
        : 0;
      const actualMaxPrice = allProperties.length > 0
        ? Math.ceil(Math.max(...allProperties.map(p => p.priceMax)))
        : 1000;
      
      priceMin = actualMinPrice;
      priceMax = actualMaxPrice;
      
      dropdown.innerHTML = `
        <!-- Price Range -->
        <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(0,0,0,0.08);">
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">Price per night</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 14px; font-weight: 500;">
            <span id="price-min-display">$${priceMin}</span>
            <span id="price-max-display">$${priceMax}</span>
          </div>
          <div style="position: relative; height: 40px; margin: 0 10px;">
            <div style="position: absolute; top: 17px; left: 0; right: 0; height: 6px; background: #E5E7EB; border-radius: 3px;"></div>
            <div id="slider-track" style="position: absolute; top: 17px; height: 6px; background: #16A8EE; border-radius: 3px; left: 0%; width: 100%;"></div>
            <input type="range" id="price-min-slider" min="${priceMin}" max="${priceMax}" value="${priceMin}" style="position: absolute; width: 100%; top: 8px; -webkit-appearance: none; appearance: none; background: transparent; pointer-events: none;">
            <input type="range" id="price-max-slider" min="${priceMin}" max="${priceMax}" value="${priceMax}" style="position: absolute; width: 100%; top: 8px; -webkit-appearance: none; appearance: none; background: transparent; pointer-events: none;">
          </div>
        </div>
        
        <!-- Property Type -->
        <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(0,0,0,0.08);">
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Property type</div>
          <div id="property-types" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
        </div>
        
        <!-- Rooms and Beds -->
        <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(0,0,0,0.08);">
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">Rooms and beds</div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <span style="font-size: 14px;">Bedrooms</span>
            <div style="display: flex; align-items: center; gap: 12px;">
              <button id="bedrooms-minus" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1.5px solid #E0E0E0; background: white; cursor: pointer; font-size: 20px; line-height: 1; padding: 0; opacity: 0.3;">−</button>
              <span id="bedrooms-count" style="min-width: 35px; text-align: center; font-weight: 500; font-size: 15px;">Any</span>
              <button id="bedrooms-plus" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1.5px solid #E0E0E0; background: white; cursor: pointer; font-size: 20px; line-height: 1; padding: 0;">+</button>
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <span style="font-size: 14px;">Beds</span>
            <div style="display: flex; align-items: center; gap: 12px;">
              <button id="beds-minus" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1.5px solid #E0E0E0; background: white; cursor: pointer; font-size: 20px; line-height: 1; padding: 0; opacity: 0.3;">−</button>
              <span id="beds-count" style="min-width: 35px; text-align: center; font-weight: 500; font-size: 15px;">Any</span>
              <button id="beds-plus" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1.5px solid #E0E0E0; background: white; cursor: pointer; font-size: 20px; line-height: 1; padding: 0;">+</button>
            </div>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 14px;">Bathrooms</span>
            <div style="display: flex; align-items: center; gap: 12px;">
              <button id="bathrooms-minus" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1.5px solid #E0E0E0; background: white; cursor: pointer; font-size: 20px; line-height: 1; padding: 0; opacity: 0.3;">−</button>
              <span id="bathrooms-count" style="min-width: 35px; text-align: center; font-weight: 500; font-size: 15px;">Any</span>
              <button id="bathrooms-plus" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1.5px solid #E0E0E0; background: white; cursor: pointer; font-size: 20px; line-height: 1; padding: 0;">+</button>
            </div>
          </div>
        </div>
        
        <!-- Amenities -->
        <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(0,0,0,0.08);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 16px; font-weight: 600;">Pets Allowed</span>
            <div id="pets-toggle" style="position: relative; width: 48px; height: 28px; background: #E0E0E0; border-radius: 14px; cursor: pointer; transition: background 0.3s;">
              <div style="position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; background: white; border-radius: 50%; transition: transform 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
            </div>
          </div>
        </div>
        
        <!-- Actions -->
        <div style="display: flex; gap: 12px; align-items: center;">
          <button id="clear-filters" style="padding: 10px 16px; border: none; border-radius: 12px; background: transparent; color: #0F2C3A; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'Manrope', sans-serif; text-decoration: underline;">Clear all</button>
          <button id="apply-filters" style="flex: 1; padding: 14px 32px; border: none; border-radius: 12px; background: #0F2C3A; color: white; font-size: 16px; font-weight: 600; cursor: pointer; font-family: 'Manrope', sans-serif;">Show properties</button>
        </div>
      `;
      
      // Find the filter button's parent container and append dropdown there
      const filterBtn = document.getElementById('filter-btn');
      const filterContainer = filterBtn.parentElement;
      filterContainer.style.position = 'relative';
      filterContainer.appendChild(dropdown);
      
      // Setup filter interactions
      setupPriceSliders();
      setupPropertyTypeFilter();
      setupRoomSelectors();
      setupPetsToggle();
      setupFilterActions();
      
      return dropdown;
    }
    
    function toggleFilterDropdown() {
      const dropdown = document.getElementById('filter-dropdown');
      if (dropdown.style.display === 'none' || dropdown.style.display === '') {
        dropdown.style.display = 'block';
      } else {
        dropdown.style.display = 'none';
      }
    }
    
    function hideFilterDropdown() {
      const dropdown = document.getElementById('filter-dropdown');
      if (dropdown) {
        dropdown.style.display = 'none';
      }
    }
    
    function setupPriceSliders() {
      const minSlider = document.getElementById('price-min-slider');
      const maxSlider = document.getElementById('price-max-slider');
      const minDisplay = document.getElementById('price-min-display');
      const maxDisplay = document.getElementById('price-max-display');
      const track = document.getElementById('slider-track');
      
      // Add slider thumb styles
      const style = document.createElement('style');
      style.textContent = `
        #price-min-slider::-webkit-slider-thumb,
        #price-max-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          background: white;
          border: 2px solid #16A8EE;
          border-radius: 50%;
          cursor: pointer;
          pointer-events: auto;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }
        #price-min-slider::-webkit-slider-thumb:hover,
        #price-max-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 2px 8px rgba(22, 168, 238, 0.4);
        }
        #price-min-slider::-webkit-slider-thumb:active,
        #price-max-slider::-webkit-slider-thumb:active {
          cursor: grabbing;
          box-shadow: 0 2px 8px rgba(22, 168, 238, 0.6);
        }
        #price-min-slider::-moz-range-thumb,
        #price-max-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: white;
          border: 2px solid #16A8EE;
          border-radius: 50%;
          cursor: pointer;
          pointer-events: auto;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }
        #price-min-slider::-webkit-slider-runnable-track,
        #price-max-slider::-webkit-slider-runnable-track {
          background: transparent;
          height: 6px;
        }
        #price-min-slider::-moz-range-track,
        #price-max-slider::-moz-range-track {
          background: transparent;
          height: 6px;
        }
      `;
      document.head.appendChild(style);
      
      function updateSlider() {
        let minVal = parseInt(minSlider.value);
        let maxVal = parseInt(maxSlider.value);
        
        if (minVal >= maxVal) {
          if (this === minSlider) {
            maxSlider.value = minVal + 10;
            maxVal = minVal + 10;
          } else {
            minSlider.value = maxVal - 10;
            minVal = maxVal - 10;
          }
        }
        
        minDisplay.textContent = '$' + minVal;
        maxDisplay.textContent = '$' + maxVal;
        
        const rangeMin = parseInt(minSlider.min);
        const rangeMax = parseInt(minSlider.max);
        const percentMin = ((minVal - rangeMin) / (rangeMax - rangeMin)) * 100;
        const percentMax = ((maxVal - rangeMin) / (rangeMax - rangeMin)) * 100;
        
        track.style.left = percentMin + '%';
        track.style.width = (percentMax - percentMin) + '%';
      }
      
      minSlider.addEventListener('input', updateSlider);
      maxSlider.addEventListener('input', updateSlider);
      
      // Call initially to set correct track position
      console.log('🎨 Initializing slider track...');
      console.log('Min:', minSlider.value, 'Max:', maxSlider.value);
      console.log('Range:', minSlider.min, 'to', minSlider.max);
      updateSlider.call(minSlider);
      console.log('Track left:', track.style.left, 'width:', track.style.width);
    }
    
    function setupPropertyTypeFilter() {
      const container = document.getElementById('property-types');
      const uniqueTypes = [...new Set(allProperties.map(p => p.propertyType).filter(t => t))];
      
      uniqueTypes.forEach(type => {
        const pill = document.createElement('div');
        pill.className = 'property-type-pill';
        pill.textContent = type;
        pill.style.cssText = `
          padding: 8px 14px;
          border: 1.5px solid #E0E0E0;
          border-radius: 12px;
          background: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        `;
        
        pill.addEventListener('click', function() {
          const isActive = this.classList.contains('active');
          if (isActive) {
            this.classList.remove('active');
            this.style.background = 'white';
            this.style.color = '#0F2C3A';
            this.style.borderColor = '#E0E0E0';
            selectedPropertyTypes = selectedPropertyTypes.filter(t => t !== type);
          } else {
            this.classList.add('active');
            this.style.background = '#16A8EE';
            this.style.color = 'white';
            this.style.borderColor = '#16A8EE';
            selectedPropertyTypes.push(type);
          }
        });
        
        container.appendChild(pill);
      });
    }
    
    function setupRoomSelectors() {
      // Bedrooms
      const bedroomsMinus = document.getElementById('bedrooms-minus');
      const bedroomsCount = document.getElementById('bedrooms-count');
      
      bedroomsMinus.addEventListener('click', () => {
        if (bedroomsFilter > 0) {
          bedroomsFilter--;
          bedroomsCount.textContent = bedroomsFilter === 0 ? 'Any' : bedroomsFilter;
          bedroomsMinus.style.opacity = bedroomsFilter === 0 ? '0.3' : '1';
        }
      });
      
      document.getElementById('bedrooms-plus').addEventListener('click', () => {
        bedroomsFilter++;
        bedroomsCount.textContent = bedroomsFilter;
        bedroomsMinus.style.opacity = '1';
      });
      
      // Beds
      const bedsMinus = document.getElementById('beds-minus');
      const bedsCount = document.getElementById('beds-count');
      
      bedsMinus.addEventListener('click', () => {
        if (bedsFilter > 0) {
          bedsFilter--;
          bedsCount.textContent = bedsFilter === 0 ? 'Any' : bedsFilter;
          bedsMinus.style.opacity = bedsFilter === 0 ? '0.3' : '1';
        }
      });
      
      document.getElementById('beds-plus').addEventListener('click', () => {
        bedsFilter++;
        bedsCount.textContent = bedsFilter;
        bedsMinus.style.opacity = '1';
      });
      
      // Bathrooms
      const bathroomsMinus = document.getElementById('bathrooms-minus');
      const bathroomsCount = document.getElementById('bathrooms-count');
      
      bathroomsMinus.addEventListener('click', () => {
        if (bathroomsFilter > 0) {
          bathroomsFilter--;
          bathroomsCount.textContent = bathroomsFilter === 0 ? 'Any' : bathroomsFilter;
          bathroomsMinus.style.opacity = bathroomsFilter === 0 ? '0.3' : '1';
        }
      });
      
      document.getElementById('bathrooms-plus').addEventListener('click', () => {
        bathroomsFilter++;
        bathroomsCount.textContent = bathroomsFilter;
        bathroomsMinus.style.opacity = '1';
      });
    }
    
    function setupPetsToggle() {
      const toggle = document.getElementById('pets-toggle');
      
      toggle.addEventListener('click', function() {
        petsAllowedFilter = !petsAllowedFilter;
        
        if (petsAllowedFilter) {
          this.style.background = '#16A8EE';
          this.querySelector('div').style.transform = 'translateX(20px)';
        } else {
          this.style.background = '#E0E0E0';
          this.querySelector('div').style.transform = 'translateX(0)';
        }
      });
    }
    
    function setupFilterActions() {
      document.getElementById('clear-filters').addEventListener('click', () => {
        // Reset all filters
        const actualMinPrice = allProperties.length > 0 
          ? Math.floor(Math.min(...allProperties.map(p => p.priceMin).filter(p => p > 0)))
          : 0;
        const actualMaxPrice = allProperties.length > 0
          ? Math.ceil(Math.max(...allProperties.map(p => p.priceMax)))
          : 1000;
        
        priceMin = actualMinPrice;
        priceMax = actualMaxPrice;
        bedroomsFilter = 0;
        bedsFilter = 0;
        bathroomsFilter = 0;
        selectedPropertyTypes = [];
        petsAllowedFilter = false;
        
        // Reset UI
        document.getElementById('price-min-slider').value = priceMin;
        document.getElementById('price-max-slider').value = priceMax;
        document.getElementById('price-min-display').textContent = '$' + priceMin;
        document.getElementById('price-max-display').textContent = '$' + priceMax;
        document.getElementById('slider-track').style.left = '0%';
        document.getElementById('slider-track').style.width = '100%';
        
        document.querySelectorAll('.property-type-pill').forEach(pill => {
          pill.classList.remove('active');
          pill.style.background = 'white';
          pill.style.color = '#0F2C3A';
          pill.style.borderColor = '#E0E0E0';
        });
        
        document.getElementById('bedrooms-count').textContent = 'Any';
        document.getElementById('beds-count').textContent = 'Any';
        document.getElementById('bathrooms-count').textContent = 'Any';
        
        const petsToggle = document.getElementById('pets-toggle');
        petsToggle.style.background = '#E0E0E0';
        petsToggle.querySelector('div').style.transform = 'translateX(0)';
        
        // Apply (which will show all properties)
        applyFilters();
      });
      
      document.getElementById('apply-filters').addEventListener('click', () => {
        applyFilters();
        hideFilterDropdown();
      });
    }
    
    function applyFilters() {
      console.log('🎛️ Applying filters:', {
        price: [parseInt(document.getElementById('price-min-slider').value), parseInt(document.getElementById('price-max-slider').value)],
        propertyTypes: selectedPropertyTypes,
        bedrooms: bedroomsFilter,
        beds: bedsFilter,
        bathrooms: bathroomsFilter,
        petsAllowed: petsAllowedFilter
      });
      
      // This will trigger the viewport filtering which will now include filter logic
      updateCardsFromMapBounds();
    }
    
    // Show error message
    function showError(message) {
      const container = document.getElementById('cards-container');
      container.innerHTML = `
        <div class="empty-state">
          <h3>⚠️ Error</h3>
          <p>${message}</p>
        </div>
      `;
    }
    
    // Start when page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', async function() {
        await init();
        setupSearchBar(); // Phase 5
        setupFilters(); // Phase 6
        setupMobileBottomSheet(); // Phase 8
      });
    } else {
      init().then(() => {
        setupSearchBar(); // Phase 5
        setupFilters(); // Phase 6
        setupMobileBottomSheet(); // Phase 8
      });
    }
    
    // ============================================
    // PHASE 8: MOBILE UI
    // ============================================
    
    function setupMobileBottomSheet() {
      // Only on mobile
      if (window.innerWidth > 768) return;
      
      console.log('📱 Setting up mobile UI...');
      
      const mapSection = document.getElementById('map-section');
      const cardsSection = document.getElementById('cards-section');
      const searchTrigger = document.getElementById('mobile-search-trigger');
      const filterTrigger = document.getElementById('mobile-filter-trigger');
      const viewToggleCheckbox = document.getElementById('view-toggle-checkbox');
      const backToMapBtn = document.getElementById('back-to-map-btn');
      const overlay = document.getElementById('mobile-search-overlay');
      const overlayClose = document.getElementById('mobile-overlay-close');
      const applyBtn = document.getElementById('mobile-apply-search');
      const clearBtn = document.getElementById('mobile-clear-all');
      
      if (!mapSection || !cardsSection) return;
      
      // View toggle - ON = map visible, OFF = list visible
      if (viewToggleCheckbox) {
        viewToggleCheckbox.addEventListener('change', () => {
          if (viewToggleCheckbox.checked) {
            // Toggle ON = Map visible
            mapSection.classList.remove('list-view-active');
            cardsSection.classList.remove('list-view-active');
            console.log('🗺️ Map visible');
          } else {
            // Toggle OFF = List visible
            mapSection.classList.add('list-view-active');
            cardsSection.classList.add('list-view-active');
            
            // Make sure cards are rendered
            const currentProperties = getCurrentFilteredProperties();
            renderPropertyCards(currentProperties);
            
            console.log('📋 List visible');
          }
        });
      }
      
      // Back to Map button (if still exists)
      if (backToMapBtn) {
        backToMapBtn.addEventListener('click', () => {
          mapSection.classList.remove('list-view-active');
          cardsSection.classList.remove('list-view-active');
          if (viewToggleCheckbox) {
            viewToggleCheckbox.checked = true;
          }
          console.log('🗺️ Switched to map view');
        });
      }
      
      // Search trigger button - opens overlay
      if (searchTrigger) {
        searchTrigger.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('📱 Mobile search trigger clicked');
          overlay.classList.add('active');
          syncOverlayFields();
          moveFiltersToOverlay();
        });
      }
      
      // Filter trigger button - opens overlay
      if (filterTrigger) {
        filterTrigger.addEventListener('click', () => {
          overlay.classList.add('active');
          syncOverlayFields();
          moveFiltersToOverlay();
        });
      }
      
      // Close overlay - click background
      if (overlay) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            overlay.classList.remove('active');
          }
        });
      }
      
      // Close overlay - close button
      if (overlayClose) {
        overlayClose.addEventListener('click', () => {
          overlay.classList.remove('active');
        });
      }
      
      // Apply search/filters
      if (applyBtn) {
        applyBtn.addEventListener('click', async () => {
          console.log('📱 Mobile apply button clicked');
          
          // Sync mobile fields to desktop
          syncMobileToDesktop();
          
          // Run search if location is selected
          if (selectedLocation) {
            console.log('📱 Running search...');
            await handleSearch();
          } else {
            console.log('📱 No location selected, just applying filters');
            // Just apply filters to current properties
            const filteredProperties = applyCurrentFilters(allProperties);
            renderPropertyCards(filteredProperties);
            updateMapMarkers(filteredProperties);
          }
          
          // Close overlay
          overlay.classList.remove('active');
        });
      }
      
      // Clear all
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          // Clear search fields
          selectedLocation = null;
          checkinDate = null;
          checkoutDate = null;
          guestCount = 1;
          
          // Clear desktop inputs
          const locationInput = document.getElementById('location-input');
          if (locationInput) locationInput.value = '';
          
          const checkinDisplay = document.getElementById('checkin-display');
          const checkoutDisplay = document.getElementById('checkout-display');
          const guestsDisplay = document.getElementById('guests-display');
          
          if (checkinDisplay) checkinDisplay.value = 'Add date';
          if (checkoutDisplay) checkoutDisplay.value = 'Add date';
          if (guestsDisplay) guestsDisplay.value = '1 guest';
          
          // Clear filters
          const clearFiltersBtn = document.querySelector('#mobile-filters-container #clear-filters');
          if (clearFiltersBtn) clearFiltersBtn.click();
          
          syncOverlayFields();
        });
      }
      
      // Setup mobile input fields
      setupMobileInputs();
      
      console.log('✅ Mobile UI ready');
    }
    
    function getCurrentFilteredProperties() {
      // Get currently visible properties based on map viewport
      if (!mapInstance) return allProperties;
      
      const bounds = mapInstance.getBounds();
      return allProperties.filter(property => {
        const lat = parseFloat(property.latitude);
        const lng = parseFloat(property.longitude);
        
        if (isNaN(lat) || isNaN(lng)) return false;
        return bounds.contains([lat, lng]);
      });
    }
    
    function setupMobileInputs() {
      // Location autocomplete
      const locationInput = document.getElementById('mobile-location-input');
      if (locationInput) {
        let locationTimeout;
        locationInput.addEventListener('input', function() {
          clearTimeout(locationTimeout);
          locationTimeout = setTimeout(async () => {
            if (this.value.length < 2) return;
            
            try {
              const response = await fetch(`${WORKER_URL}/api/places/autocomplete?input=${encodeURIComponent(this.value)}`);
              const data = await response.json();
              
              // Create dropdown for mobile
              showMobileLocationDropdown(data.predictions || []);
            } catch (error) {
              console.error('Location autocomplete error:', error);
            }
          }, 300);
        });
      }
      
      // Check-in
      const checkinInput = document.getElementById('mobile-checkin-input');
      if (checkinInput) {
        checkinInput.addEventListener('click', () => {
          toggleMobileCalendar();
        });
      }
      
      // Check-out
      const checkoutInput = document.getElementById('mobile-checkout-input');
      if (checkoutInput) {
        checkoutInput.addEventListener('click', () => {
          if (!checkinDate) {
            alert('Please select check-in date first');
            return;
          }
          toggleMobileCalendar();
        });
      }
      
      // Guests
      const guestsInput = document.getElementById('mobile-guests-input');
      if (guestsInput) {
        guestsInput.addEventListener('click', toggleMobileGuests);
      }
      
      // Guest controls
      const guestMinus = document.getElementById('mobile-guest-minus');
      const guestPlus = document.getElementById('mobile-guest-plus');
      if (guestMinus) {
        guestMinus.addEventListener('click', () => {
          guestCount = Math.max(1, guestCount - 1);
          updateMobileGuestDisplay();
        });
      }
      if (guestPlus) {
        guestPlus.addEventListener('click', () => {
          guestCount = Math.min(16, guestCount + 1);
          updateMobileGuestDisplay();
        });
      }
      
      // Watch for changes in desktop fields and sync
      setInterval(syncOverlayFields, 500);
    }
    
    function toggleMobileCalendar() {
      const calWrapper = document.getElementById('mobile-calendar-wrapper');
      const guestPopup = document.getElementById('mobile-guest-popup');
      const dateFieldGroups = document.querySelectorAll('.mobile-search-content .mobile-search-field-group');
      
      // Hide guest popup
      if (guestPopup) guestPopup.classList.remove('active');
      
      // Toggle calendar
      if (calWrapper.classList.contains('active')) {
        // Closing calendar - show date fields again
        calWrapper.classList.remove('active');
        dateFieldGroups.forEach(group => {
          if (group.querySelector('#mobile-checkin-input') || group.querySelector('#mobile-checkout-input')) {
            group.style.display = 'flex';
          }
        });
      } else {
        // Opening calendar - hide date fields
        calWrapper.classList.add('active');
        dateFieldGroups.forEach(group => {
          if (group.querySelector('#mobile-checkin-input') || group.querySelector('#mobile-checkout-input')) {
            group.style.display = 'none';
          }
        });
        renderMobileCalendar();
      }
    }
    
    function toggleMobileGuests() {
      const calWrapper = document.getElementById('mobile-calendar-wrapper');
      const guestPopup = document.getElementById('mobile-guest-popup');
      
      // Hide calendar
      if (calWrapper) calWrapper.classList.remove('active');
      
      // Toggle guest popup
      if (guestPopup.classList.contains('active')) {
        guestPopup.classList.remove('active');
      } else {
        guestPopup.classList.add('active');
      }
    }
    
    function updateMobileGuestDisplay() {
      const guestNumber = document.getElementById('mobile-guest-number');
      const guestsInput = document.getElementById('mobile-guests-input');
      const guestMinus = document.getElementById('mobile-guest-minus');
      const guestPlus = document.getElementById('mobile-guest-plus');
      
      if (guestNumber) guestNumber.textContent = guestCount;
      if (guestsInput) guestsInput.value = `${guestCount} ${guestCount === 1 ? 'guest' : 'guests'}`;
      if (guestMinus) guestMinus.disabled = guestCount <= 1;
      if (guestPlus) guestPlus.disabled = guestCount >= 16;
    }
    
    function renderMobileCalendar() {
      const calWrapper = document.getElementById('mobile-calendar-wrapper');
      if (!calWrapper) return;
      
      const month = currentCheckinMonth || new Date();
      const year = month.getFullYear();
      const monthNum = month.getMonth();
      const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const firstDay = new Date(year, monthNum, 1).getDay();
      const daysInMonth = new Date(year, monthNum + 1, 0).getDate();
      
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      
      // Build calendar HTML
      let calendarHTML = `
        <div style="padding: 20px; background: white; border-radius: 12px; border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 16px; font-size: 14px; font-weight: 600; color: #16A8EE;">
            ${checkinDate && !checkoutDate ? 'Select check-out date' : 'Select check-in date'}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <button onclick="changeCalendarMonth(-1)" style="width: 32px; height: 32px; border: 1px solid #e5e7eb; background: white; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px;">←</button>
            <div style="font-size: 16px; font-weight: 600; color: #0F2C3A;">${monthName}</div>
            <button onclick="changeCalendarMonth(1)" style="width: 32px; height: 32px; border: 1px solid #e5e7eb; background: white; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px;">→</button>
          </div>
          
          <!-- Weekdays -->
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 8px;">
            ${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => 
              `<div style="text-align: center; font-size: 11px; font-weight: 600; color: #9ca3af; padding: 6px 0;">${d}</div>`
            ).join('')}
          </div>
          
          <!-- Days -->
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
      `;
      
      // Empty cells before first day
      for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div style="aspect-ratio: 1;"></div>';
      }
      
      // Calendar days
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${pad(monthNum + 1)}-${pad(day)}`;
        const isPast = dateStr < todayStr;
        const isSelected = dateStr === checkinDate || dateStr === checkoutDate;
        const isInRange = checkinDate && checkoutDate && dateStr > checkinDate && dateStr < checkoutDate;
        
        let dayStyle = `
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        `;
        
        if (isPast) {
          dayStyle += 'color: #e5e7eb; cursor: not-allowed;';
        } else if (isSelected) {
          dayStyle += 'background: #0F2C3A; color: white; font-weight: 600;';
        } else if (isInRange) {
          dayStyle += 'background: #e8f6fd; color: #0F2C3A;';
        } else {
          dayStyle += 'color: #0F2C3A; font-weight: 600;';
        }
        
        const clickHandler = isPast ? '' : `onclick="selectMobileDate('${dateStr}')"`;
        const hoverStyle = !isPast && !isSelected ? 'onmouseover="this.style.background=\'#f3f4f6\'" onmouseout="this.style.background=\'\'"' : '';
        
        calendarHTML += `<div style="${dayStyle}" ${clickHandler} ${hoverStyle}>${day}</div>`;
      }
      
      calendarHTML += `
          </div>
          
          <!-- Clear dates button -->
          <div style="text-align: right; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <button onclick="clearMobileDates()" style="background: none; border: none; color: ${checkinDate || checkoutDate ? '#16A8EE' : '#9ca3af'}; font-size: 14px; font-weight: 500; cursor: ${checkinDate || checkoutDate ? 'pointer' : 'not-allowed'}; padding: 8px 16px;" ${!checkinDate && !checkoutDate ? 'disabled' : ''}>Clear dates</button>
          </div>
        </div>
      `;
      
      calWrapper.innerHTML = calendarHTML;
    }
    
    function changeCalendarMonth(delta) {
      if (!currentCheckinMonth) currentCheckinMonth = new Date();
      currentCheckinMonth.setMonth(currentCheckinMonth.getMonth() + delta);
      renderMobileCalendar();
    }
    
    function selectMobileDate(dateStr) {
      if (!checkinDate) {
        // Selecting check-in
        checkinDate = dateStr;
        checkoutDate = null;
        console.log('✅ Check-in selected:', checkinDate);
        renderMobileCalendar(); // Re-render to show selection
        syncOverlayFields(); // Update input displays
        // Calendar stays open for check-out selection
      } else if (!checkoutDate) {
        // Selecting check-out
        if (dateStr <= checkinDate) {
          alert('Check-out must be after check-in');
          return;
        }
        checkoutDate = dateStr;
        console.log('✅ Check-out selected:', checkoutDate);
        syncOverlayFields(); // Update input displays
        
        // CLOSE calendar and show date fields again
        const calWrapper = document.getElementById('mobile-calendar-wrapper');
        const dateFieldGroups = document.querySelectorAll('.mobile-search-content .mobile-search-field-group');
        
        if (calWrapper) {
          calWrapper.classList.remove('active');
        }
        
        // Show date field groups again
        dateFieldGroups.forEach(group => {
          if (group.querySelector('#mobile-checkin-input') || group.querySelector('#mobile-checkout-input')) {
            group.style.display = 'flex';
          }
        });
      } else {
        // Both already selected, start over
        checkinDate = dateStr;
        checkoutDate = null;
        console.log('✅ Restarting - Check-in selected:', checkinDate);
        renderMobileCalendar();
        syncOverlayFields();
      }
    }
    
    function clearMobileDates() {
      checkinDate = null;
      checkoutDate = null;
      renderMobileCalendar();
      syncOverlayFields();
    }
    
    function pad(n) {
      return String(n).padStart(2, '0');
    }
    
    function showMobileLocationDropdown(predictions) {
      // Reuse desktop location dropdown logic
      const existingDropdown = document.querySelector('.location-dropdown');
      if (existingDropdown) existingDropdown.remove();
      
      if (predictions.length === 0) return;
      
      const dropdown = document.createElement('div');
      dropdown.className = 'location-dropdown';
      dropdown.style.cssText = `
        position: fixed;
        left: 20px;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        max-height: 400px;
        overflow-y: auto;
        z-index: 2001;
      `;
      
      predictions.forEach(prediction => {
        const option = document.createElement('div');
        option.className = 'location-option';
        option.textContent = prediction.description;
        option.style.cssText = `
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
        `;
        
        option.addEventListener('click', () => {
          selectedLocation = prediction;
          document.getElementById('mobile-location-input').value = prediction.description;
          dropdown.remove();
        });
        
        dropdown.appendChild(option);
      });
      
      document.body.appendChild(dropdown);
      
      // Close on background click
      setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
          if (!dropdown.contains(e.target) && e.target.id !== 'mobile-location-input') {
            dropdown.remove();
            document.removeEventListener('click', closeDropdown);
          }
        });
      }, 100);
    }
    
    function syncMobileToDesktop() {
      // Sync location
      const mobileLocation = document.getElementById('mobile-location-input');
      const desktopLocation = document.getElementById('location-input');
      if (mobileLocation && desktopLocation) {
        desktopLocation.value = mobileLocation.value;
      }
    }
    
    function syncOverlayFields() {
      const locationInput = document.getElementById('mobile-location-input');
      const checkinInput = document.getElementById('mobile-checkin-input');
      const checkoutInput = document.getElementById('mobile-checkout-input');
      const guestsInput = document.getElementById('mobile-guests-input');
      
      if (locationInput && selectedLocation) {
        locationInput.value = selectedLocation.description;
      }
      
      if (checkinInput) {
        if (checkinDate) {
          const d = new Date(checkinDate + 'T00:00:00');
          checkinInput.value = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
          checkinInput.value = '';
          checkinInput.placeholder = 'Add date';
        }
      }
      
      if (checkoutInput) {
        if (checkoutDate) {
          const d = new Date(checkoutDate + 'T00:00:00');
          checkoutInput.value = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
          checkoutInput.value = '';
          checkoutInput.placeholder = 'Add date';
        }
      }
      
      if (guestsInput) {
        guestsInput.value = `${guestCount} ${guestCount === 1 ? 'guest' : 'guests'}`;
      }
    }
    
    function moveFiltersToOverlay() {
      const container = document.getElementById('mobile-filters-container');
      const filterDropdown = document.getElementById('filter-dropdown');
      
      if (container && filterDropdown && window.innerWidth <= 768) {
        // Only clone if not already cloned
        if (container.children.length === 0) {
          const clone = filterDropdown.cloneNode(true);
          clone.style.display = 'block';
          clone.id = 'mobile-filter-dropdown';
          
          // Remove the action buttons from clone
          const clonedActions = clone.querySelector('div[style*="display: flex; gap: 12px"]');
          if (clonedActions && clonedActions.querySelector('#clear-filters')) {
            clonedActions.remove();
          }
          
          container.appendChild(clone);
          setupMobileFilterControls(clone);
        }
      }
    }
    
    function setupMobileFilterControls(clone) {
      console.log('📱 Setting up mobile filter controls');
      
      // PRICE SLIDERS
      const clonedMinSlider = clone.querySelector('#price-min-slider');
      const clonedMaxSlider = clone.querySelector('#price-max-slider');
      const clonedTrack = clone.querySelector('#slider-track');
      const clonedMinDisplay = clone.querySelector('#price-min-display');
      const clonedMaxDisplay = clone.querySelector('#price-max-display');
      
      if (clonedMinSlider && clonedMaxSlider && clonedTrack) {
        function updateMobileSlider() {
          let minVal = parseInt(clonedMinSlider.value);
          let maxVal = parseInt(clonedMaxSlider.value);
          
          if (minVal >= maxVal) {
            if (this === clonedMinSlider) {
              clonedMaxSlider.value = minVal + 10;
              maxVal = minVal + 10;
            } else {
              clonedMinSlider.value = maxVal - 10;
              minVal = maxVal - 10;
            }
          }
          
          clonedMinDisplay.textContent = '$' + minVal;
          clonedMaxDisplay.textContent = '$' + maxVal;
          
          const rangeMin = parseInt(clonedMinSlider.min);
          const rangeMax = parseInt(clonedMinSlider.max);
          const percentMin = ((minVal - rangeMin) / (rangeMax - rangeMin)) * 100;
          const percentMax = ((maxVal - rangeMin) / (rangeMax - rangeMin)) * 100;
          
          clonedTrack.style.left = percentMin + '%';
          clonedTrack.style.width = (percentMax - percentMin) + '%';
          priceMin = minVal;
          priceMax = maxVal;
        }
        
        clonedMinSlider.addEventListener('input', updateMobileSlider);
        clonedMaxSlider.addEventListener('input', updateMobileSlider);
        updateMobileSlider.call(clonedMinSlider);
      }
      
      // PROPERTY TYPE PILLS
      const propertyTypePills = clone.querySelectorAll('.property-type-pill');
      propertyTypePills.forEach(pill => {
        pill.addEventListener('click', function() {
          const type = this.textContent.trim();
          const isActive = this.classList.contains('active');
          
          if (isActive) {
            this.classList.remove('active');
            this.style.background = 'white';
            this.style.color = '#0F2C3A';
            this.style.borderColor = '#E0E0E0';
            selectedPropertyTypes = selectedPropertyTypes.filter(t => t !== type);
          } else {
            this.classList.add('active');
            this.style.background = '#16A8EE';
            this.style.color = 'white';
            this.style.borderColor = '#16A8EE';
            selectedPropertyTypes.push(type);
          }
        });
      });
      
      // BEDROOMS
      const bedroomsMinus = clone.querySelector('#bedrooms-minus');
      const bedroomsPlus = clone.querySelector('#bedrooms-plus');
      const bedroomsCount = clone.querySelector('#bedrooms-count');
      
      if (bedroomsMinus && bedroomsPlus && bedroomsCount) {
        bedroomsMinus.addEventListener('click', () => {
          if (bedroomsFilter > 0) {
            bedroomsFilter--;
            bedroomsCount.textContent = bedroomsFilter === 0 ? 'Any' : bedroomsFilter;
            bedroomsMinus.style.opacity = bedroomsFilter === 0 ? '0.3' : '1';
          }
        });
        
        bedroomsPlus.addEventListener('click', () => {
          bedroomsFilter++;
          bedroomsCount.textContent = bedroomsFilter;
          bedroomsMinus.style.opacity = '1';
        });
      }
      
      // BEDS
      const bedsMinus = clone.querySelector('#beds-minus');
      const bedsPlus = clone.querySelector('#beds-plus');
      const bedsCount = clone.querySelector('#beds-count');
      
      if (bedsMinus && bedsPlus && bedsCount) {
        bedsMinus.addEventListener('click', () => {
          if (bedsFilter > 0) {
            bedsFilter--;
            bedsCount.textContent = bedsFilter === 0 ? 'Any' : bedsFilter;
            bedsMinus.style.opacity = bedsFilter === 0 ? '0.3' : '1';
          }
        });
        
        bedsPlus.addEventListener('click', () => {
          bedsFilter++;
          bedsCount.textContent = bedsFilter;
          bedsMinus.style.opacity = '1';
        });
      }
      
      // BATHROOMS
      const bathroomsMinus = clone.querySelector('#bathrooms-minus');
      const bathroomsPlus = clone.querySelector('#bathrooms-plus');
      const bathroomsCount = clone.querySelector('#bathrooms-count');
      
      if (bathroomsMinus && bathroomsPlus && bathroomsCount) {
        bathroomsMinus.addEventListener('click', () => {
          if (bathroomsFilter > 0) {
            bathroomsFilter--;
            bathroomsCount.textContent = bathroomsFilter === 0 ? 'Any' : bathroomsFilter;
            bathroomsMinus.style.opacity = bathroomsFilter === 0 ? '0.3' : '1';
          }
        });
        
        bathroomsPlus.addEventListener('click', () => {
          bathroomsFilter++;
          bathroomsCount.textContent = bathroomsFilter;
          bathroomsMinus.style.opacity = '1';
        });
      }
      
      // PETS TOGGLE
      const petsToggle = clone.querySelector('#pets-toggle');
      if (petsToggle) {
        petsToggle.addEventListener('click', function() {
          petsAllowedFilter = !petsAllowedFilter;
          
          if (petsAllowedFilter) {
            this.style.background = '#16A8EE';
            this.querySelector('div').style.transform = 'translateX(20px)';
          } else {
            this.style.background = '#E0E0E0';
            this.querySelector('div').style.transform = 'translateX(0)';
          }
        });
      }
      
      console.log('✅ Mobile filter controls ready');
    }
    
    function formatDateShort(date) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
