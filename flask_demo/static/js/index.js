setTimeout(() => {
  document.querySelectorAll("#card").forEach((x, i) => {
    x.classList.add("visible");
    x.addEventListener('click', () => {
      window.location = ["/ssh", "/account"][i]
    }, false);
  })
}, 100)

document.querySelector("#logout").addEventListener('click', () => {
  window.location = "/logout"
}, false);

