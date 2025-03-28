// Fix for particles.js background
document.addEventListener("DOMContentLoaded", function() {
    // Check if particles-js element exists
    const particlesContainer = document.getElementById('particles-js');
    if (!particlesContainer) {
      console.error('particles-js container not found');
      return;
    }
    
    // Make sure the container has the right CSS
    particlesContainer.style.position = 'fixed';
    particlesContainer.style.width = '100%';
    particlesContainer.style.height = '100%';
    particlesContainer.style.zIndex = '1';
    particlesContainer.style.top = '0';
    particlesContainer.style.left = '0';
    
    // Create canvas element if it doesn't exist
    if (!particlesContainer.querySelector('.particles-js-canvas-el')) {
      const canvas = document.createElement('canvas');
      canvas.className = 'particles-js-canvas-el';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      particlesContainer.appendChild(canvas);
    }
    
    // Initialize particles with custom settings for the red/blue gradient look
    particlesJS('particles-js', {
      "particles": {
        "number": {
          "value": 80,
          "density": {
            "enable": true,
            "value_area": 800
          }
        },
        "color": {
          "value": "#ffffff"
        },
        "shape": {
          "type": "circle",
          "stroke": {
            "width": 0,
            "color": "#000000"
          }
        },
        "opacity": {
          "value": 0.5,
          "random": true,
          "anim": {
            "enable": true,
            "speed": 1,
            "opacity_min": 0.1,
            "sync": false
          }
        },
        "size": {
          "value": 3,
          "random": true,
          "anim": {
            "enable": false,
            "speed": 40,
            "size_min": 0.1,
            "sync": false
          }
        },
        "line_linked": {
          "enable": true,
          "distance": 150,
          "color": "#ff0000",
          "opacity": 0.4,
          "width": 1
        },
        "move": {
          "enable": true,
          "speed": 2,
          "direction": "none",
          "random": true,
          "straight": false,
          "out_mode": "out",
          "bounce": false,
          "attract": {
            "enable": true,
            "rotateX": 600,
            "rotateY": 1200
          }
        }
      },
      "interactivity": {
        "detect_on": "canvas",
        "events": {
          "onhover": {
            "enable": true,
            "mode": "repulse"
          },
          "onclick": {
            "enable": true,
            "mode": "push"
          },
          "resize": true
        },
        "modes": {
          "grab": {
            "distance": 140,
            "line_linked": {
              "opacity": 1
            }
          },
          "bubble": {
            "distance": 400,
            "size": 40,
            "duration": 2,
            "opacity": 8,
            "speed": 3
          },
          "repulse": {
            "distance": 100,
            "duration": 0.4
          },
          "push": {
            "particles_nb": 4
          },
          "remove": {
            "particles_nb": 2
          }
        }
      },
      "retina_detect": true
    });
    
    console.log('Particles.js initialized with custom settings');
  });
  