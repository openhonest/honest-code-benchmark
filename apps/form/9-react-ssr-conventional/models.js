const REQUIRED = {
  1: ['firstName', 'lastName', 'email', 'phone'],
  2: ['street', 'city', 'state', 'zip', 'country'],
  3: ['accountType'],
};

export const EMPTY_FIELDS = {
  firstName: '', lastName: '', email: '', phone: '',
  street: '', city: '', state: '', zip: '', country: '',
  accountType: 'individual', companyName: '', taxId: '', poNumber: '',
};

export class RegistrationForm {
  static TOTAL_STEPS = 4;

  // The shared client renders step 1 empty and prefills from the first
  // record after hydration, so the server starts from the same state.
  static initial(records) {
    return new RegistrationForm({ ...EMPTY_FIELDS }, 1, {}, records);
  }

  constructor(fields, step, errors, records = []) {
    this.fields = fields;
    this.step = step;
    this.errors = errors;
    this.records = records;
  }

  isRequired(name) {
    return Object.values(REQUIRED).some(list => list.includes(name));
  }

  hasError(name) {
    return !!this.errors[name];
  }

  get steps() {
    return Array.from({ length: RegistrationForm.TOTAL_STEPS }, (_, i) => i + 1);
  }
}
