document.addEventListener('DOMContentLoaded', () => {
    // --- Constants, State Variables, DOM Elements ---
    const MERGE_WINDOW_MINUTES = 10;
    const DIET_OPTIONS = ["水", "牛奶", "豆漿", "果汁", "茶", "安素", "完膳", "補體素", "早餐", "午餐", "晚餐", "點心", "白飯", "稀飯", "麵食", "水果", "蔬菜", "魚肉", "雞肉", "豬肉", "餅乾"];
    const MED_ROUTES = ['口服', '針劑', '塗抹', '吸入', '外用', '其他'];
    
    let allPatientData;
    try {
        const storedData = localStorage.getItem('carelog-all-patients');
        allPatientData = storedData ? JSON.parse(storedData) : {};
    } catch (error) {
        console.error("讀取 localStorage 資料失敗:", error);
        allPatientData = {};
    }

    let currentPatientInternalId = null;
    let currentRecordState = {};
    let mainChartInstance = null;
    let currentChartType = 'io';

    const dom = {
        patientSelector: document.getElementById('patientSelector'),
        patientSearchInput: document.getElementById('patientSearchInput'),
        newPatientBtn: document.getElementById('newPatientBtn'),
        deletePatientBtn: document.getElementById('deletePatientBtn'),
        printReportBtn: document.getElementById('printReportBtn'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        patientForm: document.getElementById('patientForm'),
        savePatientBtn: document.getElementById('savePatientBtn'),
        cancelPatientBtn: document.getElementById('cancelPatientBtn'),
        patientNameInput: document.getElementById('patientName'),
        patientIdInput: document.getElementById('patientId'),
        recordSection: document.getElementById('recordSection'),
        recordForm: document.getElementById('recordForm'),
        formContent: document.querySelector('.form-content'),
        recordTypeSelector: document.querySelector('.record-type-selector'),
        allFormSections: document.querySelectorAll('.form-section'),
        allStatefulInputs: document.querySelectorAll('.stateful-input'),
        addLogBtn: document.getElementById('addLogBtn'),
        clearFormBtn: document.getElementById('clearFormBtn'),
        recordsTableBody: document.querySelector('#recordsTable tbody'),
        medicationsList: document.getElementById('medications-list'),
        addMedicationBtn: document.getElementById('addMedicationBtn'),
        dietTagsContainer: document.getElementById('diet-tags-container'),
        dietOptionsGrid: document.getElementById('diet-options-grid'),
        customDietInput: document.getElementById('customDietInput'),
        addCustomDietBtn: document.getElementById('addCustomDietBtn'),
        chartControls: document.getElementById('chartControls'),
        mainChartCanvas: document.getElementById('mainChartCanvas'),
        chartTitle: document.getElementById('chartTitle'),
        printChartsContainer: document.getElementById('print-charts-container'),
        reportHeader: document.querySelector('.report-header'),
    };
    
    // --- Helper & Logic Functions ---
    function showToast(message, duration = 3000) {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) existingToast.remove();
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, duration);
    }
    function triggerHapticFeedback() { if (navigator.vibrate) navigator.vibrate(10); }
    function initializeState(){ currentRecordState = { dietContent: [], medications: [] }; }
    function saveAllData(){ localStorage.setItem('carelog-all-patients', JSON.stringify(allPatientData)); }
    
    function mergeDataIntoRecord(targetRecord, newData) {
        ['waterAmount', 'urineOutput', 'bodyTemp', 'pulse', 'respiration', 'bpSystolic', 'bpDiastolic', 'drainage'].forEach(key => {
            const newValue = parseFloat(newData[key]);
            if (!isNaN(newValue)) {
                if (key === 'bodyTemp' && newValue > 0) { targetRecord[key] = newValue;
                } else if (key !== 'bodyTemp') {
                    const oldValue = parseFloat(targetRecord[key]) || 0;
                    targetRecord[key] = oldValue + newValue;
                }
            }
        });
        ['dietNotes', 'bowelMovement', 'specialObservation'].forEach(key => {
            if (newData[key] && String(newData[key]).trim() !== '') { targetRecord[key] = newData[key]; }
        });
        targetRecord.dietContent = Array.from(new Set([...(targetRecord.dietContent || []), ...(newData.dietContent || [])]));
        const newMeds = (newData.medications || []).filter(med => med.name || med.route || med.dosage);
        targetRecord.medications = (targetRecord.medications || []).concat(newMeds);
        targetRecord.time = new Date().toISOString();
    }

    function findMergeableRecord(patientData) {
        if (!patientData || !patientData.records || patientData.records.length === 0) return null;
        const lastRecord = patientData.records[patientData.records.length - 1];
        const now = new Date();
        const lastRecordTime = new Date(lastRecord.time);
        if ((now - lastRecordTime) / 60000 < MERGE_WINDOW_MINUTES) return lastRecord;
        return null;
    }

    function updatePatientActionButtonsState() {
        const isPatientSelected = !!currentPatientInternalId;
        if (dom.deletePatientBtn) dom.deletePatientBtn.disabled = !isPatientSelected;
        if (dom.printReportBtn) dom.printReportBtn.disabled = !isPatientSelected;
    }

    // --- Chart & Print Functions ---
    function getRecentDaysDataStructure() {
        const data = {};
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = date.toISOString().split('T')[0];
            const label = date.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
            labels.push(label);
            data[key] = {};
        }
        return { labels, data };
    }

    function processIODataForChart(records) {
        const { labels, data } = getRecentDaysDataStructure();
        Object.keys(data).forEach(key => { data[key] = { intake: 0, output: 0 }; });
        (records || []).forEach(record => {
            const recordDateKey = record.time.split('T')[0];
            if (data[recordDateKey]) {
                data[recordDateKey].intake += parseFloat(record.waterAmount) || 0;
                const urine = parseFloat(record.urineOutput) || 0;
                const drainage = parseFloat(record.drainage) || 0;
                data[recordDateKey].output += urine + drainage;
            }
        });
        const intakeData = Object.values(data).map(day => day.intake);
        const outputData = Object.values(data).map(day => day.output);
        return { labels, datasets: [ { label: '總攝入量 (ml)', data: intakeData, backgroundColor: 'rgba(0, 123, 255, 0.5)', borderColor: 'rgba(0, 123, 255, 1)', borderWidth: 1 }, { label: '總排出量 (ml)', data: outputData, backgroundColor: 'rgba(23, 162, 184, 0.5)', borderColor: 'rgba(23, 162, 184, 1)', borderWidth: 1 } ] };
    }

    function processSingleVitalDataForChart(records, key, label, color) {
        const { labels, data } = getRecentDaysDataStructure();
        Object.keys(data).forEach(k => { data[k] = null; });
        (records || []).forEach(record => {
            const recordDateKey = record.time.split('T')[0];
            const value = parseFloat(record[key]);
            if (data.hasOwnProperty(recordDateKey) && value > 0) { data[recordDateKey] = value; }
        });
        const vitalData = Object.values(data);
        return { labels, datasets: [{ label, data: vitalData, borderColor: color, backgroundColor: `${color}33`, fill: true, tension: 0.1, spanGaps: false }] };
    }

    function processBPDataForChart(records) {
        const { labels, data } = getRecentDaysDataStructure();
        Object.keys(data).forEach(key => { data[key] = { systolic: null, diastolic: null }; });
        (records || []).forEach(record => {
            const recordDateKey = record.time.split('T')[0];
            if (data.hasOwnProperty(recordDateKey)) {
                if (parseFloat(record.bpSystolic) > 0) data[recordDateKey].systolic = parseFloat(record.bpSystolic);
                if (parseFloat(record.bpDiastolic) > 0) data[recordDateKey].diastolic = parseFloat(record.bpDiastolic);
            }
        });
        const systolicData = Object.values(data).map(d => d.systolic);
        const diastolicData = Object.values(data).map(d => d.diastolic);
        return { labels, datasets: [
            { label: '收縮壓 (mmHg)', data: systolicData, borderColor: 'rgba(220, 53, 69, 1)', backgroundColor: 'rgba(220, 53, 69, 0.2)', fill: false, tension: 0.1 },
            { label: '舒張壓 (mmHg)', data: diastolicData, borderColor: 'rgba(25, 135, 84, 1)', backgroundColor: 'rgba(25, 135, 84, 0.2)', fill: false, tension: 0.1 }
        ]};
    }

    function updateChart(canvas, type, data, options) {
        if (mainChartInstance) { mainChartInstance.destroy(); }
        mainChartInstance = new Chart(canvas, { type, data, options });
    }
    
    function renderCurrentChart() {
        if (!currentPatientInternalId) return;
        const patientData = allPatientData[currentPatientInternalId];
        let chartData, chartType = 'line', chartOptions = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { position: 'top' } } };
        
        switch (currentChartType) {
            case 'io':
                chartData = processIODataForChart(patientData.records);
                chartType = 'bar';
                dom.chartTitle.textContent = '總攝入與總排出量趨勢圖';
                break;
            case 'temp':
                chartData = processSingleVitalDataForChart(patientData.records, 'bodyTemp', '體溫 (°C)', 'rgba(255, 99, 132, 1)');
                dom.chartTitle.textContent = '體溫趨勢圖';
                break;
            case 'pulse':
                chartData = processSingleVitalDataForChart(patientData.records, 'pulse', '脈搏/心率 (次/分)', 'rgba(54, 162, 235, 1)');
                dom.chartTitle.textContent = '脈搏/心率趨勢圖';
                break;
            case 'bp':
                chartData = processBPDataForChart(patientData.records);
                dom.chartTitle.textContent = '血壓趨勢圖';
                break;
        }
        updateChart(dom.mainChartCanvas, chartType, chartData, chartOptions);
    }

    async function prepareChartsForPrinting() {
        if (!currentPatientInternalId) return;
        const patientData = allPatientData[currentPatientInternalId];
        dom.printChartsContainer.innerHTML = '';
        dom.reportHeader.textContent = `${patientData.name} - 照護紀錄總結報告`;

        const chartConfigs = [
            { title: '總量趨勢', type: 'bar', data: processIODataForChart(patientData.records) },
            { title: '體溫趨勢', type: 'line', data: processSingleVitalDataForChart(patientData.records, 'bodyTemp', '體溫 (°C)') },
            { title: '脈搏趨勢', type: 'line', data: processSingleVitalDataForChart(patientData.records, 'pulse', '脈搏/心率') },
            { title: '血壓趨勢', type: 'line', data: processBPDataForChart(patientData.records) }
        ];

        const chartImagePromises = chartConfigs.map(config => {
            return new Promise(resolve => {
                const tempCanvas = document.createElement('canvas');
                // 為了避免 Chart.js 的響應式尺寸問題，我們暫時給它一個固定尺寸
                tempCanvas.width = 400;
                tempCanvas.height = 300;

                const chart = new Chart(tempCanvas, {
                    type: config.type,
                    data: config.data,
                    options: {
                        responsive: false, // 關閉響應式
                        maintainAspectRatio: false,
                        animation: false, // 關閉動畫以立即渲染
                        plugins: {
                            legend: { display: config.type !== 'line' || config.title === '血壓趨勢' }
                        }
                    }
                });

                // Chart.js 渲染需要極短的時間
                setTimeout(() => {
                    const container = document.createElement('div');
                    container.className = 'print-chart-item';
                    const titleEl = document.createElement('h3');
                    titleEl.textContent = config.title;
                    const img = new Image();
                    img.src = chart.toBase64Image();
                    img.style.width = '100%';
                    container.appendChild(titleEl);
container.appendChild(img);
                    resolve(container);
                    chart.destroy();
                }, 100); // 給予 100ms 的渲染緩衝時間
            });
        });
        
        const chartElements = await Promise.all(chartImagePromises);
        dom.printChartsContainer.innerHTML = ''; // 再次清空以防萬一
        chartElements.forEach(el => dom.printChartsContainer.appendChild(el));
    }

    // --- UI RENDERING FUNCTIONS ---
    function populatePatientSelector() {
        const currentSelection = dom.patientSelector.value;
        dom.patientSelector.innerHTML = '<option value="">-- 請選擇或新增病人 --</option>';
        Object.values(allPatientData).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant')).forEach(p => {
            const option = document.createElement('option');
            option.value = p.internalId;
            option.textContent = `${p.name} (${p.id || '無床號'})`;
            dom.patientSelector.appendChild(option);
        });
        if (currentSelection) dom.patientSelector.value = currentSelection;
        if (dom.patientSearchInput) { dom.patientSearchInput.dispatchEvent(new Event('input')); }
    }
    
    function selectPatient(internalId) {
        currentPatientInternalId = internalId;
        // 清理 UI 和狀態
        const formSections = document.querySelectorAll('.form-section');
        formSections.forEach(section => {
            const inputs = section.querySelectorAll('input, textarea');
            inputs.forEach(input => input.value = '');
        });
        initializeState();
        updateDietSelectionUI();
        renderMedicationsList();
    
        if (internalId) {
            dom.patientSelector.value = internalId;
            dom.recordSection.classList.remove('hidden');
            renderTable(allPatientData[internalId]);
            renderCurrentChart();
            prepareChartsForPrinting();
        } else {
            dom.patientSelector.value = "";
            dom.recordSection.classList.add('hidden');
            if (dom.recordsTableBody) dom.recordsTableBody.innerHTML = '';
            if (mainChartInstance) mainChartInstance.destroy();
            dom.reportHeader.textContent = '';
            dom.printChartsContainer.innerHTML = '';
        }
        dom.patientForm.classList.add('hidden');
        setActiveForm('diet');
        updatePatientActionButtonsState();
    }

    function setActiveForm(formType) {
        document.querySelectorAll('.record-type-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.form-section').forEach(section => section.classList.remove('active'));
        const activeButton = document.querySelector(`.record-type-btn[data-form="${formType}"]`);
        const activeSection = document.getElementById(`${formType}-fields`);
        if (activeButton) activeButton.classList.add('active');
        if (activeSection) activeSection.classList.add('active');
    }

    function clearFormAndState() {
        initializeState();
        dom.recordForm.reset();
        renderMedicationsList();
        updateDietSelectionUI();
    }
    
    function renderDietOptionsGrid() {
        const dietOptionsGrid = document.getElementById('diet-options-grid');
        dietOptionsGrid.innerHTML = '';
        DIET_OPTIONS.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'diet-option-btn';
            button.textContent = option;
            button.dataset.diet = option;
            dietOptionsGrid.appendChild(button);
        });
    }

    function updateDietSelectionUI() {
        const dietTagsContainer = document.getElementById('diet-tags-container');
        const selectedItems = currentRecordState.dietContent || [];
        dietTagsContainer.innerHTML = "";
        selectedItems.forEach(item => {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = item;
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'tag-remove-btn';
            removeBtn.textContent = '×';
            removeBtn.dataset.diet = item;
            tag.appendChild(removeBtn);
            dietTagsContainer.appendChild(tag);
        });
        document.querySelectorAll('.diet-option-btn').forEach(btn => {
            btn.classList.toggle('is-selected', selectedItems.includes(btn.dataset.diet));
        });
    }
    
    function renderMedicationsList() {
        const medicationsList = document.getElementById('medications-list');
        medicationsList.innerHTML = "";
        if (!currentRecordState.medications || currentRecordState.medications.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.textContent = '點擊下方「＋」按鈕來新增用藥項目。';
            placeholder.style.textAlign = 'center';
            placeholder.style.color = 'var(--text-secondary)';
            placeholder.style.padding = '20px 0';
            medicationsList.appendChild(placeholder);
            return;
        }
        currentRecordState.medications.forEach((med, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'medication-entry';
            const routeOptions = MED_ROUTES.map(route => `<option value="${route}" ${med.route === route ? 'selected' : ''}>${route}</option>`).join('');
            entryDiv.innerHTML = `<div class="medication-grid"><div class.medication-fields"><input type="text" placeholder="藥品名稱" data-med-index="${index}" data-med-key="name" value="${med.name || ''}"><select data-med-index="${index}" data-med-key="route">${routeOptions}</select><input type="text" placeholder="劑量/頻率" data-med-index="${index}" data-med-key="dosage" value="${med.dosage || ''}"></div><button type="button" class="med-delete-btn" title="刪除此藥物" data-med-index="${index}">🗑️</button></div>`;
            medicationsList.appendChild(entryDiv);
        });
    }

    function renderTable(patientData) {
        if (!currentPatientInternalId) return;
        const tableHead = document.querySelector('#recordsTable thead tr');
        tableHead.innerHTML = `<th>時間</th><th>飲食</th><th>附註描述</th><th>水分(ml)</th><th>生命徵象與排泄</th><th>用藥</th><th>特殊觀察</th><th>操作</th>`;
        dom.recordsTableBody.innerHTML = '';
        const sortedRecords = (patientData.records || []).slice().sort((a, b) => new Date(b.time) - new Date(a.time));
        if (sortedRecords.length === 0) {
            dom.recordsTableBody.innerHTML = `<tr><td colspan="8">這位病人目前沒有任何紀錄。</td></tr>`;
            return;
        }
        sortedRecords.forEach(record => {
            const row = document.createElement('tr');
            const recordDate = new Date(record.time);
            const timeInfo = recordDate.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(' ', '<br>');
            let vitalsAndOutputInfo = [];
            if (record.bodyTemp) vitalsAndOutputInfo.push(`體溫: ${parseFloat(record.bodyTemp).toFixed(1)}°C`);
            if (record.pulse) vitalsAndOutputInfo.push(`心率: ${record.pulse}`);
            if (record.respiration) vitalsAndOutputInfo.push(`呼吸: ${record.respiration}`);
            if (record.bpSystolic && record.bpDiastolic) vitalsAndOutputInfo.push(`血壓: ${record.bpSystolic}/${record.bpDiastolic}`);
            if (record.urineOutput) vitalsAndOutputInfo.push(`排尿: ${record.urineOutput}ml`);
            if (record.drainage) vitalsAndOutputInfo.push(`引流: ${record.drainage}ml`);
            if (record.bowelMovement) vitalsAndOutputInfo.push(`排便: ${record.bowelMovement}`);
            const dietInfo = (Array.isArray(record.dietContent) && record.dietContent.length > 0) ? record.dietContent.join(', ') : '---';
            const dietNotesInfo = record.dietNotes || '---';
            const waterAmountInfo = record.waterAmount || '---';
            const medInfo = (record.medications && record.medications.length > 0) ? record.medications.map(med => `${med.name || '未命名'} (${med.dosage || '未註明'})`).join('<br>') : '---';
            const observationInfo = record.specialObservation || '---';
            const actionsInfo = `<button class="delete-btn" data-id="${record.id}" title="刪除">🗑️</button>`;
            row.innerHTML = `<td>${timeInfo}</td><td>${dietInfo}</td><td>${dietNotesInfo}</td><td>${waterAmountInfo}</td><td>${vitalsAndOutputInfo.length > 0 ? vitalsAndOutputInfo.join('<br>') : '---'}</td><td>${medInfo}</td><td>${observationInfo}</td><td>${actionsInfo}</td>`;
            dom.recordsTableBody.appendChild(row);
        });
    }

    // --- EVENT LISTENERS ---
    dom.printReportBtn.addEventListener('click', () => {
        if (!currentPatientInternalId) return;
        // 列印前最後一次確保圖表是最新的
        prepareChartsForPrinting().then(() => {
            window.print();
        });
    });

    dom.patientSearchInput.addEventListener('input', e => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const options = dom.patientSelector.options;
        for (let i = 1; i < options.length; i++) {
            const option = options[i];
            const optionText = option.textContent.toLowerCase();
            if (optionText.includes(searchTerm)) { option.style.display = ''; } else { option.style.display = 'none'; }
        }
    });

    dom.newPatientBtn.addEventListener('click', () => { dom.patientForm.classList.remove('hidden'); dom.patientNameInput.focus(); });
    dom.cancelPatientBtn.addEventListener('click', () => { dom.patientForm.classList.add('hidden'); });
    dom.patientForm.addEventListener('submit', e => {
        e.preventDefault();
        const name = dom.patientNameInput.value.trim();
        if (!name) { showToast('病人姓名為必填欄位！'); return; }
        const originalButtonText = dom.savePatientBtn.innerHTML;
        dom.savePatientBtn.disabled = true;
        dom.savePatientBtn.innerHTML = `<span class="spinner"></span>儲存中...`;
        setTimeout(() => {
            const internalId = `patient_${Date.now()}`;
            allPatientData[internalId] = { internalId, name: name, id: dom.patientIdInput.value.trim(), records: [] };
            saveAllData();
            populatePatientSelector();
            dom.patientSelector.value = internalId;
            selectPatient(internalId);
            dom.patientForm.reset();
            dom.savePatientBtn.disabled = false;
            dom.savePatientBtn.innerHTML = originalButtonText;
            showToast(`病人「${name}」已成功新增！`);
            triggerHapticFeedback();
        }, 500);
    });

    dom.patientSelector.addEventListener('change', () => selectPatient(dom.patientSelector.value));
    
    dom.recordTypeSelector.addEventListener('click', e => {
        const button = e.target.closest('.record-type-btn');
        if (button) setActiveForm(button.dataset.form);
    });
    
    dom.chartControls.addEventListener('click', e => {
        const button = e.target.closest('.chart-type-btn');
        if (button && !button.classList.contains('active')) {
            currentChartType = button.dataset.chart;
            dom.chartControls.querySelector('.active').classList.remove('active');
            button.classList.add('active');
            renderCurrentChart();
            triggerHapticFeedback();
        }
    });

    function handleAddCustomDiet() {
        const customDietInput = document.getElementById('customDietInput');
        const customItem = customDietInput.value.trim();
        if (!customItem) return;
        const dietContent = currentRecordState.dietContent || [];
        if (dietContent.length >= 5) { showToast('最多只能新增五項飲食內容。'); return; }
        if (!dietContent.includes(customItem)) {
            dietContent.push(customItem);
            currentRecordState.dietContent = dietContent;
            updateDietSelectionUI();
        }
        customDietInput.value = '';
    }

    document.getElementById('addCustomDietBtn').addEventListener('click', handleAddCustomDiet);
    document.getElementById('customDietInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomDiet(); } });
    
    document.getElementById('diet-options-grid').addEventListener('click', e => {
        const target = e.target;
        if (target.matches('.diet-option-btn')) {
            const item = target.dataset.diet;
            const dietContent = currentRecordState.dietContent || [];
            const itemIndex = dietContent.indexOf(item);
            if (itemIndex > -1) {
                dietContent.splice(itemIndex, 1);
            } else {
                if (dietContent.length >= 5) { showToast('最多只能選擇五項飲食內容。'); return; }
                dietContent.push(item);
            }
            currentRecordState.dietContent = dietContent;
            updateDietSelectionUI();
        }
    });

    document.getElementById('diet-tags-container').addEventListener('click', e => {
        const target = e.target.closest('.tag-remove-btn');
        if (target) {
            const item = target.dataset.diet;
            const dietContent = currentRecordState.dietContent || [];
            const itemIndex = dietContent.indexOf(item);
            if(itemIndex > -1) {
                dietContent.splice(itemIndex, 1);
                currentRecordState.dietContent = dietContent;
                updateDietSelectionUI();
            }
        }
    });

    dom.medicationsList.addEventListener('input', e => { if (e.target.matches('[data-med-index]')) { const index = parseInt(e.target.dataset.medIndex, 10); const key = e.target.dataset.medKey; currentRecordState.medications[index][key] = e.target.value; } });
    dom.medicationsList.addEventListener('click', e => { if (e.target.matches('.med-delete-btn')) { const index = parseInt(e.target.dataset.medIndex, 10); currentRecordState.medications.splice(index, 1); renderMedicationsList(); } });
    document.getElementById('addMedicationBtn').addEventListener('click', () => { if (!currentRecordState.medications) currentRecordState.medications = []; currentRecordState.medications.push({ name: '', route: '口服', dosage: '' }); renderMedicationsList(); });

    dom.allStatefulInputs.forEach(input => { input.addEventListener('input', e => { const key = e.target.dataset.key; if (key) currentRecordState[key] = e.target.value; }); });

    dom.recordForm.addEventListener('submit', e => {
        e.preventDefault();
        if (!currentPatientInternalId) return showToast('請先選擇一位病人！');
        const patientData = allPatientData[currentPatientInternalId];
        const isStateEmpty = Object.values(currentRecordState).every(value => !value || (Array.isArray(value) && value.length === 0));
        if (isStateEmpty) return showToast('表單是空的，沒有可新增的紀錄。');
        
        const mergeableRecord = findMergeableRecord(patientData);
        let message = '';
        if (mergeableRecord) {
            mergeDataIntoRecord(mergeableRecord, currentRecordState);
            message = '紀錄已成功合併！';
        } else {
            const newRecord = { ...currentRecordState, id: Date.now(), time: new Date().toISOString() };
            patientData.records.push(newRecord);
            message = '已新增紀錄！';
        }
        saveAllData();
        renderTable(patientData);
        renderCurrentChart();
        prepareChartsForPrinting();
        clearFormAndState();
        
        const currentActiveButton = document.querySelector('.record-type-btn.active');
        const currentFormType = currentActiveButton ? currentActiveButton.dataset.form : 'diet';
        const formSequence = ['diet', 'output', 'med', 'other'];
        const currentIndex = formSequence.indexOf(currentFormType);
        const nextFormType = formSequence[(currentIndex + 1) % formSequence.length];
        setActiveForm(nextFormType);

        showToast(message);
        triggerHapticFeedback();
    });

    dom.clearFormBtn.addEventListener('click', () => { if (confirm('確定要清除此筆在表單上的所有內容嗎？')) { clearFormAndState(); setActiveForm('diet'); } });

    dom.recordsTableBody.addEventListener('click', e => {
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            const idToDelete = parseInt(deleteButton.dataset.id, 10);
            const patientData = allPatientData[currentPatientInternalId];
            if (patientData && confirm(`您確定要刪除這筆紀錄嗎？`)) {
                patientData.records = patientData.records.filter(r => r.id !== idToDelete);
                saveAllData();
                renderTable(patientData);
                renderCurrentChart();
                prepareChartsForPrinting();
            }
        }
    });

    document.body.addEventListener('click', e => {
        const quickAddBtn = e.target.closest('.btn-quick-add');
        if (quickAddBtn) {
            const targetInputId = quickAddBtn.dataset.targetInput;
            const amountToAdd = parseInt(quickAddBtn.dataset.amount, 10);
            const targetInput = document.getElementById(targetInputId);
            if (targetInput && !isNaN(amountToAdd)) {
                targetInput.value = (parseInt(targetInput.value, 10) || 0) + amountToAdd;
                targetInput.dispatchEvent(new Event('input'));
            }
        }
        
        const stepperBtn = e.target.closest('.stepper-btn');
        if (stepperBtn) {
            const targetInput = document.getElementById(stepperBtn.dataset.targetInput);
            if (targetInput) {
                let currentValue = parseFloat(targetInput.value) || 0;
                const step = parseFloat(targetInput.step) || 1;
                if (stepperBtn.classList.contains('stepper-up')) {
                    currentValue += step;
                } else {
                    currentValue = Math.max(0, currentValue - step);
                }
                targetInput.value = currentValue;
                targetInput.dispatchEvent(new Event('input'));
            }
        }
    });

    dom.deletePatientBtn.addEventListener('click', () => {
        if (!currentPatientInternalId) return;
        const patientName = allPatientData[currentPatientInternalId].name;
        if (confirm(`確定要永久刪除病患 "${patientName}" 的所有資料嗎？此操作無法復原。`)) {
            delete allPatientData[currentPatientInternalId];
            saveAllData();
            populatePatientSelector();
            selectPatient(null);
        }
    });

    dom.themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        triggerHapticFeedback();
    });
    
    // --- Initial Load ---
    initializeState();
    populatePatientSelector();
    renderDietOptionsGrid();
    setActiveForm('diet');
    updatePatientActionButtonsState();
});