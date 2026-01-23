// nav.js
// What this file does:
// - Controls the mobile "hamburger" menu (show/hide the nav links on small screens)
// - Keeps the "selected" class in the navbar in sync with the current page
//
// Why this exists:
// This logic was duplicated across many HTML files. Keeping it in one file makes the site
// easier to maintain: change it once and every page gets the fix.

/**
 * Toggle the mobile navigation menu.
 *
 * This matches the previous inline behavior:
 * - If #menu is currently displayed as "block", clear the inline style (fall back to CSS).
 * - Otherwise set it to "block".
 */
window.myFunction = function myFunction() {
  const menu = document.getElementById("menu");
  if (!menu) return;

  if (menu.style.display === "block") {
    menu.style.display = "";
  } else {
    menu.style.display = "block";
  }
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
    menu.style.display = "";
  }
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

