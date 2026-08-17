/**
 * Consenso cookie sito pubblico OpsHub — analytics e marketing indipendenti.
 */
(function (global) {
  'use strict';

  var COOKIE_CONSENT = 'cookie_consent';
  var COOKIE_ANALYTICS = 'cookie_analytics';
  var COOKIE_MARKETING = 'cookie_marketing';

  function getCookie(name) {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function setCookie(name, value, days) {
    var date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + value + ';expires=' + date.toUTCString() + ';path=/;SameSite=Lax';
  }

  function toBool(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  function applyConsent(options) {
    var opts = options || {};
    var analyticsEnabled = toBool(opts.analytics);
    var marketingEnabled = toBool(opts.marketing);
    var anyOptional = analyticsEnabled || marketingEnabled;

    setCookie(COOKIE_CONSENT, anyOptional ? 'accepted' : 'rejected', 365);
    setCookie(COOKIE_ANALYTICS, analyticsEnabled ? 'true' : 'false', 365);
    setCookie(COOKIE_MARKETING, marketingEnabled ? 'true' : 'false', 365);

    if (typeof global.updateSiteConsent === 'function') {
      global.updateSiteConsent({
        analytics: analyticsEnabled,
        marketing: marketingEnabled
      });
    }
  }

  function readConsentFromCookies() {
    var consent = getCookie(COOKIE_CONSENT);
    if (!consent) return null;
    return {
      analytics: getCookie(COOKIE_ANALYTICS) === 'true',
      marketing: getCookie(COOKIE_MARKETING) === 'true'
    };
  }

  function syncConsentFromCookies() {
    var state = readConsentFromCookies();
    if (!state || typeof global.updateSiteConsent !== 'function') return;
    global.updateSiteConsent(state);
  }

  global.OpsHubSiteConsent = {
    COOKIE_CONSENT: COOKIE_CONSENT,
    COOKIE_ANALYTICS: COOKIE_ANALYTICS,
    COOKIE_MARKETING: COOKIE_MARKETING,
    getCookie: getCookie,
    setCookie: setCookie,
    applyConsent: applyConsent,
    readConsentFromCookies: readConsentFromCookies,
    syncConsentFromCookies: syncConsentFromCookies
  };
})(window);
