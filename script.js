document.addEventListener('DOMContentLoaded', () => {
    // --- Constants, State Variables, DOM Elements ---
    const MERGE_WINDOW_MINUTES = 10;
    const DIET_OPTIONS = ["水", "牛奶", "豆漿", "果汁", "茶", "安素", "完膳", "補體素", "早餐", "午餐", "晚餐", "點心", "白飯", "稀飯", "麵食", "水果", "蔬菜", "魚肉", "雞肉", "豬肉", "餅乾"];
    const MED_ROUTES = ['口服', '針劑', '塗抹', '吸入', '外用', '其他'];
    let allPatientData = JSON.parse(localStorage.getItem('carelog-all-patients')) || {};
    let currentPatientInternalId = null;
    let currentRecordState = {};
    let ioChartInstance = null;
    const dom = {
        patientSelector: document.getElementById('patientSelector'),
        newPatientBtn: document.getElementById('newPatientBtn'),
        deletePatientBtn: document.getElementById('deletePatientBtn'),
        exportPdfBtn: document.getElementById('exportPdfBtn'),
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
        dietContentInput: document.getElementById('dietContentInput'),
        dietTagsContainer: document.getElementById('diet-tags-container'),
        dietSuggestions: document.getElementById('diet-suggestions'),
        ioChartCanvas: document.getElementById('ioChart'),
    };

    // --- Data Migration Functions ---
    function migrateOldData(){/*...*/}
    function migrateMedicationData(){/*...*/}
    function migrateCorruptedDietContent(){/*...*/}
    
    // --- Helper & Logic Functions ---
    function initializeState(){ currentRecordState = { dietContent: [], medications: [] }; }
    function saveAllData(){ localStorage.setItem('carelog-all-patients', JSON.stringify(allPatientData)); }
    function mergeDataIntoRecord(targetRecord, newData) {
        ['waterAmount', 'urineOutput'].forEach(key => {
            const oldValue = parseFloat(targetRecord[key]) || 0;
            const newValue = parseFloat(newData[key]) || 0;
            if (newValue > 0) targetRecord[key] = oldValue + newValue;
        });
        ['dietNotes', 'bowelMovement', 'specialObservation', 'bodyTemp'].forEach(key => {
            if (newData[key] && newData[key].trim() !== '') {
                targetRecord[key] = newData[key];
            }
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
                last7DaysData[recordDateKey].intake += parseFloat(record.waterAmount) || 0;
                last7DaysData[recordDateKey].output += parseFloat(record.urineOutput) || 0;
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
                    label: '攝取水量 (ml)', data: chartData.intakeData,
                    backgroundColor: 'rgba(0, 123, 255, 0.5)', borderColor: 'rgba(0, 123, 255, 1)', borderWidth: 1
                }, {
                    label: '總排尿量 (ml)', data: chartData.outputData,
                    backgroundColor: 'rgba(23, 162, 184, 0.5)', borderColor: 'rgba(23, 162, 184, 1)', borderWidth: 1
                }]
            },
            options: finalOptions
        });
    }
    function exportPatientDataAsPDF() {
        if (!currentPatientInternalId || typeof html2pdf === 'undefined') return;
        const patientData = allPatientData[currentPatientInternalId];
        const records = patientData.records || [];
        const printableArea = dom.printableArea;
        const chartData = processDataForChart(records);
        const totalIntake = chartData.intakeData.reduce((sum, val) => sum + val, 0);
        const avgIntake = totalIntake > 0 ? (totalIntake / 7).toFixed(0) : 0;
        let tempSum = 0;
        let tempCount = 0;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        records.filter(r => new Date(r.time) >= sevenDaysAgo && r.bodyTemp).forEach(r => {
            tempSum += parseFloat(r.bodyTemp);
            tempCount++;
        });
        const avgTemp = tempCount > 0 ? (tempSum / tempCount).toFixed(1) : '無紀錄';
        const headerEl = document.createElement('div');
        headerEl.className = 'pdf-header';
        headerEl.innerHTML = `<h2>${patientData.name} - 照護紀錄報告</h2><p>病床號/房號：${patientData.id || '未提供'}</p><p>報告產出日期：${new Date().toLocaleDateString('zh-TW')}</p><div class="pdf-header-summary"><p>近七日日均攝取水量：<strong>${avgIntake} ml</strong></p><p>近七日平均體溫：<strong>${avgTemp} °C</strong></p></div>`;
        printableArea.prepend(headerEl);
        renderChart(patientData, { animation: false });
        setTimeout(() => {
            const options = {
                margin: 15, filename: `${patientData.name}_照護報告_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().from(printableArea).set(options).save().then(() => {
                headerEl.remove();
                renderChart(patientData);
            });
        }, 100);
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
        renderDietTags();
        setActiveForm('diet');
    }
    function renderDietTags() {
        dom.dietTagsContainer.innerHTML = "";
        (currentRecordState.dietContent || []).forEach((item, index) => {
            const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = item;
            const removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.className = 'tag-remove-btn'; removeBtn.textContent = '×'; removeBtn.dataset.index = index;
            tag.appendChild(removeBtn);
            dom.dietTagsContainer.appendChild(tag);
        });
    }
    function renderDietSuggestions(query) {
        dom.dietSuggestions.innerHTML = '';
        if (!query) { dom.dietSuggestions.classList.add('hidden'); return; }
        const filteredOptions = DIET_OPTIONS.filter(option => option.toLowerCase().includes(query.toLowerCase()) && !(currentRecordState.dietContent || []).includes(option));
        if (filteredOptions.length > 0) {
            filteredOptions.forEach(option => {
                const item = document.createElement('div'); item.className = 'suggestion-item'; item.textContent = option;
                item.addEventListener('mousedown', e => {
                    e.preventDefault();
                    if ((currentRecordState.dietContent || []).length < 5) {
                        currentRecordState.dietContent.push(option);
                        renderDietTags(); dom.dietContentInput.value = ''; dom.dietSuggestions.classList.add('hidden');
                    } else { alert('最多只能選擇五項飲食內容。'); }
                });
                dom.dietSuggestions.appendChild(item);
            });
            dom.dietSuggestions.classList.remove('hidden');
        } else { dom.dietSuggestions.classList.add('hidden'); }
    }
    function renderMedicationsList() {
        dom.medicationsList.innerHTML = "";
        if (!currentRecordState.medications || currentRecordState.medications.length === 0) return;
        currentRecordState.medications.forEach((med, index) => {
            const entryDiv = document.createElement('div'); entryDiv.className = 'medication-entry';
            const routeOptions = MED_ROUTES.map(route => `<option value="${route}" ${med.route === route ? 'selected' : ''}>${route}</option>`).join('');
            const selectHTML = `<select data-med-index="${index}" data-med-key="route">${routeOptions}</select>`;
            entryDiv.innerHTML = `<input type="text" placeholder="藥品名稱" data-med-index="${index}" data-med-key="name" value="${med.name || ''}">
                ${selectHTML}
                <input type="text" placeholder="劑量/頻率" data-med-index="${index}" data-med-key="dosage" value="${med.dosage || ''}">
                <button type="button" class="med-delete-btn" data-med-index="${index}">-</button>`;
            dom.medicationsList.appendChild(entryDiv);
        });
    }
    function renderTable(patientData) {
        if (!currentPatientInternalId) return;
        dom.recordsTableBody.innerHTML = '';
        const sortedRecords = (patientData.records || []).slice().sort((a, b) => new Date(b.time) - new Date(a.time));
        if (sortedRecords.length === 0) {
            dom.recordsTableBody.innerHTML = '<tr><td colspan="9">這位病人目前沒有任何紀錄。</td></tr>';
            return;
        }
        sortedRecords.forEach(record => {
            const row = document.createElement('tr');
            const recordDate = new Date(record.time);
            const timeInfo = recordDate.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(' ', '<br>');
            const dietInfo = (Array.isArray(record.dietContent) && record.dietContent.length > 0) ? record.dietContent.join(', ') : '---';
            const dietNotesInfo = record.dietNotes || '---';
            const waterAmountInfo = record.waterAmount || '---';
            const bodyTempInfo = record.bodyTemp ? `${parseFloat(record.bodyTemp).toFixed(1)}` : '---';
            const outputInfo = `${record.urineOutput ? `尿:${record.urineOutput}ml` : ''}${record.bowelMovement ? ` 便:${record.bowelMovement}` : ''}` || '---';
            const medInfo = (record.medications && record.medications.length > 0) ? record.medications.map(med => { if (!med.name && !med.dosage) return ''; return `${med.name || '未命名'} (${med.route || ''}, ${med.dosage || '未註明'})`; }).filter(Boolean).join('<br>') : '---';
            const observationInfo = record.specialObservation || '---';
            const actionsInfo = `<button class="delete-btn" data-id="${record.id}" title="刪除">🗑️</button>`;
            row.innerHTML = `<td>${timeInfo}</td><td>${dietInfo}</td><td>${dietNotesInfo}</td><td>${waterAmountInfo}</td><td>${bodyTempInfo}</td><td>${outputInfo}</td><td>${medInfo}</td><td>${observationInfo}</td><td>${actionsInfo}</td>`;
            dom.recordsTableBody.appendChild(row);
        });
    }

    // --- EVENT LISTENERS ---
    dom.newPatientBtn.addEventListener('click', () => { dom.patientForm.classList.remove('hidden'); dom.patientNameInput.focus(); });
    dom.cancelPatientBtn.addEventListener('click', () => { dom.patientForm.classList.add('hidden'); });
    dom.patientForm.addEventListener('submit', e => { e.preventDefault(); const name = dom.patientNameInput.value.trim(); if (!name) { alert('病人姓名為必填欄位！'); return; } const internalId = `patient_${Date.now()}`; allPatientData[internalId] = { internalId, name: name, id: dom.patientIdInput.value.trim(), records: [] }; saveAllData(); populatePatientSelector(); dom.patientSelector.value = internalId; selectPatient(internalId); dom.patientForm.reset(); });
    dom.patientSelector.addEventListener('change', () => selectPatient(dom.patientSelector.value));
    dom.recordTypeSelector.addEventListener('click', e => { const button = e.target.closest('.record-type-btn'); if (button) setActiveForm(button.dataset.form); });
    dom.dietContentInput.addEventListener('input', () => renderDietSuggestions(dom.dietContentInput.value));
    dom.dietContentInput.addEventListener('focus', () => renderDietSuggestions(dom.dietContentInput.value));
    dom.dietContentInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const customItem = dom.dietContentInput.value.trim(); if (customItem && (currentRecordState.dietContent || []).length < 5) { if (!(currentRecordState.dietContent || []).includes(customItem)) currentRecordState.dietContent.push(customItem); renderDietTags(); dom.dietContentInput.value = ''; dom.dietSuggestions.classList.add('hidden'); } else if ((currentRecordState.dietContent || []).length >= 5) { alert('最多只能新增五項飲食內容。'); } } });
    document.addEventListener('click', e => { if (dom.dietContentInput && !dom.dietContentInput.contains(e.target)) { dom.dietSuggestions.classList.add('hidden'); } });
    dom.dietTagsContainer.addEventListener('click', e => { if (e.target.matches('.tag-remove-btn')) { const index = parseInt(e.target.dataset.index, 10); currentRecordState.dietContent.splice(index, 1); renderDietTags(); } });
    dom.addMedicationBtn.addEventListener('click', () => { if (!currentRecordState.medications) currentRecordState.medications = []; currentRecordState.medications.push({ name: '', route: '口服', dosage: '' }); renderMedicationsList(); });
    dom.medicationsList.addEventListener('input', e => { if (e.target.matches('[data-med-index]')) { const index = parseInt(e.target.dataset.medIndex, 10); const key = e.target.dataset.medKey; currentRecordState.medications[index][key] = e.target.value; } });
    dom.medicationsList.addEventListener('change', e => { if (e.target.matches('select[data-med-index]')) { const index = parseInt(e.target.dataset.medIndex, 10); const key = e.target.dataset.medKey; currentRecordState.medications[index][key] = e.target.value; } });
    dom.medicationsList.addEventListener('click', e => { if (e.target.matches('.med-delete-btn')) { const index = parseInt(e.target.dataset.medIndex, 10); currentRecordState.medications.splice(index, 1); renderMedicationsList(); } });
    dom.allStatefulInputs.forEach(input => { input.addEventListener('input', e => { const key = e.target.dataset.key; const value = e.target.value; if (key) { currentRecordState[key] = value; } }); });
    dom.recordForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!currentPatientInternalId) return alert('請先選擇一位病人！');
    const patientData = allPatientData[currentPatientInternalId];
    const isStateEmpty = Object.values(currentRecordState).every(value => !value || (Array.isArray(value) && value.length === 0));
    if (isStateEmpty) return alert('表單是空的，沒有可新增的紀錄。');
    
    // ▼▼▼【新增的跳轉邏輯】▼▼▼
    // 1. 先找出目前的表單是哪一個
    const currentActiveButton = document.querySelector('.record-type-btn.active');
    const currentFormType = currentActiveButton ? currentActiveButton.dataset.form : 'diet';
    
    // 2. 建立一個表單的順序列表
    const formSequence = ['diet', 'output', 'med', 'other'];
    
    // 3. 計算出下一個表單的索引，如果到最後一個了，就繞回開頭
    const currentIndex = formSequence.indexOf(currentFormType);
    const nextIndex = (currentIndex + 1) % formSequence.length;
    const nextFormType = formSequence[nextIndex];
    // ▲▲▲【新增的跳轉邏輯結束】▲▲▲

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
    
    // ▼▼▼【替換原有的 clearFormAndState()】▼▼▼
    // 我們手動執行清理，並跳轉到計算好的下一個表單
    initializeState();
    dom.recordForm.reset();
    renderMedicationsList();
    renderDietTags();
    setActiveForm(nextFormType); // 使用我們計算出的 nextFormType
    // ▲▲▲【替換結束】▲▲▲

    alert(message);
});
    dom.clearFormBtn.addEventListener('click', () => { if (confirm('確定要清除此筆在表單上的所有內容嗎？')) { clearFormAndState(); } });
    dom.recordsTableBody.addEventListener('click', e => { const deleteButton = e.target.closest('.delete-btn'); if (deleteButton) { const idToDelete = parseInt(deleteButton.dataset.id, 10); const patientData = allPatientData[currentPatientInternalId]; if (patientData && confirm(`您確定要永久刪除病患 「${patientData.name}」 的所有資料嗎？\n\n這個操作無法復原！`)) { const recordIndex = patientData.records.findIndex(r => r.id === idToDelete); if (recordIndex > -1) { patientData.records.splice(recordIndex, 1); saveAllData(); renderTable(patientData); renderChart(patientData); } } } });
    dom.formContent.addEventListener('click', e => { if (e.target.matches('.btn-quick-add')) { const button = e.target; const targetInputId = button.dataset.targetInput; const amountToAdd = parseInt(button.dataset.amount, 10); const targetInput = document.getElementById(targetInputId); if (targetInput && !isNaN(amountToAdd)) { targetInput.value = (parseInt(targetInput.value, 10) || 0) + amountToAdd; targetInput.dispatchEvent(new Event('input')); } } });
    dom.deletePatientBtn.addEventListener('click', () => { if (!currentPatientInternalId) return; const patientToDelete = allPatientData[currentPatientInternalId]; if (!patientToDelete) return; const confirmation = confirm(`您確定要永久刪除病患 「${patientToDelete.name}」 的所有資料嗎？\n\n這個操作無法復原！`); if (confirmation) { delete allPatientData[currentPatientInternalId]; saveAllData(); populatePatientSelector(); selectPatient(null); alert(`病患 「${patientToDelete.name}」 的資料已成功刪除。`); } });
    dom.exportPdfBtn.addEventListener('click', exportPatientDataAsPDF);
    
    // --- Initial Load ---
    migrateOldData();
    migrateMedicationData();
    migrateCorruptedDietContent();
    initializeState();
    populatePatientSelector();
    setActiveForm('diet');
    updatePatientActionButtonsState();
});