/**
 * Consenso cookie sito pubblico OpsHub — analytics e marketing indipendenti.
 */
(function (global) {
  'use strict';

  var COOKIE_CONSENT = 'cookie_consent';
  var COOKIE_ANALYTICS = 'cookie_analytics';
  var COOKIE_MARKETING = 'cookie_marketing';
  var COOKIE_VERSION = 'cookie_consent_version';
  var CONSENT_VERSION = '2026-08-23-v1';

  function getCookie(name) {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function setCookie(name, value, days) {
    var date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    var secure = global.location && global.location.protocol === 'https:' ? ';Secure' : '';
    document.cookie = name + '=' + value + ';expires=' + date.toUTCString() + ';path=/;SameSite=Lax' + secure;
  }

  function toBool(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  function applyConsent(options) {
    var opts = options || {};
    var analyticsEnabled = toBool(opts.analytics);
    var marketingEnabled = toBool(opts.marketing);
    var anyOptional = analyticsEnabled || marketingEnabled;

    setCookie(COOKIE_CONSENT, anyOptional ? 'accepted' : 'rejected', 180);
    setCookie(COOKIE_ANALYTICS, analyticsEnabled ? 'true' : 'false', 180);
    setCookie(COOKIE_MARKETING, marketingEnabled ? 'true' : 'false', 180);
    setCookie(COOKIE_VERSION, CONSENT_VERSION, 180);

    if (typeof global.updateSiteConsent === 'function') {
      global.updateSiteConsent({
        analytics: analyticsEnabled,
        marketing: marketingEnabled
      });
    }
    if (typeof global.CustomEvent === 'function') {
      global.dispatchEvent(new global.CustomEvent('opshub:consent-updated', {
        detail: {analytics:analyticsEnabled, marketing:marketingEnabled}
      }));
    }
  }

  function readConsentFromCookies() {
    var consent = getCookie(COOKIE_CONSENT);
    var version = getCookie(COOKIE_VERSION);
    if (!consent || (version && version !== CONSENT_VERSION)) return null;
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
    COOKIE_VERSION: COOKIE_VERSION,
    CONSENT_VERSION: CONSENT_VERSION,
    getCookie: getCookie,
    setCookie: setCookie,
    applyConsent: applyConsent,
    readConsentFromCookies: readConsentFromCookies,
    syncConsentFromCookies: syncConsentFromCookies
  };
})(window);
