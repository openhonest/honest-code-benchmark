import { signal, computed } from '@preact/signals-react';

const REQUIRED = {
  1: ['firstName', 'lastName', 'email', 'phone'],
  2: ['street', 'city', 'state', 'zip', 'country'],
  3: ['accountType'],
};

export const fields = signal({
  firstName: '', lastName: '', email: '', phone: '',
  street: '', city: '', state: '', zip: '', country: '',
  accountType: 'individual', companyName: '', taxId: '', poNumber: '',
});
export const step = signal(1);
export const errors = signal({});

export function prefill(rec) {
  fields.value = {
    firstName: rec.firstName || '',
    lastName: rec.lastName || '',
    email: rec.email || '',
    phone: rec.phone || '',
    street: rec.street || '',
    city: rec.city || '',
    state: rec.state || '',
    zip: rec.zip || '',
    country: rec.country || '',
    accountType: rec.accountType || 'individual',
    companyName: rec.companyName || '',
    taxId: rec.taxId || '',
    poNumber: rec.poNumber || '',
  };
}

export function setField(name, value) {
  fields.value = { ...fields.value, [name]: value };
  if (errors.value[name]) {
    const next = { ...errors.value };
    delete next[name];
    errors.value = next;
  }
}

export function nextStep() {
  const s = step.value;
  const f = fields.value;
  const required = REQUIRED[s] || [];
  const newErrors = {};
  for (const r of required) {
    if (!f[r]?.trim()) newErrors[r] = true;
  }
  if (s === 3 && f.accountType === 'business') {
    if (!f.companyName?.trim()) newErrors.companyName = true;
    if (!f.taxId?.trim()) newErrors.taxId = true;
  }
  errors.value = newErrors;
  if (Object.keys(newErrors).length === 0) step.value = s + 1;
}

export function prevStep() {
  errors.value = {};
  step.value = step.value - 1;
}
