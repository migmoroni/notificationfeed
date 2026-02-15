/**
 * PWA — Install prompt (Add to Home Screen) handler.
 */

let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function listenForInstallPrompt(): void {
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		deferredPrompt = e as BeforeInstallPromptEvent;
	});
}

export function canShowInstallPrompt(): boolean {
	return deferredPrompt !== null;
}

export async function showInstallPrompt(): Promise<boolean> {
	if (!deferredPrompt) return false;

	await deferredPrompt.prompt();
	const { outcome } = await deferredPrompt.userChoice;
	deferredPrompt = null;

	return outcome === 'accepted';
}
