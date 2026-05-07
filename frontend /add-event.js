

const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'index.html';
    throw new Error('Not authenticated');
}
try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role === 'student') {
        window.location.href = 'notices.html';
        throw new Error('Access denied');
    }
} catch(e) {
    if (e.message === 'Access denied') throw e;
}

let images = [];
let fieldCount = 0;

function toast(msg, type = 'info') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'show ' + type;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.className = '', 3500);
}

const imageInput = document.getElementById('imageInput');
const previewGrid = document.getElementById('previewGrid');

imageInput.addEventListener('change', function () {
    const files = Array.from(imageInput.files);
    images.push(...files);
    renderPreview();
});

function renderPreview() {
    previewGrid.innerHTML = '';
    images.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        const btn = document.createElement('button');
        btn.className = 'remove-img';
        btn.innerHTML = '×';
        btn.onclick = (e) => { e.preventDefault(); images.splice(index, 1); renderPreview(); };
        div.appendChild(img);
        div.appendChild(btn);
        previewGrid.appendChild(div);
    });
}

function toggleRegCard() {
    const cb = document.getElementById('requiresRegistration');
    cb.checked = !cb.checked;
    onRegToggle(cb);
}

function onRegToggle(cb) {
    const container = document.getElementById('formFieldsContainer');
    const card      = document.getElementById('regToggleCard');
    container.style.display = cb.checked ? 'block' : 'none';
    card.classList.toggle('active', cb.checked);

    if (cb.checked && document.getElementById('fields').children.length === 0) {
        addDefaultFields();
    }
}

function addDefaultFields() {
    const defaults = [
        { fieldName: 'name',      label: 'Full Name',    type: 'text',   required: true  },
        { fieldName: 'email',     label: 'Email Address',type: 'email',  required: true  },
        { fieldName: 'studentId', label: 'Student ID',   type: 'text',   required: true  },
        { fieldName: 'phone',     label: 'Phone Number', type: 'text',   required: false },
    ];
    defaults.forEach(f => addField(f));
}

function addField(defaults = {}) {
    fieldCount++;
    const id = 'field_' + fieldCount;
    const container = document.getElementById('fields');

    const div = document.createElement('div');
    div.className = 'field-row';
    div.id = id;

    div.innerHTML = `
        <div class="field-row-grid">
            <div>
                <label class="small-label">Field Name (key)</label>
                <input type="text" class="fname" placeholder="e.g. studentId, phone" value="${defaults.fieldName || ''}">
            </div>
            <div>
                <label class="small-label">Display Label</label>
                <input type="text" class="flabel" placeholder="e.g. Student ID" value="${defaults.label || ''}">
            </div>
            <div>
                <label class="small-label">Type</label>
                <select class="ftype">
                    <option value="text" ${defaults.type==='text'?'selected':''}>Text</option>
                    <option value="email" ${defaults.type==='email'?'selected':''}>Email</option>
                    <option value="number" ${defaults.type==='number'?'selected':''}>Number</option>
                    <option value="tel" ${defaults.type==='tel'?'selected':''}>Phone</option>
                </select>
            </div>
            <div class="req-checkbox">
                <input type="checkbox" class="freq" id="freq_${fieldCount}" ${defaults.required?'checked':''}>
                <label for="freq_${fieldCount}">Required</label>
                <button type="button" class="remove-field" onclick="removeField('${id}')" title="Remove field">×</button>
            </div>
        </div>
    `;

    container.appendChild(div);
}

function removeField(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function goBackHome() { window.location.href = 'notices.html'; }

function setStepIndicator(activeStep) {
    for (let i = 1; i <= 3; i++) {
        const s = document.getElementById('step-ind-' + i);
        if (i < activeStep) { s.className = 'step done'; s.querySelector('.step-num').textContent = '✓'; }
        else if (i === activeStep) { s.className = 'step active'; s.querySelector('.step-num').textContent = i; }
        else { s.className = 'step'; s.querySelector('.step-num').textContent = i; }
        if (i < 3) {
            const d = document.getElementById('div-' + i);
            d.className = 'step-divider' + (i < activeStep ? ' done' : '');
        }
    }
}

function goToStep2() {
    const title    = document.getElementById('title').value.trim();
    const category = document.getElementById('category').value;

    if (!title)    { toast('Please enter an event title!', 'error'); return; }
    if (!category) { toast('Please select a category!', 'error'); return; }

    document.getElementById('step1').classList.add('hidden');
    document.getElementById('step2').classList.remove('hidden');
    setStepIndicator(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToStep1() {
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step1').classList.remove('hidden');
    setStepIndicator(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToStep3() {
    const start = document.getElementById('startDate').value;
    const end   = document.getElementById('endDate').value;

    if (!start) { toast('Please select a start date!', 'error'); return; }
    if (!end)   { toast('Please select an end date!', 'error'); return; }
    if (end < start) { toast('End date cannot be before start date!', 'error'); return; }

    const requiresReg = document.getElementById('requiresRegistration').checked;
    if (requiresReg) {
        const fieldDivs = document.querySelectorAll('#fields > .field-row');
        for (const div of fieldDivs) {
            const fname = div.querySelector('.fname').value.trim();
            const flabel = div.querySelector('.flabel').value.trim();
            if (!fname || !flabel) { toast('Fill in all field names and labels!', 'error'); return; }
        }
    }

    buildReview();
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.remove('hidden');
    setStepIndicator(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToStep2() {
    const title    = document.getElementById('title').value.trim();
    const category = document.getElementById('category').value;
    if (!title)    { toast('Please enter an event title!', 'error'); return; }
    if (!category) { toast('Please select a category!', 'error'); return; }
    document.getElementById('step1').classList.add('hidden');
    document.getElementById('step2').classList.remove('hidden');
    setStepIndicator(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildReview() {
    const title       = document.getElementById('title').value.trim();
    const category    = document.getElementById('category').value;
    const desc        = document.getElementById('description').value.trim();
    const start       = document.getElementById('startDate').value;
    const end         = document.getElementById('endDate').value;
    const requiresReg = document.getElementById('requiresRegistration').checked;
    const fieldDivs   = document.querySelectorAll('#fields > .field-row');

    let fieldsHTML = '';
    if (requiresReg && fieldDivs.length > 0) {
        fieldsHTML = '<div style="margin-top:14px;"><strong style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Registration Fields:</strong><ul style="margin-top:8px;padding-left:0;list-style:none;display:flex;flex-wrap:wrap;gap:8px;">';
        fieldDivs.forEach(div => {
            const fname = div.querySelector('.fname').value.trim();
            const flabel = div.querySelector('.flabel').value.trim();
            const freq  = div.querySelector('.freq').checked;
            fieldsHTML += `<li style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:5px 12px;font-size:13px;font-weight:600;color:#1e40af;">${flabel} <code style="font-size:11px;color:#64748b">(${fname})${freq?' *':''}</code></li>`;
        });
        fieldsHTML += '</ul></div>';
    }

    document.getElementById('reviewContent').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;font-size:14px;">
            <div><span style="color:#64748b;font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:.05em;">Title</span><p style="font-weight:700;color:#0f172a;margin-top:4px;">${escHtml(title)}</p></div>
            <div><span style="color:#64748b;font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:.05em;">Category</span><p style="margin-top:4px;"><span style="background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">${escHtml(category)}</span></p></div>
            <div><span style="color:#64748b;font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:.05em;">Start Date</span><p style="font-weight:600;margin-top:4px;">${new Date(start).toDateString()}</p></div>
            <div><span style="color:#64748b;font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:.05em;">End Date</span><p style="font-weight:600;margin-top:4px;">${new Date(end).toDateString()}</p></div>
            ${desc ? `<div style="grid-column:1/-1"><span style="color:#64748b;font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:.05em;">Description</span><p style="color:#374151;margin-top:4px;line-height:1.6;">${escHtml(desc)}</p></div>` : ''}
            <div style="grid-column:1/-1"><span style="color:#64748b;font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:.05em;">Registration Required</span><p style="margin-top:4px;"><span style="background:${requiresReg?'#dcfce7':'#f1f5f9'};color:${requiresReg?'#15803d':'#64748b'};padding:3px 12px;border-radius:20px;font-size:12.5px;font-weight:700;">${requiresReg?'✓ Yes':'✗ No'}</span></p></div>
        </div>
        ${images.length > 0 ? `<div style="margin-top:14px;"><span style="color:#64748b;font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:.05em;">Image</span><p style="margin-top:6px;font-size:13.5px;color:#374151;">📷 ${images.length} image(s) selected</p></div>` : ''}
        ${fieldsHTML}
    `;
}

function escHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
}

async function submitEvent() {
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Posting...';

    const title       = document.getElementById('title').value.trim();
    const desc        = document.getElementById('description').value.trim();
    const category    = document.getElementById('category').value;
    const start       = document.getElementById('startDate').value;
    const end         = document.getElementById('endDate').value;
    const requiresReg = document.getElementById('requiresRegistration').checked;

    // Collect form fields
    let formFields = [];
    if (requiresReg) {
        const fieldDivs = document.querySelectorAll('#fields > .field-row');
        fieldDivs.forEach(div => {
            const fname = div.querySelector('.fname').value.trim();
            const flabel = div.querySelector('.flabel').value.trim();
            if (fname && flabel) {
                formFields.push({
                    fieldName: fname,
                    label:     flabel,
                    type:      div.querySelector('.ftype').value,
                    required:  div.querySelector('.freq').checked
                });
            }
        });
    }

    const formData = new FormData();
    formData.append('title',       title);
    formData.append('description', desc);
    formData.append('category',    category);
    formData.append('startDate',   start);
    formData.append('endDate',     end);
    formData.append('requiresRegistration', requiresReg);
    formData.append('formFields',  JSON.stringify(formFields));
    if (images.length > 0) formData.append('image', images[0]);

    try {
        const res = await fetch('http://localhost:3000/api/events/addEvent', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            toast('🎉 Event posted successfully!', 'success');
            setTimeout(() => window.location.href = 'notices.html', 1400);
        } else {
            toast(data.message || 'Failed to post event', 'error');
            btn.disabled = false;
            btn.textContent = '🎟️ Post Event';
        }
    } catch(err) {
        console.error('Submit error:', err);
        toast('Network error. Please try again.', 'error');
        btn.disabled = false;
        btn.textContent = '🎟️ Post Event';
    }
}
