// js/fcm.js

// ★修正: onMessage が足りていなかったので追加
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js";
import { app, db, auth } from "./firebase.js";
import { doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// ★修正: firebaseConfig をインポート
import { fcmConfig, firebaseConfig } from "./config.js";

const messaging = getMessaging(app);
const VAPID_KEY = fcmConfig.vapidKey;

export async function initMessaging(passedUserId) {

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn("通知権限が許可されませんでした");
            return;
        }

        let registration;
        if ('serviceWorker' in navigator) {
            // ここで firebaseConfig を使用するため、インポートが必須でした
            const params = new URLSearchParams(firebaseConfig).toString();
            const swUrl = `/firebase-messaging-sw.js?${params}`;
            registration = await navigator.serviceWorker.register(swUrl);
        }

        const token = await getToken(messaging, { 
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration 
        });
        
        if (token) {

            const saveTokenToFirestore = async (uid) => {
                const userRef = doc(db, "user_profiles", uid);
                // フィールドの上書きではなく、配列への追加 (arrayUnion)
                await updateDoc(userRef, {
                    fcmTokens: arrayUnion(token)
                });
            };

            if (passedUserId) {
                await saveTokenToFirestore(passedUserId);
            } else if (auth.currentUser) {
                await saveTokenToFirestore(auth.currentUser.uid);
            } else {
                auth.onAuthStateChanged(async (user) => {
                    if (user) await saveTokenToFirestore(user.uid);
                });
            }
        }
    } catch (error) {
        console.error('FCM初期化中にエラーが発生しました:', error);
    }
}

export function listenForMessages() {
    onMessage(messaging, (payload) => {

        // ★追加: Workerからの通知かを判定
        if (payload.data && payload.data.source === 'worker') {
            // カスタムイベントを発火させて host.js に処理を依頼
            document.dispatchEvent(new CustomEvent('force-fetch-status'));
        }

        const { title, body } = payload.notification;
        
        // ブラウザ通知を表示
        new Notification(title, { 
            body: body,
            icon: "/512.png" 
        });
    });
}
