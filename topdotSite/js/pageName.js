// pageName.js
// What this file does:
// - Takes the `pageName` variable defined by each page (e.g. "Home", "Blog")
// - If the page contains elements like #breadcrumb-page-name or #post-name,
//   it fills them with the current page name.
//
// Why this exists:
// This logic was duplicated across many pages and it caused errors on pages that
// don't actually include those elements. This file makes the behavior safe.

document.addEventListener("DOMContentLoaded", function onDomReady() {
  // If a page doesn't define `pageName`, we do nothing.
  // Note: `pageName` is usually declared near the top of <body>.
  if (typeof pageName === "undefined") return;

  const breadcrumbPageName = document.getElementById("breadcrumb-page-name");
  if (breadcrumbPageName) {
    breadcrumbPageName.innerText = pageName;
  }

  const postName = document.getElementById("post-name");
  if (postName) {
    postName.innerText = pageName;
  }
});

