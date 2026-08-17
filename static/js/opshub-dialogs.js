/**
 * OpsHub dialogs — API portabile per Confirm / Alert / Prompt.
 * Usa markup già presente (#opshubConfirmModal / #opshubAlertModal / #opshubPromptModal)
 * oppure lo inietta se assente (pagine senza base.html).
 * Richiede Bootstrap 5 Modal.
 */
(function (global) {
  'use strict';
  if (global.__opshubDialogsBooted) return;
  global.__opshubDialogsBooted = true;

  function ensureCss() {
    if (document.getElementById('opshub-modals-css')) return;
    var link = document.createElement('link');
    link.id = 'opshub-modals-css';
    link.rel = 'stylesheet';
    link.href = '/static/css/opshub-modals.css?v=20260731-modal-stack-v2';
    document.head.appendChild(link);
  }

  function injectMarkup() {
    if (document.getElementById('opshubConfirmModal')) return;
    ensureCss();
    var wrap = document.createElement('div');
    wrap.id = 'opshubDialogsRoot';
    wrap.innerHTML =
      '<div class="modal fade" id="opshubConfirmModal" tabindex="-1" aria-hidden="true">' +
      '  <div class="modal-dialog modal-dialog-centered" style="max-width:520px;">' +
      '    <div class="modal-content opshub-modal-shell">' +
      '      <div class="modal-header"><div class="opshub-modal-head-text"><h5 class="modal-title" id="opshubConfirmTitle">Conferma</h5></div>' +
      '        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Chiudi"></button></div>' +
      '      <div class="modal-body"><div id="opshubConfirmBody"></div></div>' +
      '      <div class="modal-footer">' +
      '        <button type="button" class="btn btn-hero btn-compact btn-inline btn-hero-outline" id="opshubConfirmCancel" data-bs-dismiss="modal">Annulla</button>' +
      '        <button type="button" class="btn btn-hero btn-compact btn-inline btn-hero-blue" id="opshubConfirmOk">Conferma</button>' +
      '      </div></div></div></div>' +
      '<div class="modal fade" id="opshubAlertModal" tabindex="-1" aria-hidden="true">' +
      '  <div class="modal-dialog modal-dialog-centered" style="max-width:480px;">' +
      '    <div class="modal-content border-0 shadow-lg" style="border-radius:18px;overflow:hidden;">' +
      '      <div class="modal-header border-0 text-white py-3" id="opshubAlertHeader" style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);">' +
      '        <h5 class="modal-title fw-bold mb-0" id="opshubAlertTitle">Avviso</h5>' +
      '        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Chiudi"></button></div>' +
      '      <div class="modal-body py-3 px-3" style="color:#334155;"><p class="mb-0 fw-semibold" id="opshubAlertBody" style="white-space:pre-line;line-height:1.45;"></p></div>' +
      '      <div class="modal-footer border-0 pt-0 pb-3 px-3">' +
      '        <button type="button" class="btn text-white border-0 px-4 fw-semibold" id="opshubAlertOk" data-bs-dismiss="modal" style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);border-radius:10px;">Ho capito</button>' +
      '      </div></div></div></div>' +
      '<div class="modal fade" id="opshubPromptModal" tabindex="-1" aria-hidden="true">' +
      '  <div class="modal-dialog modal-dialog-centered" style="max-width:520px;">' +
      '    <div class="modal-content opshub-modal-shell">' +
      '      <div class="modal-header"><div class="opshub-modal-head-text"><h5 class="modal-title" id="opshubPromptTitle">Inserisci valore</h5></div>' +
      '        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Chiudi"></button></div>' +
      '      <div class="modal-body">' +
      '        <p class="opshub-modal-subtitle mb-2" id="opshubPromptBody"></p>' +
      '        <input type="text" class="form-control" id="opshubPromptInput" autocomplete="off">' +
      '      </div>' +
      '      <div class="modal-footer">' +
      '        <button type="button" class="btn btn-hero btn-compact btn-inline btn-hero-outline" id="opshubPromptCancel" data-bs-dismiss="modal">Annulla</button>' +
      '        <button type="button" class="btn btn-hero btn-compact btn-inline btn-hero-blue" id="opshubPromptOk">OK</button>' +
      '      </div></div></div></div>';
    document.body.appendChild(wrap);
  }

  function readZ(el) {
    if (!el) return 0;
    var inline = el.style && el.style.getPropertyValue('z-index');
    var fromInline = inline ? parseInt(inline, 10) : NaN;
    var fromCss = parseInt(window.getComputedStyle(el).zIndex, 10);
    var z = Number.isFinite(fromInline) ? fromInline : fromCss;
    return Number.isFinite(z) ? z : 0;
  }

  var DIALOG_TOP_Z = 2147483647;
  var dialogQueue = Promise.resolve();

  function enqueueDialog(run) {
    var result = dialogQueue.then(run, run);
    dialogQueue = result.catch(function () { /* keep queue usable */ });
    return result;
  }

  function suspendUnderlyingModals(modalEl) {
    var active = document.activeElement;
    var suspended = [];
    document.querySelectorAll('.modal.show').forEach(function (under) {
      if (under === modalEl) return;
      var inst = hasBootstrap() ? bootstrap.Modal.getInstance(under) : null;
      var trap = inst && inst._focustrap;
      try { if (trap && typeof trap.deactivate === 'function') trap.deactivate(); } catch (e) { /* ignore */ }
      suspended.push({
        el: under,
        trap: trap,
        inert: under.hasAttribute('inert'),
        ariaHidden: under.getAttribute('aria-hidden'),
      });
      under.setAttribute('inert', '');
      under.setAttribute('aria-hidden', 'true');
    });
    return function restoreUnderlyingModals() {
      suspended.forEach(function (item) {
        if (!item.el || !item.el.isConnected || !item.el.classList.contains('show')) return;
        if (!item.inert) item.el.removeAttribute('inert');
        if (item.ariaHidden == null) item.el.removeAttribute('aria-hidden');
        else item.el.setAttribute('aria-hidden', item.ariaHidden);
        try { if (item.trap && typeof item.trap.activate === 'function') item.trap.activate(); } catch (e) { /* ignore */ }
      });
      if (active && active.isConnected) {
        setTimeout(function () { try { active.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 0);
      }
    };
  }

  /**
   * Porta una modale OpsHub sopra qualsiasi overlay già aperto.
   * Usa z-index !important per battere CSS di pagina (personale, reperibilità, cantieri).
   */
  function stackOnTop(modalEl) {
    if (!modalEl) return function () {};
    // Sempre in fondo a body: evita stacking context di parent e vince sul paint order
    document.body.appendChild(modalEl);

    function collectMaxZ() {
      var maxZ = 0;
      document.querySelectorAll(
        '.modal, .modal-backdrop, .offcanvas.show, .offcanvas-backdrop, .card-context-menu, [data-opshub-overlay]'
      ).forEach(function (m) {
        if (m === modalEl) return;
        var z = readZ(m);
        if (z > 0) maxZ = Math.max(maxZ, z);
      });
      return maxZ;
    }

    function raise() {
      collectMaxZ();
      modalEl.style.setProperty('z-index', String(DIALOG_TOP_Z), 'important');
      var backs = document.querySelectorAll('.modal-backdrop');
      if (backs.length) {
        backs[backs.length - 1].style.setProperty('z-index', String(DIALOG_TOP_Z - 1), 'important');
      }
    }

    raise();
    var t0 = setTimeout(raise, 0);
    var t1 = setTimeout(raise, 50);
    var t2 = setTimeout(raise, 150);
    var t3 = setTimeout(raise, 320);
    modalEl.addEventListener('show.bs.modal', raise);
    modalEl.addEventListener('shown.bs.modal', raise);
    return function () {
      modalEl.removeEventListener('show.bs.modal', raise);
      modalEl.removeEventListener('shown.bs.modal', raise);
      clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      modalEl.style.removeProperty('z-index');
      // Non lasciare backdrop a z-index max dopo chiusura alert/confirm
      document.querySelectorAll('.modal-backdrop').forEach(function (b) {
        if (readZ(b) >= DIALOG_TOP_Z - 100) b.style.removeProperty('z-index');
      });
    };
  }

  global.OpsHubRaiseModal = stackOnTop;

  function cleanupStack() {
    try {
      var openModals = Array.prototype.slice.call(document.querySelectorAll('.modal.show'));
      var backdrops = Array.prototype.slice.call(document.querySelectorAll('.modal-backdrop'));

      if (openModals.length === 0) {
        backdrops.forEach(function (b) { b.remove(); });
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
        return;
      }

      // Resta almeno una modale aperta (es. #modalCantiere): non lasciare overlay orfano
      document.body.classList.add('modal-open');

      // Bootstrap nested: al massimo 1 backdrop per modale aperta; rimuovi gli extra
      var keep = Math.max(1, openModals.length);
      if (backdrops.length > keep) {
        backdrops.slice(0, backdrops.length - keep).forEach(function (b) { b.remove(); });
      }

      // Il raise dell'alert porta il backdrop a z-index max: va resettato o resta sopra la modale sotto
      document.querySelectorAll('.modal-backdrop').forEach(function (b, i) {
        b.style.removeProperty('z-index');
        b.classList.add('show');
        // Stagger leggero se più backdrop (raro)
        if (openModals.length > 1) {
          b.style.zIndex = String(1040 + (i + 1) * 10);
        }
      });

      // Se Bootstrap ha rimosso tutti i backdrop ma resta una modale, ricrea quello base
      if (!document.querySelector('.modal-backdrop')) {
        var bd = document.createElement('div');
        bd.className = 'modal-backdrop fade show';
        document.body.appendChild(bd);
      }
    } catch (e) { /* ignore */ }
  }

  global.OpsHubCleanupModalStack = cleanupStack;

  function hasBootstrap() {
    return !!(global.bootstrap && global.bootstrap.Modal);
  }

  function ensureApis() {
    injectMarkup();

    if (typeof global.OpsHubConfirm !== 'function') {
      global.OpsHubConfirm = function (opts) {
        return enqueueDialog(function () {
        opts = opts || {};
        var modalEl = document.getElementById('opshubConfirmModal');
        var titleEl = document.getElementById('opshubConfirmTitle');
        var bodyEl = document.getElementById('opshubConfirmBody');
        var okBtn = document.getElementById('opshubConfirmOk');
        var cancelBtn = document.getElementById('opshubConfirmCancel');
        if (!modalEl || !okBtn || !cancelBtn || !hasBootstrap()) return Promise.resolve(false);

        if (titleEl) titleEl.textContent = String(opts.title || 'Conferma');
        if (bodyEl) bodyEl.textContent = String(opts.body || '');
        okBtn.textContent = String(opts.okText || 'Conferma');
        cancelBtn.textContent = String(opts.cancelText || 'Annulla');
        var variant = String(opts.variant || 'primary');
        var heroOk = variant === 'danger' ? 'btn-hero-danger' : (variant === 'success' ? 'btn-hero-green' : 'btn-hero-blue');
        okBtn.className = 'btn btn-hero btn-compact btn-inline ' + heroOk;
        cancelBtn.className = 'btn btn-hero btn-compact btn-inline btn-hero-outline';
        cancelBtn.style.display = opts.showCancel === false ? 'none' : '';

        var bs = bootstrap.Modal.getOrCreateInstance(modalEl);
        var settled = false;
        var outcome = false;
        return new Promise(function (resolve) {
          var restoreUnderlying = suspendUnderlyingModals(modalEl);
          var cleanupZ = stackOnTop(modalEl);
          function done(val) {
            if (settled) return;
            settled = true;
            okBtn.removeEventListener('click', onOk);
            modalEl.removeEventListener('hidden.bs.modal', onHidden);
            cleanupZ();
            restoreUnderlying();
            cleanupStack();
            setTimeout(cleanupStack, 0);
            setTimeout(cleanupStack, 150);
            setTimeout(cleanupStack, 320);
            resolve(val);
          }
          function onOk() { outcome = true; bs.hide(); }
          function onHidden() { done(outcome); }
          okBtn.addEventListener('click', onOk);
          modalEl.addEventListener('hidden.bs.modal', onHidden);
          bs.show();
        });
        });
      };
      global.OpsHubConfirm.show = function (opts) {
        opts = opts || {};
        var danger = opts.danger === true || opts.variant === 'danger';
        return global.OpsHubConfirm({
          title: opts.title || 'Conferma',
          body: opts.message || opts.body || '',
          okText: opts.confirmText || opts.okText || 'Conferma',
          cancelText: opts.cancelText || 'Annulla',
          variant: danger ? 'danger' : (opts.variant || 'primary'),
          showCancel: opts.showCancel !== false,
        });
      };
    }

    if (typeof global.OpsHubAlert !== 'function') {
      global.__opshubNativeAlert = global.__opshubNativeAlert || global.alert.bind(global);
      global.OpsHubAlert = function (opts) {
        return enqueueDialog(function () {
        opts = opts || {};
        var modalEl = document.getElementById('opshubAlertModal');
        var titleEl = document.getElementById('opshubAlertTitle');
        var bodyEl = document.getElementById('opshubAlertBody');
        var hdr = document.getElementById('opshubAlertHeader');
        var okBtn = document.getElementById('opshubAlertOk');
        if (!modalEl || !okBtn || !hasBootstrap()) {
          try { global.__opshubNativeAlert(String(opts.body || opts.title || 'Avviso')); } catch (e) { /* ignore */ }
          return Promise.resolve();
        }
        if (titleEl) titleEl.textContent = String(opts.title || 'Avviso');
        if (bodyEl) bodyEl.textContent = String(opts.body || '');
        okBtn.textContent = String(opts.okText || 'Ho capito');
        var variant = String(opts.variant || 'info');
        if (hdr) {
          var bg = 'linear-gradient(135deg,#1e3a8a,#3b82f6)';
          if (variant === 'danger') bg = 'linear-gradient(135deg,#b91c1c,#dc2626)';
          else if (variant === 'warning') bg = 'linear-gradient(135deg,#b45309,#d97706)';
          else if (variant === 'success') bg = 'linear-gradient(135deg,#047857,#059669)';
          hdr.style.background = bg;
          okBtn.style.background = bg;
        }
        var bs = bootstrap.Modal.getOrCreateInstance(modalEl);
        return new Promise(function (resolve) {
          var restoreUnderlying = suspendUnderlyingModals(modalEl);
          var cleanupZ = stackOnTop(modalEl);
          var settled = false;
          function finish() {
            if (settled) return;
            settled = true;
            cleanupZ();
            restoreUnderlying();
            // Subito + dopo animazione Bootstrap: toglie overlay orfano se resta #modalCantiere
            cleanupStack();
            setTimeout(cleanupStack, 0);
            setTimeout(cleanupStack, 150);
            setTimeout(cleanupStack, 320);
            resolve();
          }
          modalEl.addEventListener('hidden.bs.modal', finish, { once: true });
          bs.show();
        });
        });
      };
    }

    if (typeof global.OpsHubPrompt !== 'function') {
      global.OpsHubPrompt = function (opts) {
        return enqueueDialog(function () {
        opts = opts || {};
        injectMarkup();
        var modalEl = document.getElementById('opshubPromptModal');
        var titleEl = document.getElementById('opshubPromptTitle');
        var bodyEl = document.getElementById('opshubPromptBody');
        var inputEl = document.getElementById('opshubPromptInput');
        var okBtn = document.getElementById('opshubPromptOk');
        var cancelBtn = document.getElementById('opshubPromptCancel');
        if (!modalEl || !inputEl || !okBtn || !hasBootstrap()) return Promise.resolve(null);

        if (titleEl) titleEl.textContent = String(opts.title || 'Inserisci valore');
        if (bodyEl) bodyEl.textContent = String(opts.body || opts.message || '');
        inputEl.value = String(opts.defaultValue != null ? opts.defaultValue : (opts.value != null ? opts.value : ''));
        inputEl.placeholder = String(opts.placeholder || '');
        okBtn.textContent = String(opts.okText || 'OK');
        if (cancelBtn) cancelBtn.textContent = String(opts.cancelText || 'Annulla');

        var bs = bootstrap.Modal.getOrCreateInstance(modalEl);
        var settled = false;
        var outcome = null;
        return new Promise(function (resolve) {
          var restoreUnderlying = suspendUnderlyingModals(modalEl);
          var cleanupZ = stackOnTop(modalEl);
          function done(val) {
            if (settled) return;
            settled = true;
            okBtn.removeEventListener('click', onOk);
            inputEl.removeEventListener('keydown', onKey);
            modalEl.removeEventListener('hidden.bs.modal', onHidden);
            cleanupZ();
            restoreUnderlying();
            cleanupStack();
            setTimeout(cleanupStack, 0);
            setTimeout(cleanupStack, 150);
            setTimeout(cleanupStack, 320);
            resolve(val);
          }
          function onOk() {
            outcome = inputEl.value;
            bs.hide();
          }
          function onHidden() { done(outcome); }
          function onKey(ev) {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              onOk();
            }
          }
          okBtn.addEventListener('click', onOk);
          inputEl.addEventListener('keydown', onKey);
          modalEl.addEventListener('hidden.bs.modal', onHidden);
          bs.show();
          setTimeout(function () { try { inputEl.focus(); inputEl.select(); } catch (e) { /* ignore */ } }, 200);
        });
        });
      };
    }

    if (typeof global.showNotification !== 'function') {
      global.showNotification = function (title, message, type) {
        type = type || 'info';
        var container = document.getElementById('notificationContainer');
        if (!container) {
          container = document.createElement('div');
          container.id = 'notificationContainer';
          container.style.cssText = 'position:fixed;top:100px;right:20px;z-index:9999;';
          document.body.appendChild(container);
        }
        var n = document.createElement('div');
        n.className = 'notification ' + type;
        n.style.cssText = 'background:#fff;border-radius:8px;box-shadow:0 10px 15px -3px rgb(0 0 0 / .1);padding:1rem 1.25rem;margin-bottom:.75rem;border-left:4px solid #3b82f6;max-width:350px;';
        if (type === 'success') n.style.borderLeftColor = '#10b981';
        if (type === 'error' || type === 'danger') n.style.borderLeftColor = '#ef4444';
        if (type === 'warning') n.style.borderLeftColor = '#f59e0b';
        n.innerHTML = '<div style="font-weight:700;margin-bottom:.25rem;">' + String(title || '') +
          ' <button type="button" style="float:right;border:0;background:0;font-size:1.2rem;cursor:pointer;" onclick="this.closest(\'.notification\').remove()">&times;</button></div>' +
          '<div>' + String(message || '') + '</div>';
        container.appendChild(n);
        setTimeout(function () { try { n.remove(); } catch (e) {} }, 5000);
      };
    }

    if (!global.__opshubAlertPatched) {
      global.__opshubAlertPatched = true;
      global.__opshubNativeAlert = global.__opshubNativeAlert || global.alert.bind(global);
      global.alert = function (msg) {
        var text = msg == null ? '' : String(msg);
        var isSuccess = /success|successo|salvato|salvata|completato|completata|inviato|inviata|eliminato|eliminata|archiviato|archiviata|riuscito/i.test(text)
          && !/error|impossibile|violat|failed|fallit|attenzione|warning/i.test(text);
        if (isSuccess && typeof global.showNotification === 'function' && document.getElementById('notificationContainer')) {
          global.showNotification('Operazione completata', text, 'success');
          return;
        }
        if (typeof global.OpsHubAlert === 'function' && document.getElementById('opshubAlertModal')) {
          return global.OpsHubAlert({
            title: isSuccess ? 'Operazione completata' : 'Avviso',
            body: text,
            variant: /error|impossibile|violat|failed|fallit/i.test(text) ? 'danger'
              : (/attenzione|warning|obbligatori|mancante/i.test(text) ? 'warning'
                : (isSuccess ? 'success' : 'info')),
            okText: 'Ho capito',
          });
        }
        return global.__opshubNativeAlert(text);
      };
    }

    // Helpers corti per migrazione
    global.opsConfirm = async function (body, opts) {
      opts = opts || {};
      if (typeof global.OpsHubConfirm === 'function') {
        return global.OpsHubConfirm({
          title: opts.title || 'Conferma',
          body: String(body || opts.body || ''),
          okText: opts.okText || opts.confirmText || 'Conferma',
          cancelText: opts.cancelText || 'Annulla',
          variant: opts.variant || (opts.danger ? 'danger' : 'primary'),
          showCancel: opts.showCancel !== false,
        });
      }
      return false;
    };

    global.opsAlert = async function (body, opts) {
      opts = opts || {};
      if (typeof global.OpsHubAlert === 'function') {
        return global.OpsHubAlert({
          title: opts.title || 'Avviso',
          body: String(body || opts.body || ''),
          okText: opts.okText || 'Ho capito',
          variant: opts.variant || 'info',
        });
      }
      try {
        global.__opshubNativeAlert = global.__opshubNativeAlert || global.alert.bind(global);
        global.__opshubNativeAlert(String(body || ''));
      } catch (e) { /* ignore */ }
    };

    if (!global.__opshubConfirmFormBound) {
      global.__opshubConfirmFormBound = true;
      document.addEventListener('submit', async function (event) {
        var form = event.target;
        if (!form || !form.matches || !form.matches('form[data-opshub-confirm-message]')) return;
        if (form.dataset.opshubConfirming === '1') return;
        event.preventDefault();
        var ok = await global.opsConfirm(form.dataset.opshubConfirmMessage || '', {
          title: form.dataset.opshubConfirmTitle || 'Conferma',
          variant: form.dataset.opshubConfirmVariant || 'primary',
        });
        if (!ok) return;
        form.dataset.opshubConfirming = '1';
        try { form.submit(); } finally { delete form.dataset.opshubConfirming; }
      }, true);
    }

    global.opsPrompt = async function (body, defaultValue, opts) {
      opts = opts || {};
      if (typeof global.OpsHubPrompt === 'function') {
        return global.OpsHubPrompt({
          title: opts.title || 'Inserisci valore',
          body: String(body || ''),
          defaultValue: defaultValue != null ? defaultValue : '',
          okText: opts.okText || 'OK',
          cancelText: opts.cancelText || 'Annulla',
          placeholder: opts.placeholder || '',
        });
      }
      return null;
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureApis);
  } else {
    ensureApis();
  }
})(typeof window !== 'undefined' ? window : this);
