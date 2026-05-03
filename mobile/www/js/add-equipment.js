// ================================== //
// SkillConnect Mobile                //
// Supplier Add Equipment             //
// ================================== //

async function renderAddEquipment(appElement, stateRoute) {
    const CATA = ['Power Tools', 'Hand Tools', 'Heavy Machinery', 'Scaffolding', 'Electrical', 'Plumbing', 'Welding', 'Painting', 'Gardening', 'Safety', 'Other'];
    const COND = {
        'New': { ic: 'ri-star-fill', d: 'Brand new, unused', c: 'new' },
        'Excellent': { ic: 'ri-check-double-line', d: 'Like new condition', c: 'exc' },
        'Good': { ic: 'ri-thumb-up-line', d: 'Minor wear, fully functional', c: 'goo' },
        'Fair': { ic: 'ri-information-line', d: 'Visible wear, still works well', c: 'fai' }
    };

    let ae = {
        f: {
            equipmentName: '',
            category: '',
            condition: '',
            description: '',
            rentalPrice: '',
            deposit: '',
            quantityTotal: 1,
            quantityAvailable: 1,
            isAvailable: true
        },
        errs: {},
        isSubmitting: false,
        showDiscard: false,
        formTouched: false
    };

    const dF = JSON.stringify(ae.f);

    function validate() {
        ae.errs = {};
        if (!ae.f.equipmentName.trim() || ae.f.equipmentName.trim().length < 3) ae.errs.en = 'Name must be at least 3 characters';
        if (!ae.f.category) ae.errs.ca = 'Please select a category';
        if (!ae.f.condition) ae.errs.co = 'Please select a condition';

        const pr = parseFloat(ae.f.rentalPrice);
        if (isNaN(pr) || pr <= 0) ae.errs.pr = 'Enter a valid daily rate';

        const dp = parseFloat(ae.f.deposit);
        if (isNaN(dp) || dp < 0) ae.errs.dp = 'Enter a valid deposit amount';

        return Object.keys(ae.errs).length === 0;
    }

    function aeUpdateUI() {
        const isDirty = JSON.stringify(ae.f) !== dF;
        const pr = parseFloat(ae.f.rentalPrice) || 0;
        const dp = parseFloat(ae.f.deposit) || 0;

        const wk = pr * 7;
        const mo = pr * 30;
        const lowD = (dp > 0 && pr > 0 && dp < pr * 2);

        let cndH = '';
        for (let k in COND) {
            const cx = COND[k];
            cndH += `<div class="ae-cnd ${cx.c} ${ae.f.condition === k ? 'active' : ''}" data-cnd="${k}">
                <i class="${cx.ic} ae-cnd-i"></i>
                <div class="ae-cnd-t">${k}</div>
                <div class="ae-cnd-s">${cx.d}</div>
             </div>`;
        }

        let dtH = '';
        if (ae.f.quantityTotal <= 10) {
            for (let i = 0; i < ae.f.quantityTotal; i++) dtH += `<div class="ae-dt ${i < ae.f.quantityAvailable ? 'a' : ''}"></div>`;
        }

        let cnM = cx => cx === 'New' ? 'new' : cx === 'Excellent' ? 'exc' : cx === 'Good' ? 'goo' : 'fai';

        let dM = '';
        if (ae.showDiscard) {
            dM = `
                <div class="ae-dbg active" id="da-bg">
                    <div class="ae-sht" style="padding-bottom:max(24px,env(safe-area-inset-bottom,24px))">
                        <div class="ae-dh"></div>
                        <div class="ae-sht-t">Discard listing?</div>
                        <div class="ae-sht-s">Your equipment details will not be saved.</div>
                        <button class="ae-sht-fb" id="da-do">Discard</button>
                        <button class="ae-sht-fl" id="da-cn">Keep Editing</button>
                    </div>
                </div>
             `;
        }

        appElement.innerHTML = `
            <div class="ae-screen">
                <div class="ae-h">
                    <button class="ae-bck" id="ae-bck">Cancel</button>
                    <div class="ae-t">Add Equipment</div>
                    <div style="width:50px"></div>
                </div>
                
                <div class="ae-scr" id="ae-cx">
                    <div class="ae-c">
                        <div class="ae-in-w">
                            <div class="ae-lbl">Equipment Name <span class="ae-req">*</span></div>
                            <input type="text" class="ae-in ${ae.formTouched && ae.errs.en ? 'err' : ''}" id="in-nm" placeholder="e.g. Heavy Duty Power Drill" value="${ae.f.equipmentName}" maxlength="100">
                            <div class="ae-cc">${ae.f.equipmentName.length} / 100</div>
                            ${ae.formTouched && ae.errs.en ? `<div class="ae-err-m">${ae.errs.en}</div>` : ''}
                        </div>
                        
                        <div class="ae-in-w">
                            <div class="ae-lbl">Category <span class="ae-req">*</span></div>
                            <div class="ae-cg">
                                ${CATA.map(c => `<button class="ae-cp ${ae.f.category === c ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('')}
                            </div>
                            ${ae.formTouched && ae.errs.ca ? `<div class="ae-err-m">${ae.errs.ca}</div>` : ''}
                        </div>

                        <div class="ae-in-w">
                            <div class="ae-lbl">Condition <span class="ae-req">*</span></div>
                            <div class="ae-cnd-g">${cndH}</div>
                            ${ae.formTouched && ae.errs.co ? `<div class="ae-err-m">${ae.errs.co}</div>` : ''}
                        </div>

                        <div class="ae-in-w" style="margin-bottom:0">
                            <div class="ae-lbl">Description</div>
                            <textarea class="ae-ta" id="in-ds" placeholder="Describe the equipment in detail..." maxlength="1000">${ae.f.description}</textarea>
                            <div class="ae-cc">${ae.f.description.length} / 1000</div>
                            <div class="ae-hp">A detailed description gets more enquiries</div>
                        </div>
                    </div>

                    <div class="ae-c">
                        <div class="ae-in-w">
                            <div class="ae-lbl">Daily Rental Price (LKR) <span class="ae-req">*</span></div>
                            <div class="ae-num-w">
                                <span class="ae-num-p">LKR</span>
                                <input type="number" inputmode="numeric" class="ae-in ae-num-i ${ae.formTouched && ae.errs.pr ? 'err' : ''}" id="in-pr" placeholder="e.g. 1500" value="${ae.f.rentalPrice}">
                            </div>
                            ${ae.formTouched && ae.errs.pr ? `<div class="ae-err-m">${ae.errs.pr}</div>` : ''}
                            <div class="ae-hp">Set a competitive daily rate to attract more customers</div>
                            
                            <div class="ae-est">
                                <div class="ae-est-l">Weekly estimate: ~LKR ${wk}</div>
                                <div class="ae-est-l" style="opacity:0.8">Monthly estimate: ~LKR ${mo}</div>
                            </div>
                        </div>

                        <div class="ae-in-w" style="margin-bottom:0">
                            <div class="ae-lbl">Security Deposit (LKR) <span class="ae-req">*</span></div>
                            <div class="ae-num-w">
                                <span class="ae-num-p">LKR</span>
                                <input type="number" inputmode="numeric" class="ae-in ae-num-i ${ae.formTouched && ae.errs.dp ? 'err' : ''}" id="in-dp" placeholder="e.g. 5000" value="${ae.f.deposit}">
                            </div>
                            ${ae.formTouched && ae.errs.dp ? `<div class="ae-err-m">${ae.errs.dp}</div>` : ''}
                            <div class="ae-hp">Refundable deposit to protect against damage or loss</div>
                            
                            <div class="ae-dg">&#128161; Typical deposit: 3–5&times; the daily rate</div>
                            ${lowD ? `<div class="ae-dw">&#9888; Low deposit — consider increasing to protect against loss</div>` : ''}
                        </div>
                    </div>

                    <div class="ae-c">
                        <div class="ae-in-w">
                            <div class="ae-lbl">Total Units You Own <span class="ae-req">*</span></div>
                            <div class="ae-stp-w">
                                <div class="ae-stp-c">
                                    <button class="ae-stp-btn b-tm" data-v="-1" ${ae.f.quantityTotal <= 1 ? 'disabled' : ''}>&minus;</button>
                                    <div class="ae-stp-v">${ae.f.quantityTotal}</div>
                                    <button class="ae-stp-btn b-tm" data-v="1" ${ae.f.quantityTotal >= 50 ? 'disabled' : ''}>&plus;</button>
                                </div>
                            </div>
                        </div>

                        <div class="ae-in-w">
                            <div class="ae-lbl">Currently Available for Rent <span class="ae-req">*</span></div>
                            <div class="ae-stp-w">
                                <div class="ae-stp-c">
                                    <button class="ae-stp-btn b-am" data-v="-1" ${ae.f.quantityAvailable <= 0 ? 'disabled' : ''}>&minus;</button>
                                    <div class="ae-stp-v">${ae.f.quantityAvailable}</div>
                                    <button class="ae-stp-btn b-am" data-v="1" ${ae.f.quantityAvailable >= ae.f.quantityTotal ? 'disabled' : ''}>&plus;</button>
                                </div>
                            </div>
                            <div class="ae-dt-r">${dtH}</div>
                            <div class="ae-dt-l">${ae.f.quantityAvailable} available, ${ae.f.quantityTotal - ae.f.quantityAvailable} currently rented</div>
                            <div class="ae-hp" style="margin-top:8px">Set lower if some units are already rented out</div>
                        </div>

                        <div class="ae-t-row">
                            <div style="flex:1">
                                <div class="ae-lbl" style="margin-bottom:2px">List as available</div>
                                <div class="ae-hp" style="margin:0">${ae.f.isAvailable ? 'Customers can find and enquire about this equipment' : 'This listing will be hidden from customers'}</div>
                            </div>
                            <div class="ae-t-tg ${ae.f.isAvailable ? 'active' : ''}" id="btn-tg"></div>
                        </div>
                    </div>

                    <div class="ae-ph">
                        <i class="ri-camera-fill ae-ph-i"></i>
                        <div class="ae-ph-t">Add photos (coming soon)</div>
                        <div class="ae-ph-s">Photos increase enquiries by 3&times;</div>
                    </div>
                    
                    <div>
                        <div class="ae-prv-s">How customers will see this</div>
                        <div class="ae-prv-l">Preview</div>
                        <div class="ae-prv-w">
                            <div class="ae-c-cd ${!ae.f.isAvailable ? 'u' : ''}">
                                <div class="ae-cv-nm">${ae.f.equipmentName || 'Equipment name...'}</div>
                                <div class="ae-cv-rw2">
                                    <div class="ae-p-cp">${ae.f.category || 'Category'}</div>
                                    ${ae.f.condition ? `<div class="ae-p-cd ${cnM(ae.f.condition)}">${ae.f.condition}</div>` : ''}
                                </div>
                                <div class="ae-cv-rw3">
                                    <i class="ri-wallet-3-line" style="color:#0D9488"></i>
                                    <div class="ae-v-pr">LKR ${ae.f.rentalPrice || '0'} / day</div>
                                    <div class="ae-v-sep">&middot;</div>
                                    <div class="ae-v-dp">LKR ${ae.f.deposit || '0'} deposit</div>
                                </div>
                                <div class="ae-cv-rw4">
                                    ${ae.f.quantityTotal <= 10 ? Array.from({ length: ae.f.quantityTotal }).map((_, i) => `<div class="ae-v-d ${i < ae.f.quantityAvailable ? 'a' : ''}"></div>`).join('') : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="ae-act">
                    <button class="ae-sub" id="btn-sub">${ae.isSubmitting ? `<div class="spinner" style="width:20px;height:20px;border:2px solid;border-top-color:#FFF;border-radius:50%;animation:spin 1s infinite;"></div>` : 'List Equipment'}</button>
                </div>
                ${dM}
            </div>
        `;
    }

    appElement.addEventListener('input', e => {
        const tg = e.target;
        if (tg.id === 'in-nm') { ae.f.equipmentName = tg.value; aeUpdateUI(); }
        if (tg.id === 'in-ds') { ae.f.description = tg.value; aeUpdateUI(); }
        if (tg.id === 'in-pr') { ae.f.rentalPrice = tg.value; aeUpdateUI(); }
        if (tg.id === 'in-dp') { ae.f.deposit = tg.value; aeUpdateUI(); }
    });

    appElement.addEventListener('click', async e => {
        const tg = e.target;

        if (tg.closest('#ae-bck')) {
            const isDirty = JSON.stringify(ae.f) !== dF;
            if (isDirty) { ae.showDiscard = true; return aeUpdateUI(); }
            return navigate(-1);
        }

        if (tg.closest('#da-cn') || tg.id === 'da-bg') { ae.showDiscard = false; return aeUpdateUI(); }
        if (tg.closest('#da-do')) return navigate(-1);

        const ctg = tg.closest('.ae-cp');
        if (ctg) { ae.f.category = ctg.dataset.cat; return aeUpdateUI(); }

        const cnd = tg.closest('.ae-cnd');
        if (cnd) { ae.f.condition = cnd.dataset.cnd; return aeUpdateUI(); }

        const bT = tg.closest('.b-tm');
        if (bT) {
            const m = parseInt(bT.dataset.v);
            ae.f.quantityTotal = Math.max(1, Math.min(50, ae.f.quantityTotal + m));
            if (ae.f.quantityAvailable > ae.f.quantityTotal) ae.f.quantityAvailable = ae.f.quantityTotal;
            return aeUpdateUI();
        }

        const bA = tg.closest('.b-am');
        if (bA) {
            const m = parseInt(bA.dataset.v);
            ae.f.quantityAvailable = Math.max(0, Math.min(ae.f.quantityTotal, ae.f.quantityAvailable + m));
            return aeUpdateUI();
        }

        if (tg.closest('#btn-tg')) { ae.f.isAvailable = !ae.f.isAvailable; return aeUpdateUI(); }

        if (tg.closest('#btn-sub')) {
            ae.formTouched = true;
            if (!validate()) {
                aeUpdateUI();
                showToast('Please check the highlighted fields', 'error');
                const cr = document.getElementById('ae-cx');
                if (cr) cr.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            if (ae.isSubmitting) return;
            ae.isSubmitting = true; aeUpdateUI();

            const payload = {
                equipmentName: ae.f.equipmentName.trim(),
                equipmentDescription: ae.f.description.trim(),
                category: ae.f.category,
                equipmentCondition: ae.f.condition,
                rentalPricePerDay: parseFloat(ae.f.rentalPrice),
                depositAmount: parseFloat(ae.f.deposit),
                quantityAvailable: ae.f.quantityAvailable,
                quantityTotal: ae.f.quantityTotal,
                isAvailable: ae.f.isAvailable
            };

            if (api.addEquipment) {
                try {
                    const r = await api.addEquipment(payload);
                    showToast('Equipment listed successfully! 🎉', 'success');
                    return navigate('/supplier/equipment', { state: { newEquipmentId: r.data?._id } });
                } catch (er) {
                    ae.isSubmitting = false; aeUpdateUI();
                    showToast(er.response?.data?.message || 'Connection failed. Check your network.', 'error');
                }
            } else {
                await new Promise(r => setTimeout(r, 1200));
                showToast('Equipment listed successfully! 🎉', 'success');
                return navigate('/supplier/equipment', { state: { newEquipmentId: 'm123' } });
            }
        }
    });

    aeUpdateUI();
}
