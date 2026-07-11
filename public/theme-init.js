try {
  var virroTheme = window.localStorage.getItem("virro-theme");
  if (virroTheme === "light" || virroTheme === "dark") {
    document.documentElement.dataset.theme = virroTheme;
  }
} catch {
  // Keep the server default when browser storage is unavailable.
}
