interface ShareOptions {
	url: string;
	title?: string;
	text?: string;
}

export function shareTwitter({ url, title, text }: ShareOptions) {
	const tweetText = text || title || 'Post';
	const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`;
	window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
}

export function shareLinkedIn({ url }: ShareOptions) {
	const linkUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
	window.open(linkUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
}

export function shareBluesky({ url, title }: ShareOptions) {
	const shareText = title ? `${title}\n${url}` : url;
	const linkUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(shareText)}`;
	window.open(linkUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
}

export function shareFacebook({ url }: ShareOptions) {
	const linkUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
	window.open(linkUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
}

export function shareWhatsApp({ url, title }: ShareOptions) {
	const shareText = title ? `${title}\n${url}` : url;
	const linkUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
	window.open(linkUrl, '_blank', 'noopener,noreferrer');
}

export function shareTelegram({ url, title }: ShareOptions) {
	const linkUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title || '')}`;
	window.open(linkUrl, '_blank', 'noopener,noreferrer');
}

export function shareSignal({ url, title }: ShareOptions) {
	const shareText = title ? `${title}\n${url}` : url;
	const linkUrl = `https://signal.me/#p/?text=${encodeURIComponent(shareText)}`;
	window.open(linkUrl, '_blank', 'noopener,noreferrer');
}

export function shareReddit({ url, title }: ShareOptions) {
	const linkUrl = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || '')}`;
	window.open(linkUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
}

export function sharePinterest({ url, title }: ShareOptions) {
	const shareText = title ? `${title} ${url}` : url;
	const linkUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(shareText)}`;
	window.open(linkUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
}

export function shareThreads({ url, title }: ShareOptions) {
	const shareText = title ? `${title}\n${url}` : url;
	const linkUrl = `https://threads.net/intent/post?text=${encodeURIComponent(shareText)}`;
	window.open(linkUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
}

export function shareEmail({ url, title, text }: ShareOptions) {
	const body = text ? `${text}\n\n${url}` : url;
	const linkUrl = `mailto:?subject=${encodeURIComponent(title || 'Link partilhado')}&body=${encodeURIComponent(body)}`;
	window.open(linkUrl, '_self');
}

export function shareTumblr({ url, title }: ShareOptions) {
	const linkUrl = `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodeURIComponent(url)}&caption=${encodeURIComponent(title || '')}`;
	window.open(linkUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
}

export function shareHN({ url, title }: ShareOptions) {
	const linkUrl = `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(url)}&t=${encodeURIComponent(title || '')}`;
	window.open(linkUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
}

export async function nativeShare({ url, title, text }: ShareOptions) {
	if (typeof navigator !== 'undefined' && navigator.share) {
		try {
			await navigator.share({
				title: title || '',
				text: text || '',
				url: url
			});
		} catch {
			// User cancelled or error
		}
	}
}
