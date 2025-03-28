document.addEventListener("DOMContentLoaded", function() {
  particlesJS.load('particles-js', 'particles.json', function() {
    console.log('particles.js loaded - callback');
  });
});

var BASE_URL = "https://github.com/Vrdevil44/MusicPad/raw/main/sounds";
var audioBars = {};

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
    var audio = new Audio(`${BASE_URL}/${e.keyCode}.wav`);
    var $bar = $(`#bar-${e.keyCode}`);
    if (audioBars[e.keyCode]) {
      // Update the instance of the time bar for the pressed key
      audioBars[e.keyCode].audio.pause();
      audioBars[e.keyCode].audio.currentTime = 0;
      audioBars[e.keyCode].bar.removeClass('active');
    } else {
      $bar.addClass('active');
    }
    audioBars[e.keyCode] = {audio: audio, bar: $bar};
    audio.play();
    $(`#pad-${e.keyCode}`).fadeOut(20).fadeIn(20);
    audio.addEventListener('timeupdate', function() {
      var duration = audio.duration;
      var currentTime = audio.currentTime;
      var width = (currentTime / duration) * 100;
      audioBars[e.keyCode].bar.css('width', (100 - width) + '%');
    });
  }
});

$('body').on("click", '.key-pad', function(e) {
  e = e || window.event;
  var id = $(this).attr('id');
  var keyCode = id.split("-")[1];
  console.log('Tap KeyCode: ' + keyCode);

  var audio = new Audio(`${BASE_URL}/${keyCode}.wav`);
  var $bar = $(`#bar-${keyCode}`);
  if (audioBars[keyCode]) {
    // Update the instance of the time bar for the tapped key
    audioBars[keyCode].audio.pause();
    audioBars[keyCode].audio.currentTime = 0;
    audioBars[keyCode].bar.removeClass('active');
  } else {
    $bar.addClass('active');
  }
  audioBars[keyCode] = {audio: audio, bar: $bar};
  audio.play();
  $(`#pad-${keyCode}`).fadeOut(20).fadeIn(20);
  audio.addEventListener('timeupdate', function() {
    var duration = audio.duration;
    var currentTime = audio.currentTime;
    var width = (currentTime / duration) * 100;
    audioBars[keyCode].bar.css('width', (100 - width) + '%');
  });
});

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

// Add error handling for audio loading
function loadAudio(keyCode) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(`${BASE_URL}/${keyCode}.wav`);
    audio.addEventListener('canplaythrough', () => resolve(audio));
    audio.addEventListener('error', (e) => reject(e));
  });
}

