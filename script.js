document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const MERGE_WINDOW_MINUTES = 10;
    const DIET_OPTIONS = ["水", "牛奶", "豆漿", "果汁", "茶", "安素", "完膳", "補體素", "早餐", "午餐", "晚餐", "點心", "白飯", "稀飯", "麵食", "水果", "蔬菜", "魚肉", "雞肉", "豬肉", "餅乾"];
    const MED_ROUTES = ['口服', '針劑', '塗抹', '吸入', '外用', '其他'];

    // --- State Variables & DOM Elements ---
    let allPatientData = JSON.parse(localStorage.getItem('carelog-all-patients')) || {};
    let currentPatientInternalId = null;
    let currentRecordState = {};
    const dom = { /* ... Unchanged ... */ };
    Object.assign(dom,{patientSelector:document.getElementById("patientSelector"),newPatientBtn:document.getElementById("newPatientBtn"),patientForm:document.getElementById("patientForm"),savePatientBtn:document.getElementById("savePatientBtn"),cancelPatientBtn:document.getElementById("cancelPatientBtn"),patientNameInput:document.getElementById("patientName"),patientIdInput:document.getElementById("patientId"),recordSection:document.getElementById("recordSection"),recordForm:document.getElementById("recordForm"),formContent:document.querySelector(".form-content"),recordTypeSelector:document.querySelector(".record-type-selector"),allFormSections:document.querySelectorAll(".form-section"),allStatefulInputs:document.querySelectorAll(".stateful-input"),addLogBtn:document.getElementById("addLogBtn"),clearFormBtn:document.getElementById("clearFormBtn"),recordsTableBody:document.querySelector("#recordsTable tbody"),medicationsList:document.getElementById("medications-list"),addMedicationBtn:document.getElementById("addMedicationBtn"),dietContentInput:document.getElementById("dietContentInput"),dietTagsContainer:document.getElementById("diet-tags-container"),dietSuggestions:document.getElementById("diet-suggestions")});


    // --- DATA MIGRATION ---
    function migrateOldData() { /* ... Unchanged logic for dietNotes ... */ }
    function migrateMedicationData() { /* ... Unchanged logic for medication structure ... */ }
    
    // ✨✨✨ NEW MIGRATION FUNCTION TO FIX BAD DATA ✨✨✨
    function migrateCorruptedDietContent() {
        if (localStorage.getItem('carelog-migrated-dietcontent-string-v2')) return;

        let wasMigrated = false;
        Object.values(allPatientData).forEach(patient => {
            (patient.records || []).forEach(record => {
                if (record && typeof record.dietContent === 'string') {
                    // Convert the comma-separated string back to a proper array
                    record.dietContent = record.dietContent.split(',').map(item => item.trim()).filter(Boolean);
                    wasMigrated = true;
                }
            });
        });

        if (wasMigrated) {
            console.log('Successfully migrated corrupted dietContent (string to array).');
            saveAllData();
            localStorage.setItem('carelog-migrated-dietcontent-string-v2', 'true');
        }
    }


    // --- All Helper & Logic Functions are UNCHANGED ---
    // initializeState, saveAllData, mergeDataIntoRecord, findMergeableRecord
    
    // --- UI Rendering Functions ---
    // populatePatientSelector, selectPatient, setActiveForm, clearFormAndState, 
    // renderDietTags, renderDietSuggestions, renderMedicationsList are UNCHANGED

    function renderTable() {
        if (!currentPatientInternalId) return;
        const patientData = allPatientData[currentPatientInternalId];
        dom.recordsTableBody.innerHTML = '';
        const sortedRecords = (patientData.records || []).slice().sort((a, b) => new Date(b.time) - new Date(a.time));
        if (sortedRecords.length === 0) {
            dom.recordsTableBody.innerHTML = '<tr><td colspan="8">這位病人目前沒有任何紀錄。</td></tr>';
            return;
        }
        sortedRecords.forEach(record => {
            const row = document.createElement('tr');
            
            // ✨✨✨ DEFENSIVE CODING FIX IS HERE ✨✨✨
            // Check if dietContent is an array before trying to join it.
            let dietInfo = '---';
            if (Array.isArray(record.dietContent) && record.dietContent.length > 0) {
                dietInfo = record.dietContent.join(', ');
            } else if (typeof record.dietContent === 'string' && record.dietContent) {
                // As a fallback, if it's still a string, just display it.
                dietInfo = record.dietContent;
            }

            // ... The rest of the function remains the same
            const recordDate = new Date(record.time);
            const timeInfo = recordDate.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(' ', '<br>');
            const dietNotesInfo = record.dietNotes || '---';
            const waterAmountInfo = record.waterAmount || '---';
            const outputInfo = `${record.urineOutput ? `尿:${record.urineOutput}ml` : ''}${record.bowelMovement ? ` 便:${record.bowelMovement}` : ''}` || '---';
            const medInfo = (record.medications && record.medications.length > 0) ? record.medications.map(m => { if (!m.name && !m.dosage) return ''; return `${m.name || '未命名'} (${m.route || ''}, ${m.dosage || '未註明'})`; }).filter(Boolean).join('<br>') : '---';
            const observationInfo = record.specialObservation || '---';
            const actionsInfo = `<button class="delete-btn" data-id="${record.id}" title="刪除">🗑️</button>`;
            row.innerHTML = `<td>${timeInfo}</td><td>${dietInfo}</td><td>${dietNotesInfo}</td><td>${waterAmountInfo}</td><td>${outputInfo}</td><td>${medInfo}</td><td>${observationInfo}</td><td>${actionsInfo}</td>`;
            dom.recordsTableBody.appendChild(row);
        });
    }

    // --- Event Listeners and Initial Load (Full code provided for completeness) ---
    function migrateOldData(){if(localStorage.getItem("carelog-migrated-to-dietNotes"))return;let t=!1;Object.values(allPatientData).forEach(e=>{(e.records||[]).forEach(e=>{if(e.hasOwnProperty("intakeDescription")||e.hasOwnProperty("intakeAmount")){const o=[e.intakeDescription,e.intakeAmount].filter(Boolean).join(" ");o&&(e.dietNotes=e.dietNotes?`${e.dietNotes} ${o}`:o),delete e.intakeDescription,delete e.intakeAmount,t=!0}})}),t&&(console.log("Successfully migrated old data to new dietNotes field."),saveAllData(),localStorage.setItem("carelog-migrated-to-dietNotes","true"))}function migrateMedicationData(){if(localStorage.getItem("carelog-migrated-to-meds-structure"))return;let t=!1;Object.values(allPatientData).forEach(e=>{(e.records||[]).forEach(e=>{e.medications&&Array.isArray(e.medications)&&e.medications.forEach(e=>{e&&"string"==typeof e.route&&!e.hasOwnProperty("dosage")&&(e.dosage=e.route,e.route="口服",t=!0)})})}),t&&(console.log("Successfully migrated old medication data."),saveAllData(),localStorage.setItem("carelog-migrated-to-meds-structure","true"))}function initializeState(){currentRecordState={dietContent:[],medications:[]}}function saveAllData(){localStorage.setItem("carelog-all-patients",JSON.stringify(allPatientData))}function mergeDataIntoRecord(t,e){["waterAmount","urineOutput"].forEach(o=>{const n=parseFloat(t[o])||0,a=parseFloat(e[o])||0;a>0&&(t[o]=n+a)}),["dietNotes","bowelMovement","specialObservation"].forEach(o=>{if(e[o]){const n=(t[o]||"").split(", ").filter(Boolean),a=(e[o]||"").split(", ").filter(Boolean);t[o]=Array.from(new Set([...n,...a])).join(", ")}}),t.dietContent=Array.from(new Set([...t.dietContent||[],...e.dietContent||[]]));const o=(e.medications||[]).filter(t=>t.name||t.route||t.dosage);t.medications=(t.medications||[]).concat(o),t.time=(new Date).toISOString()}function findMergeableRecord(t){if(!t||!t.records||0===t.records.length)return null;const e=t.records[t.records.length-1],o=new Date,n=new Date(e.time);return(o-n)/6e4<MERGE_WINDOW_MINUTES?e:null}function populatePatientSelector(){const t=dom.patientSelector.value;dom.patientSelector.innerHTML='<option value="">-- 請選擇或新增病人 --</option>',Object.values(allPatientData).sort((t,e)=>t.name.localeCompare(e.name,"zh-Hant")).forEach(t=>{const e=document.createElement("option");e.value=t.internalId,e.textContent=`${t.name} (${t.id||"無床號"})`,dom.patientSelector.appendChild(e)}),t&&(dom.patientSelector.value=t)}function selectPatient(t){currentPatientInternalId=t,clearFormAndState(),t?(dom.patientSelector.value=t,dom.recordSection.classList.remove("hidden"),renderTable()):(dom.patientSelector.value="",dom.recordSection.classList.add("hidden"),dom.recordsTableBody&&(dom.recordsTableBody.innerHTML="")),dom.patientForm.classList.add("hidden"),setActiveForm("diet")}function setActiveForm(t){document.querySelectorAll(".record-type-btn").forEach(t=>t.classList.remove("active")),dom.allFormSections.forEach(t=>t.classList.remove("active"));const e=document.querySelector(`.record-type-btn[data-form="${t}"]`),o=document.getElementById(`${t}-fields`);e&&e.classList.add("active"),o&&o.classList.add("active")}function clearFormAndState(){initializeState(),dom.recordForm.reset(),renderMedicationsList(),renderDietTags(),setActiveForm("diet")}function renderDietTags(){dom.dietTagsContainer.innerHTML="",(currentRecordState.dietContent||[]).forEach((t,e)=>{const o=document.createElement("span");o.className="tag",o.textContent=t;const n=document.createElement("button");n.type="button",n.className="tag-remove-btn",n.textContent="×",n.dataset.index=e,o.appendChild(n),dom.dietTagsContainer.appendChild(o)})}function renderDietSuggestions(t){if(dom.dietSuggestions.innerHTML="",!t)return void dom.dietSuggestions.classList.add("hidden");const e=DIET_OPTIONS.filter(e=>e.toLowerCase().includes(t.toLowerCase())&&!(currentRecordState.dietContent||[]).includes(e));e.length>0?(e.forEach(t=>{const e=document.createElement("div");e.className="suggestion-item",e.textContent=t,e.addEventListener("mousedown",o=>{o.preventDefault(),(currentRecordState.dietContent||[]).length<5?(currentRecordState.dietContent.push(t),renderDietTags(),dom.dietContentInput.value="",dom.dietSuggestions.classList.add("hidden")):alert("最多只能選擇五項飲食內容。")}),dom.dietSuggestions.appendChild(e)}),dom.dietSuggestions.classList.remove("hidden")):dom.dietSuggestions.classList.add("hidden")}function renderMedicationsList(){dom.medicationsList.innerHTML="",currentRecordState.medications&&0!==currentRecordState.medications.length&&currentRecordState.medications.forEach((t,e)=>{const o=document.createElement("div");o.className="medication-entry";const n=MED_ROUTES.map(e=>`<option value="${e}" ${t.route===e?"selected":""}>${e}</option>`).join(""),a=`<select data-med-index="${e}" data-med-key="route">${n}</select>`;o.innerHTML=`<input type="text" placeholder="藥品名稱" data-med-index="${e}" data-med-key="name" value="${t.name||""}">\n                ${a}\n                <input type="text" placeholder="劑量/頻率" data-med-index="${e}" data-med-key="dosage" value="${t.dosage||""}">\n                <button type="button" class="med-delete-btn" data-med-index="${e}">-</button>`,dom.medicationsList.appendChild(o)})}dom.newPatientBtn.addEventListener("click",()=>{dom.patientForm.classList.remove("hidden"),dom.patientNameInput.focus()}),dom.cancelPatientBtn.addEventListener("click",()=>dom.patientForm.classList.add("hidden")),dom.patientForm.addEventListener("submit",t=>{t.preventDefault();const e=dom.patientNameInput.value.trim();if(!e)return void alert("病人姓名為必填欄位！");const o=`patient_${Date.now()}`;allPatientData[o]={internalId:o,name:e,id:dom.patientIdInput.value.trim(),records:[]},saveAllData(),populatePatientSelector(),dom.patientSelector.value=o,selectPatient(o),dom.patientForm.reset()}),dom.patientSelector.addEventListener("change",()=>selectPatient(dom.patientSelector.value)),dom.recordTypeSelector.addEventListener("click",t=>{const e=t.target.closest(".record-type-btn");e&&setActiveForm(e.dataset.form)}),dom.dietContentInput.addEventListener("input",()=>renderDietSuggestions(dom.dietContentInput.value)),dom.dietContentInput.addEventListener("focus",()=>renderDietSuggestions(dom.dietContentInput.value)),dom.dietContentInput.addEventListener("keydown",t=>{"Enter"===t.key&&(t.preventDefault(),(t=dom.dietContentInput.value.trim())&&(currentRecordState.dietContent||[]).length<5?((currentRecordState.dietContent||[]).includes(t)||currentRecordState.dietContent.push(t),renderDietTags(),dom.dietContentInput.value="",dom.dietSuggestions.classList.add("hidden")):(currentRecordState.dietContent||[]).length>=5&&alert("最多只能新增五項飲食內容。"))}),document.addEventListener("click",t=>{dom.dietContentInput&&!dom.dietContentInput.contains(t.target)&&dom.dietSuggestions.classList.add("hidden")}),dom.dietTagsContainer.addEventListener("click",t=>{if(t.target.matches(".tag-remove-btn")){const e=parseInt(t.target.dataset.index,10);currentRecordState.dietContent.splice(e,1),renderDietTags()}}),dom.addMedicationBtn.addEventListener("click",()=>{currentRecordState.medications||(currentRecordState.medications=[]),currentRecordState.medications.push({name:"",route:"口服",dosage:""}),renderMedicationsList()}),dom.medicationsList.addEventListener("input",t=>{if(t.target.matches("[data-med-index]")){const e=parseInt(t.target.dataset.medIndex,10),o=t.target.dataset.medKey;currentRecordState.medications[e][o]=t.target.value}}),dom.medicationsList.addEventListener("change",t=>{if(t.target.matches("select[data-med-index]")){const e=parseInt(t.target.dataset.medIndex,10),o=t.target.dataset.medKey;currentRecordState.medications[e][o]=t.target.value}}),dom.medicationsList.addEventListener("click",t=>{if(t.target.matches(".med-delete-btn")){const e=parseInt(t.target.dataset.medIndex,10);currentRecordState.medications.splice(e,1),renderMedicationsList()}}),dom.allStatefulInputs.forEach(t=>{t.addEventListener("input",e=>{const o=e.target.dataset.key,n=e.target.value;o&&(currentRecordState[o]=n)})}),dom.recordForm.addEventListener("submit",t=>{t.preventDefault();if(currentPatientInternalId){const t=allPatientData[currentPatientInternalId];if(!Object.values(currentRecordState).every(t=>!t||Array.isArray(t)&&0===t.length)){const o=findMergeableRecord(t);let n="";o?(mergeDataIntoRecord(o,currentRecordState),n="紀錄已成功合併！"):(t.records.push({...currentRecordState,id:Date.now(),time:(new Date).toISOString()}),n="已新增紀錄！"),saveAllData(),renderTable(),clearFormAndState(),alert(n)}else alert("表單是空的，沒有可新增的紀錄。")}else alert("請先選擇一位病人！")}),dom.clearFormBtn.addEventListener("click",()=>{confirm("確定要清除此筆在表單上的所有內容嗎？")&&clearFormAndState()}),dom.recordsTableBody.addEventListener("click",t=>{const e=t.target.closest(".delete-btn");if(e){const o=parseInt(e.dataset.id,10),n=allPatientData[currentPatientInternalId];if(n&&confirm("確定要永久刪除這筆紀錄嗎？")){const t=n.records.findIndex(t=>t.id===o);t>-1&&(n.records.splice(t,1),saveAllData(),renderTable())}}}),dom.formContent.addEventListener("click",t=>{if(t.target.matches(".btn-quick-add")){const e=t.target,o=e.dataset.targetInput,n=parseInt(e.dataset.amount,10),a=document.getElementById(o);a&&!isNaN(n)&&(a.value=(parseInt(a.value,10)||0)+n,a.dispatchEvent(new Event("input")))}});

    // --- Initial Load ---
    migrateOldData();
    migrateMedicationData();
    migrateCorruptedDietContent(); // Run the new data repair script
    initializeState();
    populatePatientSelector();
    setActiveForm('diet');
});