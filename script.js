const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".site-nav");

if (menuButton && navigation) {
  const header = menuButton.closest(".site-header");
  const mobileNavigation = window.matchMedia("(max-width: 1100px)");

  const closeMenu = ({ restoreFocus = false } = {}) => {
    navigation.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Menü öffnen");
    if (restoreFocus) menuButton.focus();
  };

  menuButton.addEventListener("click", () => {
    const opening = !navigation.classList.contains("is-open");
    navigation.classList.toggle("is-open", opening);
    document.body.classList.toggle("menu-open", opening);
    menuButton.setAttribute("aria-expanded", String(opening));
    menuButton.setAttribute("aria-label", opening ? "Menü schließen" : "Menü öffnen");
    if (opening) navigation.querySelector("a")?.focus();
  });

  navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  window.addEventListener("keydown", (event) => {
    const menuIsOpen = navigation.classList.contains("is-open");

    if (event.key === "Escape" && menuIsOpen) {
      closeMenu({ restoreFocus: true });
      return;
    }

    if (event.key !== "Tab" || !menuIsOpen || !mobileNavigation.matches || !header) return;

    const focusableElements = [...header.querySelectorAll("a[href], button:not([disabled])")]
      .filter((element) => element.offsetParent !== null);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  });
}

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const atmosphereVideos = document.querySelectorAll("[data-atmosphere-video]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

atmosphereVideos.forEach((video) => {
  if (reducedMotion.matches || !("IntersectionObserver" in window)) return;

  let userPaused = false;

  video.addEventListener("play", () => {
    userPaused = false;
  });

  video.addEventListener("pause", () => {
    if (video.dataset.pausedByObserver !== "true") userPaused = true;
  });

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        delete video.dataset.pausedByObserver;
        if (!userPaused) video.play().catch(() => {});
      } else {
        video.dataset.pausedByObserver = "true";
        video.pause();
      }
    },
    { threshold: 0.45 }
  );

  observer.observe(video);
});
