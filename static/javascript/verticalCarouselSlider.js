const slides = document.querySelector(".slides");
    const indicators = document.querySelectorAll(".indicator");
    const verticalCarouselSlider = document.querySelector(
      ".vertical_slider_box"
    );
    let currentSlide = 1;

    function goToSlide(slideNumber) {
      currentSlide = slideNumber;
      var carousel_slider = verticalCarouselSlider.getBoundingClientRect();
      console.log(carousel_slider.height);
      slides.style.transform = `translateY(-${
        carousel_slider.height * (currentSlide - 1)
      }px)`;
      updateIndicators();
    }

    function updateIndicators() {
      indicators.forEach((indicator, index) => {
        if (index === currentSlide - 1) {
          indicator.classList.add("active");
        } else {
          indicator.classList.remove("active");
        }
      });
    }

    indicators.forEach((indicator, index) => {
      indicator.addEventListener("click", () => {
        goToSlide(index + 1);
      });
    });

    setInterval(() => {
      currentSlide++;
      if (currentSlide > 4) {
        currentSlide = 1;
      }
      goToSlide(currentSlide);
    }, 2000);

