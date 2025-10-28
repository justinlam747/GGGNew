/**
 * Get the API base URL based on the current hostname
 * Uses hostname detection for reliable production/development detection
 */
export const getApiBaseUrl = () => {
  const isProduction = typeof window !== 'undefined' && (
    window.location.hostname === 'gggnew.onrender.com' ||
    window.location.hostname === 'glazinggorillagames.com' ||
    window.location.hostname === 'www.glazinggorillagames.com'
  );
  return isProduction ? '' : 'http://localhost:5001';
};
