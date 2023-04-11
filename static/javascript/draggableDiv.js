const myDiv = document.getElementById("home_DraggableDiv");
    let isDragging = false;
    let initialX;
    // let initialY;
    let currentX;
    // let currentY;

    function dragStart(event) {
      var rect = event.target.getBoundingClientRect();
      if (event.clientX - rect.left < 38) {
        initialX = event.clientX - myDiv.offsetLeft;
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
        console.log(currentX);
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