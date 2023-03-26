particlesJS.load('particles-js', 'particles.json', function() {
  console.log('callback - particles.js config loaded');
});
// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btn = document.getElementById("myBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks the button, open the modal 
btn.onclick = function() {
  modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

function submitForm() {
    var form = document.querySelector("#signup-form");
    var formData = new FormData(form);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/signup");
    xhr.onload = function() {
      if (xhr.status === 200) {
        var response = success;//JSON.parse(xhr.responseText);
        if (response.success) {
          // Redirect to the home page
          window.location.href = "/index.html";
        } else {
          // Show an error message
          alert("Error: " + response.message);
        }
      }
    };
    xhr.send(formData);
  }
  function login() {
    var form = document.querySelector("#login-form");
    var formData = new FormData(form);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/login");
    xhr.onload = function() {
      if (xhr.status === 200) {
        var response = success;//JSON.parse(xhr.responseText);
        if (response.success) {
          // Redirect to the home page
          window.location.href = "/index.html";
        } else {
          // Show an error message
          alert("Error: " + response.message);
        }
      }
    };
    xhr.send(formData);
  }
  

  function validateLoginForm() {
    var email = document.getElementById("logemail").value;
    var password = document.getElementById("logpass").value;
  
    if (email == "") {
      alert("Email address is required");
      return false;
    }
    
    if (!validateEmail(email)) {
      alert("Invalid email address");
      return false;
    }
  
    if (password == "") {
      alert("Password is required");
      return false;
    }
  
    return true;
  }
  
  function validateSignupForm() {
    var name = document.getElementById("logname").value;
    var email = document.getElementById("logemail").value;
    var password = document.getElementById("logpass").value;
  
    if (name == "") {
      alert("Name is required");
      return false;
    }
  
    if (email == "") {
      alert("Email address is required");
      return false;
    }
    
    if (!validateEmail(email)) {
      alert("Invalid email address");
      return false;
    }
  
    if (password == "") {
      alert("Password is required");
      return false;
    }
  
    return true;
  }
  
  function validateEmail(email) {
    var re = /\S+@\S+\.\S+/;
    return re.test(email);
  }