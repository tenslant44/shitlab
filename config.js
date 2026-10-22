/* Tenslant ID connection settings.
   After hosting this standalone game, set apiBase to your Tenslant ID Worker URL,
   clientId to the OAuth client registered for THIS game's origin, and redirectUri
   to this site's exact URL including /index.html (or your chosen callback page).
*/
window.CLICK_LAB_CONFIG = {
  apiBase: "https://tenslant-id.tenslant44.workers.dev",
  clientId: "click-lab-standalone",
  redirectUri: window.location.origin + window.location.pathname
};
