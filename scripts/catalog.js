const CONFIG_URL = "scripts/products.json";
const PAGE_SIZE = 4;
const MOBILE_MEDIA = "(max-width: 768px)";
const NOTE_TEXT =
  "The cost is not final. Download our mobile app to see the final price and place your order. Earn loyalty points and enjoy your favorite coffee with up to 20% discount.";

const formatPrice = (value) => `$${value.toFixed(2)}`;

const parsePrice = (value) => Number.parseFloat(value) || 0;

const getProductImage = (category, index) =>
  `images/catalog/${category}-${index + 1}.jpg`;

const loadProducts = async () => {
  const response = await fetch(CONFIG_URL);

  if (!response.ok) {
    throw new Error(`Failed to load catalog config: ${response.status}`);
  }

  const products = await response.json();

  if (!Array.isArray(products)) {
    throw new Error("Catalog config must be an array of products");
  }

  return products;
};

const getProductsByCategory = (products, category) =>
  products
    .filter((item) => item.category === category)
    .map((item, index) => ({
      ...item,
      image: getProductImage(category, index),
    }));

const createOptionButton = ({ mark, label, isActive = false }) => {
  const button = document.createElement("button");
  button.className = "product-modal__option medium";
  button.type = "button";

  if (isActive) {
    button.classList.add("is-active");
  }

  const markEl = document.createElement("span");
  markEl.className = "product-modal__option-mark";
  markEl.textContent = mark;
  markEl.setAttribute("aria-hidden", "true");

  const labelEl = document.createElement("span");
  labelEl.textContent = label;

  button.append(markEl, labelEl);

  return button;
};

const createModal = () => {
  const root = document.createElement("div");
  root.className = "product-modal";
  root.setAttribute("data-product-modal", "");
  root.setAttribute("aria-hidden", "true");

  root.innerHTML = `
    <div class="product-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
      <img class="product-modal__image" data-modal-image alt="" width="310" height="310">
      <div class="product-modal__panel">
        <div class="product-modal__intro">
          <h2 class="heading-3 product-modal__title" id="product-modal-title" data-modal-title></h2>
          <p class="medium product-modal__description" data-modal-description></p>
        </div>
        <div class="product-modal__body">
          <div class="product-modal__group">
            <p class="medium product-modal__label">Size</p>
            <div class="product-modal__options" data-modal-sizes role="group" aria-label="Size"></div>
          </div>
          <div class="product-modal__group">
            <p class="medium product-modal__label">Additives</p>
            <div class="product-modal__options" data-modal-additives role="group" aria-label="Additives"></div>
          </div>
          <div class="product-modal__total">
            <span class="heading-3">Total:</span>
            <span class="heading-3" data-modal-price></span>
          </div>
          <div class="product-modal__note">
            <svg class="product-modal__note-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="8" cy="8" r="7.25" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 7V11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="8" cy="5" r="0.75" fill="currentColor"/>
            </svg>
            <p class="product-modal__note-text">${NOTE_TEXT}</p>
          </div>
          <button class="product-modal__close button" type="button" data-modal-close>Close</button>
        </div>
      </div>
    </div>
  `;

  document.body.append(root);

  return root;
};

const initProductModal = () => {
  const modal = createModal();
  const imageEl = modal.querySelector("[data-modal-image]");
  const titleEl = modal.querySelector("[data-modal-title]");
  const descriptionEl = modal.querySelector("[data-modal-description]");
  const sizesEl = modal.querySelector("[data-modal-sizes]");
  const additivesEl = modal.querySelector("[data-modal-additives]");
  const priceEl = modal.querySelector("[data-modal-price]");

  let currentItem = null;
  let selectedSizeKey = "s";
  let selectedAdditives = new Set();
  let lastFocusedElement = null;
  let isClosing = false;

  const isOpen = () => modal.classList.contains("is-open");

  const lockScroll = () => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.documentElement.style.setProperty(
      "--scrollbar-compensation",
      `${scrollbarWidth}px`,
    );
    document.body.classList.add("is-modal-open");
  };

  const unlockScroll = () => {
    document.body.classList.remove("is-modal-open");
    document.documentElement.style.removeProperty("--scrollbar-compensation");
  };

  const updatePrice = () => {
    if (!currentItem) {
      return;
    }

    const basePrice = parsePrice(currentItem.price);
    const sizeExtra = parsePrice(currentItem.sizes?.[selectedSizeKey]?.["add-price"]);
    const additivesExtra = [...selectedAdditives].reduce((sum, index) => {
      const additive = currentItem.additives?.[index];
      return sum + parsePrice(additive?.["add-price"]);
    }, 0);

    priceEl.textContent = formatPrice(basePrice + sizeExtra + additivesExtra);
  };

  const renderSizes = () => {
    sizesEl.replaceChildren();

    Object.entries(currentItem.sizes || {}).forEach(([key, size]) => {
      const button = createOptionButton({
        mark: key.toUpperCase(),
        label: size.size,
        isActive: key === selectedSizeKey,
      });

      button.setAttribute("aria-pressed", String(key === selectedSizeKey));
      button.addEventListener("click", () => {
        selectedSizeKey = key;
        renderSizes();
        updatePrice();
      });

      sizesEl.append(button);
    });
  };

  const renderAdditives = () => {
    additivesEl.replaceChildren();

    (currentItem.additives || []).forEach((additive, index) => {
      const isActive = selectedAdditives.has(index);
      const button = createOptionButton({
        mark: String(index + 1),
        label: additive.name,
        isActive,
      });

      button.setAttribute("aria-pressed", String(isActive));
      button.addEventListener("click", () => {
        if (selectedAdditives.has(index)) {
          selectedAdditives.delete(index);
        } else {
          selectedAdditives.add(index);
        }

        renderAdditives();
        updatePrice();
      });

      additivesEl.append(button);
    });
  };

  const closeModal = () => {
    if (!isOpen() || isClosing) {
      return;
    }

    isClosing = true;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");

    let isSettled = false;

    const settleClose = () => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      modal.removeEventListener("transitionend", onFadeOut);
      window.clearTimeout(fallbackTimer);
      isClosing = false;
      unlockScroll();

      if (lastFocusedElement instanceof HTMLElement) {
        lastFocusedElement.focus();
      }
    };

    const onFadeOut = (event) => {
      if (event.target !== modal || event.propertyName !== "opacity") {
        return;
      }

      settleClose();
    };

    const fallbackTimer = window.setTimeout(settleClose, 350);

    modal.addEventListener("transitionend", onFadeOut);
  };

  const openModal = (item) => {
    if (isClosing) {
      return;
    }

    currentItem = item;
    selectedSizeKey = "s";
    selectedAdditives = new Set();
    lastFocusedElement = document.activeElement;

    imageEl.src = item.image;
    imageEl.alt = item.name;
    titleEl.textContent = item.name;
    descriptionEl.textContent = item.description;

    renderSizes();
    renderAdditives();
    updatePrice();

    modal.setAttribute("aria-hidden", "false");
    lockScroll();

    requestAnimationFrame(() => {
      modal.classList.add("is-open");
      modal.querySelector("[data-modal-close]")?.focus();
    });
  };

  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-modal-close]")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      closeModal();
    }
  });

  return { openModal, closeModal };
};

const createCard = (item, onOpen) => {
  const card = document.createElement("li");
  card.className = "catalog-card";
  card.setAttribute("role", "button");
  card.tabIndex = 0;
  card.setAttribute("aria-label", `Open details for ${item.name}`);

  const frame = document.createElement("div");
  frame.className = "catalog-card__frame";

  const image = document.createElement("img");
  image.className = "catalog-card__image";
  image.src = item.image;
  image.alt = item.name;
  image.width = 340;
  image.height = 340;
  image.loading = "lazy";

  frame.append(image);

  const body = document.createElement("div");
  body.className = "catalog-card__body";

  const name = document.createElement("h2");
  name.className = "heading-3 catalog-card__name";
  name.textContent = item.name;

  const description = document.createElement("p");
  description.className = "medium catalog-card__description";
  description.textContent = item.description;

  const price = document.createElement("p");
  price.className = "heading-3 catalog-card__price";
  price.textContent = formatPrice(parsePrice(item.price));

  body.append(name, description, price);
  card.append(frame, body);

  const open = () => onOpen(item);

  card.addEventListener("click", open);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });

  return card;
};

const initCatalog = async (root, productModal) => {
  const list = root.querySelector("[data-catalog-list]");
  const moreButton = root.querySelector("[data-catalog-more]");
  const loader = root.querySelector("[data-catalog-loader]");
  const tabs = [...root.querySelectorAll("[data-category-tab]")];
  const mobileMedia = window.matchMedia(MOBILE_MEDIA);

  if (!list) {
    return;
  }

  let products = [];
  let category = root.dataset.category || tabs[0]?.dataset.categoryTab || "coffee";
  let items = [];
  let isExpanded = false;

  const isMobile = () => mobileMedia.matches;

  const getVisibleCount = () => {
    if (!isMobile() || isExpanded) {
      return items.length;
    }

    return Math.min(PAGE_SIZE, items.length);
  };

  const setLoading = (isLoading) => {
    root.classList.toggle("is-loading", isLoading);

    if (loader) {
      loader.hidden = !isLoading;
      loader.setAttribute("aria-hidden", String(!isLoading));
    }

    if (moreButton && isLoading) {
      moreButton.hidden = true;
    }
  };

  const updateTabs = () => {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.categoryTab === category;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-pressed", String(isActive));
    });
  };

  const updateMoreButton = () => {
    if (!moreButton) {
      return;
    }

    moreButton.hidden = !(isMobile() && !isExpanded && items.length > PAGE_SIZE);
  };

  const renderCards = () => {
    const fragment = document.createDocumentFragment();
    const visibleCount = getVisibleCount();

    items.slice(0, visibleCount).forEach((item) => {
      fragment.append(createCard(item, productModal.openModal));
    });

    list.replaceChildren(fragment);
    updateMoreButton();
  };

  const setCategory = (nextCategory) => {
    if (!nextCategory) {
      return;
    }

    category = nextCategory;
    root.dataset.category = category;
    items = getProductsByCategory(products, category);
    isExpanded = false;
    updateTabs();
    renderCards();
  };

  setLoading(true);

  try {
    products = await loadProducts();
  } catch (error) {
    setLoading(false);
    throw error;
  }

  setCategory(category);
  setLoading(false);

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const nextCategory = tab.dataset.categoryTab;

      if (!nextCategory || nextCategory === category) {
        return;
      }

      setCategory(nextCategory);
    });
  });

  if (moreButton) {
    moreButton.addEventListener("click", () => {
      isExpanded = true;
      renderCards();
    });
  }

  const onViewportChange = () => {
    if (!isMobile()) {
      isExpanded = false;
    }

    renderCards();
  };

  if (typeof mobileMedia.addEventListener === "function") {
    mobileMedia.addEventListener("change", onViewportChange);
  } else {
    mobileMedia.addListener(onViewportChange);
  }
};

const productModal = initProductModal();

document.querySelectorAll("[data-catalog]").forEach((root) => {
  initCatalog(root, productModal).catch((error) => {
    console.error(error);
  });
});
