// Browser navigation and installation remain separate from the game/audio loop.
const commands = [];
const canvas = document.getElementById('canvas');
const installButton = document.getElementById('install-app');
const installDialog = document.getElementById('install-dialog');
const installTitle = document.getElementById('install-title');
const installMessage = document.getElementById('install-message');
let installPrompt = null;
let installedInSession = false;

export function placeOverlay(element, x, y, width, height) {
  const bounds = canvas.getBoundingClientRect();
  const scale = Math.min(bounds.width / 480, bounds.height / 900);
  Object.assign(element.style, {
    left: (bounds.x + (bounds.width - 480 * scale) / 2 + x * scale) + 'px',
    top: (bounds.y + (bounds.height - 900 * scale) / 2 + y * scale) + 'px',
    width: (width * scale) + 'px', height: (height * scale) + 'px',
  });
}
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
window.fivefoldInstallLabel = () => standalone() || installedInSession ? 'APP INSTALLED' : 'INSTALL APP';
window.fivefoldTakeCommand = () => commands.shift() || '';
window.fivefoldAppScreen = screen => {
  installButton.hidden = screen !== 'settings';
  installButton.setAttribute('aria-label', window.fivefoldInstallLabel());
  placeOverlay(installButton, 24, 704, 432, 44);
};
window.addEventListener('resize', () => placeOverlay(installButton, 24, 704, 432, 44));
new ResizeObserver(() => placeOverlay(installButton, 24, 704, 432, 44)).observe(canvas);

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
