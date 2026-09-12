const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".site-nav");

if (menuButton && navigation) {
  const closeMenu = () => {
    navigation.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Menü öffnen");
  };

  menuButton.addEventListener("click", () => {
    const opening = !navigation.classList.contains("is-open");
    navigation.classList.toggle("is-open", opening);
    document.body.classList.toggle("menu-open", opening);
    menuButton.setAttribute("aria-expanded", String(opening));
    menuButton.setAttribute("aria-label", opening ? "Menü schließen" : "Menü öffnen");
  });

  navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});
