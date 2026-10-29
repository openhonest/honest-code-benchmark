import { create } from 'zustand';

const REQUIRED = {
  1: ['firstName', 'lastName', 'email', 'phone'],
  2: ['street', 'city', 'state', 'zip', 'country'],
  3: ['accountType'],
};

export const useFormStore = create((set, get) => ({
  fields: {
    firstName: '', lastName: '', email: '', phone: '',
    street: '', city: '', state: '', zip: '', country: '',
    accountType: 'individual', companyName: '', taxId: '', poNumber: '',
  },
  step: 1,
  errors: {},

  prefill: (rec) => set({
    fields: {
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
    },
  }),

  setField: (name, value) => set(s => {
    const errors = { ...s.errors };
    if (errors[name]) delete errors[name];
    return { fields: { ...s.fields, [name]: value }, errors };
  }),

  nextStep: () => set(s => {
    const required = REQUIRED[s.step] || [];
    const newErrors = {};
    for (const f of required) {
      if (!s.fields[f]?.trim()) newErrors[f] = true;
    }
    if (s.step === 3 && s.fields.accountType === 'business') {
      if (!s.fields.companyName?.trim()) newErrors.companyName = true;
      if (!s.fields.taxId?.trim()) newErrors.taxId = true;
    }
    if (Object.keys(newErrors).length > 0) return { errors: newErrors };
    return { step: s.step + 1, errors: {} };
  }),

  prevStep: () => set(s => ({ step: s.step - 1, errors: {} })),
}));
