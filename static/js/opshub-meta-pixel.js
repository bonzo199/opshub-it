/* Meta PageView for public opshub.it pages. Lead conversions remain server-only. */
(function (window, document) {
  'use strict';
  if (!/^(www\.)?opshub\.it$/.test(window.location.hostname) ||
      window.__opshubMetaInstalled) return;
  var consent = window.OpsHubSiteConsent;
  if (!consent) return; // Fail closed if the consent helper is unavailable.
  window.__opshubMetaInstalled = true;
  var pixelId = '1013095608522281';
  var reviewCookie = 'opshub_meta_consent';
  var reviewVersion = '2026-11-21-site-v1';
  var ready = false, loading = false, initialized = false, pageViewSent = false;

  function allowed() {
    var state = consent.readConsentFromCookies();
    return !!(state && state.marketing === true &&
      consent.getCookie(reviewCookie) === reviewVersion);
  }

  function removePixelCookies() {
    ['_fbp', '_fbc'].forEach(function (name) {
      ['', ';domain=' + window.location.hostname, ';domain=.opshub.it'].forEach(function (domain) {
        document.cookie = name + '=;Max-Age=0;path=/;SameSite=Lax;Secure' + domain;
      });
    });
  }

  function sendPageView() {
    if (!ready || !allowed()) return;
    window.fbq('consent', 'grant');
    if (!initialized) {
      // Disable automatic configuration: this page sends PageView explicitly.
      window.fbq('set', 'autoConfig', false, pixelId);
      window.fbq('init', pixelId);
      initialized = true;
    }
    if (!pageViewSent) {
      window.fbq('track', 'PageView');
      pageViewSent = true;
    }
  }

  function loadPixel() {
    if (!allowed()) return;
    if (ready) { sendPageView(); return; }
    if (loading) return;
    if (window.fbq && window.fbq.callMethod) {
      ready = true; sendPageView(); return;
    }
    // Meta's standard queue, created only after explicit marketing consent.
    var n = window.fbq = window.fbq || function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = n.queue || [];
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.setAttribute('data-opshub-meta', 'true');
    script.onload = function () {
      loading = false; ready = true;
      // Recheck consent here: it may have been withdrawn while loading.
      if (allowed()) sendPageView();
      else window.fbq('consent', 'revoke');
    };
    script.onerror = function () { loading = false; script.remove(); };
    loading = true;
    document.head.appendChild(script);
  }

  window.addEventListener('opshub:consent-updated', function (event) {
    var state = event.detail;
    if (!state || typeof state.marketing !== 'boolean') return;
    // A fresh marketing choice acknowledges Meta across the public site.
    consent.setCookie(reviewCookie, reviewVersion, 180);
    if (state.marketing === true) loadPixel();
    else {
      if (window.fbq) window.fbq('consent', 'revoke');
      removePixelCookies();
    }
  });

  function start() {
    var state = consent.readConsentFromCookies();
    if (state && state.marketing === true && consent.getCookie(reviewCookie) !== reviewVersion) {
      // A previous choice covered LinkedIn or /test only: request site-wide review.
      var banner = document.getElementById('siteCookieBanner');
      if (banner) banner.classList.add('is-open');
      return;
    }
    loadPixel();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})(window, document);
