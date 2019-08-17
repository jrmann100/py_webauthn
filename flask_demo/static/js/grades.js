function hint() {
  document.querySelector("#hint").classList.add("visible");
  var text;
  switch (this) {
    case document.querySelector("#name"):
      text = "Enter your last name.";
      break;
    case document.querySelector("#password"):
      text = "Enter your student ID.";
      break;
  }
  document.querySelector("#hint").innerText = text;
  this.addEventListener("focusout", removeHint);
}

function hintErr(text) {
  document.querySelector("#hint").classList.add("visible");
  setTimeout(() => {
    document.querySelector("#hint").style.color = "#8B0000";
  }, 250);
  setTimeout(() => {
    document.querySelector("#hint").style.color = "inherit";
  }, 750);
  document.querySelector("#hint").innerText = "Error: " + text;
}

function removeHint() {
  document.querySelector("#hint").classList.remove("visible");
  this.removeEventListener("focusout", removeHint);
}

function createCode() {
  var alphanum = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  var name = document.querySelector("#name").value.toLowerCase().replace(" ", "");
  var password = document.querySelector("#password").value.toLowerCase().replace(" ", "");
  if (name.length == 0 || password.length == 0) {
    hintErr("You didn't enter credentials.");
    return;
  }
  console.log("Generating student code. Username: " + name + " and password " + password);

  var code = "r";
  for (let i = 0; i < Math.min(24, Math.max(name.length, password.length)); i++) {
    n = Math.max(((i < name.length) ? alphanum.indexOf(name[i]) : 0), 0);
    p = Math.max(((i < password.length) ? alphanum.indexOf(password[i]) : 0), 0);
    value = ((2 * n + p) ^ 13) % (alphanum.length - 1);
    if (value > 0) {
      code += alphanum[value]
    }
  }
  console.log("Generated code: " + code);
  return code;
}

function fetchGrades(code) {
  var request = new XMLHttpRequest();
  request.open('GET', "/grades/" + code, true);
  request.addEventListener("error", () => {
    hintErr("Couldn't get grades\n(network error).");
  });
  request.addEventListener("load", () => {

    if (request.status >= 200 && request.status < 400) {
      console.log("Successfully fetched grades.");
      document.querySelector("#loader-fadebox").style.display = "block";
      document.querySelector("#loader-fadebox").style.opacity = 1;
var frame = document.querySelector("#main").contentWindow.document;
frame.open();
frame.write(request.response);
frame.close();
      document.querySelector("#popup").classList.remove("visible");
      setTimeout(() => {
        document.querySelector("#loader-fadebox").style.opacity = 0;
        document.body.style.position = "static";
	  }, 1000);
      setTimeout(() => {
        document.querySelector("#loader-fadebox").style.display = "none";
      }, 1500);
    }
    else {
      console.warn("Error, status " + request.status);
      hintErr("Couldn't get grades\n(incorrect, or grades don't exist).");
    }
  });

  request.send();
};

setTimeout(() => {
  document.querySelector("#popup").classList.add("visible");
}, 100);
document.body.innerHTML += "<iframe id=\"main\"></iframe>"
document.querySelector("#name").addEventListener("focus", hint);
document.querySelector("#password").addEventListener("focus", hint);
document.querySelector("#popup form").addEventListener("submit", (e) => {
  e.preventDefault();
  fetchGrades(createCode());
});


