/* Shared modal cookie choice for public opshub.it pages. Consent stays in the shared API. */
(function () {
  'use strict';
  var consentApi = window.OpsHubSiteConsent;
  if (!consentApi) return;
  var banner = document.getElementById('siteCookieBanner');
  var modal = document.getElementById('siteCookieSettingsModal');
  if (!banner || !modal) return;
  var lockedNodes = new Map();
  var previousOverflow = null;
  var lastFocus = null;
  function open(node) { return node.classList.contains('is-open'); }
  function blocked() { return open(banner) || open(modal); }
  function currentDialog() { return open(modal) ? modal : banner; }
  function focusables() {
    return Array.from(currentDialog().querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]'))
      .filter(function (node) { return node.getClientRects().length > 0; });
  }
  function focusChoice() {
    var target = open(modal) ? document.getElementById('siteCookieAnalytics') : document.getElementById('siteCookieReject');
    if (target) target.focus({preventScroll:true});
  }
  function updateHeroSpace() {
    var heading = document.querySelector('main h1, h1');
    if (!heading) return;
    var height = window.innerHeight;
    var space = Math.min(Math.max(heading.getBoundingClientRect().bottom + 12, height * .32), height * .52);
    banner.style.setProperty('--cookie-hero-space', Math.round(space) + 'px');
  }
  function syncLock() {
    if (blocked()) {
      updateHeroSpace();
      if (previousOverflow === null) {
        previousOverflow = document.body.style.overflow;
        lastFocus = document.activeElement;
      }
      document.body.style.overflow = 'hidden';
      Array.from(document.body.children).forEach(function (node) {
        if (node === banner || node === modal || /^(SCRIPT|STYLE|LINK)$/.test(node.tagName)) return;
        if (!lockedNodes.has(node)) lockedNodes.set(node, node.inert);
        node.inert = true;
      });
      banner.inert = open(modal);
    } else {
      lockedNodes.forEach(function (wasInert, node) { node.inert = wasInert; });
      lockedNodes.clear(); banner.inert = false;
      if (previousOverflow !== null) document.body.style.overflow = previousOverflow;
      previousOverflow = null;
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({preventScroll:true});
      lastFocus = null;
    }
  }
  function showBanner() {
    banner.classList.add('is-open'); syncLock(); focusChoice();
  }
  function closeModal() {
    modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true');
    syncLock(); if (open(banner)) focusChoice();
  }
  function openModal() {
    document.getElementById('siteCookieAnalytics').checked = consentApi.getCookie(consentApi.COOKIE_ANALYTICS) === 'true';
    document.getElementById('siteCookieMarketing').checked = consentApi.getCookie(consentApi.COOKIE_MARKETING) === 'true';
    modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false');
    syncLock(); focusChoice();
  }
  function choose(analytics, marketing) {
    consentApi.applyConsent({analytics:analytics, marketing:marketing});
    banner.classList.remove('is-open');
    closeModal(); syncLock();
  }
  document.getElementById('siteCookieAccept').addEventListener('click', function () { choose(true, true); });
  document.getElementById('siteCookieReject').addEventListener('click', function () { choose(false, false); });
  document.getElementById('siteCookieSettings').addEventListener('click', openModal);
  var detailsToggle = document.getElementById('siteCookieDetailsToggle');
  if (detailsToggle) detailsToggle.addEventListener('click', function () {
    var details = document.getElementById('siteCookieBannerDetails');
    details.hidden = !details.hidden;
    detailsToggle.setAttribute('aria-expanded', String(!details.hidden));
  });
  document.getElementById('siteCookieSaveSettings').addEventListener('click', function () {
    choose(document.getElementById('siteCookieAnalytics').checked, document.getElementById('siteCookieMarketing').checked);
  });
  document.getElementById('siteCookieModalClose').addEventListener('click', closeModal);
  document.getElementById('siteCookieModalCancel').addEventListener('click', closeModal);
  document.getElementById('siteCookieReopen').addEventListener('click', showBanner);
  modal.addEventListener('click', function (event) { if (event.target === modal) closeModal(); });
  document.addEventListener('click', function (event) {
    if (blocked() && !currentDialog().contains(event.target)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener('keydown', function (event) {
    if (!blocked()) return;
    if (event.key === 'Escape') {
      event.preventDefault(); if (open(modal)) closeModal();
    } else if (event.key === 'Tab') {
      var nodes = focusables();
      if (!nodes.length) { event.preventDefault(); currentDialog().focus(); return; }
      var index = nodes.indexOf(document.activeElement);
      if (event.shiftKey && index <= 0) { event.preventDefault(); nodes[nodes.length - 1].focus(); }
      else if (!event.shiftKey && (index === -1 || index === nodes.length - 1)) { event.preventDefault(); nodes[0].focus(); }
    }
  }, true);
  // Meta may require a new choice when a provider was added: lock that banner too.
  new MutationObserver(function () { syncLock(); }).observe(banner, {attributes:true, attributeFilter:['class']});
  window.addEventListener('resize', function () { if (blocked()) updateHeroSpace(); });
  window.openSiteCookieSettings = openModal;
  consentApi.syncConsentFromCookies();
  if (!consentApi.readConsentFromCookies()) showBanner();
})();
