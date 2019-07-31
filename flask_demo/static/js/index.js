setTimeout(() => {
  document.querySelectorAll(".card").forEach((x, i) => {
    x.classList.add("visible");
    x.correspondingService = document.querySelectorAll(".iframe-wrapper")[i];
    x.addEventListener('click', showService, false);
  })
}, 100)

outsideWrapper = function(evt) {
  var a = evt.currentTarget;
  var parents = [];
  while (a) {
    parents.unshift(a);
    a = a.parentNode;
  }
  if (parents.includes(evt.currentTarget)) {
    hideService();
    document.removeEventListener('click', outsideWrapper);
  }
}

showService = function(event) {
  document.querySelector("#exit").classList.add("visible");
  activeService = event.currentTarget.correspondingService;
  activeService.classList.add("visible");
  setTimeout(() => {
    document.addEventListener('click', outsideWrapper)
  }, 100) // FIND BETTER SOLUTION
  activeService.querySelector("iframe").src = "/" + activeService.id; // this is janky but it just might work...
}


hideService = function() {
  if ((activeService.classList[0] == "ssh" && onbeforeSSH()) || activeService.classList[0] != "ssh") {
    activeService.querySelector("iframe").src = "";
    activeService.classList.remove("visible");
    document.querySelector("#exit").classList.remove("visible");
  }
}

onbeforeSSH = function() {
  contentWindow = activeService.querySelector("iframe").contentWindow
  if ((contentWindow.shellinabox && contentWindow.shellinabox.session && confirm("Are you sure you want to end this SSH session?")) || !(contentWindow.shellinabox && contentWindow.shellinabox.session)) {
    if (contentWindow.shellinabox) {
      delete contentWindow.shellinabox.session;
      delete contentWindow.onbeforeunload
    }
    return true;
  } else {
    setTimeout(() => {
      document.addEventListener('click', outsideWrapper)
    }, 100) // FIND BETTER SOLUTION
    return false;
  }
}
//document.querySelector("#exit").addEventListener('click', hideService, false); // Since outsideWrapper() includes the button!

document.querySelector("#logout").addEventListener('click', () => {
  window.location = "/logout"
}, false);

