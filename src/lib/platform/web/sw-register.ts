/**
 * PWA — Service Worker registration.
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!('serviceWorker' in navigator)) return null;

	try {
		const registration = await navigator.serviceWorker.register('/sw.js', {
			scope: '/'
		});
		return registration;
	} catch (error) {
		console.error('Service worker registration failed:', error);
		return null;
	}
}
