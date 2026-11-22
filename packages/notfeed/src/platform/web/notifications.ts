/**
 * PWA — Web Push notifications.
 */

export async function requestNotificationPermission(): Promise<NotificationPermission> {
	if (!('Notification' in window)) return 'denied';
	return Notification.requestPermission();
}

export function showNotification(title: string, options?: NotificationOptions): void {
	if (Notification.permission === 'granted') {
		new Notification(title, options);
	}
}
