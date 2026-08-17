/**
 * Missione 16:40 — entry point e orchestrazione.
 */

import { createInitialState, hydrateState, loadSession, clearSession, saveSession, shouldResumeSession } from './state.js';
import {
  getCurrentEvent,
  shouldTriggerSurprise,
  pickSurpriseEvent,
  selectChoice,
  finalizeGame,
  GAME_CONFIG,
} from './engine.js';
import { updateDerivedMetrics } from './scoring.js';
import { trackEvent } from './analytics.js';
import {
  cacheElements,
  updateHUD,
  renderEvent,
  showFeedback,
  showSurpriseModal,
  pushNotification,
  renderReport,
  showScreen,
  runIntro,
  renderCtaForm,
  resetHudBaseline,
  els,
} from './ui.js';
import { runOpsHubReplay } from './opshub-replay.js';
import { bindLeadForm } from './form.js';
import { playClick, playNotify, playUrgent } from './sound.js';

/** @type {import('./state.js').GameState} */
let state;

function init() {
  const root = document.getElementById('m1640-app');
  if (!root) return;

  cacheElements(root);
  renderCtaForm();

  if (new URLSearchParams(window.location.search).has('fresh')) {
    clearSession();
  }

  const saved = loadSession();
  if (saved && shouldResumeSession(saved)) {
    state = hydrateState(saved);
    resumeGame();
  } else {
    if (saved) clearSession();
    state = createInitialState();
    showScreen('intro');
    runIntro(startGame);
  }

  bindGlobalControls();
}

function bindGlobalControls() {
  els.soundToggle?.addEventListener('click', () => {
    const on = document.body.classList.toggle('m1640-sound-on');
    els.soundToggle?.setAttribute('aria-pressed', on ? 'true' : 'false');
    els.soundToggle?.setAttribute('aria-label', on ? 'Disattiva effetti sonori' : 'Attiva effetti sonori (disattivati)');
    const icon = els.soundToggle?.querySelector('i');
    if (icon) {
      icon.className = on ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
    }
    if (on) playClick();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.surpriseModal && !els.surpriseModal.hidden) {
      els.surpriseModal.querySelector('[data-dismiss]')?.click();
    }
  });
}

function startGame() {
  state.phase = 'playing';
  showScreen('playing');
  trackEvent('game_started');
  resetHudBaseline();
  pushNotification('Direzione: serve report completo a fine giornata', 'urgent', '16:22');
  pushNotification('Commessa #2847 — chiusura richiesta entro le 17:00', 'warn', '16:05');
  playNotify();
  updateHUD(state);
  showNextEvent();
}

function resumeGame() {
  showScreen('playing');
  updateHUD(state);
  showNextEvent();
}

function showNextEvent() {
  updateDerivedMetrics(state);
  updateHUD(state);

  if (shouldTriggerSurprise(state)) {
    state.phase = 'surprise';
    const surprise = pickSurpriseEvent(state);
    showSurpriseModal(surprise, () => {
      state.phase = 'playing';
      updateHUD(state);
      continueAfterSurprise();
    });
    return;
  }

  continueAfterSurprise();
}

function continueAfterSurprise() {
  const event = getCurrentEvent(state);
  if (!event) {
    endGame();
    return;
  }

  trackEvent('event_viewed', { event_id: event.id, index: state.eventIndex });
  renderEvent(event, state.eventIndex);
  bindChoiceHandlers();
}

function bindChoiceHandlers() {
  els.eventArea?.querySelectorAll('[data-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-choice');
      if (!id) return;
      els.eventArea.querySelectorAll('[data-choice]').forEach((b) => {
        b.disabled = true;
      });
      btn.classList.add('m1640-choice--selected');

      const { feedback, overtime } = selectChoice(state, id);
      updateDerivedMetrics(state);
      updateHUD(state);
      showFeedback(feedback, overtime ? 'urgent' : 'info');
      playClick();

      if (overtime) {
        pushNotification('Sono le 17:00 — la direzione attende', 'urgent');
        playUrgent();
      }

      setTimeout(() => {
        if (state.eventIndex >= 5) {
          endGame();
        } else {
          showNextEvent();
        }
      }, overtime ? 900 : 650);
    });
  });
}

function endGame() {
  finalizeGame(state);
  showScreen('report');
  renderReport(state, handleReportAction);
}

/**
 * @param {string} action
 */
function handleReportAction(action) {
  if (action === 'opshub') {
    state.phase = 'opshub';
    saveSession(state);
    showScreen('opshub');
    els.opshub.hidden = false;
    els.opshub.classList.add('m1640-screen--active');
    runOpsHubReplay(els.opshub, () => {
      state.phase = 'cta';
      clearSession();
      showScreen('cta');
      bindCtaForm();
    });
  } else if (action === 'replay') {
    clearSession();
    state = createInitialState();
    els.intro?.querySelectorAll('[data-intro-step]').forEach((s) => s.classList.remove('m1640-intro-step--visible'));
    showScreen('intro');
    runIntro(startGame);
  }
}

function bindCtaForm() {
  const form = document.getElementById('m1640-lead-form');
  const status = document.querySelector('.m1640-form__status');
  if (!form) return;

  bindLeadForm(form, (result) => {
    if (!status) return;
    if (result.ok) {
      status.textContent = result.demo
        ? 'Richiesta registrata (modalità demo). In produzione arriverà al team OpsHub.'
        : 'Grazie. Ti contattiamo a breve.';
      status.dataset.tone = 'ok';
      form.reset();
    } else {
      status.textContent = result.error || 'Errore invio.';
      status.dataset.tone = 'error';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { GAME_CONFIG };
