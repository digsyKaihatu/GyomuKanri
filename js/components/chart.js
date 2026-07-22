// js/components/chart.js - Chart.jsによるグラフ描画関連

import { formatHoursMinutes } from "../utils.js"; 

// ★追加: Chart.js とプラグインを動的にロードする関数
async function ensureChartLibrariesLoaded() {
    if (typeof Chart === "undefined") {
        // Chart.js本体の読み込み
        await import("https://cdn.jsdelivr.net/npm/chart.js");
    }
    if (typeof ChartDataLabels === "undefined") {
        // プラグインの読み込み
        await import("https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js");
    }
}

export async function createPieChart(ctx, data, colorMap, showLegend = true) {
    if (!ctx || !data || typeof data !== 'object') {
        console.error("Invalid arguments provided to createPieChart.");
        return null;
    }

    // ★追加: 呼び出されたタイミングでライブラリの存在を保証する
    await ensureChartLibrariesLoaded();

    const sortedData = Object.entries(data)
        .filter(([, value]) => value > 0)
        .sort(([, a], [, b]) => b - a); 

    if (sortedData.length === 0) {
        return null; 
    }

    const labels = sortedData.map(([key]) => key); 
    const values = sortedData.map(([, value]) => value); 
    const backgroundColors = labels.map(
        (label) => colorMap[label] || generateRandomColor() 
    );

    try {
        const chart = new Chart(ctx, {
            type: "pie",
            data: {
                labels: labels,
                datasets: [
                    {
                        data: values,
                        backgroundColor: backgroundColors,
                        borderColor: '#ffffff', 
                        borderWidth: 1 
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, 
                plugins: {
                    legend: {
                        display: showLegend, 
                        position: 'top', 
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.label || "";
                                if (label) {
                                    label += ": ";
                                }
                                if (context.parsed !== null) {
                                    label += formatHoursMinutes(context.parsed);
                                }
                                return label;
                            },
                        },
                    },
                    datalabels: {
                        formatter: (value, ctx) => {
                            if (!showLegend) {
                                const total = ctx.chart.getDatasetMeta(0).total;
                                const percentage = total > 0 ? (value / total) * 100 : 0;
                                const displayThreshold = 10;
                                if (percentage < displayThreshold) {
                                    return null; 
                                }

                                const label = ctx.chart.data.labels[ctx.dataIndex];
                                const maxLength = 6; 
                                const lines = [];
                                if (label) {
                                    for (let i = 0; i < label.length; i += maxLength) {
                                        lines.push(label.substring(i, i + maxLength));
                                    }
                                }
                                return lines; 
                            }
                            return null; 
                        },
                        color: '#333', 
                        anchor: 'end', 
                        align: 'end', 
                        offset: -10, 
                        font: {
                            size: 10, 
                        },
                    },
                },
            },
            plugins: [ChartDataLabels],
        });
        return chart;
    } catch (error) {
        console.error("Error creating pie chart:", error);
        return null;
    }
}

// ★ 第7引数に interactionMode = 'index' を追加
export async function createLineChart(ctx, labels, datasets, titleText = "グラフ", yAxisTitle = "値", targetLegendLabel = null, interactionMode = 'index') {
    if (!ctx || !Array.isArray(labels) || !Array.isArray(datasets)) {
        console.error("Invalid arguments provided to createLineChart.");
        return null;
    }

    await ensureChartLibrariesLoaded();

    if (datasets.length === 0 || datasets.every(ds => ds.data.length === 0)) {
         ctx.font = "16px sans-serif";
         ctx.textAlign = "center";
         ctx.fillText("データがありません", ctx.canvas.width / 2, ctx.canvas.height / 2);
         return null;
    }

    try {
        const chart = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: datasets, 
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, 
                // ★修正: 引数によってマウスオーバーの判定モードを動的に変更する
                interaction: { 
                    mode: interactionMode, 
                    intersect: interactionMode === 'index' ? false : true, // nearest等の時は線上でのみ反応させる
                },
                plugins: {
                    legend: {
                        position: 'top', 
                        labels: {
                             boxWidth: 12,
                             padding: 15,
                             filter: function(legendItem, chartData) {
                                 if (!targetLegendLabel) return true;
                                 return legendItem.text === targetLegendLabel;
                             }
                        }
                    },
                    // ★追加・修正: ツールチップ（マウスオーバー時の説明窓）のカスタマイズ
                    tooltip: {
                        enabled: true,
                        padding: 6,         // 窓の内側の余白を狭くしてコンパクトに
                        bodySpacing: 3,     // 行間を詰める
                        titleFont: { size: 11, weight: 'bold' }, // 日付の文字サイズ
                        bodyFont: { size: 11 },                  // 名前の文字サイズ
                        boxWidth: 8,        // カラーボックスのサイズを縮小
                        boxHeight: 8,
                        
                        // ★重要: 表示するデータを絞り込むフィルターロジック
                        filter: function(tooltipItem) {
                            const value = tooltipItem.raw; // その日の件数
                            const datasetLabel = tooltipItem.dataset.label; // メンバー名
                            
                            // 1. 自分自身のデータであれば、0件であっても必ず表示する
                            if (targetLegendLabel && datasetLabel === targetLegendLabel) {
                                return true;
                            }
                            
                            // 2. 他のメンバーは、1件以上書き込みがある（0より大きい）場合のみ表示する
                            return value > 0;
                        }
                    },
                    title: {
                        display: true, 
                        text: titleText, 
                        font: { size: 16 }
                    },
                    datalabels: {
                         display: false
                    }
                },
                scales: {
                    x: { 
                        display: true,
                        grid: {
                             display: false 
                        }
                    },
                    y: { 
                        display: true,
                        beginAtZero: true, 
                        title: {
                            display: true, 
                            text: yAxisTitle, 
                        },
                        grid: {
                             color: '#e2e8f0' 
                        }
                    },
                },
            },
        });
        return chart;
    } catch (error) {
        console.error("Error creating line chart:", error);
        return null;
    }
}

export function destroyCharts(chartInstances) {
    if (!Array.isArray(chartInstances)) return;
    chartInstances.forEach((chart) => {
        if (chart && typeof chart.destroy === 'function') {
            try {
                chart.destroy();
            } catch (error) {
                console.error("Error destroying chart instance:", error, chart);
            }
        }
    });
}

function generateRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70; 
    const lightness = 60; 
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// ★追加部分
// ★修正・改善された renderChart 関数
export async function renderChart(canvas, labels, dataPoints, title) {
    if (!canvas) return;
    
    // ★追加
    await ensureChartLibrariesLoaded();
    const ctx = canvas.getContext('2d');
    
    // 💡 視認性が高く、お互いに明確に区別できる美しい固定カラーパレット
    // シェアの大きい上位業務から順番にこの色が確定で割り当てられます
    const presetColors = [
        '#3b82f6', // 青 (Blue)
        '#f97316', // オレンジ (Orange)
        '#10b981', // 緑 (Emerald)
        '#a855f7', // 紫 (Purple)
        '#ef4444', // 赤 (Red)
        '#06b6d4', // 水色 (Cyan)
        '#eab308', // 黄色 (Yellow)
        '#ec4899', // ピンク (Pink)
        '#6366f1', // インディゴ (Indigo)
        '#14b8a6', // ティール (Teal)
        '#84cc16', // ライム (Lime)
        '#f43f5e', // ローズ (Rose)
        '#64748b'  // スレート/グレー (Slate)
    ];

    // 業務の数（ラベルの数）だけ背景色を生成
    const backgroundColors = labels.map((_, index) => {
        // 1. プリセットパレットの範囲内であれば、定義された明確に違う色を順番に使う
        if (index < presetColors.length) {
            return presetColors[index];
        }
        
        // 2. 万が一業務数がパレット（13色）を超えるほど多い場合は、
        // 黄金比（0.618033...）を用いて、色相環上で隣り合わない（最も離れた）色を自動計算
        const goldenRatioConjugate = 0.618033988749895;
        const h = (index * goldenRatioConjugate) % 1;
        const hue = Math.floor(h * 360);
        
        return `hsl(${hue}, 70%, 58%)`; // 鮮やかで見やすいトーンを維持
    });

    return new Chart(ctx, {
        type: 'doughnut', 
        data: {
            labels: labels,
            datasets: [{
                data: dataPoints,
                backgroundColor: backgroundColors, // 💡 生成した被らないカラー配列を適用
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: false, 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed + ' 時間';
                            }
                            return label;
                        }
                    }
                },
                datalabels: {
                    display: false
                }
            }
        }
    });
}
