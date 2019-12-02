document.querySelectorAll("table")[1].insertAdjacentHTML("afterend", document.createElement("canvas").outerHTML);
canvas = document.querySelector("canvas");
canvas.setAttribute("width", 2000);
canvas.setAttribute("height", 1000);

var ctx = canvas.getContext("2d");
var totalPointsArray = [];
document.querySelectorAll("table")[1].querySelectorAll("tr:not(:nth-of-type(2)) td:nth-of-type(2)").forEach((e, i) => {
  totalPointsArray.push(Number(e.textContent.split("/")[1].split(" ")[0]));
})

var earnedPointsArray = [];
document.querySelectorAll("table")[1].querySelectorAll("tr:not(:nth-of-type(2)) td:nth-of-type(2)").forEach((e, i) => {
  earnedPointsArray.push(Number(e.textContent.split("/")[0]));
});

var categoriesArray = [];
document.querySelectorAll("table")[1].querySelectorAll("tr:not(:nth-of-type(2)) td:first-of-type").forEach((e, i) => {
  categoriesArray.push(e.textContent.split(": ")[1]);
});
console.log(categoriesArray);


colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];

var totalPoints = Number(document.querySelectorAll("table")[1].querySelector("tr:nth-of-type(2) td:nth-of-type(2)").textContent.split("/")[0].split(" ")[1]);

var radiansStart = 0;
var pointsStart = 0;

const weightedPoints = [0.45/0.85, 0.15/0.85, 0.25/0.85];

// Help from https://stackoverflow.com/a/14394912/9068081
// void ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);
ctx.setTransform(0.85, 0, 0, 0.85, (canvas.height * 0.15) / 2, (canvas.height * 0.15) / 2);
ctx.lineWidth = 10;
ctx.strokeStyle = "black";
for (var i = 0; i < totalPointsArray.length; i++) {
  ctx.fillStyle = colors[i];
  ctx.beginPath();
  ctx.moveTo(canvas.height / 2, canvas.height / 2);
  ctx.arc(canvas.height / 2, canvas.height / 2, canvas.height / 2, radiansStart, radiansStart + (2 * Math.PI * weightedPoints[i]), false);

  ctx.lineTo(canvas.height / 2, canvas.height / 2);
  ctx.stroke();

  ctx.fill();


  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "2.75em Roboto";
  ctx.beginPath();
  ctx.moveTo(canvas.height / 2, canvas.height / 2);

  ctx.arc(canvas.height / 2, canvas.height / 2, canvas.height / 2,
    radiansStart + (2 * Math.PI * (weightedPoints[i]) * (earnedPointsArray[i] / totalPointsArray[i])),
    radiansStart + (2 * Math.PI * weightedPoints[i]), false);
  ctx.fill();
  radiansStart += (2 * Math.PI * weightedPoints[i]);
}

for (var i = 0; i < totalPointsArray.length; i++) {
  pointsStart += totalPointsArray[i] / 2;
  ctx.fillStyle = "white";
  ctx.rect(canvas.height / 2 + (canvas.height) * Math.cos(2 * Math.PI * (pointsStart / totalPoints)) - ((ctx.measureText(categoriesArray[i]).width + 20) / 2), canvas.height / 2 + (canvas.height * 0.375) * Math.sin(2 * Math.PI * (pointsStart / totalPoints)) - 75, ctx.measureText(categoriesArray[i]).width + 20, 100);
  ctx.fill();
  pointsStart += totalPointsArray[i] / 2;

}

pointsStart = 0;
for (var i = 0; i < totalPointsArray.length; i++) {
  pointsStart += totalPointsArray[i] / 2;
  ctx.fillStyle = "black";
  ctx.fillText(categoriesArray[i], canvas.height / 2 + (canvas.height) * Math.cos(2 * Math.PI * (pointsStart / totalPoints)) - (ctx.measureText(categoriesArray[i]).width / 2), canvas.height / 2 + (canvas.height * 0.375) * Math.sin(2 * Math.PI * (pointsStart / totalPoints)));
  pointsStart += totalPointsArray[i] / 2;

}

var scroll0 = new Range();
scroll0.setStartBefore(document.querySelectorAll("center")[0]);
scroll0.setEndAfter(document.querySelectorAll("p")[0]);
section0 = document.createElement('section');
scroll0.surroundContents(section0);

var scroll1 = new Range();
scroll1.setStartBefore(document.querySelectorAll("p")[1]);
scroll1.setEndAfter(document.querySelectorAll("p")[1]);
section1 = document.createElement('section');
scroll1.surroundContents(section1);

var scrollRange = new Range();
scrollRange.setStartBefore(section0);
scrollRange.setEndAfter(section1);
article = document.createElement('article');
scrollRange.surroundContents(article);
