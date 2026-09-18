const SWIPE_THRESHOLD = 50;

const initSlider = (root) => {
  const track = root.querySelector(".slider__track");
  const realSlides = [...root.querySelectorAll(".slider__slide")];
  const prevButton = root.querySelector(".slider__arrow--prev");
  const nextButton = root.querySelector(".slider__arrow--next");
  const bullets = [...root.querySelectorAll(".slider__bullet")];

  if (!track || realSlides.length === 0) {
    return;
  }

  const firstClone = realSlides[0].cloneNode(true);
  const lastClone = realSlides[realSlides.length - 1].cloneNode(true);

  firstClone.setAttribute("aria-hidden", "true");
  lastClone.setAttribute("aria-hidden", "true");

  track.append(firstClone);
  track.prepend(lastClone);

  // [cloneLast, ...realSlides, cloneFirst]
  let currentIndex = 1;
  let isAnimating = false;
  let touchStartX = 0;
  let touchDeltaX = 0;

  const getRealIndex = () => {
    if (currentIndex === 0) {
      return realSlides.length - 1;
    }

    if (currentIndex === realSlides.length + 1) {
      return 0;
    }

    return currentIndex - 1;
  };

  const updateBullets = () => {
    const realIndex = getRealIndex();

    bullets.forEach((bullet, bulletIndex) => {
      bullet.classList.toggle("is-active", bulletIndex === realIndex);
    });
  };

  const setPosition = (index, withTransition) => {
    track.classList.toggle("slider__track--no-transition", !withTransition);
    track.style.transform = `translateX(-${index * 100}%)`;

    if (!withTransition) {
      void track.offsetHeight;
      track.classList.remove("slider__track--no-transition");
    }
  };

  const goTo = (index) => {
    if (isAnimating) {
      return;
    }

    isAnimating = true;
    currentIndex = index;
    setPosition(currentIndex, true);
    updateBullets();
  };

  const goPrev = () => goTo(currentIndex - 1);
  const goNext = () => goTo(currentIndex + 1);

  track.addEventListener("transitionend", (event) => {
    if (event.target !== track || event.propertyName !== "transform") {
      return;
    }

    if (currentIndex === 0) {
      currentIndex = realSlides.length;
      setPosition(currentIndex, false);
    } else if (currentIndex === realSlides.length + 1) {
      currentIndex = 1;
      setPosition(currentIndex, false);
    }

    isAnimating = false;
  });

  prevButton?.addEventListener("click", goPrev);
  nextButton?.addEventListener("click", goNext);

  root.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.changedTouches[0].clientX;
      touchDeltaX = 0;
    },
    { passive: true },
  );

  root.addEventListener(
    "touchmove",
    (event) => {
      touchDeltaX = event.changedTouches[0].clientX - touchStartX;
    },
    { passive: true },
  );

  root.addEventListener(
    "touchend",
    () => {
      if (isAnimating) {
        touchDeltaX = 0;
        return;
      }

      if (touchDeltaX > SWIPE_THRESHOLD) {
        goPrev();
      } else if (touchDeltaX < -SWIPE_THRESHOLD) {
        goNext();
      }

      touchDeltaX = 0;
    },
    { passive: true },
  );

  setPosition(currentIndex, false);
  updateBullets();
};

document.querySelectorAll("[data-slider]").forEach(initSlider);
