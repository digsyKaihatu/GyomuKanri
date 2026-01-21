// js/pollingWorker.js
self.onmessage = function(e) {
    if (e.data === 'start') {
        // 30秒ごとにメインスレッドへ合図を送る
        setInterval(() => {
            self.postMessage('tick');
        }, 30000);
    }
};
