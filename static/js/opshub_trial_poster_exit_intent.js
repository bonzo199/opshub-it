(function (global) {
  'use strict';

  function isCoarsePointerDevice() {
    try {
      if (global.matchMedia && global.matchMedia('(pointer: coarse)').matches) return true;
    } catch (err) {
      // ignore
    }
    return 'ontouchstart' in global || ((global.navigator && global.navigator.maxTouchPoints) || 0) > 0;
  }

  function bindTrialPosterExitIntent(options) {
    options = options || {};
    var overlayId = options.overlayId;
    var canTrigger = options.canTrigger;
    var onTrigger = options.onTrigger;

    if (typeof canTrigger !== 'function' || typeof onTrigger !== 'function') return;
    if (overlayId && !global.document.getElementById(overlayId)) return;
    if (typeof options.isDisabled === 'function' && options.isDisabled()) return;

    var armed = true;
    var teardownFns = [];

    function addTeardown(fn) {
      teardownFns.push(fn);
    }

    function teardown() {
      teardownFns.forEach(function (fn) {
        fn();
      });
      teardownFns = [];
    }

    function canFire() {
      return armed && canTrigger();
    }

    function fire(source) {
      if (!canFire()) return;
      armed = false;
      teardown();
      onTrigger(source || 'trial_poster_exit_intent');
    }

    function onDesktopExitIntent(e) {
      if (!canFire()) return;
      if (e.relatedTarget || e.toElement) return;
      if (typeof e.clientY === 'number' && e.clientY > 0) return;
      fire('trial_poster_exit_intent_desktop');
    }

    if (!isCoarsePointerDevice()) {
      global.document.addEventListener('mouseout', onDesktopExitIntent);
      addTeardown(function () {
        global.document.removeEventListener('mouseout', onDesktopExitIntent);
      });
    }

    if (isCoarsePointerDevice()) {
      if (global.history && global.history.pushState) {
        try {
          global.history.pushState({ opshubTrialPosterTrap: 1 }, '');
        } catch (err) {
          // ignore
        }

        function onBackExitIntent() {
          if (!canFire()) return;
          try {
            global.history.pushState({ opshubTrialPosterTrap: 1 }, '');
          } catch (err) {
            // ignore
          }
          fire('trial_poster_exit_intent_back');
        }

        global.addEventListener('popstate', onBackExitIntent);
        addTeardown(function () {
          global.removeEventListener('popstate', onBackExitIntent);
        });
      }

      var maxScrollY = 0;
      var minScrollDepth = options.minScrollDepth != null ? options.minScrollDepth : 400;
      var scrollTopThreshold = options.scrollTopThreshold != null ? options.scrollTopThreshold : 48;

      function onScrollExitIntent() {
        if (!canFire()) return;
        var scrollY = global.scrollY || global.document.documentElement.scrollTop || 0;
        maxScrollY = Math.max(maxScrollY, scrollY);
        if (maxScrollY >= minScrollDepth && scrollY <= scrollTopThreshold) {
          fire('trial_poster_exit_intent_scroll_top');
        }
      }

      global.addEventListener('scroll', onScrollExitIntent, { passive: true });
      addTeardown(function () {
        global.removeEventListener('scroll', onScrollExitIntent);
      });
    }
  }

  global.OpsHubTrialPosterExitIntent = {
    bind: bindTrialPosterExitIntent,
    isCoarsePointerDevice: isCoarsePointerDevice
  };
})(window);
