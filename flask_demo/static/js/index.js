setTimeout(() => {
  document.querySelectorAll("#card").forEach((x, i) => {
    x.classList.add("visible");
    x.correspondingService = document.querySelectorAll("#iframe-wrapper")[i];
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
  event.currentTarget.correspondingService.classList.add("visible");
  document.querySelector("#exit").classList.add("visible");
  activeService = event.currentTarget.correspondingService;
  setTimeout(() => {
    document.addEventListener('click', outsideWrapper)
  }, 100) // FIND BETTER SOLUTION
  event.currentTarget.correspondingService.querySelector("iframe").src = "/" + event.currentTarget.correspondingService.classList[0]; // this is janky but it just might work...
}

hideService = function() {
  activeService.classList.remove("visible");
  activeService.querySelector("iframe").src = "";
  document.querySelector("#exit").classList.remove("visible");
}

//document.querySelector("#exit").addEventListener('click', hideService, false); // Since outsideWrapper() includes the button!

document.querySelector("#logout").addEventListener('click', () => {
  window.location = "/logout"
}, false);

