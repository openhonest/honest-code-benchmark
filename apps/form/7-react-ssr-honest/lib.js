export const COUNTRIES = ['US','CA','MX','GB','DE','FR','JP','AU','BR','IN'];

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

export const STEP_REQUIRED_FIELDS = {
  1: ['firstName', 'lastName', 'email', 'phone'],
  2: ['street', 'city', 'state', 'zip', 'country'],
  3: ['accountType'],
};

export const EMPTY_FIELDS = {
  firstName: '', lastName: '', email: '', phone: '',
  street: '', city: '', state: '', zip: '', country: '',
  accountType: 'individual', companyName: '', taxId: '', poNumber: '',
};

export function prefill_from_record(record) {
  return {
    firstName: record.firstName || '',
    lastName: record.lastName || '',
    email: record.email || '',
    phone: record.phone || '',
    street: record.street || '',
    city: record.city || '',
    state: record.state || '',
    zip: record.zip || '',
    country: record.country || '',
    accountType: record.accountType || 'individual',
    companyName: record.companyName || '',
    taxId: record.taxId || '',
    poNumber: record.poNumber || '',
  };
}

export function validate_step(fields, stepNum) {
  const required = STEP_REQUIRED_FIELDS[stepNum] || [];
  const errors = {};
  for (const f of required) {
    if (!fields[f]?.trim()) errors[f] = true;
  }
  return errors;
}

export function validate_business(fields) {
  if (fields.accountType !== 'business') return {};
  const errors = {};
  if (!fields.companyName?.trim()) errors.companyName = true;
  if (!fields.taxId?.trim()) errors.taxId = true;
  return errors;
}

export function next_step(fields, currentStep) {
  const stepErrors = validate_step(fields, currentStep);
  const bizErrors = currentStep === 3 ? validate_business(fields) : {};
  const merged = { ...stepErrors, ...bizErrors };
  if (Object.keys(merged).length > 0) return merged;
  return currentStep + 1;
}

export function update_field(fields, name, value) {
  return { ...fields, [name]: value };
}

export function clear_error(errors, name) {
  if (!errors[name]) return errors;
  const next = { ...errors };
  delete next[name];
  return next;
}

export function format_review(fields) {
  const lines = [
    { label: 'Name', value: `${fields.firstName} ${fields.lastName}` },
    { label: 'Email', value: fields.email },
    { label: 'Phone', value: fields.phone },
    { label: 'Address', value: `${fields.street}, ${fields.city}, ${fields.state} ${fields.zip}` },
    { label: 'Country', value: fields.country },
    { label: 'Account Type', value: fields.accountType },
  ];
  if (fields.accountType === 'business') {
    lines.push({ label: 'Company', value: fields.companyName });
    lines.push({ label: 'Tax ID', value: fields.taxId });
    if (fields.poNumber) {
      lines.push({ label: 'PO Number', value: fields.poNumber });
    }
  }
  return lines;
}
