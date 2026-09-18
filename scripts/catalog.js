const CONFIG_URL = "scripts/catalog.config.json";
const PAGE_SIZE = 4;
const DESKTOP_BREAKPOINT = "(min-width: 768px)";
const FETCH_DELAY_MS = 1000;

const delay = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const createCard = (item) => {
  const card = document.createElement("li");
  card.className = "catalog-card";

  const image = document.createElement("img");
  image.className = "catalog-card__image";
  image.src = item.image;
  image.alt = item.name;
  image.width = 340;
  image.height = 340;
  image.loading = "lazy";

  const body = document.createElement("div");
  body.className = "catalog-card__body";

  const name = document.createElement("h3");
  name.className = "heading-3 catalog-card__name";
  name.textContent = item.name;

  const description = document.createElement("p");
  description.className = "medium catalog-card__description";
  description.textContent = item.description;

  const price = document.createElement("p");
  price.className = "heading-3 catalog-card__price";
  price.textContent = `$${item.price}`;

  body.append(name, description, price);
  card.append(image, body);

  return card;
};

const initCatalog = async (root) => {
  const list = root.querySelector("[data-catalog-list]");
  const sentinel = root.querySelector("[data-catalog-sentinel]");
  const loader = root.querySelector("[data-catalog-loader]");
  const category = root.dataset.category;

  if (!list || !category) {
    return;
  }

  const setLoading = (isLoading) => {
    root.classList.toggle("is-loading", isLoading);

    if (loader) {
      loader.hidden = !isLoading;
      loader.setAttribute("aria-hidden", String(!isLoading));
    }
  };

  setLoading(true);

  const [response] = await Promise.all([
    fetch(CONFIG_URL),
    delay(FETCH_DELAY_MS),
  ]);

  if (!response.ok) {
    setLoading(false);
    throw new Error(`Failed to load catalog config: ${response.status}`);
  }

  const catalog = await response.json();
  const items = catalog[category] ?? [];

  let renderedCount = 0;
  let isLoading = false;
  let observer = null;

  const hasMore = () => renderedCount < items.length;

  const renderNext = (count = PAGE_SIZE) => {
    if (isLoading || !hasMore()) {
      return;
    }

    isLoading = true;

    const nextItems = items.slice(renderedCount, renderedCount + count);
    const fragment = document.createDocumentFragment();

    nextItems.forEach((item) => {
      fragment.append(createCard(item));
    });

    list.append(fragment);
    renderedCount += nextItems.length;
    isLoading = false;

    if (!hasMore() && observer && sentinel) {
      observer.unobserve(sentinel);
    }
  };

  const fillViewport = () => {
    while (hasMore() && sentinel && sentinel.getBoundingClientRect().top <= window.innerHeight) {
      renderNext(PAGE_SIZE);
    }
  };

  const showAll = () => {
    if (renderedCount < items.length) {
      renderNext(items.length - renderedCount);
    }
  };

  const syncByViewport = () => {
    if (window.matchMedia(DESKTOP_BREAKPOINT).matches) {
      if (observer && sentinel) {
        observer.unobserve(sentinel);
      }

      showAll();
      return;
    }

    if (renderedCount === 0) {
      renderNext(PAGE_SIZE);
    }

    if (observer && sentinel && hasMore()) {
      observer.observe(sentinel);
      fillViewport();
    }
  };

  if (sentinel) {
    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        if (window.matchMedia(DESKTOP_BREAKPOINT).matches) {
          return;
        }

        renderNext(PAGE_SIZE);
        fillViewport();
      },
      {
        root: null,
        rootMargin: "0px 0px 200px 0px",
        threshold: 0,
      },
    );
  }

  syncByViewport();
  setLoading(false);

  window.matchMedia(DESKTOP_BREAKPOINT).addEventListener("change", () => {
    syncByViewport();
  });
};

document.querySelectorAll("[data-catalog]").forEach((root) => {
  initCatalog(root).catch((error) => {
    console.error(error);
  });
});
