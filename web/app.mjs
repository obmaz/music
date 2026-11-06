// Browser navigation and installation remain separate from the game/audio loop.
const commands = [];
const canvas = document.getElementById('canvas');
const installButton = document.getElementById('install-app');
const fullscreenButton = document.getElementById('fullscreen-app');
const installDialog = document.getElementById('install-dialog');
const installTitle = document.getElementById('install-title');
const installMessage = document.getElementById('install-message');
let installPrompt = null;
let installedInSession = false;
let currentScreen = 'menu';

export function placeOverlay(element, x, y, width, height) {
  const bounds = canvas.getBoundingClientRect();
  const scale = Math.min(bounds.width / 480, bounds.height / 900);
  Object.assign(element.style, {
    left: (bounds.x + (bounds.width - 480 * scale) / 2 + x * scale) + 'px',
    top: (bounds.y + (bounds.height - 900 * scale) / 2 + y * scale) + 'px',
    width: (width * scale) + 'px', height: (height * scale) + 'px',
  });
}
const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
const fullscreenDisplay = matchMedia('(display-mode: fullscreen)');
const standaloneDisplay = matchMedia('(display-mode: standalone)');
// Remember the launch context: API fullscreen in a browser tab is not an install.
const installedContext = standaloneDisplay.matches || navigator.standalone === true || (fullscreenDisplay.matches && !fullscreenElement());
const standalone = () => installedContext;
const isFullscreen = () => Boolean(fullscreenElement()) || fullscreenDisplay.matches;
window.fivefoldInstallLabel = () => standalone() || installedInSession ? 'APP INSTALLED' : 'INSTALL APP';
window.fivefoldFullscreenLabel = () => fullscreenElement() ? 'EXIT FULLSCREEN' : (fullscreenDisplay.matches ? 'FULLSCREEN ON' : 'FULLSCREEN');
window.fivefoldTakeCommand = () => commands.shift() || '';
function placeAppButtons() {
  placeOverlay(installButton, 24, 704, 207, 44);
  placeOverlay(fullscreenButton, 241, 704, 215, 44);
}
function syncFullscreenUI() {
  fullscreenButton.setAttribute('aria-label', window.fivefoldFullscreenLabel());
  fullscreenButton.setAttribute('aria-pressed', String(isFullscreen()));
  canvas.dataset.fullscreen = String(isFullscreen());
  commands.push('fullscreen_label');
  placeAppButtons();
}
window.fivefoldAppScreen = screen => {
  currentScreen = screen;
  installButton.hidden = fullscreenButton.hidden = screen !== 'settings';
  installButton.setAttribute('aria-label', window.fivefoldInstallLabel());
  syncFullscreenUI();
};
window.addEventListener('resize', placeAppButtons);
new ResizeObserver(placeAppButtons).observe(canvas);
let previousApiFullscreen = Boolean(fullscreenElement());
function fullscreenChanged() {
  const current = Boolean(fullscreenElement());
  // Android Back/Escape may exit fullscreen without producing a history event.
  if (previousApiFullscreen && !current && currentScreen === 'playing') commands.push('back');
  previousApiFullscreen = current;
  syncFullscreenUI();
}
document.addEventListener('fullscreenchange', fullscreenChanged);
document.addEventListener('webkitfullscreenchange', fullscreenChanged);
fullscreenDisplay.addEventListener('change', syncFullscreenUI);
window.fivefoldToggleFullscreen = async () => {
  try {
    if (fullscreenElement()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) await exit.call(document);
    } else if (fullscreenDisplay.matches) {
      showInstallHelp('전체화면', '이미 전체화면으로 실행 중입니다.');
    } else {
      const root = document.documentElement;
      if (root.requestFullscreen) await root.requestFullscreen({navigationUI:'hide'});
      else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
      else showInstallHelp('전체화면', '이 브라우저는 전체화면 전환을 지원하지 않습니다.\n홈 화면에 설치한 앱으로 열면 브라우저 주소창 없이 플레이할 수 있습니다.');
    }
  } catch {
    showInstallHelp('전체화면', '브라우저에서 전체화면 전환을 허용하지 않았습니다.\n설치한 앱으로 열거나 지원되는 브라우저에서 다시 시도해 주세요.');
  }
  syncFullscreenUI();
};
// Fullscreen requires transient activation, so keep the call on a real DOM click.
fullscreenButton.addEventListener('click', window.fivefoldToggleFullscreen);

// Arm inside the first real interaction, so Chromium does not skip a history
// entry created without user activation when the hardware/browser Back is used.
// Reloads reuse the existing guard, and repeated Back does not grow history.
let historyArmed = history.state?.fivefold === 'guard';
const guard = () => history.pushState({fivefold: 'guard'}, '', location.href);
function armHistory(event) {
  if (historyArmed || !event.isTrusted || (navigator.userActivation && !navigator.userActivation.isActive)) return;
  history.replaceState({...history.state, fivefold: 'base'}, '', location.href);
  guard(); historyArmed = true;
}
window.addEventListener('pointerdown', armHistory, true);
window.addEventListener('keydown', armHistory, true);
window.addEventListener('popstate', () => {
  if (!historyArmed) return;
  guard();
  if (installDialog.open) { installDialog.close(); canvas.focus(); return; }
  window.fivefoldCancelImport?.();
  commands.push('back');
});
window.addEventListener('keydown', event => {
  if (installDialog.open && event.key === 'Escape') {
    event.preventDefault(); event.stopImmediatePropagation();
    installDialog.close(); canvas.focus();
  }
}, true);

function showInstallHelp(title, message) {
  installTitle.textContent = title;
  installMessage.textContent = message;
  if (!installDialog.open) installDialog.showModal();
}
document.getElementById('install-close').addEventListener('click', () => { installDialog.close(); canvas.focus(); });
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event;
  installButton.setAttribute('aria-label', window.fivefoldInstallLabel());
  commands.push('install_label');
});
window.addEventListener('appinstalled', () => {
  installedInSession = true; installPrompt = null;
  if (installDialog.open) installDialog.close();
  installButton.setAttribute('aria-label', window.fivefoldInstallLabel());
  commands.push('install_label');
});
matchMedia('(display-mode: standalone)').addEventListener('change', () => commands.push('install_label'));
window.fivefoldInstall = async () => {
  if (standalone() || installedInSession) {
    showInstallHelp('앱으로 실행 중입니다', 'FIVEFOLD를 앱처럼 사용할 수 있습니다. 홈 화면의 아이콘으로 다시 열어 주세요.');
    return;
  }
  if (installPrompt) {
    const prompt = installPrompt; installPrompt = null;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      showInstallHelp('앱 설치', '브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해 주세요.');
    }
    return;
  }
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  showInstallHelp('FIVEFOLD 앱 설치', ios
    ? '공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하고 ‘추가’를 눌러 주세요.\n메뉴가 보이지 않으면 Safari에서 이 페이지를 열어 주세요.'
    : '브라우저 메뉴(⋮)에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해 주세요.\n설치 메뉴가 없으면 최신 Chrome 또는 Edge에서 이 페이지를 열어 주세요.');
};
// A DOM button keeps prompt() inside the user's real click/touch gesture.
installButton.addEventListener('click', window.fivefoldInstall);

window.fivefoldRegisterApp = async () => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  try {
    await navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'});
    await navigator.serviceWorker.ready;
    canvas.dataset.offlineReady = 'true';
  } catch {
    // Installation help and online play still work if offline storage is unavailable.
    canvas.dataset.offlineReady = 'false';
  }
};
