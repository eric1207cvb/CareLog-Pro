document.addEventListener('DOMContentLoaded', () => {
    const MERGE_WINDOW_MINUTES = 10;
    const DIET_OPTIONS = ["水", "牛奶", "豆漿", "果汁", "茶", "安素", "完膳", "補體素", "早餐", "午餐", "晚餐", "點心", "白飯", "稀飯", "麵食", "水果", "蔬菜", "魚肉", "雞肉", "豬肉", "餅乾"];
    const MED_ROUTES = ['口服', '針劑', '塗抹', '吸入', '外用', '其他'];
    let allPatientData = JSON.parse(localStorage.getItem('carelog-all-patients')) || {};
    let currentPatientInternalId = null;
    let currentRecordState = {};
    const dom = {
        patientSelector: document.getElementById('patientSelector'),
        newPatientBtn: document.getElementById('newPatientBtn'),
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
    };

    function migrateOldData(){ /* ... Unchanged ... */ }
    function migrateMedicationData(){ /* ... Unchanged ... */ }
    function migrateCorruptedDietContent(){ /* ... Unchanged ... */ }
    function initializeState(){ currentRecordState = { dietContent: [], medications: [] }; }
    function saveAllData(){ localStorage.setItem('carelog-all-patients', JSON.stringify(allPatientData)); }
    function mergeDataIntoRecord(targetRecord, newData){ /* ... Unchanged ... */ }
    function findMergeableRecord(patientData){ /* ... Unchanged ... */ }
    function populatePatientSelector(){ /* ... Unchanged ... */ }
    function selectPatient(internalId){ /* ... Unchanged ... */ }
    function setActiveForm(formType){ /* ... Unchanged ... */ }
    function clearFormAndState(){ /* ... Unchanged ... */ }
    function renderDietTags(){ /* ... Unchanged ... */ }
    function renderDietSuggestions(query){ /* ... Unchanged ... */ }
    function renderMedicationsList(){ /* ... Unchanged ... */ }
    function renderTable(){ /* ... Unchanged ... */ }

    // --- All functions before Event Listeners ---
    migrateOldData=function(){if(localStorage.getItem("carelog-migrated-to-dietNotes"))return;let t=!1;Object.values(allPatientData).forEach(e=>{(e.records||[]).forEach(e=>{if(e.hasOwnProperty("intakeDescription")||e.hasOwnProperty("intakeAmount")){const o=[e.intakeDescription,e.intakeAmount].filter(Boolean).join(" ");o&&(e.dietNotes=e.dietNotes?`${e.dietNotes} ${o}`:o),delete e.intakeDescription,delete e.intakeAmount,t=!0}})}),t&&(console.log("Successfully migrated old data to new dietNotes field."),saveAllData(),localStorage.setItem("carelog-migrated-to-dietNotes","true"))},migrateMedicationData=function(){if(localStorage.getItem("carelog-migrated-to-meds-structure"))return;let t=!1;Object.values(allPatientData).forEach(e=>{(e.records||[]).forEach(e=>{e.medications&&Array.isArray(e.medications)&&e.medications.forEach(e=>{e&&"string"==typeof e.route&&!e.hasOwnProperty("dosage")&&(e.dosage=e.route,e.route="口服",t=!0)})})}),t&&(console.log("Successfully migrated old medication data."),saveAllData(),localStorage.setItem("carelog-migrated-to-meds-structure","true"))},migrateCorruptedDietContent=function(){if(localStorage.getItem("carelog-migrated-dietcontent-string-v2"))return;let t=!1;Object.values(allPatientData).forEach(e=>{(e.records||[]).forEach(e=>{e&&"string"==typeof e.dietContent&&(e.dietContent=e.dietContent.split(",").map(t=>t.trim()).filter(Boolean),t=!0)})}),t&&(console.log("Successfully migrated corrupted dietContent (string to array)."),saveAllData(),localStorage.setItem("carelog-migrated-dietcontent-string-v2","true"))},mergeDataIntoRecord=function(t,e){["waterAmount","urineOutput"].forEach(o=>{const n=parseFloat(t[o])||0,a=parseFloat(e[o])||0;a>0&&(t[o]=n+a)}),["dietNotes","bowelMovement","specialObservation"].forEach(o=>{if(e[o]){const n=(t[o]||"").split(", ").filter(Boolean),a=(e[o]||"").split(", ").filter(Boolean);t[o]=Array.from(new Set([...n,...a])).join(", ")}}),t.dietContent=Array.from(new Set([...t.dietContent||[],...e.dietContent||[]]));const o=(e.medications||[]).filter(t=>t.name||t.route||t.dosage);t.medications=(t.medications||[]).concat(o),t.time=(new Date).toISOString()},findMergeableRecord=function(t){if(!t||!t.records||0===t.records.length)return null;const e=t.records[t.records.length-1],o=new Date,n=new Date(e.time);return(o-n)/6e4<MERGE_WINDOW_MINUTES?e:null},populatePatientSelector=function(){const t=dom.patientSelector.value;dom.patientSelector.innerHTML='<option value="">-- 請選擇或新增病人 --</option>',Object.values(allPatientData).sort((t,e)=>t.name.localeCompare(e.name,"zh-Hant")).forEach(t=>{const e=document.createElement("option");e.value=t.internalId,e.textContent=`${t.name} (${t.id||"無床號"})`,dom.patientSelector.appendChild(e)}),t&&(dom.patientSelector.value=t)},selectPatient=function(t){currentPatientInternalId=t,clearFormAndState(),t?(dom.patientSelector.value=t,dom.recordSection.classList.remove("hidden"),renderTable()):(dom.patientSelector.value="",dom.recordSection.classList.add("hidden"),dom.recordsTableBody&&(dom.recordsTableBody.innerHTML="")),dom.patientForm.classList.add("hidden"),setActiveForm("diet")},setActiveForm=function(t){document.querySelectorAll(".record-type-btn").forEach(t=>t.classList.remove("active")),dom.allFormSections.forEach(t=>t.classList.remove("active"));const e=document.querySelector(`.record-type-btn[data-form="${t}"]`),o=document.getElementById(`${t}-fields`);e&&e.classList.add("active"),o&&o.classList.add("active")},clearFormAndState=function(){initializeState(),dom.recordForm.reset(),renderMedicationsList(),renderDietTags(),setActiveForm("diet")},renderDietTags=function(){dom.dietTagsContainer.innerHTML="",(currentRecordState.dietContent||[]).forEach((t,e)=>{const o=document.createElement("span");o.className="tag",o.textContent=t;const n=document.createElement("button");n.type="button",n.className="tag-remove-btn",n.textContent="×",n.dataset.index=e,o.appendChild(n),dom.dietTagsContainer.appendChild(o)})},renderDietSuggestions=function(t){if(dom.dietSuggestions.innerHTML="",!t)return void dom.dietSuggestions.classList.add("hidden");const e=DIET_OPTIONS.filter(e=>e.toLowerCase().includes(t.toLowerCase())&&!(currentRecordState.dietContent||[]).includes(e));e.length>0?(e.forEach(t=>{const e=document.createElement("div");e.className="suggestion-item",e.textContent=t,e.addEventListener("mousedown",o=>{o.preventDefault(),(currentRecordState.dietContent||[]).length<5?(currentRecordState.dietContent.push(t),renderDietTags(),dom.dietContentInput.value="",dom.dietSuggestions.classList.add("hidden")):alert("最多只能選擇五項飲食內容。")}),dom.dietSuggestions.appendChild(e)}),dom.dietSuggestions.classList.remove("hidden")):dom.dietSuggestions.classList.add("hidden")},renderMedicationsList=function(){dom.medicationsList.innerHTML="",currentRecordState.medications&&0!==currentRecordState.medications.length&&currentRecordState.medications.forEach((t,e)=>{const o=document.createElement("div");o.className="medication-entry";const n=MED_ROUTES.map(e=>`<option value="${e}" ${t.route===e?"selected":""}>${e}</option>`).join(""),a=`<select data-med-index="${e}" data-med-key="route">${n}</select>`;o.innerHTML=`<input type="text" placeholder="藥品名稱" data-med-index="${e}" data-med-key="name" value="${t.name||""}">
                ${a}
                <input type="text" placeholder="劑量/頻率" data-med-index="${e}" data-med-key="dosage" value="${t.dosage||""}">
                <button type="button" class="med-delete-btn" data-med-index="${e}">-</button>`,dom.medicationsList.appendChild(o)})},renderTable=function(){if(currentPatientInternalId){const t=allPatientData[currentPatientInternalId];dom.recordsTableBody.innerHTML="";const e=(t.records||[]).slice().sort((t,e)=>new Date(e.time)-new Date(t.time));if(0===e.length)dom.recordsTableBody.innerHTML='<tr><td colspan="8">這位病人目前沒有任何紀錄。</td></tr>';else{e.forEach(t=>{const e=document.createElement("tr"),o=new Date(t.time),n=o.toLocaleString("zh-TW",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:!1}).replace(" ","<br>"),a=Array.isArray(t.dietContent)&&t.dietContent.length>0?t.dietContent.join(", "):"string"==typeof t.dietContent&&t.dietContent?t.dietContent:"---",i=t.dietNotes||"---",d=t.waterAmount||"---",l=`${t.urineOutput?`尿:${t.urineOutput}ml`:""}${t.bowelMovement?` 便:${t.bowelMovement}`:""}`||"---",s=t.medications&&t.medications.length>0?t.medications.map(t=>{if(!t.name&&!t.dosage)return"";return`${t.name||"未命名"} (${t.route||""}, ${t.dosage||"未註明"})`}).filter(Boolean).join("<br>"):"---",c=t.specialObservation||"---",r=`<button class="delete-btn" data-id="${t.id}" title="刪除">🗑️</button>`;e.innerHTML=`<td>${n}</td><td>${a}</td><td>${i}</td><td>${d}</td><td>${l}</td><td>${s}</td><td>${c}</td><td>${r}</td>`,dom.recordsTableBody.appendChild(e)})}}};

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
    
    // ✨✨✨ THIS IS THE DEBUGGING VERSION OF THE SUBMIT HANDLER ✨✨✨
    dom.recordForm.addEventListener('submit', e => {
        e.preventDefault();
        if (!currentPatientInternalId) return alert('請先選擇一位病人！');
        
        console.log("--- 偵錯開始 ---");
        console.log("1. 按下提交鈕時，表單上的暫存資料 (currentRecordState):", JSON.parse(JSON.stringify(currentRecordState)));

        const patientData = allPatientData[currentPatientInternalId];
        const isStateEmpty = Object.values(currentRecordState).every(value => !value || (Array.isArray(value) && value.length === 0));
        if (isStateEmpty) {
            console.log("偵測到表單為空，操作取消。");
            console.log("--- 偵錯結束 ---");
            return alert('表單是空的，沒有可新增的紀錄。');
        }

        const mergeableRecord = findMergeableRecord(patientData);
        let message = '';

        if (mergeableRecord) {
            console.log("2. 判斷為『合併』模式。合併前的舊紀錄:", JSON.parse(JSON.stringify(mergeableRecord)));
            mergeDataIntoRecord(mergeableRecord, currentRecordState);
            console.log("3. 合併後的最終紀錄:", JSON.parse(JSON.stringify(mergeableRecord)));
            message = '紀錄已成功合併！';
        } else {
            console.log("2. 判斷為『新增』模式。");
            const newRecord = { ...currentRecordState, id: Date.now(), time: new Date().toISOString() };
            console.log("3. 準備新增的最終紀錄:", JSON.parse(JSON.stringify(newRecord)));
            patientData.records.push(newRecord);
            message = '已新增紀錄！';
        }

        console.log("--- 偵錯結束 ---");

        saveAllData();
        renderTable();
        clearFormAndState();
        alert(message);
    });

    dom.clearFormBtn.addEventListener('click', () => { if (confirm('確定要清除此筆在表單上的所有內容嗎？')) { clearFormAndState(); } });
    dom.recordsTableBody.addEventListener('click', e => { const deleteButton = e.target.closest('.delete-btn'); if (deleteButton) { const idToDelete = parseInt(deleteButton.dataset.id, 10); const patientData = allPatientData[currentPatientInternalId]; if (patientData && confirm('確定要永久刪除這筆紀錄嗎？')) { const recordIndex = patientData.records.findIndex(r => r.id === idToDelete); if (recordIndex > -1) { patientData.records.splice(recordIndex, 1); saveAllData(); renderTable(); } } } });
    dom.formContent.addEventListener('click', e => { if (e.target.matches('.btn-quick-add')) { const button = e.target; const targetInputId = button.dataset.targetInput; const amountToAdd = parseInt(button.dataset.amount, 10); const targetInput = document.getElementById(targetInputId); if (targetInput && !isNaN(amountToAdd)) { targetInput.value = (parseInt(targetInput.value, 10) || 0) + amountToAdd; targetInput.dispatchEvent(new Event('input')); } } });

    // --- Initial Load ---
    migrateOldData();
    migrateMedicationData();
    migrateCorruptedDietContent();
    initializeState();
    populatePatientSelector();
    setActiveForm('diet');
});