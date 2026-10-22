export function getImageSource(url: string): string {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return trimmedUrl;

  try {
    const parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.hostname !== 'drive.google.com' && parsedUrl.hostname !== 'www.drive.google.com') {
      return trimmedUrl;
    }

    const fileId =
      parsedUrl.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ??
      parsedUrl.searchParams.get('id');

    if (!fileId || !/^[\w-]+$/.test(fileId)) return trimmedUrl;

    const imageUrl = new URL('https://drive.google.com/thumbnail');
    imageUrl.searchParams.set('id', fileId);
    imageUrl.searchParams.set('sz', 'w1200');
    return imageUrl.toString();
  } catch {
    return trimmedUrl;
  }
}
