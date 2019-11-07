document.querySelectorAll("button").forEach((el) => {
  el.addEventListener("click", (e) => {
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    } else if (document.selection) {
      document.selection.empty();
    }
    var selector = document.querySelector("input");
    selector.value = e.target.innerText;
    selector.select();
    selector.setSelectionRange(0, 99999);
    document.execCommand("copy");
    hint("Copied " + selector.value + " to clipboard.");
  }, false);
});

document.querySelector("input").addEventListener("input", (e) => {
  if (window.getSelection) {
    window.getSelection().removeAllRanges();
  } else if (document.selection) {
    document.selection.empty();
  }
  e.target.value = e.target.value.substring(e.target.value.length - 1, e.target.value.length) + "\u0301";
  e.target.select();
  document.execCommand("copy");
  hint("Copied " + e.target.value + " to clipboard.");
});

setTimeout(() => {
  document.querySelector("#popup").classList.add("visible");
}, 100);

setTimeout(() => {
  hint("Type a letter.");
}, 250);


function hint(text) {
  document.querySelector("#hint").classList.add("visible");
  var text;
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
  setTimeout(() => {
    hint("Acute Accent Tool\nJordan Mann")
  }, 1000)
}

