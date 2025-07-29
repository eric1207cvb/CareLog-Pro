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
    let ioChartInstance = null;
    const dom = {
        patientSelector: document.getElementById('patientSelector'),
        newPatientBtn: document.getElementById('newPatientBtn'),
        deletePatientBtn: document.getElementById('deletePatientBtn'),
        exportPdfBtn: document.getElementById('exportPdfBtn'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        printableArea: document.getElementById('printableArea'),
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
        ioChartCanvas: document.getElementById('ioChart'),
    };

    // --- Data Migration Functions (stubs for future use) ---
    function migrateOldData(){/*...*/}
    function migrateMedicationData(){/*...*/}
    function migrateCorruptedDietContent(){/*...*/}
    
    // --- Helper & Logic Functions ---
    function showToast(message) {
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
        }, 3000);
    }
    function triggerHapticFeedback() {
        if (navigator.vibrate) navigator.vibrate(10);
    }
    function initializeState(){ currentRecordState = { dietContent: [], medications: [] }; }
    function saveAllData(){ localStorage.setItem('carelog-all-patients', JSON.stringify(allPatientData)); }
    
    function mergeDataIntoRecord(targetRecord, newData) {
        // 合併所有數值型別的欄位
        ['waterAmount', 'urineOutput', 'bodyTemp', 'pulse', 'respiration', 'bpSystolic', 'bpDiastolic', 'drainage'].forEach(key => {
            const newValue = parseFloat(newData[key]);
            if (!isNaN(newValue)) {
                if (key === 'bodyTemp' && newValue > 0) { // 體溫，有新值就覆蓋
                    targetRecord[key] = newValue;
                } else if (key !== 'bodyTemp') { // 其他數值，累加
                    const oldValue = parseFloat(targetRecord[key]) || 0;
                    targetRecord[key] = oldValue + newValue;
                }
            }
        });
    
        // 合併所有文字型別的欄位 (若有新值則覆蓋)
        ['dietNotes', 'bowelMovement', 'specialObservation'].forEach(key => {
            if (newData[key] && String(newData[key]).trim() !== '') {
                targetRecord[key] = newData[key];
            }
        });
    
        // 合併陣列型別的欄位
        targetRecord.dietContent = Array.from(new Set([...(targetRecord.dietContent || []), ...(newData.dietContent || [])]));
        const newMeds = (newData.medications || []).filter(med => med.name || med.route || med.dosage);
        targetRecord.medications = (targetRecord.medications || []).concat(newMeds);
    
        // 更新時間戳
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
        if (dom.exportPdfBtn) dom.exportPdfBtn.disabled = !isPatientSelected;
    }

    // --- Chart & PDF Functions ---
function processDataForChart(records) {
    const last7DaysData = {};
    const labels = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        const label = date.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
        labels.push(label);
        last7DaysData[key] = { intake: 0, output: 0 };
    }

    (records || []).forEach(record => {
        const recordDateKey = record.time.split('T')[0];
        if (last7DaysData[recordDateKey]) {
            // 計算總攝入量 (目前只有水分)
            last7DaysData[recordDateKey].intake += parseFloat(record.waterAmount) || 0;
            
            // 【關鍵修改】計算總排出量 (排尿量 + 引流管量)
            const urine = parseFloat(record.urineOutput) || 0;
            const drainage = parseFloat(record.drainage) || 0;
            last7DaysData[recordDateKey].output += urine + drainage;
        }
    });

    const intakeData = Object.values(last7DaysData).map(day => day.intake);
    const outputData = Object.values(last7DaysData).map(day => day.output);
    return { labels, intakeData, outputData };
}
function renderChart(patientData, optionsOverrides = {}) {
    if (!dom.ioChartCanvas) return;
    const chartData = processDataForChart(patientData.records);
    if (ioChartInstance) ioChartInstance.destroy();
    const defaultOptions = {
        responsive: true, maintainAspectRatio: false, animation: {},
        scales: { y: { beginAtZero: true, title: { display: true, text: '總量 (ml)' } } },
        plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } }
    };
    const finalOptions = { ...defaultOptions, ...optionsOverrides };
    ioChartInstance = new Chart(dom.ioChartCanvas, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: '總攝入量 (ml)', // Minor update for clarity
                data: chartData.intakeData,
                backgroundColor: 'rgba(0, 123, 255, 0.5)', 
                borderColor: 'rgba(0, 123, 255, 1)', 
                borderWidth: 1
            }, {
                // 【關鍵修改】更新圖例文字
                label: '總排出量 (ml)', 
                data: chartData.outputData,
                backgroundColor: 'rgba(23, 162, 184, 0.5)', 
                borderColor: 'rgba(23, 162, 184, 1)', 
                borderWidth: 1
            }]
        },
        options: finalOptions
    });
}
    function exportPatientDataAsPDF() {
        if (!currentPatientInternalId || typeof html2pdf === 'undefined') {
            console.error("未選擇病人或 html2pdf 函式庫未載入。");
            return;
        }
        const patientData = allPatientData[currentPatientInternalId];
        if (!patientData) return;
        const printableArea = dom.printableArea;
        const chartContainer = printableArea.querySelector('.chart-container');
        const canvas = dom.ioChartCanvas;
        const headerEl = document.createElement('div');
        headerEl.className = 'pdf-header';
        const records = patientData.records || [];
        const chartData = processDataForChart(records);
        const totalIntake = chartData.intakeData.reduce((sum, val) => sum + val, 0);
        const avgIntake = totalIntake > 0 ? (totalIntake / 7).toFixed(0) : 0;
        let tempSum = 0; let tempCount = 0;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        records.filter(r => new Date(r.time) >= sevenDaysAgo && r.bodyTemp).forEach(r => {
            tempSum += parseFloat(r.bodyTemp);
            tempCount++;
        });
        const avgTemp = tempCount > 0 ? (tempSum / tempCount).toFixed(1) : '無紀錄';
        headerEl.innerHTML = `<h2>${patientData.name} - 照護紀錄報告</h2><p>病床號/房號：${patientData.id || '未提供'}</p><p>報告產出日期：${new Date().toLocaleDateString('zh-TW')}</p><div class="pdf-header-summary"><p>近七日日均攝取水量：<strong>${avgIntake} ml</strong></p><p>近七日平均體溫：<strong>${avgTemp} °C</strong></p></div>`;
        printableArea.prepend(headerEl);
        const chartImage = ioChartInstance.toBase64Image();
        const imgElement = document.createElement('img');
        imgElement.src = chartImage;
        imgElement.style.width = '100%';
        imgElement.style.display = 'block';
        imgElement.onload = () => {
            const options = {
                margin: 15,
                filename: `${patientData.name}_照護報告_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().from(printableArea).set(options).save().finally(() => {
                headerEl.remove();
                imgElement.remove();
                canvas.style.display = 'block';
            });
        };
        canvas.style.display = 'none';
        chartContainer.appendChild(imgElement);
        imgElement.onerror = () => {
            console.error("圖表圖片載入失敗，無法生成 PDF。");
            headerEl.remove();
            canvas.style.display = 'block';
            showToast('生成圖表時發生錯誤，無法匯出 PDF。');
        };
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
    }
    function selectPatient(internalId) {
        currentPatientInternalId = internalId;
        clearFormAndState();
        if (internalId) {
            const patientData = allPatientData[internalId];
            dom.patientSelector.value = internalId;
            dom.recordSection.classList.remove('hidden');
            renderTable(patientData);
            renderChart(patientData);
        } else {
            dom.patientSelector.value = "";
            dom.recordSection.classList.add('hidden');
            if (dom.recordsTableBody) dom.recordsTableBody.innerHTML = '';
            if (ioChartInstance) ioChartInstance.destroy();
        }
        dom.patientForm.classList.add('hidden');
        setActiveForm('diet');
        updatePatientActionButtonsState();
    }
    function setActiveForm(formType) {
        document.querySelectorAll('.record-type-btn').forEach(btn => btn.classList.remove('active'));
        dom.allFormSections.forEach(section => section.classList.remove('active'));
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

    // --- DIET UI FUNCTIONS ---
    function renderDietOptionsGrid() {
        dom.dietOptionsGrid.innerHTML = '';
        DIET_OPTIONS.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'diet-option-btn';
            button.textContent = option;
            button.dataset.diet = option;
            dom.dietOptionsGrid.appendChild(button);
        });
    }
    function updateDietSelectionUI() {
        const selectedItems = currentRecordState.dietContent || [];
        dom.dietTagsContainer.innerHTML = "";
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
            dom.dietTagsContainer.appendChild(tag);
        });
        document.querySelectorAll('.diet-option-btn').forEach(btn => {
            btn.classList.toggle('is-selected', selectedItems.includes(btn.dataset.diet));
        });
    }

    function renderMedicationsList() {
        dom.medicationsList.innerHTML = "";
        if (!currentRecordState.medications || currentRecordState.medications.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.textContent = '點擊下方「＋」按鈕來新增用藥項目。';
            placeholder.style.textAlign = 'center';
            placeholder.style.color = 'var(--text-secondary)';
            placeholder.style.padding = '20px 0';
            dom.medicationsList.appendChild(placeholder);
            return;
        }
        currentRecordState.medications.forEach((med, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'medication-entry';
            const routeOptions = MED_ROUTES.map(route => `<option value="${route}" ${med.route === route ? 'selected' : ''}>${route}</option>`).join('');
            entryDiv.innerHTML = `
                <div class="medication-grid">
                    <div class="medication-fields">
                        <input type="text" placeholder="藥品名稱 (如: 脈優)" data-med-index="${index}" data-med-key="name" value="${med.name || ''}">
                        <select data-med-index="${index}" data-med-key="route">${routeOptions}</select>
                        <input type="text" placeholder="劑量/頻率 (如: 1顆/早)" data-med-index="${index}" data-med-key="dosage" value="${med.dosage || ''}">
                    </div>
                    <button type="button" class="med-delete-btn" title="刪除此藥物" data-med-index="${index}">🗑️</button>
                </div>
            `;
            dom.medicationsList.appendChild(entryDiv);
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
            
            row.innerHTML = `
                <td>${timeInfo}</td>
                <td>${dietInfo}</td>
                <td>${dietNotesInfo}</td>
                <td>${waterAmountInfo}</td>
                <td>${vitalsAndOutputInfo.length > 0 ? vitalsAndOutputInfo.join('<br>') : '---'}</td>
                <td>${medInfo}</td>
                <td>${observationInfo}</td>
                <td>${actionsInfo}</td>
            `;
            dom.recordsTableBody.appendChild(row);
        });
    }

    // --- EVENT LISTENERS ---
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
    dom.recordTypeSelector.addEventListener('click', e => { const button = e.target.closest('.record-type-btn'); if (button) setActiveForm(button.dataset.form); });
    
    function handleAddCustomDiet() {
        const customItem = dom.customDietInput.value.trim();
        if (!customItem) return;
        const dietContent = currentRecordState.dietContent || [];
        if (dietContent.length >= 5) { showToast('最多只能新增五項飲食內容。'); return; }
        if (!dietContent.includes(customItem)) {
            dietContent.push(customItem);
            currentRecordState.dietContent = dietContent;
            updateDietSelectionUI();
        }
        dom.customDietInput.value = '';
    }
    dom.addCustomDietBtn.addEventListener('click', handleAddCustomDiet);
    dom.customDietInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomDiet(); } });
    dom.dietOptionsGrid.addEventListener('click', e => {
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
    dom.dietTagsContainer.addEventListener('click', e => {
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

    dom.addMedicationBtn.addEventListener('click', () => { if (!currentRecordState.medications) currentRecordState.medications = []; currentRecordState.medications.push({ name: '', route: '口服', dosage: '' }); renderMedicationsList(); });
    dom.medicationsList.addEventListener('input', e => { if (e.target.matches('[data-med-index]')) { const index = parseInt(e.target.dataset.medIndex, 10); const key = e.target.dataset.medKey; currentRecordState.medications[index][key] = e.target.value; } });
    dom.medicationsList.addEventListener('click', e => { if (e.target.matches('.med-delete-btn')) { const index = parseInt(e.target.dataset.medIndex, 10); currentRecordState.medications.splice(index, 1); renderMedicationsList(); } });
    
    dom.allStatefulInputs.forEach(input => { input.addEventListener('input', e => { const key = e.target.dataset.key; if (key) currentRecordState[key] = e.target.value; }); });
    
    dom.recordForm.addEventListener('submit', e => {
        e.preventDefault();
        if (!currentPatientInternalId) return showToast('請先選擇一位病人！');
        const patientData = allPatientData[currentPatientInternalId];
        const isStateEmpty = Object.values(currentRecordState).every(value => !value || (Array.isArray(value) && value.length === 0));
        if (isStateEmpty) return showToast('表單是空的，沒有可新增的紀錄。');
        
        const currentActiveButton = document.querySelector('.record-type-btn.active');
        const currentFormType = currentActiveButton ? currentActiveButton.dataset.form : 'diet';
        const formSequence = ['diet', 'output', 'med', 'other'];
        const currentIndex = formSequence.indexOf(currentFormType);
        const nextFormType = (currentIndex + 1) % formSequence.length;

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
        renderChart(patientData);
        
        clearFormAndState();
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
            if (patientData) {
                const recordToDelete = patientData.records.find(r => r.id === idToDelete);
                const recordTime = recordToDelete ? new Date(recordToDelete.time).toLocaleString('zh-TW') : '該筆';

                if (confirm(`您確定要刪除這筆於「${recordTime}」的紀錄嗎？`)) {
                    patientData.records = patientData.records.filter(r => r.id !== idToDelete);
                    saveAllData();
                    renderTable(patientData);
                    renderChart(patientData);
                }
            }
        }
    });

    dom.formContent.addEventListener('click', e => {
        const quickAddBtn = e.target.closest('.btn-quick-add');
        if (quickAddBtn) {
            const targetInputId = quickAddBtn.dataset.targetInput;
            const amountToAdd = parseInt(quickAddBtn.dataset.amount, 10);
            const targetInput = document.getElementById(targetInputId);
            if (targetInput && !isNaN(amountToAdd)) {
                targetInput.value = (parseInt(targetInput.value, 10) || 0) + amountToAdd;
                targetInput.dispatchEvent(new Event('input'));
                triggerHapticFeedback();
            }
        }
    });
    
    document.body.addEventListener('click', e => {
        const stepperBtn = e.target.closest('.stepper-btn');
        if (stepperBtn) {
            const targetInput = document.getElementById(stepperBtn.dataset.targetInput);
            if (targetInput) {
                let currentValue = parseFloat(targetInput.value) || 0;
                const baseStep = parseFloat(targetInput.step) || 1;
                const step = e.shiftKey ? (baseStep * 10) : baseStep;
                if (stepperBtn.classList.contains('stepper-up')) {
                    currentValue += step;
                } else if (stepperBtn.classList.contains('stepper-down')) {
                    const min = parseFloat(targetInput.min);
                    currentValue -= step;
                    if (!isNaN(min) && currentValue < min) currentValue = min;
                }
                const decimalPlaces = baseStep.toString().split('.')[1]?.length || 0;
                targetInput.value = currentValue.toFixed(decimalPlaces);
                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                triggerHapticFeedback();
            }
        }
    });

    dom.deletePatientBtn.addEventListener('click', () => { if (!currentPatientInternalId) return; const patientToDelete = allPatientData[currentPatientInternalId]; if (!patientToDelete) return; if (confirm(`您確定要永久刪除病患 「${patientToDelete.name}」 的所有資料嗎？\n\n這個操作無法復原！`)) { delete allPatientData[currentPatientInternalId]; saveAllData(); populatePatientSelector(); selectPatient(null); showToast(`病患 「${patientToDelete.name}」 的資料已成功刪除。`); } });
    
    dom.exportPdfBtn.addEventListener('click', exportPatientDataAsPDF);

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
    migrateOldData();
    migrateMedicationData();
    migrateCorruptedDietContent();
    initializeState();
    populatePatientSelector();
    renderDietOptionsGrid();
    setActiveForm('diet');
    updatePatientActionButtonsState();
});