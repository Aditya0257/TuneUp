const myDiv = document.getElementById("home_DraggableDiv");
let isDragging = false;
let initialX;
// let initialY;
let currentX;
// let currentY;

function dragStart(event) {
  var rect = event.target.getBoundingClientRect(); // suppose x : 146, y : 50, width : 440, height : 240, top : 50, right : 586, bottom : 290, left : 146

  //* this is done to allow the small starting width portion of my dragging div 
  //* to allow drag start, like you just cant click anywhere on my draggable div to start dragging, 
  //* only at the starting fixed given width to enable dragging.
  if (event.clientX - rect.left < 38) {
    // using event.clientX -> Get the horizontal position of the mouse click
    initialX = event.clientX - myDiv.offsetLeft; // offsetLeft ->  Represents the horizontal distance between the left edge of the element and the left edge of its closest positioned ancestor.
    isDragging = true;
  }
  // initialX = event.clientX - myDiv.offsetLeft;
  // initialY = event.clientY - myDiv.offsetTop;
  // isDragging = true;
}

function dragEnd() {
  isDragging = false;
}

function drag(event) {
  if (isDragging) {
    event.preventDefault();
    currentX = event.clientX - initialX;
    // console.log(currentX);
    // currentY = event.clientY - initialY;
    let slidingWidth = (currentX / screen.width) * 100;

    if (slidingWidth > 36.8) {
      myDiv.style.left = `36.8%`;
    } else if (currentX > initialX) {
      myDiv.style.left = `${currentX}px`;
      myDiv.style.transition = `left 0.8s`;
    } else {
      myDiv.style.left = `0px`;
    }
    // myDiv.style.top = `${currentY}px`;
  }
}

myDiv.addEventListener("mousedown", dragStart);
document.addEventListener("mouseup", dragEnd);
document.addEventListener("mousemove", drag);
