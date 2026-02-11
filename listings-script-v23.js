// ============================================
// JAVASCRIPT CHANGES FOR listings-script-v23.js
// ============================================
// Replace these 4 functions in your existing listings-script-v22.js file

// ============================================
// CHANGE 1: Fix selectDate() - Store dates as strings
// ============================================
// FIND THIS FUNCTION and REPLACE it with:

function selectDate(type, date) {
  const dateStr = formatDate(date); // Convert to YYYY-MM-DD string
  
  if (type === 'checkin') {
    checkinDate = dateStr; // Store as string
    checkoutDate = null;
    document.getElementById('checkin-display').value = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    document.getElementById('checkout-display').value = 'Add date';
  } else {
    if (dateStr <= checkinDate) {
      alert('Check-out must be after check-in');
      return;
    }
    checkoutDate = dateStr; // Store as string
    document.getElementById('checkout-display').value = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  hideDatePickers();
}

// ============================================
// CHANGE 2: Fix toggleMobileCalendar() - Use display: flex
// ============================================
// FIND THIS FUNCTION and REPLACE it with:

function toggleMobileCalendar() {
  const calWrapper = document.getElementById('mobile-calendar-wrapper');
  const guestPopup = document.getElementById('mobile-guest-popup');
  
  // Get BOTH date input fields directly
  const checkinInput = document.getElementById('mobile-checkin-input');
  const checkoutInput = document.getElementById('mobile-checkout-input');
  
  // Get their parent containers
  const checkinParent = checkinInput?.closest('.mobile-search-field-group');
  const checkoutParent = checkoutInput?.closest('.mobile-search-field-group');
  
  // Hide guest popup
  if (guestPopup) guestPopup.classList.remove('active');
  
  // Toggle calendar
  if (calWrapper.classList.contains('active')) {
    // Closing calendar - show date fields again
    calWrapper.classList.remove('active');
    if (checkinParent) checkinParent.style.display = 'flex'; // ✅ Changed from 'block'
    if (checkoutParent) checkoutParent.style.display = 'flex'; // ✅ Changed from 'block'
  } else {
    // Opening calendar - hide date fields, show calendar
    calWrapper.classList.add('active');
    if (checkinParent) checkinParent.style.display = 'none';
    if (checkoutParent) checkoutParent.style.display = 'none';
    renderMobileCalendar();
  }
}

// ============================================
// CHANGE 3: Fix selectMobileDate() - Use display: flex
// ============================================
// FIND THIS FUNCTION and REPLACE it with:

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
    const checkinParent = document.getElementById('mobile-checkin-input')?.closest('.mobile-search-field-group');
    const checkoutParent = document.getElementById('mobile-checkout-input')?.closest('.mobile-search-field-group');
    
    if (calWrapper) {
      calWrapper.classList.remove('active');
    }
    
    // Show date field groups again with flex
    if (checkinParent) checkinParent.style.display = 'flex'; // ✅ Changed from 'block'
    if (checkoutParent) checkoutParent.style.display = 'flex'; // ✅ Changed from 'block'
  } else {
    // Both already selected, start over
    checkinDate = dateStr;
    checkoutDate = null;
    console.log('✅ Restarting - Check-in selected:', checkinDate);
    renderMobileCalendar();
    syncOverlayFields();
  }
}

// ============================================
// CHANGE 4: Update mobile apply button section in setupMobileBottomSheet()
// ============================================
// FIND this section in the setupMobileBottomSheet() function:
//
//   // Apply search/filters
//   if (applyBtn) {
//     console.log('✅ Mobile apply button found:', applyBtn);
//     applyBtn.addEventListener('click', async () => {
//
// And REPLACE the entire event listener with:

  // Apply search/filters
  if (applyBtn) {
    console.log('✅ Mobile apply button found:', applyBtn);
    applyBtn.addEventListener('click', async () => {
      console.log('📱 Mobile apply button clicked');
      
      // Validate location is required
      if (!selectedLocation) {
        alert('Please enter a location');
        return;
      }
      
      // Create loading overlay inside the panel
      const panel = document.querySelector('.mobile-search-panel');
      const loadingOverlay = document.createElement('div');
      loadingOverlay.id = 'mobile-loading-overlay';
      loadingOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.95);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 100;
        border-radius: 24px 24px 0 0;
      `;
      loadingOverlay.innerHTML = `
        <div style="width: 50px; height: 50px; border: 4px solid #e5e7eb; border-top: 4px solid #16A8EE; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 16px; font-size: 16px; font-weight: 600; color: #0F2C3A;">Searching properties...</p>
      `;
      
      panel.appendChild(loadingOverlay);
      
      // Sync mobile fields to desktop
      syncMobileToDesktop();
      
      try {
        // Run search
        console.log('📱 Running search...');
        await handleSearch();
        
        // Success - close overlay
        overlay.classList.remove('active');
        loadingOverlay.remove();
      } catch (error) {
        // Error - remove loading, show error
        loadingOverlay.remove();
        alert('Search failed. Please try again.');
        console.error('Search error:', error);
      }
    });
  } else {
    console.error('❌ Mobile apply button NOT FOUND - check HTML for id="mobile-apply-search"');
  }

// ============================================
// IMPLEMENTATION INSTRUCTIONS
// ============================================
/*
1. Open your current listings-script-v22.js file
2. Find each of the 4 functions listed above
3. Replace them with the new versions
4. Save the file as listings-script-v23.js
5. Upload to GitHub
6. Update your Webflow head to reference v23 instead of v22
*/
