setTimeout(() => {
  //<div id="iframe-wrapper" class="ssh"><iframe src="/ssh"
  document.querySelectorAll(".card").forEach((x, i) => {
    var name = x.querySelector("p").textContent.toLowerCase();
    var wrapper = document.createElement("div");
    wrapper.classList.add("iframe-wrapper");
    var frame = document.createElement("iframe");
    wrapper.appendChild(frame);
    frame.src = name;
    wrapper.id = name;
    x.classList.add("visible");
    x.correspondingService = wrapper;
    x.correspondingService.classList.add("iframe-wrapper");
    document.body.append(x.correspondingService);
    x.addEventListener('click', showService, false);
  })
}, 100)

var outsideWrapper = function(evt) {
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

var showService = function(event) {
  document.querySelector("#exit").classList.add("visible");
  activeService = event.currentTarget.correspondingService;
  activeService.classList.add("visible");
  setTimeout(() => {
    document.addEventListener('click', outsideWrapper)
  }, 100) // FIND BETTER SOLUTION
  activeService.querySelector("iframe").src = "/" + activeService.id; // this is janky but it just might work...
}


var hideService = function() {
  if ((activeService.classList[0] == "ssh" && onbeforeSSH()) || activeService.classList[0] != "ssh") {
    activeService.querySelector("iframe").src = "";
    activeService.classList.remove("visible");
    document.querySelector("#exit").classList.remove("visible");
  }
}

var onbeforeSSH = function() {
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

