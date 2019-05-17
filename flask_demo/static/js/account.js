setTimeout(() => {
  document.querySelectorAll("#card").forEach((x, i) => {
    x.classList.add("visible");
    x.addEventListener('click', doSomething, false);
  })
}, 100)

doSomething = function() {
  console.log("Nothing yet\u2026");
}

