// Load particles.js configuration
particlesJS.load('particles-js', 'particles.json', function () {
  console.log('callback - particles.js config loaded');
});

// Define the base URL for the audio files
const BASE_URL = 'https://github.com/Vrdevil44/MusicPad/raw/main/sounds';

// Create an object to store the audio bars
const audioBars = {};

/**
 * Update the time bar of the specified key.
 * @param {number} keyCode - The key code of the pressed key.
 */
function updateTimeBar(keyCode) {
  const audio = audioBars[keyCode].audio;
  const $bar = audioBars[keyCode].bar;
  const duration = audio.duration;
  const currentTime = audio.currentTime;
  const width = (currentTime / duration) * 100;
  $bar.css('width', (100 - width) + '%');
}

/**
 * Handle key press events.
 */
$('body').on('keypress', function (e) {
  e.preventDefault();
  const keyCode = e.keyCode;
  console.log('Keypress KeyCode: ' + keyCode);

  if (keyCode === 32) { // Spacebar is pressed
    for (const key in audioBars) {
      audioBars[key].audio.pause();
      audioBars[key].audio.currentTime = 0;
      audioBars[key].bar.removeClass('active');
      delete audioBars[key];
    }
  } else {
    const audio = new Audio(`${BASE_URL}/${keyCode}.wav`);
    const $bar = $(`#bar-${keyCode}`);

    if (audioBars[keyCode]) {
      audioBars[keyCode].audio.pause();
      audioBars[keyCode].audio.currentTime = 0;
      audioBars[keyCode].bar.removeClass('active');
    } else {
      $bar.addClass('active');
    }

    audioBars[keyCode] = { audio: audio, bar: $bar };
    audio.play();
    $(`#pad-${keyCode}`).fadeOut(20).fadeIn(20);
    audio.addEventListener('timeupdate', () => updateTimeBar(keyCode));
  }
});

/**
 * Handle key pad click events.
 */
$('body').on('click', '.key-pad', function (e) {
  const id = $(this).attr('id');
  const keyCode = id.split('-')[1];
  console.log('Tap KeyCode: ' + keyCode);

  const audio = new Audio(`${BASE_URL}/${keyCode}.wav`);
  const $bar = $(`#bar-${keyCode}`);

  if (audioBars[keyCode]) {
    audioBars[keyCode].audio.pause();
    audioBars[keyCode].audio.currentTime = 0;
    audioBars[keyCode].bar.removeClass('active');
  } else {
    $bar.addClass('active');
  }

  audioBars[keyCode] = { audio: audio, bar: $bar };
  audio.play();
  $(`#pad-${keyCode}`).fadeOut(20).fadeIn(20);
  audio.addEventListener('timeupdate', () => updateTimeBar(keyCode));
});

/**
 * Handle key up events.
 */
$('body').on('keyup', function (e) {
  const keyCode = e.keyCode;
  console.log('Keyup KeyCode: ' + keyCode);

  if (audioBars[keyCode]) {
    const audioBar = audioBars[keyCode];
    const audio = audioBar.audio;
    const bar = audioBar.bar;
    const duration = audio.duration;
    const currentTime = audio.currentTime;
    const remainingTime = duration - currentTime;
    bar.removeClass('active');
    delete audioBars[keyCode];

    if (remainingTime > 0.1) {
      audio.pause();
      audio.currentTime= 0;
    }
    }
    });

$(document).on('keydown', function(e) {
  if (e.shiftKey && e.keyCode === 82) { 
    var modal = $("#instructions-modal");
    if (modal.css("display") === "none") {
      modal.css("display", "block");
    } else {
      modal.css("display", "none");
    }
  }
});


$(".close").on("click", function() {
  $("#instructions-modal").css("display", "none");
});


$(".instructions-btn").on("click", function() {
  $("#instructions-modal").css("display", "block");
});


let savedTracks = [];


function getRandomTrackName() {
  let trackName = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const charactersLength = characters.length;

  for (let i = 0; i < 5; i++) {
    trackName += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return trackName;
}


function saveTrack() {
  const trackName = getRandomTrackName();
  savedTracks.push(trackName);
  updateSavedTracksDisplay();
}


function updateSavedTracksDisplay() {
  const savedTracksElement = document.querySelector('#saved-tracks');
  savedTracksElement.innerHTML = '';

  savedTracks.forEach(function (track) {
    const trackElement = document.createElement('div');
    trackElement.classList.add('saved-track');
    trackElement.textContent = track;
    savedTracksElement.appendChild(trackElement);
  });
}


document.querySelector('#save-btn').addEventListener('click', saveTrack);
