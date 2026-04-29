/**
 * PWA — Install prompt (Add to Home Screen) handler.
 *
 * Captures the `beforeinstallprompt` event and exposes a small reactive
 * surface (`installPrompt.canInstall`, `installPrompt.installed`) plus an
 * imperative `promptInstall()`.
 *
 * `setupInstallPrompt()` must be called once on web boot. Idempotent.
 */

interface BeforeInstallPromptEvent extends Event {
prompt(): Promise<void>;
userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenerInstalled = false;

export const installPrompt = $state({
canInstall: false,
installed: false
});

export function setupInstallPrompt(): void {
if (typeof window === 'undefined' || listenerInstalled) return;
listenerInstalled = true;

window.addEventListener('beforeinstallprompt', (e) => {
e.preventDefault();
deferredPrompt = e as BeforeInstallPromptEvent;
installPrompt.canInstall = true;
});

window.addEventListener('appinstalled', () => {
deferredPrompt = null;
installPrompt.canInstall = false;
installPrompt.installed = true;
});

// Already installed (standalone display)?
if (window.matchMedia('(display-mode: standalone)').matches) {
installPrompt.installed = true;
}
}

export async function promptInstall(): Promise<boolean> {
if (!deferredPrompt) return false;

const evt = deferredPrompt;
deferredPrompt = null;
installPrompt.canInstall = false;

await evt.prompt();
const { outcome } = await evt.userChoice;
if (outcome === 'accepted') {
installPrompt.installed = true;
}
return outcome === 'accepted';
}
