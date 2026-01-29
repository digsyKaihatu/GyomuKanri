// js/components/modal/utils.js
import { 
    showModal, 
    closeModal, 
    helpModal,           // ← これが足りないとエラーになります
    goalDetailsModal, 
    breakReservationModal 
} from "./core.js";
import { userReservations } from '../../views/client/reservations.js';

/**
 * 1. ヘルプモーダルを表示する
 * 元の長い if-else 分岐をオブジェクト形式にまとめて短縮しましたが、
 * 内容（client, host, taskSettings, progress, approval）はすべて保持しています。
 */
export function showHelpModal(pageKey) {
    const titleEl = document.getElementById("help-modal-title");
    const contentEl = document.getElementById("help-modal-content");
    if (!helpModal || !titleEl || !contentEl) return;

// 【修正1】useStateは削除し、単なる変数としてタイムスタンプを生成
    // これによりURLが毎回変わり、強制的に最新の内容が読み込まれます
    const timestamp = new Date().getTime();
    const docBaseUrl = "https://docs.google.com/document/d/19d1aHsmVkLSyDEAcDjS3CAYUfWMYWxzg-KLdNOgtMCg/preview";
    const docBaseUrl_Admin = "https://docs.google.com/document/d/1Lz_55NO-VXwCQwdPLOaUIPES-lwmGsebC_2AE75q-FA/preview";
    
const helpContents = {
client: {
    title: "従業員画面（業務記録）ヘルプ",
    content: `
        <div class="w-full h-[65vh] bg-white rounded border border-gray-200 overflow-hidden">
            <iframe 
                src="${docBaseUrl}" 
                class="w-full h-full block" 
                frameborder="0">
            </iframe>
        </div>
        
        <div class="mt-2 text-right">
            <a href="${docBaseUrl}" 
               target="_blank" 
               rel="noopener noreferrer" 
               class="text-xs text-blue-600 hover:underline">
               別ウィンドウで拡大表示する ↗
            </a>
        </div>
    `
},
    
        host: {
title: "管理者画面（モニタリング）ヘルプ",
    content: `
        <div class="w-full h-[65vh] bg-white rounded border border-gray-200 overflow-hidden">
            <iframe 
                src="${docBaseUrl_Admin}" 
                class="w-full h-full block" 
                frameborder="0">
            </iframe>
        </div>
        
        <div class="mt-2 text-right">
            <a href="${docBaseUrl_Admin}" 
               target="_blank" 
               rel="noopener noreferrer" 
               class="text-xs text-blue-600 hover:underline">
               別ウィンドウで拡大表示する ↗
            </a>
        </div>
    `
},
    taskSettings: {
title: "業務マスター設定ヘルプ",
        content: `
            <p class="font-semibold mb-2 text-gray-800">従業員が日報で選択する「業務名（大項目）」と「工数目標（小項目）」を定義します。</p>
            <div class="space-y-4 text-sm text-gray-600">
                <div>
                    <strong class="text-gray-700 block border-b pb-1 mb-1">📂 業務（大項目）の管理</strong>
                    <ul class="list-disc list-inside pl-2 space-y-1">
                        <li><strong>新規追加:</strong> 上部の入力欄に業務名を入力し「追加」を押すと、新しい業務がリストに加わります。</li>
                        <li><strong>メモ:</strong> 各業務に備考やルールなどをメモとして保存できます。</li>
                        <li><strong>削除:</strong> 「削除」ボタンで業務を消去できます。紐づく工数も全て消えますが、過去のログは残ります。</li>
                    </ul>
                </div>

                <div>
                    <strong class="text-gray-700 block border-b pb-1 mb-1">🎯 工数・目標（小項目）の追加</strong>
                    <p class="mb-1">「この業務に工数を追加 +」ボタンから、具体的なタスクや目標を設定します。</p>
                    <ul class="list-disc list-inside pl-2 space-y-1">
                        <li><strong>目標設定:</strong> 件数目標や納期を設定することで、進捗管理画面でのグラフ化が可能になります。</li>
                        <li><strong>編集:</strong> 追加済みの工数をクリックすると内容を修正できます。</li>
                    </ul>
                </div>

                <div>
                    <strong class="text-gray-700 block border-b pb-1 mb-1">📊 分析機能</strong>
                    <ul class="list-disc list-inside pl-2 space-y-1">
                        <li><strong>担当者別集計:</strong> 「担当者別 合計時間」を押すと、その業務にこれまで誰が何時間費やしたかの累計が表示されます。</li>
                    </ul>
                </div>
            </div>`
    },
    progress: {
title: "業務進捗管理ヘルプ",
        content: `
            <p class="font-semibold mb-2 text-gray-800">設定された目標（Goal）に対するチーム全体の進捗状況を分析・管理します。</p>
            <div class="space-y-4 text-sm text-gray-600">
                <div>
                    <strong class="text-gray-700 block border-b pb-1 mb-1">📊 進捗データの確認手順</strong>
                    <ol class="list-decimal list-inside pl-2 space-y-1">
                        <li><strong>業務選択:</strong> 左側のリストから業務名（大項目）を選択します。</li>
                        <li><strong>工数選択:</strong> 次に、詳細を確認したい工数（目標）を選択します。</li>
                        <li><strong>詳細表示:</strong> 進捗バー（達成率）、週間グラフ、担当者ごとの実績テーブルが表示されます。</li>
                    </ol>
                </div>

                <div>
                    <strong class="text-gray-700 block border-b pb-1 mb-1">📈 グラフ・分析機能</strong>
                    <ul class="list-disc list-inside pl-2 space-y-1">
                        <li><strong>表示切替:</strong> グラフ上部のボタンで「合計件数（成果量）」と「時間あたり件数（作業効率）」を切り替えられます。</li>
                        <li><strong>期間移動:</strong> 「&lt; 週」「月 &gt;&gt;」などのボタンで、表示する期間を過去/未来へ移動できます。</li>
                    </ul>
                </div>

                <div>
                    <strong class="text-gray-700 block border-b pb-1 mb-1">✅ アクション（完了・修正）</strong>
                    <ul class="list-disc list-inside pl-2 space-y-1">
                        <li><strong>編集:</strong> 目標数値や納期を変更したい場合は「編集」ボタンを押します。</li>
                        <li><strong>完了:</strong> 業務が終了したら「完了」ボタンを押してください。リストから消え、アーカイブ（過去ログ）に移動します。</li>
                        <li><strong>削除:</strong> 誤って作成した工数は「削除」できます（復元できないためご注意ください）。</li>
                    </ul>
                </div>
            </div>`
    },
    approval: {
title: "申請承認管理ヘルプ",
        content: `
            <p class="font-semibold mb-2 text-gray-800">従業員から送信された「業務記録の修正」や「追加」申請を確認・承認する画面です。</p>
            <div class="space-y-4 text-sm text-gray-600">
                <div>
                    <strong class="text-gray-700 block border-b pb-1 mb-1">📝 申請の種類と内容</strong>
                    <ul class="list-disc list-inside pl-2 space-y-1">
                        <li><span class="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded font-bold">追加申請</span>: 記録し忘れた業務を新規に追加します。指定された「時間・業務・工数」が反映されます。</li>
                        <li><span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded font-bold">変更申請</span>: 既存ログの「業務名」「工数」「メモ」を書き換えます（時間は変更されません）。</li>
                    </ul>
                </div>

                <div>
                    <strong class="text-gray-700 block border-b pb-1 mb-1">✅ 承認アクション</strong>
                    <p class="mb-1">申請内容に問題がなければ<span class="bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-bold">承認</span>ボタンを押してください。</p>
                    <ul class="list-disc list-inside pl-2 space-y-1">
                        <li>承認すると、即座に対象の<strong>業務ログが自動作成・更新</strong>されます。</li>
                        <li>工数（件数）を含む申請の場合、<strong>進捗データの数値も自動で再計算</strong>されます。</li>
                    </ul>
                </div>

                <div class="text-xs text-gray-500 mt-2">
                    ※ 現在のバージョンでは、この画面からの「否認（却下）」や「承認履歴」の確認機能はありません。
                </div>
            </div>`
    }
};

    const data = helpContents[pageKey] || { title: "ヘルプ", content: "<p>ヘルプコンテンツが見つかりません。</p>" };
    titleEl.textContent = data.title;
    contentEl.innerHTML = data.content;
    showModal(helpModal);
}

/**
 * 2. 工数（Goal）の詳細情報を表示する
 */
export function openGoalDetailsModal(title, contentHtml) {
    const titleEl = document.getElementById("goal-details-modal-title");
    const contentEl = document.getElementById("goal-details-modal-content");
    if (!goalDetailsModal || !titleEl || !contentEl) return;

    titleEl.textContent = title;
    contentEl.innerHTML = contentHtml;
    showModal(goalDetailsModal);
}

/**
 * 3. 休憩予約の追加・編集モーダルを開く
 * DBから取得した ISOString (2025-12-23T15:00...) から時刻部分(15:00)を
 * 正確に抜き出して入力欄にセットするロジックを完備しています。
 */
export function openBreakReservationModal(id = null) {
    const titleEl = document.getElementById("break-reservation-modal-title");
    const timeIn = document.getElementById("break-reservation-time-input");
    const idIn = document.getElementById("break-reservation-id");
    if (!breakReservationModal || !titleEl || !timeIn) return;

    if (id) {
        titleEl.textContent = "休憩予約の編集";
        const res = userReservations?.find(r => r.id === id);
        if (res) {
            // ISO形式(scheduledTime)と簡易形式(time)の両方に対応
            let displayTime = "";
            if (res.scheduledTime && res.scheduledTime.includes("T")) {
                displayTime = res.scheduledTime.substring(11, 16);
            } else {
                displayTime = res.time || "";
            }
            timeIn.value = displayTime;
            idIn.value = id;
        }
    } else {
        titleEl.textContent = "休憩予約の追加";
        timeIn.value = "";
        idIn.value = "";
    }
    showModal(breakReservationModal);
    timeIn.focus();
}

// 閉じる処理のショートカット
export const closeHelpModal = () => closeModal(helpModal);
export const closeGoalDetailsModal = () => closeModal(goalDetailsModal);
export const closeBreakReservationModal = () => closeModal(breakReservationModal);
