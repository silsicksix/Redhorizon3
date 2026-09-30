export interface DeviceInfo {
  isAndroid: boolean;
  isIOS: boolean;
  isWindows: boolean;
  isMac: boolean;
  isLinux: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  screenType: 'mobile' | 'tablet' | 'desktop';
  platformName: 'Android' | 'iOS' | 'Windows' | 'macOS' | 'Linux' | 'Desktop/PC' | 'Mobile';
  summary: string;
  recommendedEnv: 'termux_android' | 'desktop_pc' | 'ios_web';
  envBadgeText: string;
  envTip: string;
  fullSetupScript: string;
}

export const detectDevice = (): DeviceInfo => {
  if (typeof window === 'undefined' || !navigator) {
    return {
      isAndroid: false,
      isIOS: false,
      isWindows: false,
      isMac: false,
      isLinux: false,
      isMobile: false,
      isDesktop: true,
      hasTouch: false,
      screenType: 'desktop',
      platformName: 'Desktop/PC',
      summary: 'Persekitaran Komputer / Desktop PC',
      recommendedEnv: 'desktop_pc',
      envBadgeText: 'PC / DESKTOP OPTIMIZED',
      envTip: 'Disyorkan menggunakan terminal PowerShell / Bash / Zsh pada sistem PC anda.',
      fullSetupScript: 'npm install && npm run dev'
    };
  }

  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();
  
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (platform.includes('mac') && navigator.maxTouchPoints > 1);
  const isWindows = /win/i.test(platform) || /windows/i.test(ua);
  const isMac = (/mac/i.test(platform) || /macintosh/i.test(ua)) && !isIOS;
  const isLinux = (/linux/i.test(platform) || /linux/i.test(ua)) && !isAndroid;
  
  const hasTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
  
  let screenType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (width < 640) screenType = 'mobile';
  else if (width < 1024) screenType = 'tablet';

  const isMobile = isAndroid || isIOS || screenType === 'mobile' || /mobile|tablet|blackberry|iemobile|opera mini/i.test(ua);
  const isDesktop = !isMobile;

  let platformName: DeviceInfo['platformName'] = 'Desktop/PC';
  if (isAndroid) platformName = 'Android';
  else if (isIOS) platformName = 'iOS';
  else if (isWindows) platformName = 'Windows';
  else if (isMac) platformName = 'macOS';
  else if (isLinux) platformName = 'Linux';
  else if (isMobile) platformName = 'Mobile';

  let recommendedEnv: DeviceInfo['recommendedEnv'] = 'desktop_pc';
  let summary = 'Komputer / PC (Disyorkan Panduan Desktop)';
  let envBadgeText = '💻 PC / DESKTOP';
  let envTip = 'Akses penuh ke pelayar web desktop, terminal Node.js dan persekitaran pembangunan.';
  let fullSetupScript = 'npm install && npm run dev';

  if (isAndroid) {
    recommendedEnv = 'termux_android';
    summary = 'Peranti Android (Disyorkan Panduan Termux)';
    envBadgeText = '📱 ANDROID / TERMUX';
    envTip = 'Gunakan aplikasi Termux dari F-Droid bersama Node.js LTS untuk operasi tanpa PC.';
    fullSetupScript = 'pkg update -y && pkg install nodejs-lts git curl -y && npm install && npm run dev';
  } else if (isIOS) {
    recommendedEnv = 'ios_web';
    summary = 'Peranti Apple iOS (Disyorkan Web Cloud)';
    envBadgeText = '🍏 APPLE iOS (WEB)';
    envTip = 'Akses secara terus melalui pelayar Safari/Chrome yang bersambung ke pelayan Cloud RedHorizon.';
    fullSetupScript = 'curl -s https://your-domain.run.app/api/health';
  }

  return {
    isAndroid,
    isIOS,
    isWindows,
    isMac,
    isLinux,
    isMobile,
    isDesktop,
    hasTouch,
    screenType,
    platformName,
    summary,
    recommendedEnv,
    envBadgeText,
    envTip,
    fullSetupScript
  };
};
