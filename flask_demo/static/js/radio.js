var player = document.querySelector("#player");
var studioArray = document.querySelectorAll("#studiosel button");

var sources = ["http://airspectrum.cdnstream1.com:8114/1648_128",
  "http://airspectrum.cdnstream1.com:8024/1302_192",
  "http://pulseedm.cdnstream1.com:8124/1373_128",
  "http://174.36.206.197:8000/;stream/1",
  "http://198.178.123.17:10922/;stream/1"
];
var activeStudio = 2;


/* jshint browser: true */
setTimeout(() => {
  document.body.classList.add("visible");
}, 500);

/*setTimeout(() => {
  toggle();
  //player.src = sources[2];
  player.pause();
  player.setAttribute("src", sources[2]);
  player.play();
}, 750);*/ // This is really annoying.

var playState = true;

var svg = document.querySelector("#toggle");

function toggle() {
  playState = !playState;
  if (!playState) {

    svg.pauseAnimations();
    svg.setCurrentTime(0);
    svg.unpauseAnimations();
    document.querySelector("#toStop").beginElement();
  } else {
    document.querySelector("#toPlay").beginElement();
  }
  if (playState !== player.paused) {
    if (player.paused) {
      player.play();
    } else {
      player.pause();
    }

  }
}

document.querySelector("#toggle-wrapper").addEventListener("click", toggle);

player.pause();
player.setAttribute("src", sources[activeStudio]);
// alternative to commented autoplay above

studioArray.forEach((e) => {
  e.addEventListener("click", changeActive)
});

function changeActive(event) {
  let thisStudio = Object.values(studioArray).indexOf(event.currentTarget);
  if (thisStudio !== activeStudio) {
    event.currentTarget.classList.remove("disabled");
    //player.src = sources[activeStudio];
    player.pause();
    player.setAttribute("src", sources[thisStudio]);
    player.play();
    console.log("This is " + (thisStudio + 1));
    console.log("It was " + (activeStudio + 1));
    studioArray[activeStudio].classList.add("disabled");
    activeStudio = thisStudio;
  }
}

player.addEventListener("play", switched);
player.addEventListener("pause", switched);

function switched() {
  if (playState !== player.paused) {
    toggle();
  }
}

plus = document.querySelector("#plus");
minus = document.querySelector("#minus");


plus.addEventListener("click", changeVolume);
minus.addEventListener("click", changeVolume);

function changeVolume(event) {
  if (player.volume < 1 && event.currentTarget.id == "plus") {
    player.volume = (player.volume + 0.2).toFixed(1);
  } else if (player.volume > 0 && event.currentTarget.id == "minus") {
    player.volume = (player.volume - 0.2).toFixed(1);
  }
  console.log("Now volume is " + player.volume * 100 + "%.");
  if (player.volume == 1) {
    plus.classList.add("disabled");
  } else if (player.volume == 0) {
    minus.classList.add("disabled");
  } else {
    if (minus.classList.contains("disabled")) {
      minus.classList.remove("disabled");
    } else if (plus.classList.contains("disabled")) {
      plus.classList.remove("disabled");
    }
  }
}

