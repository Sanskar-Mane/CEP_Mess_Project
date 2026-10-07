import Constants from 'expo-constants';

const getApiUrl = (): string => {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;

    // 1. If a production HTTPS URL is configured, always use it
    if (envUrl && envUrl.startsWith('https://')) {
        return envUrl;
    }

    // 2. In development, automatically detect the computer's live LAN IP from Expo Metro
    const hostUri =
        Constants.expoConfig?.hostUri ||
        (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
        (Constants as any).manifest?.debuggerHost;

    if (hostUri) {
        const lanIp = hostUri.split(':')[0];
        if (lanIp && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
            return `http://${lanIp}:3000`;
        }
    }

    // 3. Fallback to env variable or localhost
    return envUrl || 'http://localhost:3000';
};

export const API_URL = getApiUrl();