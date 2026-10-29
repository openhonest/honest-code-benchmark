const REQUIRED = {
  1: ['firstName', 'lastName', 'email', 'phone'],
  2: ['street', 'city', 'state', 'zip', 'country'],
  3: ['accountType'],
};

const EMPTY_FIELDS = {
  firstName: '', lastName: '', email: '', phone: '',
  street: '', city: '', state: '', zip: '', country: '',
  accountType: 'individual', companyName: '', taxId: '', poNumber: '',
};

export class FormModel {
  constructor() {
    this.fields = { ...EMPTY_FIELDS };
    this.step = 1;
    this.errors = {};
  }

  static fromData(data) {
    const m = new FormModel();
    if (data && data[0]) m.prefill(data[0]);
    return m;
  }

  prefill(rec) {
    this.fields = {
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

  setField(name, value) {
    this.fields[name] = value;
    if (this.errors[name]) {
      const next = { ...this.errors };
      delete next[name];
      this.errors = next;
    }
  }

  validate(stepNum) {
    const required = REQUIRED[stepNum] || [];
    const newErrors = {};
    for (const f of required) {
      if (!this.fields[f]?.trim()) newErrors[f] = true;
    }
    if (stepNum === 3 && this.fields.accountType === 'business') {
      if (!this.fields.companyName?.trim()) newErrors.companyName = true;
      if (!this.fields.taxId?.trim()) newErrors.taxId = true;
    }
    this.errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  nextStep() {
    if (this.validate(this.step)) this.step++;
  }

  prevStep() {
    this.errors = {};
    this.step--;
  }

  isBusiness() {
    return this.fields.accountType === 'business';
  }

  submit() {
    return { ...this.fields };
  }
}
