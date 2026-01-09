// utils/youtubeUtils.js
export const extractYouTubeId = (url) => {
  if (!url) return null;
  
  const patterns = [
    // Standard YouTube URLs
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    // YouTube Shorts
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    // YouTube Live
    /youtube\.com\/live\/([^&\n?#]+)/,
    // YouTube Music
    /music\.youtube\.com\/watch\?v=([^&\n?#]+)/,
    // Mobile URLs
    /m\.youtube\.com\/watch\?v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

export const isValidYouTubeUrl = (url) => {
  if (!url) return false;
  
  const youtubePatterns = [
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
    /^(https?:\/\/)?(music\.)?youtube\.com\/.+/
  ];
  
  return youtubePatterns.some(pattern => pattern.test(url));
};

export const getYouTubeThumbnail = (videoId, quality = 'mqdefault') => {
  // quality options: default, mqdefault, hqdefault, sddefault, maxresdefault
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
};

export const getYouTubeEmbedUrl = (videoId) => {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
};