#!/usr/bin/env node

// Simple build script for development
const fs = require('fs');
const path = require('path');

// Ensure dist directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Copy HTML
function copyHTML() {
  const srcPath = path.join(__dirname, 'app/src/index.html');
  const destPath = path.join(__dirname, 'app/dist/index.html');
  
  ensureDir(path.dirname(destPath));
  
  // Read the source HTML and ensure CSP is included
  let htmlContent = fs.readFileSync(srcPath, 'utf8');
  
  // Make sure CSP meta tag is present for mobile-friendly JavaScript execution
  const cspTag = `<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-eval' 'unsafe-inline'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; frame-src 'none';">`;
  
  if (!htmlContent.includes('Content-Security-Policy')) {
    htmlContent = htmlContent.replace('</head>', `  ${cspTag}\n</head>`);
  }
  
  fs.writeFileSync(destPath, htmlContent);
  console.log('✓ Copied HTML with CSP header');
}

// Create simple CSS (we'll use this to test the mobile changes)
function createCSS() {
  ensureDir('app/dist/css/3D');
  
  const css = `
/* Basic 3D styles for testing */
body, html {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  width: 100%;
  height: 100%;
  font-family: 'Raleway', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background: #0a0a0a;
  color: white;
}

.loader {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
}

/* Mobile optimizations */
body {
  -webkit-overflow-scrolling: touch;
  -webkit-touch-callout: none;
  -webkit-text-size-adjust: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

body.mobile {
  overflow: hidden;
  position: fixed;
  width: 100%;
  height: 100%;
  -webkit-overflow-scrolling: auto;
}

@media screen and (max-width: 768px) {
  .menu {
    top: 20px;
    left: 20px;
    height: 50px;
  }
  
  .trigger {
    height: 100px;
  }
  
  h1 {
    font-size: 20px;
    line-height: 30px;
    letter-spacing: 5px;
  }
}
`;

  fs.writeFileSync('app/dist/css/3D/main.css', css);
  console.log('✓ Created CSS');
}

// Create simple JS bundle (for testing)
function createJS() {
  ensureDir('app/dist/js/3D');
  
  const js = `
// Mobile-friendly 3D portfolio - Enhanced Version
console.log('3D Portfolio - Mobile Enabled with CSP Support');

// Mobile detection utilities
const MobileUtils = {
  isMobile: function() {
    return navigator.userAgent.match(/Android/i)
      || navigator.userAgent.match(/webOS/i)
      || navigator.userAgent.match(/iPhone/i)
      || navigator.userAgent.match(/iPad/i)
      || navigator.userAgent.match(/iPod/i)
      || navigator.userAgent.match(/BlackBerry/i)
      || navigator.userAgent.match(/Windows Phone/i);
  },
  
  isTablet: function() {
    return navigator.userAgent.match(/iPad/i)
      || (navigator.userAgent.match(/Android/i) && !navigator.userAgent.match(/Mobile/i));
  },
  
  isTouchCapable: function() {
    return 'ontouchstart' in window 
      || navigator.maxTouchPoints > 0 
      || navigator.msMaxTouchPoints > 0;
  },
  
  getPerformanceLevel: function() {
    if (this.isTablet()) return 'medium';
    if (this.isMobile()) return 'low';
    return 'high';
  }
};

// WebGL Detection
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

// Initialize mobile-friendly experience
function initMobileExperience() {
  const body = document.body;
  
  if (MobileUtils.isMobile()) {
    body.classList.add('mobile');
    console.log('Mobile device detected - 3D experience enabled');
    
    // Prevent default touch behaviors that interfere with WebGL
    document.addEventListener('touchstart', function(e) {
      if (e.target === document.body) {
        e.preventDefault();
      }
    }, { passive: false });
    
    document.addEventListener('touchmove', function(e) {
      if (e.target === document.body) {
        e.preventDefault();
      }
    }, { passive: false });
  }
  
  // Add performance class
  body.classList.add('perf-' + MobileUtils.getPerformanceLevel());
}

// Touch navigation handler
let touchStartY = 0;
let touchStartX = 0;
let isNavigating = false;

function initTouchNavigation() {
  if (!MobileUtils.isTouchCapable()) return;
  
  document.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    }
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (e.changedTouches.length === 1) {
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndX = e.changedTouches[0].clientX;
      
      const swipeDistanceY = Math.abs(touchEndY - touchStartY);
      const swipeDistanceX = Math.abs(touchEndX - touchStartX);
      
      const minSwipeDistance = 50;
      
      if (swipeDistanceY > minSwipeDistance && swipeDistanceY > swipeDistanceX) {
        if (touchEndY < touchStartY) {
          console.log('Swipe up detected - Next section');
          // Trigger next section
          dispatchEvent(new CustomEvent('navigate', { detail: { direction: 'next' } }));
        } else {
          console.log('Swipe down detected - Previous section');
          // Trigger previous section  
          dispatchEvent(new CustomEvent('navigate', { detail: { direction: 'prev' } }));
        }
      }
    }
  }, { passive: true });
}

// WebGL initialization with mobile optimizations
function initWebGL() {
  if (!hasWebGL()) {
    console.warn('WebGL not supported, falling back to 2D experience');
    return false;
  }
  
  const performanceLevel = MobileUtils.getPerformanceLevel();
  const config = {
    antialias: performanceLevel === 'high',
    alpha: false,
    depth: true,
    stencil: false,
    powerPreference: MobileUtils.isMobile() ? 'low-power' : 'high-performance'
  };
  
  console.log('WebGL initialized with config:', config);
  return true;
}

// Menu handling for mobile
function initMobileMenu() {
  const menuButton = document.querySelector('.menu__button');
  const menu = document.querySelector('.menu');
  
  if (menuButton && MobileUtils.isTouchCapable()) {
    let menuOpen = false;
    
    menuButton.addEventListener('touchend', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (menuOpen) {
        menu.classList.remove('open');
        console.log('Menu closed');
      } else {
        menu.classList.add('open');
        console.log('Menu opened');
      }
      menuOpen = !menuOpen;
    });
    
    // Close menu when touching outside
    document.addEventListener('touchend', function(e) {
      if (menuOpen && !menu.contains(e.target)) {
        menu.classList.remove('open');
        menuOpen = false;
        console.log('Menu closed (outside touch)');
      }
    });
  }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing mobile-friendly 3D portfolio...');
  
  initMobileExperience();
  initTouchNavigation();
  initWebGL();
  initMobileMenu();
  
  // Remove loader
  const loader = document.querySelector('.loader');
  if (loader) {
    setTimeout(() => {
      loader.style.opacity = '0';
      setTimeout(() => {
        loader.style.display = 'none';
        console.log('3D Portfolio ready for mobile interaction!');
      }, 500);
    }, 2000);
  }
  
  console.log('Mobile 3D portfolio initialization complete!');
});

// Export for potential module usage
window.MobilePortfolio = {
  MobileUtils,
  hasWebGL,
  initMobileExperience,
  initTouchNavigation,
  initWebGL,
  initMobileMenu
};
`;

  fs.writeFileSync('app/dist/js/3D/bundle.js', js);
  console.log('✓ Created enhanced mobile JS with CSP support');
}

// Run build
console.log('Building mobile-friendly 3D portfolio...');
copyHTML();
createCSS();
createJS();
console.log('✅ Build complete!');
