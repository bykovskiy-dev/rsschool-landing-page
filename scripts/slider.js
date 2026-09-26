const SWIPE_THRESHOLD = 50;
const AUTOPLAY_MS = 5000;
const SLIDE_TRANSITION_FALLBACK_MS = 700;

const initSlider = (root) => {
  const track = root.querySelector(".slider__track");
  const realSlides = [...root.querySelectorAll(".slider__slide")];
  const prevButton = root.querySelector(".slider__arrow--prev");
  const nextButton = root.querySelector(".slider__arrow--next");
  const bullets = [...root.querySelectorAll(".slider__bullet")];

  if (!track || realSlides.length === 0) {
    return;
  }

  bullets.forEach((bullet) => {
    if (bullet.querySelector(".slider__bullet-fill")) {
      return;
    }

    const fill = document.createElement("span");
    fill.className = "slider__bullet-fill";
    fill.setAttribute("aria-hidden", "true");
    bullet.append(fill);
  });

  const firstClone = realSlides[0].cloneNode(true);
  const lastClone = realSlides[realSlides.length - 1].cloneNode(true);

  firstClone.setAttribute("aria-hidden", "true");
  lastClone.setAttribute("aria-hidden", "true");

  track.append(firstClone);
  track.prepend(lastClone);

  // [cloneLast, ...realSlides, cloneFirst]
  let currentIndex = 1;
  let isAnimating = false;
  let pointerId = null;
  let pointerStartX = 0;
  let pointerDeltaX = 0;
  let transitionFallbackTimer = null;
  let autoplayTimer = null;

  const getRealIndex = () => {
    if (currentIndex === 0) {
      return realSlides.length - 1;
    }

    if (currentIndex === realSlides.length + 1) {
      return 0;
    }

    return currentIndex - 1;
  };

  const syncActiveBullet = () => {
    const realIndex = getRealIndex();

    bullets.forEach((bullet, bulletIndex) => {
      const isActive = bulletIndex === realIndex;
      bullet.classList.remove("is-active");

      if (!isActive) {
        return;
      }

      // Force CSS progress animation restart.
      void bullet.offsetWidth;
      bullet.classList.add("is-active");
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

  const stopAutoplay = () => {
    if (autoplayTimer !== null) {
      window.clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }
  };

  const scheduleAutoplay = () => {
    stopAutoplay();

    if (document.hidden) {
      return;
    }

    autoplayTimer = window.setTimeout(() => {
      autoplayTimer = null;

      if (document.hidden) {
        return;
      }

      if (isAnimating) {
        scheduleAutoplay();
        return;
      }

      goNext();
    }, AUTOPLAY_MS);
  };

  const finishTransition = () => {
    if (!isAnimating) {
      return;
    }

    if (transitionFallbackTimer !== null) {
      window.clearTimeout(transitionFallbackTimer);
      transitionFallbackTimer = null;
    }

    if (currentIndex === 0) {
      currentIndex = realSlides.length;
      setPosition(currentIndex, false);
    } else if (currentIndex === realSlides.length + 1) {
      currentIndex = 1;
      setPosition(currentIndex, false);
    }

    isAnimating = false;
  };

  const goTo = (index) => {
    if (isAnimating) {
      return;
    }

    isAnimating = true;
    currentIndex = index;
    setPosition(currentIndex, true);
    // Switch indicator and restart progress with slide animation start.
    syncActiveBullet();
    // Reset autoplay countdown on every switch (manual or auto).
    scheduleAutoplay();

    if (transitionFallbackTimer !== null) {
      window.clearTimeout(transitionFallbackTimer);
    }

    transitionFallbackTimer = window.setTimeout(
      finishTransition,
      SLIDE_TRANSITION_FALLBACK_MS,
    );
  };

  const goPrev = () => goTo(currentIndex - 1);
  const goNext = () => goTo(currentIndex + 1);

  const finishPointerSwipe = () => {
    if (pointerId === null) {
      return;
    }

    if (!isAnimating) {
      if (pointerDeltaX > SWIPE_THRESHOLD) {
        goPrev();
      } else if (pointerDeltaX < -SWIPE_THRESHOLD) {
        goNext();
      } else {
        // Swipe cancelled: keep current slide, but still restart countdown.
        scheduleAutoplay();
        syncActiveBullet();
      }
    }

    pointerId = null;
    pointerDeltaX = 0;
    root.classList.remove("is-dragging");
  };

  track.addEventListener("transitionend", (event) => {
    if (event.target !== track || event.propertyName !== "transform") {
      return;
    }

    finishTransition();
  });

  prevButton?.addEventListener("click", goPrev);
  nextButton?.addEventListener("click", goNext);

  root.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    if (event.target.closest(".slider__arrow")) {
      return;
    }

    // Pause countdown while user interacts.
    stopAutoplay();
    pointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerDeltaX = 0;
    root.classList.add("is-dragging");
    root.setPointerCapture(event.pointerId);
  });

  root.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) {
      return;
    }

    pointerDeltaX = event.clientX - pointerStartX;
  });

  root.addEventListener("pointerup", (event) => {
    if (pointerId !== event.pointerId) {
      return;
    }

    finishPointerSwipe();
  });

  root.addEventListener("pointercancel", (event) => {
    if (pointerId !== event.pointerId) {
      return;
    }

    pointerId = null;
    pointerDeltaX = 0;
    root.classList.remove("is-dragging");
    scheduleAutoplay();
    syncActiveBullet();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoplay();
      return;
    }

    scheduleAutoplay();
    syncActiveBullet();
  });

  setPosition(currentIndex, false);
  syncActiveBullet();
  scheduleAutoplay();
};

document.querySelectorAll("[data-slider]").forEach(initSlider);
