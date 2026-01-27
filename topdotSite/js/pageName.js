// pageName.js
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

