// generate-config.js
import fs from 'fs'; // ★修正: require('fs') を import fs from 'fs' に変更

// 環境変数から設定値を埋め込む
const configContent = `
export const firebaseConfig = {
    apiKey: "${process.env.FIREBASE_API_KEY || ''}",
    authDomain: "${process.env.FIREBASE_AUTH_DOMAIN || ''}",
    projectId: "${process.env.FIREBASE_PROJECT_ID || ''}",
    storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET || ''}",
    messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}",
    appId: "${process.env.FIREBASE_APP_ID || ''}",
    measurementId: "${process.env.FIREBASE_MEASUREMENT_ID || ''}"
};

export const oktaConfig = {
    domain: "${process.env.OKTA_DOMAIN || ''}",
    clientId: "${process.env.OKTA_CLIENT_ID || ''}"
};

export const groqConfig = {
    apiKey: "${process.env.GROQ_API_KEY || ''}"
};

export const fcmConfig = {
    vapidKey: "${process.env.VAPID_KEY || ''}" 
};
`;

// ディレクトリがなければ作成
if (!fs.existsSync('./js')) {
    fs.mkdirSync('./js');
}

// ファイル書き込み
try {
    fs.writeFileSync('./js/config.js', configContent);
    console.log('js/config.js has been generated successfully.');
} catch (err) {
    console.error('Error writing js/config.js:', err);
    process.exit(1);
}
