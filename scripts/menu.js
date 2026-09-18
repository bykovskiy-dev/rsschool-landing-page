const DESKTOP_BREAKPOINT = "(min-width: 769px)";

const lockScroll = () => {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  document.documentElement.style.setProperty(
    "--scrollbar-compensation",
    `${scrollbarWidth}px`,
  );
  document.body.classList.add("is-menu-open");
};

const unlockScroll = () => {
  document.body.classList.remove("is-menu-open");
  document.documentElement.style.removeProperty("--scrollbar-compensation");
};

const initMobileMenu = () => {
  const burger = document.querySelector("[data-burger]");
  const menu = document.querySelector("[data-mobile-menu]");
  const desktopMedia = window.matchMedia(DESKTOP_BREAKPOINT);

  if (!burger || !menu) {
    return;
  }

  const isOpen = () => document.body.classList.contains("is-menu-open");

  const openMenu = () => {
    if (desktopMedia.matches || isOpen()) {
      return;
    }

    lockScroll();
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Close menu");
    menu.setAttribute("aria-hidden", "false");
  };

  const closeMenu = () => {
    if (!isOpen()) {
      return;
    }

    unlockScroll();
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Open menu");
    menu.setAttribute("aria-hidden", "true");
  };

  const toggleMenu = () => {
    if (isOpen()) {
      closeMenu();
      return;
    }

    openMenu();
  };

  burger.addEventListener("click", toggleMenu);

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  desktopMedia.addEventListener("change", (event) => {
    if (event.matches) {
      closeMenu();
    }
  });
};

initMobileMenu();
