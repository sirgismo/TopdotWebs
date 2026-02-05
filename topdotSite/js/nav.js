// nav.js
/**
 * Mobile menu animation controller (horizontal line sequence).
 */
let menuCloseTimer = 0;
let menuLock = false;

const setMenuAria = (toggle, isOpen) => {
  if (!toggle) return;
  toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
};

const clearMenuLines = (linesLayer) => {
  if (linesLayer) linesLayer.replaceChildren();
};

const buildMenuLines = ({ menu, linesLayer, originX, originY, startLen }) => {
  const root = document.documentElement;
  const links = Array.from(menu.querySelectorAll("a"));

  links.forEach((a, i) => a.style.setProperty("--i", String(i)));

  const targetX = window.innerWidth * 0.5;
  const dx = Math.max(0, originX - targetX);

  root.style.setProperty("--menu-origin-x", `${originX}px`);
  root.style.setProperty("--menu-origin-y", `${originY}px`);
  root.style.setProperty("--menu-mid-x", `${targetX}px`);

  // Measure final positions while menu is visible (but hidden).
  const rects = links.map((a) => a.getBoundingClientRect());

  clearMenuLines(linesLayer);
  rects.forEach((rect, i) => {
    const targetY = rect.top + rect.height / 2;
    const dy = Math.max(0, targetY - originY);
    const sx0 = dx > 0 ? Math.min(startLen, dx) / dx : 1;

    const line = document.createElement("div");
    line.className = "menu-line";
    line.style.left = `${originX}px`;
    line.style.top = `${originY}px`;
    line.style.setProperty("--i", String(i));
    line.style.setProperty("--dx", `${dx}px`);
    line.style.setProperty("--dy", `${dy}px`);
    line.style.setProperty("--sx0", String(sx0));

    const h = document.createElement("div");
    h.className = "menu-line__h";
    line.appendChild(h);
    linesLayer.appendChild(line);
  });
};

const openMenu = () => {
  const menu = document.getElementById("menu");
  const scrim = document.getElementById("menuScrim");
  const linesLayer = document.getElementById("menuLines");
  const toggle = document.getElementById("menuToggle");
  if (!menu || !scrim || !linesLayer) return;

  window.clearTimeout(menuCloseTimer);

  const body = document.body;
  const icon = toggle || document.querySelector("#mainwrapper .icon");
  const iconRect = icon ? icon.getBoundingClientRect() : null;
  const originX = iconRect ? iconRect.left + iconRect.width / 2 : window.innerWidth - 24;
  const originY = iconRect ? iconRect.top + iconRect.height / 2 : 24;
  const startLen = iconRect ? iconRect.width : 24;

  body.classList.add("menu-open");
  body.classList.add("menu-measuring");
  body.style.overflow = "hidden";
  setMenuAria(toggle, true);

  buildMenuLines({ menu, linesLayer, originX, originY, startLen });

  // Restart animations reliably.
  body.classList.remove("menu-animate");
  void menu.offsetWidth;

  window.requestAnimationFrame(() => {
    body.classList.remove("menu-measuring");
    body.classList.add("menu-animate");
  });
};

const closeMenu = () => {
  const linesLayer = document.getElementById("menuLines");
  const toggle = document.getElementById("menuToggle");
  const body = document.body;

  body.classList.remove("menu-animate", "menu-open", "menu-measuring");
  body.style.overflow = "";
  setMenuAria(toggle, false);

  window.clearTimeout(menuCloseTimer);
  menuCloseTimer = window.setTimeout(() => {
    clearMenuLines(linesLayer);
  }, 800);
};

window.myFunction = function myFunction() {
  if (menuLock) return;
  menuLock = true;

  const isOpen = document.body.classList.contains("menu-open");
  if (isOpen) closeMenu();
  else openMenu();

  window.setTimeout(() => {
    menuLock = false;
  }, 250);
};

/**
 * Mark a clicked navbar link as selected.
 *
 * This is used by inline HTML attributes like: onclick="selectLink(this)".
 * It removes the "selected" class from all links in #menu and adds it to the clicked link.
 */
window.selectLink = function selectLink(link) {
  const links = document.querySelectorAll("#menu a");
  for (let i = 0; i < links.length; i++) {
    if (links[i] === link) {
      links[i].classList.add("selected");
    } else {
      links[i].classList.remove("selected");
    }
  }
  // If a mobile menu is open, close it after navigation.
  if (document.body.classList.contains("menu-open")) {
    closeMenu();
  }
};

/**
 * When the window is resized back to desktop width, clear the inline "display" override.
 *
 * Why:
 * On mobile we may set #menu.style.display = "block". When you resize back to desktop,
 * the CSS should control visibility again, so we clear the inline style.
 */
window.addEventListener("resize", function onResize() {
  const menu = document.getElementById("menu");
  if (!menu) return;

  if (window.innerWidth >= 828) {
    // Ensure mobile-open state doesn't leak to desktop.
    closeMenu();
  }
});

// Close on scrim click + ESC
document.addEventListener("DOMContentLoaded", function onMenuDomReady() {
  const scrim = document.getElementById("menuScrim");
  if (scrim) {
    scrim.addEventListener("click", function () {
      if (document.body.classList.contains("menu-open")) {
        closeMenu();
      }
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
      closeMenu();
    }
  });
});

/**
 * On page load, automatically set the selected nav link based on the current URL.
 *
 * This replaces the old window.onload block that existed in every HTML file.
 */
document.addEventListener("DOMContentLoaded", function onDomReady() {
  const links = document.querySelectorAll("#menu a");
  const currentUrl = window.location.href;

  for (let i = 0; i < links.length; i++) {
    if (links[i].href === currentUrl) {
      links[i].classList.add("selected");
    } else {
      links[i].classList.remove("selected");
    }
  }
});

