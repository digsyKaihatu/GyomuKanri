// js/components/notification.js

/**
 * 経過時間に基づいて通知をトリガーします。
 * AI機能は使用せず、ローカルストレージから業務名を取得して定型文を表示します。
 * @param {number} elapsedSeconds - 経過秒数
 * @param {string} type - 通知タイプ ('encouragement' | 'breather')
 */
export async function triggerEncouragementNotification(elapsedSeconds, type = 'encouragement') {
    const latestTaskName = localStorage.getItem("currentTask") || "業務";
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);

    let timeString = "";
    if (hours > 0) {
        timeString += `${hours}時間`;
    }
    timeString += `${minutes}分`;

    const message = `【${latestTaskName}】を${timeString}継続しています！`;
    
    let title = "お疲れ様です！";
    if (type === 'breather') {
        title = "そろそろ一息つきませんか？";
    }

    // ★修正: 第3引数に自動で閉じる時間（ミリ秒）を指定 (例: 5000 = 5秒)
    await showBrowserNotification(title, message, 5000);
}

// 予約実行時の通知
export async function triggerReservationNotification(actionName) {
    let title = "予約時間のお知らせ";
    let message = `予約設定で${actionName}しました`;

    if (actionName === "休憩開始") {
        title = "休憩時間になりました";
        message = "自動的に休憩に切り替わりました。ゆっくり休んでください。";
    } else if (actionName === "帰宅") {
        title = "自動帰宅しました";
        message = "本日もお疲れ様でした！";
    } else if (actionName.startsWith("テスト")) {
        title = "通知テスト";
        message = actionName;
    }

    // テストの場合は5秒遅らせる（タブ切り替えの猶予）
    const delay = actionName.startsWith("テスト") ? 5000 : 0;
    setTimeout(() => {
        // ★修正: 予約通知などは少し長め(15秒)あるいはデフォルト動作にするなら時間を渡す
        showBrowserNotification(title, message, 15000);
    }, delay);
}

// 休憩経過時間の通知
export async function triggerBreakNotification(elapsedSeconds) {
    const minutes = Math.floor(elapsedSeconds / 60);
    const title = "休憩中";
    const message = `休憩中…${minutes}分`;
    // ★修正: 休憩経過通知も5秒程度で消えるように設定
    await showBrowserNotification(title, message, 5000);
}

// ブラウザ通知を表示する共通関数
// ★修正: duration 引数を追加 (デフォルト 15000ms)
async function showBrowserNotification(title, message, duration = 15000) {
    if (!("Notification" in window)) {
        console.warn("[Notification] Browser does not support Notification API");
        return;
    }

    let permission = Notification.permission;

    if (permission === "granted") {
        // バックグラウンドタブでも確実に表示されるよう、Service Worker経由の通知を優先する
        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.ready;
                if (reg && reg.showNotification) {
                    
                    const tag = 'reservation-notification';
                    
                    await reg.showNotification(title, {
                        body: message,
                        icon: '/512.pngs32.png',
                        badge: '/512.pngs32.png',
                        tag: tag,
                        renotify: true,
                        // ★修正: すぐ消す場合は requireInteraction を false にする
                        requireInteraction: duration > 10000 
                    });

                    // ★追加: Service Workerの通知を指定時間後に閉じる
                    if (duration > 0) {
                        setTimeout(async () => {
                            try {
                                const notifications = await reg.getNotifications({ tag: tag });
                                for (const notification of notifications) {
                                    notification.close();
                                }
                            } catch (e) {
                                console.error("Failed to close SW notification:", e);
                            }
                        }, duration);
                    }
                    return;
                }
            } catch (swErr) {
                console.warn("[Notification] Service Worker notification failed, falling back to foreground:", swErr);
            }
        }
        createNotification(title, message, duration);
    } else if (permission !== "denied") {
        try {
            permission = await Notification.requestPermission();
            if (permission === "granted") {
                createNotification(title, message, duration);
            }
        } catch (error) {
            console.error("Error requesting notification permission:", error);
        }
    }
}

// ★修正: duration 引数を追加
function createNotification(title, message, duration) {
    try {
        const notification = new Notification(title, {
            body: message,
            // tag: "gyomukanri-notification", 
            renotify: false, 
            silent: false,
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // ★修正: 引数の duration を使用
        if (duration > 0) {
            setTimeout(() => {
                notification.close();
            }, duration);
        }

    } catch (error) {
        console.error("Error creating notification:", error);
    }
}
