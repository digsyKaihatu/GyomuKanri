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

    await showBrowserNotification(title, message);
}

// 予約実行時の通知
export async function triggerReservationNotification(actionName) {
    console.log(`[Notification] triggerReservationNotification called for: ${actionName}`);
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
        showBrowserNotification(title, message);
    }, delay);
}

// 休憩経過時間の通知
export async function triggerBreakNotification(elapsedSeconds) {
    const minutes = Math.floor(elapsedSeconds / 60);
    const title = "休憩中";
    const message = `休憩中…${minutes}分`;
    await showBrowserNotification(title, message);
}

// ブラウザ通知を表示する共通関数
async function showBrowserNotification(title, message) {
    console.log(`[Notification] showBrowserNotification: title="${title}", message="${message}"`);
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
                    console.log("[Notification] Using Service Worker to show notification");
                    await reg.showNotification(title, {
                        body: message,
                        icon: '/icon-192.png',
                        badge: '/icon-192.png',
                        tag: 'reservation-notification',
                        renotify: true
                    });
                    return;
                }
            } catch (swErr) {
                console.warn("[Notification] Service Worker notification failed, falling back to foreground:", swErr);
            }
        }
        createNotification(title, message);
    } else if (permission !== "denied") {
        try {
            permission = await Notification.requestPermission();
            if (permission === "granted") {
                createNotification(title, message);
            }
        } catch (error) {
            console.error("Error requesting notification permission:", error);
        }
    }
}

function createNotification(title, message) {
    console.log(`[Notification] Creating actual notification: ${title}`);
    try {
        const notification = new Notification(title, {
            body: message,
            // tag: "gyomukanri-notification", // ★削除: 上書きを防ぐため削除
            renotify: false, // tagがない場合はfalse推奨（またはtrueでも可）
            silent: false,
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // 自動で閉じる（15秒）
        setTimeout(() => {
            notification.close();
        }, 15000);

    } catch (error) {
        console.error("Error creating notification:", error);
    }
}
