const viteEnv = import.meta.env;
const isGitHubPagesHost = window.location.hostname.endsWith("github.io");
const isHostedFromSourceHtml = !viteEnv?.DEV && !viteEnv?.PROD;
const isAlreadyInSiteDir = /(?:^|\/)site(?:\/|$)/.test(window.location.pathname);

if (isGitHubPagesHost && isHostedFromSourceHtml && !isAlreadyInSiteDir) {
  window.location.replace(new URL("./site/", window.location.href).toString());
} else {
  void import("./main.jsx");
}
