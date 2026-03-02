// firebase-messaging-sw.js

// ★最優先で動作させるため、Firebaseの読み込みより前にクリックイベントを定義します
self.addEventListener('notificationclick', function(event) {
    // 帰宅通知かどうかをチェック (isLeaveフラグがなければFirebase等の処理に任せる)
    if (!event.notification.data || !event.notification.data.isLeave) {
        return; 
    }

    event.notification.close(); // 通知を閉じる
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // アプリのタブが既に開いているか探す
            if (clientList.length > 0) {
                // 複数あれば現在フォーカスされているもの、なければ最初のタブを取得
                let client = clientList.find(c => c.focused) || clientList[0];
                
                // タブを一番上（アクティブ）にする
                return client.focus().then(focusedClient => {
                    const targetClient = focusedClient || client;
                    // アプリ側に「セルフチェックを開いて」とメッセージを送る
                    targetClient.postMessage({ action: 'openSelfCheck' });
                });
            }
            
            // アプリのタブが1つも開いていなければ新しく開く
            if (clients.openWindow) {
                return clients.openWindow('/').then(client => {
                    if (client) {
                        // 読み込みを待ってからメッセージを送信
                        setTimeout(() => {
                            client.postMessage({ action: 'openSelfCheck' });
                        }, 2000);
                    }
                });
            }
        })
    );
});

// --- 以降は元のFirebase設定 ---
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js");

const params = new URLSearchParams(self.location.search);
const config = Object.fromEntries(params);

firebase.initializeApp(config);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/512.pngs32.png',
        badge: '/512.pngs32.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
