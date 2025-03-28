/**
 * MusicPad Application
 * Main application file that initializes and connects all components
 */

document.addEventListener("DOMContentLoaded", function() {
    // Initialize the audio manager with the base URL for sounds
    // Using relative path instead of GitHub URL to avoid CORS issues
    const BASE_URL = "./sounds";
    const audioManager = new AudioManager(BASE_URL);
    
    // Initialize the track recorder
    const trackRecorder = new TrackRecorder();
    
    // Initialize the loop player
    const loopPlayer = new LoopPlayer(audioManager);
    
    // Initialize the audio exporter
    const audioExporter = new AudioExporter(trackRecorder, audioManager);
    
    // Initialize the UI
    const ui = new MusicPadUI(trackRecorder, loopPlayer, audioManager, audioExporter);
    ui.init();
    
    // Set up the existing key press functionality
    setupExistingKeyboardHandling(audioManager);
    
    console.log('MusicPad application initialized');
  });
  
  /**
   * Set up the existing keyboard handling functionality
   * @param {AudioManager} audioManager - The audio manager
   */
  function setupExistingKeyboardHandling(audioManager) {
    let audioBars = {};
    
    // Handle key press events
    $('body').on("keypress", function(e) {
      e.preventDefault();
      e = e || window.event;
      console.log('Keypress KeyCode: ' + e.keyCode);
      
      if (e.keyCode === 32) {
        // Stop all audio and remove all bars when spacebar is pressed
        for (var key in audioBars) {
          audioBars[key].audio.pause();
          audioBars[key].audio.currentTime = 0;
          audioBars[key].bar.removeClass('active');
          delete audioBars[key];
        }
      } else {
        // Play the sound using the AudioManager
        audioManager.playSound(e.keyCode);
        
        // Handle the visual feedback
        var $bar = $(`#bar-${e.keyCode}`);
        if (audioBars[e.keyCode]) {
          // Update the instance of the time bar for the pressed key
          audioBars[e.keyCode].audio.pause();
          audioBars[e.keyCode].audio.currentTime = 0;
          audioBars[e.keyCode].bar.removeClass('active');
        } else {
          $bar.addClass('active');
        }
        
        // Create a new audio element for the time bar animation
        var audio = new Audio(`${audioManager.baseUrl}/${e.keyCode}.wav`);
        audioBars[e.keyCode] = {audio: audio, bar: $bar};
        audio.play();
        
        // Visual feedback
        $(`#pad-${e.keyCode}`).fadeOut(20).fadeIn(20);
        
        // Time bar animation
        audio.addEventListener('timeupdate', function() {
          var duration = audio.duration;
          var currentTime = audio.currentTime;
          var width = (currentTime / duration) * 100;
          if (audioBars[e.keyCode]) {
            audioBars[e.keyCode].bar.css('width', (100 - width) + '%');
          }
        });
      }
    });
    
    // Handle click events on pads
    $('body').on("click", '.key-pad', function(e) {
      e = e || window.event;
      var id = $(this).attr('id');
      var keyCode = id.split("-")[1];
      console.log('Tap KeyCode: ' + keyCode);
      
      // Play the sound using the AudioManager
      audioManager.playSound(keyCode);
      
      // Handle the visual feedback
      var $bar = $(`#bar-${keyCode}`);
      if (audioBars[keyCode]) {
        // Update the instance of the time bar for the tapped key
        audioBars[keyCode].audio.pause();
        audioBars[keyCode].audio.currentTime = 0;
        audioBars[keyCode].bar.removeClass('active');
      } else {
        $bar.addClass('active');
      }
      
      // Create a new audio element for the time bar animation
      var audio = new Audio(`${audioManager.baseUrl}/${keyCode}.wav`);
      audioBars[keyCode] = {audio: audio, bar: $bar};
      audio.play();
      
      // Visual feedback
      $(`#pad-${keyCode}`).fadeOut(20).fadeIn(20);
      
      // Time bar animation
      audio.addEventListener('timeupdate', function() {
        var duration = audio.duration;
        var currentTime = audio.currentTime;
        var width = (currentTime / duration) * 100;
        if (audioBars[keyCode]) {
          audioBars[keyCode].bar.css('width', (100 - width) + '%');
        }
      });
    });
    
    // Handle key up events
    $('body').on("keyup", function(e) {
      e = e || window.event;
      var keyCode = e.keyCode;
      console.log('Keyup KeyCode: ' + keyCode);
      
      if (audioBars[keyCode]) {
        // Remove the time bar when the audio finishes
        var audioBar = audioBars[keyCode];
        var audio = audioBar.audio;
        var bar = audioBar.bar;
        var duration = audio.duration;
        var currentTime = audio.currentTime;
        var remainingTime = duration - currentTime;
        bar.removeClass('active');
        delete audioBars[keyCode];
        if (remainingTime > 0.1) {
          audio.pause();
          audio.currentTime = 0;
        }
      }
    });
  }
  