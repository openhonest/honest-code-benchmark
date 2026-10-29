import { configureStore, createSlice } from '@reduxjs/toolkit';

const REQUIRED = {
  1: ['firstName', 'lastName', 'email', 'phone'],
  2: ['street', 'city', 'state', 'zip', 'country'],
  3: ['accountType'],
};

const formSlice = createSlice({
  name: 'form',
  initialState: {
    fields: {
      firstName: '', lastName: '', email: '', phone: '',
      street: '', city: '', state: '', zip: '', country: '',
      accountType: 'individual', companyName: '', taxId: '', poNumber: '',
    },
    step: 1,
    errors: {},
  },
  reducers: {
    prefill(state, action) {
      const rec = action.payload;
      state.fields = {
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
    },
    setField(state, action) {
      const { name, value } = action.payload;
      state.fields[name] = value;
      if (state.errors[name]) delete state.errors[name];
    },
    nextStep(state) {
      const required = REQUIRED[state.step] || [];
      const newErrors = {};
      for (const f of required) {
        if (!state.fields[f]?.trim()) newErrors[f] = true;
      }
      if (state.step === 3 && state.fields.accountType === 'business') {
        if (!state.fields.companyName?.trim()) newErrors.companyName = true;
        if (!state.fields.taxId?.trim()) newErrors.taxId = true;
      }
      state.errors = newErrors;
      if (Object.keys(newErrors).length === 0) state.step += 1;
    },
    prevStep(state) {
      state.errors = {};
      state.step -= 1;
    },
  },
});

export const { prefill, setField, nextStep, prevStep } = formSlice.actions;
export const store = configureStore({
  reducer: { form: formSlice.reducer },
  middleware: (getDefault) => getDefault(),
});
