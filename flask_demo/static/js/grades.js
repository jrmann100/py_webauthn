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

function fetchGrades(name, password) {

  var request = new XMLHttpRequest();
  request.open('POST', "/fetchGrades", true);
  request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  request.addEventListener("error", () => {
    hintErr("Couldn't get grades\n(network error).");
  });
  request.addEventListener("load", () => {

    if (request.status >= 200 && request.status < 400) {
      console.log("Successfully fetched grades.");
      document.querySelector("#loader-fadebox").style.display = "block";
      document.querySelector("#loader-fadebox").style.opacity = 1;
      var frameElement = document.createElement("iframe");
      frameElement.id = "main";
      document.body.appendChild(frameElement);
      var frame = frameElement.contentWindow.document;
      frame.open();
      frame.write(request.response);
      var link = document.createElement("link");
      link.type = "text/css";
      link.rel = "stylesheet";
      link.href = "/static/css/gradesEmbed.css";
      frame.head.appendChild(link);
      var script = document.createElement("script");
      script.src = "/static/js/gradesEmbed.js";
      frame.body.appendChild(script);
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

  request.send(JSON.stringify({"name": name, "password" : password, "user-agent": navigator.userAgent}));
};

var urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("name")) {
	document.querySelector("#name").value = urlParams.get('name');
}
if (urlParams.get("password")) {
	document.querySelector("#password").value = urlParams.get('password');
}

setTimeout(() => {
  document.querySelector("#popup").classList.add("visible");
}, 100);
document.querySelector("#name").addEventListener("focus", hint);
document.querySelector("#password").addEventListener("focus", hint);
document.querySelector("#popup form").addEventListener("submit", (e) => {
  e.preventDefault();
  var name = document.querySelector("#name").value.toLowerCase().replace(" ", "");
  var password = document.querySelector("#password").value.toLowerCase().replace(" ", "");
  fetchGrades(name, password);
});
