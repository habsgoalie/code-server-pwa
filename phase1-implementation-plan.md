# Phase 1 Implementation Plan: Core Functionality Improvements

This document outlines the detailed implementation plan for Phase 1 of the Code Server PWA improvements. We'll focus on three key areas:

1. Refactoring the keyboard implementation
2. Adding service worker for offline capabilities
3. Improving error handling and loading states

## 1. Refactor Keyboard Implementation

### Current Issues
- Limited key set (only Ctrl, arrows, C, V)
- Inefficient event handling (dispatches keydown and keyup simultaneously)
- No visual feedback when keys are pressed
- No ability to toggle keyboard visibility
- No support for key combinations

### Implementation Steps

#### 1.1 Create Separate JavaScript File for Keyboard Logic
- Create a new file `js/keyboard.js` to contain all keyboard-related functionality
- Move existing keyboard code from index.html to this file
- Add proper documentation and comments

#### 1.2 Expand Key Set
- Add additional terminal keys:
  - Tab, Esc, Backspace, Delete
  - Function keys (F1-F12)
  - Special keys (Home, End, Page Up, Page Down)
  - Common terminal combinations (Ctrl+C, Ctrl+D, Ctrl+Z)

#### 1.3 Improve Event Handling
- Fix the current implementation to properly handle key states
- Implement proper keydown/keyup event sequence
- Add support for key combinations (e.g., Ctrl+C as a single action)
- Implement key repeat for held keys

#### 1.4 Add Keyboard Toggle
- Add a button to show/hide the keyboard overlay
- Store user preference in localStorage
- Add keyboard shortcut to toggle visibility

#### 1.5 Add Visual Feedback
- Implement CSS for active key states
- Add subtle animations for key presses
- Improve overall keyboard styling

#### 1.6 Code Changes
- Update index.html to include the new JavaScript file
- Modify the keyboard overlay HTML structure
- Add CSS for improved styling and visual feedback

## 2. Add Service Worker for Offline Capabilities

### Current Issues
- No offline support
- No caching of static assets
- No background sync capabilities

### Implementation Steps

#### 2.1 Create Service Worker File
- Create a new file `service-worker.js` in the root directory
- Implement basic service worker lifecycle events (install, activate, fetch)

#### 2.2 Implement Caching Strategy
- Cache static assets (HTML, CSS, JS, icons)
- Implement a network-first strategy for dynamic content
- Add versioning for cache management

#### 2.3 Update Manifest and HTML
- Ensure manifest.json is properly configured for offline use
- Add service worker registration in index.html
- Add appropriate meta tags for PWA installation

#### 2.4 Add Offline Fallback
- Create an offline fallback page
- Implement logic to detect offline status and show appropriate message

#### 2.5 Code Changes
- Add service worker registration code to index.html
- Create service-worker.js with caching logic
- Update manifest.json if needed

## 3. Improve Error Handling and Loading States

### Current Issues
- No loading indicator while Code Server loads
- No error handling for iframe loading failures
- No feedback to user during loading or errors

### Implementation Steps

#### 3.1 Add Loading Indicator
- Create a loading overlay with spinner/progress indicator
- Show loading overlay while iframe is loading
- Hide overlay once Code Server is fully loaded

#### 3.2 Implement Error Handling
- Add error detection for iframe loading failures
- Create error messages for common failure scenarios
- Implement retry mechanism for failed loads

#### 3.3 Add Connection Status Indicator
- Add a status indicator showing connection state
- Implement reconnection logic for lost connections
- Provide user feedback on connection quality

#### 3.4 Code Changes
- Add HTML for loading and error overlays
- Add CSS for styling these elements
- Implement JavaScript for handling loading states and errors

## File Changes Summary

### New Files to Create:
1. `js/keyboard.js` - Refactored keyboard implementation
2. `service-worker.js` - Service worker for offline capabilities
3. `js/app.js` - Main application logic including error handling

### Files to Modify:
1. `index.html` - Update to include new JS files, add loading/error UI elements
2. `manifest.json` - Ensure proper configuration for offline use

## Testing Plan

After implementing these changes, we should test:

1. **Keyboard Functionality**
   - Test all keys and combinations
   - Verify visual feedback works
   - Test keyboard toggle functionality

2. **Offline Capabilities**
   - Test app loading when offline
   - Verify static assets are cached
   - Test offline fallback page

3. **Error Handling**
   - Test behavior when Code Server is unavailable
   - Verify loading indicators work correctly
   - Test reconnection functionality

## Next Steps

After completing Phase 1, we'll evaluate the improvements and gather feedback before moving on to Phase 2, which focuses on UX and feature enhancements.