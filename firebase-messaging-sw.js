// ★ESMのimportではなく、importScriptsを使用
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js");

// ★URLパラメータから設定値を取り出す
const params = new URLSearchParams(self.location.search);
const config = Object.fromEntries(params);

// Firebase初期化 (compat版なので firebase.initializeApp を使う)
firebase.initializeApp(config);

const messaging = firebase.messaging();

// バックグラウンド通知ハンドラ
messaging.onBackgroundMessage((payload) => {
    
    // 通知の表示
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/512.pngs32.png',
        badge: '/512.pngs32.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// ★追加：通知がクリックされた時の処理
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // 通知を閉じる
    
    // 通知作成時に渡した isLeave フラグを受け取る
    const isLeave = event.notification.data && event.notification.data.isLeave;
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // 既に開いているアプリのタブを探す
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    client.focus(); // タブを一番上にする
                    
                    if (isLeave) {
                        // アプリ側にボタンを押すようメッセージを送信
                        client.postMessage({ action: 'openSelfCheck' });
                    }
                    return;
                }
            }
            // タブが開いていなければ新しく開く
            if (clients.openWindow) {
                return clients.openWindow('/').then(client => {
                    if (client && isLeave) {
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
