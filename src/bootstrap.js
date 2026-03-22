let isHostedFromSourceHtml = true;
try {
  if (import.meta.env && (import.meta.env.PROD || import.meta.env.DEV)) {
    isHostedFromSourceHtml = false;
  }
} catch (e) {}

const isGitHubPagesHost = window.location.hostname.endsWith("github.io");
const isAlreadyInSiteDir = /(?:^|\/)site(?:\/|$)/.test(window.location.pathname);

if (isGitHubPagesHost && isHostedFromSourceHtml && !isAlreadyInSiteDir) {
  window.location.replace(new URL("./site/", window.location.href).toString());
} else {
  void import("./main.jsx");
}
