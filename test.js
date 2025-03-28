/**
 * MusicPad Test and Optimization
 * Tests all implemented features and optimizes performance
 */

document.addEventListener("DOMContentLoaded", function() {
    console.log('Running MusicPad tests and optimizations...');
    
    // Test particle background
    testParticleBackground();
    
    // Test audio loading
    testAudioLoading();
    
    // Test recording system
    testRecordingSystem();
    
    // Test UI responsiveness
    testUIResponsiveness();
    
    // Apply performance optimizations
    applyPerformanceOptimizations();
    
    console.log('Tests and optimizations completed');
  });
  
  /**
   * Test particle background initialization
   */
  function testParticleBackground() {
    console.log('Testing particle background...');
    
    // Check if particles-js container exists
    const particlesContainer = document.getElementById('particles-js');
    if (!particlesContainer) {
      console.error('particles-js container not found');
      return;
    }
    
    // Check if canvas was created
    const canvas = particlesContainer.querySelector('.particles-js-canvas-el');
    if (!canvas) {
      console.error('particles-js canvas not created');
      return;
    }
    
    console.log('Particle background initialized successfully');
  }
  
  /**
   * Test audio loading functionality
   */
  function testAudioLoading() {
    console.log('Testing audio loading...');
    
    // Sample key codes to test
    const testKeyCodes = [113, 119, 101, 114]; // q, w, e, r
    
    // Create test audio manager
    const BASE_URL = "https://github.com/Vrdevil44/MusicPad/raw/main/sounds";
    const audioManager = new AudioManager(BASE_URL);
    
    // Test loading each sound
    testKeyCodes.forEach(keyCode => {
      audioManager.loadSound(keyCode)
        .then(() => {
          console.log(`Sound ${keyCode} loaded successfully`);
        })
        .catch(error => {
          console.error(`Error loading sound ${keyCode}:`, error);
        });
    });
  }
  
  /**
   * Test recording system functionality
   */
  function testRecordingSystem() {
    console.log('Testing recording system...');
    
    // Create test instances
    const BASE_URL = "https://github.com/Vrdevil44/MusicPad/raw/main/sounds";
    const audioManager = new AudioManager(BASE_URL);
    const trackRecorder = new TrackRecorder();
    const loopPlayer = new LoopPlayer(audioManager);
    
    // Test recording events
    trackRecorder.startRecording();
    
    // Simulate key presses
    setTimeout(() => {
      trackRecorder.recordEvent(113, 'keydown'); // q
    }, 100);
    
    setTimeout(() => {
      trackRecorder.recordEvent(119, 'keydown'); // w
    }, 300);
    
    setTimeout(() => {
      trackRecorder.recordEvent(101, 'keydown'); // e
    }, 600);
    
    // Stop recording after 1 second
    setTimeout(() => {
      const track = trackRecorder.stopRecording();
      
      if (track && track.events.length === 3) {
        console.log('Recording system working correctly');
        
        // Test playback (without actually playing sounds)
        console.log('Testing playback system...');
        const playbackResult = loopPlayer.playTrack(track, () => {
          console.log('Playback completed successfully');
        });
        
        if (playbackResult) {
          console.log('Playback system initialized correctly');
        } else {
          console.error('Error initializing playback');
        }
      } else {
        console.error('Recording system not working correctly');
      }
    }, 1000);
  }
  
  /**
   * Test UI responsiveness
   */
  function testUIResponsiveness() {
    console.log('Testing UI responsiveness...');
    
    // Check if control panel was created
    const controlPanel = document.querySelector('.control-panel');
    if (!controlPanel) {
      console.error('Control panel not created');
      return;
    }
    
    // Check if buttons were created
    const recordBtn = document.getElementById('record-btn');
    const playBtn = document.getElementById('play-btn');
    const loopBtn = document.getElementById('loop-btn');
    const stopBtn = document.getElementById('stop-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    if (!recordBtn || !playBtn || !loopBtn || !stopBtn || !downloadBtn) {
      console.error('Control buttons not created correctly');
      return;
    }
    
    console.log('UI elements created successfully');
    
    // Test responsive layout
    const viewportWidth = window.innerWidth;
    console.log(`Current viewport width: ${viewportWidth}px`);
    
    if (viewportWidth < 768) {
      console.log('Testing mobile layout...');
      // Check if grid layout is adjusted for mobile
      const section1 = document.querySelector('.section1');
      if (section1) {
        const computedStyle = window.getComputedStyle(section1);
        console.log(`Grid template columns: ${computedStyle.gridTemplateColumns}`);
      }
    }
  }
  
  /**
   * Apply performance optimizations
   */
  function applyPerformanceOptimizations() {
    console.log('Applying performance optimizations...');
    
    // Optimize particle count based on device performance
    optimizeParticles();
    
    // Implement audio preloading for common sounds
    preloadCommonSounds();
    
    // Add debounce to window resize events
    optimizeResizeEvents();
    
    // Optimize animations for lower-end devices
    optimizeAnimations();
  }
  
  /**
   * Optimize particles based on device performance
   */
  function optimizeParticles() {
    // Check if device is low-end (simplified check)
    const isLowEndDevice = navigator.hardwareConcurrency <= 2;
    
    if (isLowEndDevice) {
      console.log('Low-end device detected, reducing particle count');
      
      // Get particles instance
      const pJSInstance = window.pJSDom && window.pJSDom[0];
      if (pJSInstance && pJSInstance.pJS) {
        // Reduce particle count
        const particles = pJSInstance.pJS.particles;
        if (particles) {
          particles.number.value = 30; // Reduced from 80
          particles.move.speed = 1; // Reduced from 2
          
          // Refresh particles
          pJSInstance.pJS.fn.particlesRefresh();
        }
      }
    }
  }
  
  /**
   * Preload common sounds
   */
  function preloadCommonSounds() {
    // Common key codes (most frequently used)
    const commonKeyCodes = [113, 119, 101, 114, 97, 115, 100, 102]; // q, w, e, r, a, s, d, f
    
    // Create audio manager
    const BASE_URL = "https://github.com/Vrdevil44/MusicPad/raw/main/sounds";
    const audioManager = new AudioManager(BASE_URL);
    
    // Preload common sounds
    commonKeyCodes.forEach(keyCode => {
      audioManager.loadSound(keyCode)
        .then(() => {
          console.log(`Preloaded sound ${keyCode}`);
        })
        .catch(error => {
          console.error(`Error preloading sound ${keyCode}:`, error);
        });
    });
  }
  
  /**
   * Optimize window resize events
   */
  function optimizeResizeEvents() {
    // Debounce function
    function debounce(func, wait) {
      let timeout;
      return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          func.apply(context, args);
        }, wait);
      };
    }
    
    // Original resize event handlers
    const originalResize = window.onresize;
    
    // Replace with debounced version
    window.onresize = debounce(function(e) {
      if (originalResize) {
        originalResize(e);
      }
      
      // Additional resize handling if needed
      console.log('Debounced resize event');
    }, 150);
  }
  
  /**
   * Optimize animations for lower-end devices
   */
  function optimizeAnimations() {
    // Check if device is low-end (simplified check)
    const isLowEndDevice = navigator.hardwareConcurrency <= 2 || 
                           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isLowEndDevice) {
      console.log('Low-end device detected, optimizing animations');
      
      // Add a class to body for CSS optimizations
      document.body.classList.add('low-end-device');
      
      // Add simplified animation styles
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        .low-end-device .key-pad {
          transition: none !important;
        }
        
        .low-end-device .key-pad:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2) !important;
        }
        
        .low-end-device .key-pad.playing {
          animation: none !important;
          background: rgba(255, 255, 255, 0.3) !important;
        }
        
        .low-end-device .control-btn:hover:not(:disabled) {
          transform: translateY(-1px) !important;
        }
        
        .low-end-device .sectionh:before {
          animation: none !important;
        }
        
        .low-end-device .control-btn:before {
          display: none !important;
        }
      `;
      document.head.appendChild(styleElement);
    }
  }
  