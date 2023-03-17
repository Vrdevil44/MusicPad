
$('body').on("keypress", function (e) {
    e.preventDefault();
    e = e || window.event;	
    console.log('Keypress KeyCode: ' + e.keyCode);
  });
  
  $('body').on("click", '.key-pad', function (e) {
    e = e || window.event;
    var id = $(this).attr('id');
    var keyCode = id.split("-")[1];
    console.log('Tap KeyCode: ' + keyCode);
  });
var BASE_URL = "https://raw.githubusercontent.com/anilrayamajhi/padControllers/master/sounds/sounds";

$('body').on("keypress", function(e) {
  e.preventDefault();
  e = e || window.event;
  var audio = new Audio(`${BASE_URL}/${e.keyCode}.wav`);
  audio.play();
  $(`#pad-${e.keyCode}`).fadeOut(20).fadeIn(20);
});

$('body').on("click", '.key-pad', function(e) {
  e = e || window.event;
  var id = $(this).attr('id');
  var keyCode = id.split("-")[1];
  var audio = new Audio(`${BASE_URL}/${keyCode}.wav`);
  audio.play();
  $(`#pad-${keyCode}`).fadeOut(20).fadeIn(20);
});

particlesJS.load('particles-js', 'particles.json', function() {
  console.log('callback - particles.js config loaded');
});
