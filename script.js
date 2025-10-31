const LS_KEY = 'crm-customers';

let customers = [];
let nextId = 1;

const customersList = document.getElementById('customers-list');
const customerForm = document.getElementById('customer-form');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const idInput = document.getElementById('customer-id');
const totalCountEl = document.getElementById('total-count');

init();

function init() {
    if (!customerForm) {
        console.error('טופס הלקוחות לא אותר בדף.');
        return;
    }

    customerForm.addEventListener('submit', handleSubmit);
    cancelBtn?.addEventListener('click', resetFormState);

    fetchCustomers();
}

async function fetchCustomers() {
    try {
        const local = localStorage.getItem(LS_KEY);

        if (local) {
            customers = JSON.parse(local) || [];
        } else {
            const fallback = await fetch('customers.json', { cache: 'no-store' });
            if (fallback.ok) {
                const data = await fallback.json();
                customers = Array.isArray(data) ? data : [];
                persist();
            } else {
                customers = [];
            }
        }
    } catch (error) {
        console.error('טעינת הלקוחות נכשלה:', error);
        customers = [];
    }

    nextId = computeNextId(customers);
    renderCustomers();
}

function handleSubmit(event) {
    event.preventDefault();

    const payload = collectFormData();
    if (!payload.fullName) {
        return;
    }

    const editId = idInput?.value ? Number(idInput.value) : null;
    const now = new Date().toISOString();

    if (editId) {
        const index = customers.findIndex(c => Number(c.id) === editId);
        if (index !== -1) {
            customers[index] = {
                ...customers[index],
                ...payload,
                updatedAt: now,
            };
        }
    } else {
        const newCustomer = {
            id: nextId,
            ...payload,
            createdAt: now,
            updatedAt: now,
            lastTouch: null,
        };
        customers.push(newCustomer);
        nextId += 1;
    }

    persist();
    renderCustomers();
    resetFormState();
}

function collectFormData() {
    const formData = new FormData(customerForm);
    const tagsRaw = (formData.get('tags') || '').toString();

    return {
        fullName: (formData.get('fullName') || '').toString().trim(),
        phone: (formData.get('phone') || '').toString().trim(),
        email: (formData.get('email') || '').toString().trim(),
        company: (formData.get('company') || '').toString().trim(),
        status: (formData.get('status') || 'lead').toString(),
        tags: tagsRaw
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean),
        note: (formData.get('note') || '').toString().trim(),
    };
}

function renderCustomers() {
    if (!customersList) {
        return;
    }

    customersList.innerHTML = '';

    if (!Array.isArray(customers) || customers.length === 0) {
        const emptyState = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.className = 'empty-state';
        cell.textContent = 'עוד לא הוספתם לקוחות. התחילו בצד שמאל!';
        emptyState.appendChild(cell);
        customersList.appendChild(emptyState);
    } else {
        customers.forEach(customer => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${escapeHtml(customer.fullName)}</td>
                <td>${escapeHtml(customer.phone || '')}</td>
                <td>${escapeHtml(customer.email || '')}</td>
                <td>${formatStatus(customer.status)}</td>
                <td>${formatTags(customer.tags)}</td>
                <td class="table-actions"></td>
            `;

            const actionsCell = row.querySelector('.table-actions');
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.textContent = 'עריכה';
            editBtn.addEventListener('click', () => editCustomer(customer.id));

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.textContent = 'מחיקה';
            deleteBtn.addEventListener('click', () => deleteCustomer(customer.id));

            actionsCell?.appendChild(editBtn);
            actionsCell?.appendChild(deleteBtn);
            customersList.appendChild(row);
        });
    }

    if (totalCountEl) {
        totalCountEl.textContent = customers.length.toString();
    }
}

function editCustomer(id) {
    const customer = customers.find(c => Number(c.id) === Number(id));
    if (!customer) {
        return;
    }

    customerForm.elements.fullName.value = customer.fullName || '';
    customerForm.elements.phone.value = customer.phone || '';
    customerForm.elements.email.value = customer.email || '';
    customerForm.elements.company.value = customer.company || '';
    customerForm.elements.status.value = customer.status || 'lead';
    customerForm.elements.tags.value = Array.isArray(customer.tags) ? customer.tags.join(', ') : (customer.tags || '');
    customerForm.elements.note.value = customer.note || '';

    if (idInput) {
        idInput.value = customer.id;
    }

    submitBtn.textContent = 'שמירת עדכון';
    if (cancelBtn) {
        cancelBtn.style.display = 'inline-block';
    }
}

function deleteCustomer(id) {
    const next = customers.filter(customer => Number(customer.id) !== Number(id));
    if (next.length === customers.length) {
        return;
    }

    customers = next;
    persist();
    renderCustomers();
    resetFormState();
}

function resetFormState() {
    customerForm.reset();
    if (idInput) {
        idInput.value = '';
    }

    submitBtn.textContent = 'הוספת לקוח';
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
}

function persist() {
    localStorage.setItem(LS_KEY, JSON.stringify(customers));
    nextId = computeNextId(customers);
}

function computeNextId(list) {
    const maxId = list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
    return maxId + 1;
}

function formatStatus(status) {
    const STATUS_LABELS = {
        lead: 'ליד',
        contacted: 'בטיפול',
        customer: 'לקוח פעיל',
        inactive: 'לא פעיל',
    };

    return STATUS_LABELS[status] || status || '';
}

function formatTags(tags) {
    if (Array.isArray(tags) && tags.length) {
        return tags.map(escapeHtml).join(', ');
    }

    return escapeHtml(tags || '');
}

function escapeHtml(value) {
    return !value ? '' : value
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
