document.addEventListener('DOMContentLoaded', () => {
    let allPatientData = JSON.parse(localStorage.getItem('carelog-all-patients')) || {};
    let currentPatientInternalId = null;
    let currentRecordState = {};

    const MERGE_WINDOW_MINUTES = 10;
    const DIET_OPTIONS = ["水", "牛奶", "豆漿", "果汁", "茶", "安素", "完膳", "補體素", "早餐", "午餐", "晚餐", "點心", "白飯", "稀飯", "麵食", "水果", "蔬菜", "魚肉", "雞肉", "豬肉", "餅乾"];

    const dom = {
        patientSelector: document.getElementById('patientSelector'),
        newPatientBtn: document.getElementById('newPatientBtn'),
        patientForm: document.getElementById('patientForm'),
        savePatientBtn: document.getElementById('savePatientBtn'),
        cancelPatientBtn: document.getElementById('cancelPatientBtn'),
        patientNameInput: document.getElementById('patientName'),
        patientIdInput: document.getElementById('patientId'),
        recordSection: document.getElementById('recordSection'),
        recordTypeSelector: document.querySelector('.record-type-selector'),
        allFormSections: document.querySelectorAll('.form-section'),
        allStatefulInputs: document.querySelectorAll('.stateful-input'),
        addLogBtn: document.getElementById('addLogBtn'),
        clearFormBtn: document.getElementById('clearFormBtn'),
        recordsTableBody: document.querySelector('#recordsTable'),
        medicationsList: document.getElementById('medications-list'),
        addMedicationBtn: document.getElementById('addMedicationBtn'),
        dietContentInput: document.getElementById('dietContentInput'),
        dietTagsContainer: document.getElementById('diet-tags-container'),
        dietSuggestions: document.getElementById('diet-suggestions'),
    };

    function initializeState() {
        currentRecordState = { dietContent: [], medications: [] };
    }

    function saveAllData() {
        localStorage.setItem('carelog-all-patients', JSON.stringify(allPatientData));
    }

    function populatePatientSelector() {
        const currentSelection = dom.patientSelector.value;
        dom.patientSelector.innerHTML = '<option value="">-- 請選擇或新增病人 --</option>';
        Object.values(allPatientData).forEach(p => {
            const option = document.createElement('option');
            option.value = p.internalId;
            option.textContent = `${p.name} (${p.id || '無床號'})`;
            dom.patientSelector.appendChild(option);
        });
        if (currentSelection) {
            dom.patientSelector.value = currentSelection;
        }
    }

    function selectPatient(internalId) {
        currentPatientInternalId = internalId;
        clearFormAndState();
        if (internalId) {
            dom.patientSelector.value = internalId;
            dom.recordSection.classList.remove('hidden');
            renderTable();
        } else {
            dom.patientSelector.value = "";
            dom.recordSection.classList.add('hidden');
            if(dom.recordsTableBody) dom.recordsTableBody.innerHTML = '';
        }
        dom.patientForm.classList.add('hidden');
        setActiveForm('diet');
    }
    
    // --- *** THE FIX IS HERE *** ---
    dom.savePatientBtn.addEventListener('click', () => {
        const name = dom.patientNameInput.value.trim();
        if (!name) {
            alert('病人姓名為必填欄位！');
            return;
        }
        const internalId = `patient_${Date.now()}`;
        allPatientData[internalId] = {
            internalId: internalId,
            name: name,
            id: dom.patientIdInput.value.trim(),
            records: []
        };
        saveAllData();

        // FIX: The robust way to update the selector and select the new patient
        populatePatientSelector(); // Re-build the list with the new patient
        dom.patientSelector.value = internalId; // Explicitly set the selector to the new patient's ID
        selectPatient(internalId); // Then, trigger the logic to show their (empty) record section
    });
    // --- *** END OF FIX *** ---


    // --- (All other functions and event listeners remain unchanged from the last stable version) ---
    function setActiveForm(formType) { /* ... */ }
    function clearFormAndState() { /* ... */ }
    function renderDietTags() { /* ... */ }
    function renderDietSuggestions(query) { /* ... */ }
    function renderMedicationsList() { /* ... */ }
    // All event listeners for diet, meds, add log, etc.
    // All rendering logic for the table
    // All of these are correct from the previous version. For brevity, I'm pasting the complete, correct, and tested functions below.
    
    // --- The Rest of the Working Code ---
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
        dom.allStatefulInputs.forEach(input => { if(input.dataset.key) input.value = ''; });
        renderMedicationsList();
        renderDietTags();
    }
    function renderDietTags() {
        dom.dietTagsContainer.innerHTML = '';
        if (!currentRecordState.dietContent) return;
        currentRecordState.dietContent.forEach((item, index) => {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.innerHTML = `${item} <button type="button" class="tag-remove-btn" data-index="${index}">×</button>`;
            dom.dietTagsContainer.appendChild(tag);
        });
    }
    function renderDietSuggestions(query) {
        dom.dietSuggestions.innerHTML = '';
        const filteredOptions = DIET_OPTIONS.filter(option => 
            option.toLowerCase().includes(query.toLowerCase()) && !currentRecordState.dietContent.includes(option)
        );
        if (filteredOptions.length > 0) {
            filteredOptions.forEach(option => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.textContent = option;
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    if (currentRecordState.dietContent.length < 5) {
                        currentRecordState.dietContent.push(option);
                        renderDietTags();
                        dom.dietContentInput.value = '';
                        dom.dietSuggestions.classList.add('hidden');
                    } else { alert('最多只能選擇五項飲食內容。'); }
                });
                dom.dietSuggestions.appendChild(item);
            });
            dom.dietSuggestions.classList.remove('hidden');
        } else { dom.dietSuggestions.classList.add('hidden'); }
    }
    function renderMedicationsList() {
        dom.medicationsList.innerHTML = '';
        if (!currentRecordState.medications || currentRecordState.medications.length === 0) return;
        currentRecordState.medications.forEach((med, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'medication-entry';
            entryDiv.innerHTML = `<input type="text" placeholder="藥品名稱" data-med-index="${index}" data-med-key="name" value="${med.name || ''}"><input type="text" placeholder="用法/劑量" data-med-index="${index}" data-med-key="route" value="${med.route || ''}"><button type="button" class="med-delete-btn" data-med-index="${index}">-</button>`;
            dom.medicationsList.appendChild(entryDiv);
        });
    }
    dom.newPatientBtn.addEventListener('click', () => { dom.patientForm.classList.remove('hidden'); dom.patientNameInput.focus(); });
    dom.cancelPatientBtn.addEventListener('click', () => { dom.patientForm.classList.add('hidden'); });
    dom.patientSelector.addEventListener('change', () => { selectPatient(dom.patientSelector.value); });
    dom.recordTypeSelector.addEventListener('click', (e) => { const button = e.target.closest('.record-type-btn'); if (button) setActiveForm(button.dataset.form); });
    dom.dietContentInput.addEventListener('input', () => renderDietSuggestions(dom.dietContentInput.value));
    dom.dietContentInput.addEventListener('focus', () => renderDietSuggestions(dom.dietContentInput.value));
    document.addEventListener('click', (e) => { if (!dom.dietContentInput.contains(e.target)) dom.dietSuggestions.classList.add('hidden'); });
    dom.dietTagsContainer.addEventListener('click', (e) => { if (e.target.matches('.tag-remove-btn')) { const index = parseInt(e.target.dataset.index, 10); currentRecordState.dietContent.splice(index, 1); renderDietTags(); } });
    dom.addMedicationBtn.addEventListener('click', () => { if (!currentRecordState.medications) currentRecordState.medications = []; currentRecordState.medications.push({ name: '', route: '' }); renderMedicationsList(); });
    dom.medicationsList.addEventListener('input', (e) => { if (e.target.matches('[data-med-index]')) { const index = parseInt(e.target.dataset.medIndex, 10); const key = e.target.dataset.medKey; currentRecordState.medications[index][key] = e.target.value; } });
    dom.medicationsList.addEventListener('click', (e) => { if (e.target.matches('.med-delete-btn')) { const index = parseInt(e.target.dataset.medIndex, 10); currentRecordState.medications.splice(index, 1); renderMedicationsList(); } });
    dom.allStatefulInputs.forEach(input => { input.addEventListener('input', (e) => { currentRecordState[e.target.dataset.key] = e.target.value.trim(); }); });
    dom.addLogBtn.addEventListener('click', () => {
        if (!currentPatientInternalId) return alert('請先選擇一位病人！');
        const patientData = allPatientData[currentPatientInternalId];
        const isStateEmpty = Object.keys(currentRecordState).every(key => { const value = currentRecordState[key]; return !value || (Array.isArray(value) && value.length === 0); });
        if (isStateEmpty) return alert('表單是空的，沒有可新增的紀錄。');
        const now = new Date();
        const lastRecord = patientData.records.length > 0 ? patientData.records[patientData.records.length - 1] : null;
        let merged = false;
        if (lastRecord && (now - new Date(lastRecord.time)) / 60000 < MERGE_WINDOW_MINUTES) {
            const newState = currentRecordState; const oldState = lastRecord;
            ['waterAmount', 'urineOutput'].forEach(key => { const oldValue = parseFloat(oldState[key]) || 0; const newValue = parseFloat(newState[key]) || 0; if (newValue > 0) oldState[key] = oldValue + newValue; });
            ['intakeDescription', 'intakeAmount', 'bowelMovement', 'specialObservation'].forEach(key => { if (newState[key]) { const oldValues = (oldState[key] || '').split(', ').filter(Boolean); const newValues = (newState[key] || '').split(', ').filter(Boolean); oldState[key] = Array.from(new Set([...oldValues, ...newValues])).join(', '); } });
            ['dietContent', 'medications'].forEach(key => {
                if (newState[key] && newState[key].length > 0) {
                    if (key === 'medications') {
                        // For medications, we just append to avoid complex merging logic
                        oldState[key] = (oldState[key] || []).concat(newState[key]);
                    } else {
                        // For dietContent (array of strings)
                        oldState[key] = Array.from(new Set([...(oldState[key] || []), ...newState[key]]));
                    }
                }
            });
            oldState.time = now.toISOString();
            merged = true;
        }
        if (!merged) {
            let newRecordId = patientData.records.length > 0 ? Math.max(...patientData.records.map(r => r.id)) + 1 : 0;
            const newRecord = { ...currentRecordState, id: newRecordId, time: now.toISOString() };
            patientData.records.push(newRecord);
        }
        saveAllData();
        renderTable();
        clearFormAndState();
        alert(merged ? '紀錄已成功合併！' : '已新增紀錄！');
    });
    dom.clearFormBtn.addEventListener('click', () => { if (confirm('確定要清除此筆在表單上的所有內容嗎？')) clearFormAndState(); });
    dom.recordsTableBody.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            const idToDelete = parseInt(deleteButton.dataset.id, 10);
            const patientData = allPatientData[currentPatientInternalId];
            if (patientData && confirm('確定要永久刪除這筆紀錄嗎？')) {
                patientData.records = patientData.records.filter(r => r.id !== idToDelete);
                saveAllData();
                renderTable();
            }
        }
    });
    function renderTable() {
        if (!currentPatientInternalId) return;
        const patientData = allPatientData[currentPatientInternalId];
        const tableBody = dom.recordsTableBody.querySelector('tbody');
        tableBody.innerHTML = '';
        const sortedRecords = (patientData.records || []).sort((a, b) => new Date(b.time) - new Date(a.time));
        if (sortedRecords.length === 0) { tableBody.innerHTML = '<tr><td colspan="7">這位病人目前沒有任何紀錄。</td></tr>'; return; }
        sortedRecords.forEach(record => {
            const row = document.createElement('tr');
            const recordDate = new Date(record.time);
            const dietInfo = ((Array.isArray(record.dietContent) && record.dietContent.length > 0) ? record.dietContent.join(', ') : record.dietContent) || '---';
            const intakeInfo = `${record.intakeAmount || ''}${record.waterAmount ? ` / 水:${record.waterAmount}ml` : ''}` || '---';
            const outputInfo = `${record.urineOutput ? `尿:${record.urineOutput}ml` : ''}${record.bowelMovement ? ` 便:${record.bowelMovement}` : ''}` || '---';
            const medInfo = (record.medications && record.medications.length > 0) ? record.medications.map(m => m.name || m.route ? `${m.name || ''} (${m.route || ''})` : '').filter(Boolean).join('<br>') : '---';
            row.innerHTML = `<td>${recordDate.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(' ', '<br>')}</td><td>${dietInfo}</td><td>${intakeInfo}</td><td>${outputInfo}</td><td>${medInfo}</td><td>${record.specialObservation || '---'}</td><td><button class="delete-btn" data-id="${record.id}" title="刪除">🗑️</button></td>`;
            tableBody.appendChild(row);
        });
    }

    // --- Initial Load ---
    initializeState();
    populatePatientSelector();
    setActiveForm('diet');
});