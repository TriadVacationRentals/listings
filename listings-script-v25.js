// Add this function to replace the existing setupMobileBottomSheet function

function setupMobileBottomSheet() {
  // Only on mobile
  if (window.innerWidth > 768) return;
  
  console.log('📱 Setting up mobile UI...');
  
  const mapSection = document.getElementById('map-section');
  const cardsSection = document.getElementById('cards-section');
  const searchTrigger = document.getElementById('mobile-search-trigger');
  const viewToggleCheckbox = document.getElementById('view-toggle-checkbox');
  const overlay = document.getElementById('mobile-search-overlay');
  const overlayClose = document.getElementById('mobile-overlay-close');
  const applyBtn = document.getElementById('mobile-apply-search');
  const clearBtn = document.getElementById('mobile-clear-all');
  
  if (!mapSection || !cardsSection) return;
  
  // View toggle
  if (viewToggleCheckbox) {
    let savedMapView = null;
    let isMapView = true;
    
    viewToggleCheckbox.addEventListener('change', () => {
      if (viewToggleCheckbox.checked) {
        isMapView = true;
        mapSection.classList.remove('list-view-active');
        cardsSection.classList.remove('list-view-active');
        
        if (mapInstance) {
          setTimeout(() => {
            try {
              mapInstance.invalidateSize();
              
              if (savedMapView) {
                mapInstance.setView(savedMapView.center, savedMapView.zoom, { animate: false });
              } else if (mapMarkers.length > 0) {
                const group = L.featureGroup(mapMarkers);
                mapInstance.fitBounds(group.getBounds().pad(0.1), { animate: false });
              }
            } catch (error) {
              console.warn('Could not restore map:', error);
            }
          }, 100);
        }
        
        console.log('🗺️ Map visible');
      } else {
        isMapView = false;
        
        if (mapInstance) {
          try {
            savedMapView = {
              center: mapInstance.getCenter(),
              zoom: mapInstance.getZoom()
            };
          } catch (error) {
            console.warn('Could not save map view:', error);
          }
        }
        
        mapSection.classList.add('list-view-active');
        cardsSection.classList.add('list-view-active');
        
        const currentProperties = getCurrentFilteredProperties();
        renderPropertyCards(currentProperties);
        
        console.log('📋 List visible');
      }
    });
  }
  
  // Search trigger button
  if (searchTrigger) {
    searchTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('📱 Mobile search trigger clicked');
      overlay.classList.add('active');
      syncOverlayFields();
      setupMobileFilters(); // Initialize mobile filters
    });
  }
  
  // Close overlay
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  }
  
  if (overlayClose) {
    overlayClose.addEventListener('click', () => {
      overlay.classList.remove('active');
    });
  }
  
  // Apply search/filters
  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      console.log('📱 Mobile apply button clicked');
      
      syncMobileToDesktop();
      
      if (selectedLocation) {
        console.log('📱 Running search...');
        await handleSearch();
      } else {
        console.log('📱 No location selected, just applying filters');
        const filteredProperties = applyCurrentFilters(allProperties);
        renderPropertyCards(filteredProperties);
        updateMapMarkers(filteredProperties);
      }
      
      overlay.classList.remove('active');
    });
  }
  
  // Clear all
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      selectedLocation = null;
      checkinDate = null;
      checkoutDate = null;
      guestCount = 1;
      
      const locationInput = document.getElementById('location-input');
      if (locationInput) locationInput.value = '';
      
      const checkinDisplay = document.getElementById('checkin-display');
      const checkoutDisplay = document.getElementById('checkout-display');
      const guestsDisplay = document.getElementById('guests-display');
      
      if (checkinDisplay) checkinDisplay.value = 'Add date';
      if (checkoutDisplay) checkoutDisplay.value = 'Add date';
      if (guestsDisplay) guestsDisplay.value = '1 guest';
      
      // Clear mobile filters
      clearMobileFilters();
      
      syncOverlayFields();
    });
  }
  
  setupMobileInputs();
  
  console.log('✅ Mobile UI ready');
}

// NEW FUNCTION: Initialize mobile filters
function setupMobileFilters() {
  console.log('📱 Setting up mobile filters...');
  
  // Get actual price range from properties
  const actualMinPrice = allProperties.length > 0 
    ? Math.floor(Math.min(...allProperties.map(p => p.priceMin).filter(p => p > 0)))
    : 0;
  const actualMaxPrice = allProperties.length > 0
    ? Math.ceil(Math.max(...allProperties.map(p => p.priceMax)))
    : 1000;
  
  // Initialize mobile price sliders
  const minSlider = document.getElementById('mobile-price-min-slider');
  const maxSlider = document.getElementById('mobile-price-max-slider');
  
  if (minSlider && maxSlider) {
    minSlider.min = actualMinPrice;
    minSlider.max = actualMaxPrice;
    minSlider.value = actualMinPrice;
    
    maxSlider.min = actualMinPrice;
    maxSlider.max = actualMaxPrice;
    maxSlider.value = actualMaxPrice;
    
    document.getElementById('mobile-price-min-display').textContent = '$' + actualMinPrice;
    document.getElementById('mobile-price-max-display').textContent = '$' + actualMaxPrice;
    
    // Add slider thumb styles
    const style = document.createElement('style');
    style.id = 'mobile-slider-styles';
    if (!document.getElementById('mobile-slider-styles')) {
      style.textContent = `
        #mobile-price-min-slider::-webkit-slider-thumb,
        #mobile-price-max-slider::-webkit-slider-thumb {
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
        #mobile-price-min-slider::-webkit-slider-thumb:hover,
        #mobile-price-max-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 2px 8px rgba(22, 168, 238, 0.4);
        }
        #mobile-price-min-slider::-moz-range-thumb,
        #mobile-price-max-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: white;
          border: 2px solid #16A8EE;
          border-radius: 50%;
          cursor: pointer;
          pointer-events: auto;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }
      `;
      document.head.appendChild(style);
    }
    
    function updateMobileSlider() {
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
      
      document.getElementById('mobile-price-min-display').textContent = '$' + minVal;
      document.getElementById('mobile-price-max-display').textContent = '$' + maxVal;
      
      const rangeMin = parseInt(minSlider.min);
      const rangeMax = parseInt(minSlider.max);
      const percentMin = ((minVal - rangeMin) / (rangeMax - rangeMin)) * 100;
      const percentMax = ((maxVal - rangeMin) / (rangeMax - rangeMin)) * 100;
      
      const track = document.getElementById('mobile-slider-track');
      if (track) {
        track.style.left = percentMin + '%';
        track.style.width = (percentMax - percentMin) + '%';
      }
      
      // Update desktop sliders too
      const desktopMinSlider = document.getElementById('price-min-slider');
      const desktopMaxSlider = document.getElementById('price-max-slider');
      if (desktopMinSlider) desktopMinSlider.value = minVal;
      if (desktopMaxSlider) desktopMaxSlider.value = maxVal;
    }
    
    minSlider.addEventListener('input', updateMobileSlider);
    maxSlider.addEventListener('input', updateMobileSlider);
    updateMobileSlider.call(minSlider);
  }
  
  // Property types
  const container = document.getElementById('mobile-property-types');
  if (container) {
    container.innerHTML = ''; // Clear existing
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
      
      // Check if already selected
      if (selectedPropertyTypes.includes(type)) {
        pill.classList.add('active');
        pill.style.background = '#16A8EE';
        pill.style.color = 'white';
        pill.style.borderColor = '#16A8EE';
      }
      
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
  
  // Bedrooms
  const bedroomsMinus = document.getElementById('mobile-bedrooms-minus');
  const bedroomsPlus = document.getElementById('mobile-bedrooms-plus');
  const bedroomsCount = document.getElementById('mobile-bedrooms-count');
  
  if (bedroomsMinus && bedroomsPlus && bedroomsCount) {
    bedroomsCount.textContent = bedroomsFilter === 0 ? 'Any' : bedroomsFilter;
    bedroomsMinus.style.opacity = bedroomsFilter === 0 ? '0.3' : '1';
    
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
  
  // Beds
  const bedsMinus = document.getElementById('mobile-beds-minus');
  const bedsPlus = document.getElementById('mobile-beds-plus');
  const bedsCount = document.getElementById('mobile-beds-count');
  
  if (bedsMinus && bedsPlus && bedsCount) {
    bedsCount.textContent = bedsFilter === 0 ? 'Any' : bedsFilter;
    bedsMinus.style.opacity = bedsFilter === 0 ? '0.3' : '1';
    
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
  
  // Bathrooms
  const bathroomsMinus = document.getElementById('mobile-bathrooms-minus');
  const bathroomsPlus = document.getElementById('mobile-bathrooms-plus');
  const bathroomsCount = document.getElementById('mobile-bathrooms-count');
  
  if (bathroomsMinus && bathroomsPlus && bathroomsCount) {
    bathroomsCount.textContent = bathroomsFilter === 0 ? 'Any' : bathroomsFilter;
    bathroomsMinus.style.opacity = bathroomsFilter === 0 ? '0.3' : '1';
    
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
  
  // Pets toggle
  const petsToggle = document.getElementById('mobile-pets-toggle');
  if (petsToggle) {
    if (petsAllowedFilter) {
      petsToggle.style.background = '#16A8EE';
      petsToggle.querySelector('div').style.transform = 'translateX(20px)';
    }
    
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
  
  console.log('✅ Mobile filters initialized');
}

// NEW FUNCTION: Clear mobile filters
function clearMobileFilters() {
  const actualMinPrice = allProperties.length > 0 
    ? Math.floor(Math.min(...allProperties.map(p => p.priceMin).filter(p => p > 0)))
    : 0;
  const actualMaxPrice = allProperties.length > 0
    ? Math.ceil(Math.max(...allProperties.map(p => p.priceMax)))
    : 1000;
  
  // Reset filter values
  priceMin = actualMinPrice;
  priceMax = actualMaxPrice;
  bedroomsFilter = 0;
  bedsFilter = 0;
  bathroomsFilter = 0;
  selectedPropertyTypes = [];
  petsAllowedFilter = false;
  
  // Reset mobile UI
  const minSlider = document.getElementById('mobile-price-min-slider');
  const maxSlider = document.getElementById('mobile-price-max-slider');
  if (minSlider && maxSlider) {
    minSlider.value = actualMinPrice;
    maxSlider.value = actualMaxPrice;
    document.getElementById('mobile-price-min-display').textContent = '$' + actualMinPrice;
    document.getElementById('mobile-price-max-display').textContent = '$' + actualMaxPrice;
    const track = document.getElementById('mobile-slider-track');
    if (track) {
      track.style.left = '0%';
      track.style.width = '100%';
    }
  }
  
  // Reset property type pills
  document.querySelectorAll('#mobile-property-types .property-type-pill').forEach(pill => {
    pill.classList.remove('active');
    pill.style.background = 'white';
    pill.style.color = '#0F2C3A';
    pill.style.borderColor = '#E0E0E0';
  });
  
  // Reset room counts
  const bedroomsCount = document.getElementById('mobile-bedrooms-count');
  const bedsCount = document.getElementById('mobile-beds-count');
  const bathroomsCount = document.getElementById('mobile-bathrooms-count');
  
  if (bedroomsCount) bedroomsCount.textContent = 'Any';
  if (bedsCount) bedsCount.textContent = 'Any';
  if (bathroomsCount) bathroomsCount.textContent = 'Any';
  
  document.getElementById('mobile-bedrooms-minus').style.opacity = '0.3';
  document.getElementById('mobile-beds-minus').style.opacity = '0.3';
  document.getElementById('mobile-bathrooms-minus').style.opacity = '0.3';
  
  // Reset pets toggle
  const petsToggle = document.getElementById('mobile-pets-toggle');
  if (petsToggle) {
    petsToggle.style.background = '#E0E0E0';
    petsToggle.querySelector('div').style.transform = 'translateX(0)';
  }
  
  // Also clear desktop filters
  const desktopClearBtn = document.getElementById('clear-filters');
  if (desktopClearBtn) desktopClearBtn.click();
}
