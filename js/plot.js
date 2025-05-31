// 讀CSV、啟動繪圖function
window.addEventListener('DOMContentLoaded', () => {
    fetch('TOYOTA RAV4.csv')
        .then(response => response.text())
        .then(csvText => {
            const parsed = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true
            });

            const data = parsed.data;
            const priceData = data
                .map(row => parseFloat(row['Price']))
                .filter(val => !isNaN(val));

            const mileageData = data
                .map(row => parseFloat(row['Mileage']))
                .filter(val => !isNaN(val));

            const productionMonthData = data
                .map(row => parseFloat(row['ProductionMonth']))
                .filter(val => !isNaN(val));

            drawHistogram(priceData); // 繪製Price直方圖
            drawBoxPlot(priceData);   // 繪製Price盒鬚圖
            drawScatterPlotC(priceData, mileageData); // 繪製價格與里程數的散佈圖
            drawScatterPlotD(priceData, productionMonthData); // 繪製價格與出廠時間的散佈圖
            drawModelComparisonChart(); // 繪製模型比較圖表
        })
        .catch(error => console.error('載入 CSV 發生錯誤:', error));
});



// A. 價格直方圖
function drawHistogram(priceData) {
    const bins = 10;
    const min = Math.min(...priceData);
    const max = Math.max(...priceData);
    const binWidth = (max - min) / bins;

    const labels = [];
    const counts = new Array(bins).fill(0);

    for (let i = 0; i < bins; i++) {
        const lower = Math.round(min + i * binWidth);
        const upper = Math.round(min + (i + 1) * binWidth);
        labels.push(`${lower} - ${upper}`);
    }

    priceData.forEach(price => {
        let binIndex = Math.floor((price - min) / binWidth);
        if (binIndex === bins) binIndex--;
        counts[binIndex]++;
    });

    const ctx = document.getElementById('priceHistogram').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '筆數',
                data: counts,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '價格區間（萬元）'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '數量'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}



// 計算百分位數的輔助函式
function getQuantile(arr, q) {
  const pos = (arr.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return rest ? arr[base] + rest * (arr[base + 1] - arr[base]) : arr[base];
}

// B. 價格盒鬚圖
function drawBoxPlot(priceArray) {
  // 整理資料
  const sortedPrices = [...priceArray].sort((a, b) => a - b);
  const min = sortedPrices[0];
  const q1 = getQuantile(sortedPrices, 0.25);
  const median = getQuantile(sortedPrices, 0.5);
  const q3 = getQuantile(sortedPrices, 0.75);
  const max = sortedPrices[sortedPrices.length - 1];

  // Box Plot 主圖
  const trace = {
    y: sortedPrices,
    type: 'box',
    boxpoints: false,
    name: '價格',
    marker: { color: 'rgba(93, 164, 214, 0.5)' },
    line: { color: 'rgba(93, 164, 214, 1)' }
  };

  // 註解 scatter trace
  const annotationsTrace = {
    x: Array(5).fill('價格'),
    y: [min, q1, median, q3, max],
    mode: 'text',
    type: 'scatter',
    text: [
      `Min: ${min.toLocaleString()}`,
      `Q1: ${q1.toLocaleString()}`,
      `Median: ${median.toLocaleString()}`,
      `Q3: ${q3.toLocaleString()}`,
      `Max: ${max.toLocaleString()}`
    ],
    textposition: 'right',
    showlegend: false,
    hoverinfo: 'skip',
    textfont: {
      color: 'black',
      size: 12
    }
  };

  // Layout 設定
  const layout = {
    title: 'TOYOTA RAV4 價格盒鬚圖',
    yaxis: {
      title: '價格 (萬元)',
      zeroline: false
    },
    margin: { l: 80, r: 120 }
  };

  // 繪圖
  Plotly.newPlot('priceBoxplot', [trace, annotationsTrace], layout);
}



// 計算線性迴歸
function calculateLinearRegression(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 計算相關係數
    const meanX = sumX / n;
    const meanY = sumY / n;
    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const denominator = Math.sqrt(
        x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0) *
        y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0)
    );
    const r = numerator / denominator;

    return { slope, intercept, r };
}

// C. 繪製價格與里程數的散佈圖
function drawScatterPlotC(priceArray, mileageArray) {
    const ctx = document.getElementById('priceMileageScatter').getContext('2d');

    // 計算迴歸線
    const { slope, intercept, r } = calculateLinearRegression(mileageArray, priceArray);

    // 生成迴歸線的資料點
    const regressionData = mileageArray.map(x => ({
        x: x,
        y: slope * x + intercept
    }));

    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: '價格與里程數關係',
                    data: priceArray.map((price, index) => ({
                        x: mileageArray[index],
                        y: price
                    })),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: `迴歸線 (r = ${r.toFixed(2)})`,
                    data: regressionData,
                    type: 'line',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0 // 線條不平滑
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 1) {
                                return `迴歸線: y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`;
                            }
                            return `(${context.raw.x}, ${context.raw.y})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '里程數 (公里)'
                    },
                    beginAtZero: true
                },
                y: {
                    title: {
                        display: true,
                        text: '價格 (萬元)'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// D. 繪製價格與出廠時間的散佈圖productionMonthData
function drawScatterPlotD(priceArray, productionArray) {
    const ctx = document.getElementById('priceProductionMonthScatter').getContext('2d');

    // 計算迴歸線
    const { slope, intercept, r } = calculateLinearRegression(productionArray, priceArray);

    // 生成迴歸線的資料點
    const regressionData = productionArray.map(x => ({
        x: x,
        y: slope * x + intercept
    }));

    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: '價格與出廠時間關係',
                    data: priceArray.map((price, index) => ({
                        x: productionArray[index],
                        y: price
                    })),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: `迴歸線 (r = ${r.toFixed(2)})`,
                    data: regressionData,
                    type: 'line',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0 // 線條不平滑
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 1) {
                                return `迴歸線: y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`;
                            }
                            return `(${context.raw.x}, ${context.raw.y})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '出廠時間 (月)'
                    },
                    beginAtZero: true
                },
                y: {
                    title: {
                        display: true,
                        text: '價格 (萬元)'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}


// 繪製模型比較圖表
function drawModelComparisonChart() {
    const ctx = document.getElementById('modelComparisonChart').getContext('2d');

    // 模型名稱
    const models = ['Random Forest', 'XGBoost', 'SVR'];

    // 數據
    const rmseData = [8.62, 8.46, 7.92]; // RMSE
    const mseData = [5.98, 6.02, 6.03]; // MSE
    const r2Data = [0.88, 0.88, 0.90];  // R²

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: models, // X 軸標籤為模型名稱
            datasets: [
                {
                    label: 'RMSE 均方根誤差',
                    data: rmseData,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'MSE 平均絕對誤差',
                    data: mseData,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'R² 決定係數',
                    data: r2Data,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '模型'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '數值'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}