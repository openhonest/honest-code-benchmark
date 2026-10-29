import React, { useState, useEffect, useCallback } from 'react';

const COUNTRIES = ['US','CA','MX','GB','DE','FR','JP','AU','BR','IN'];
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

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

function Field({ label, name, fields, errors, onChange, type = 'text' }) {
  const hasError = errors[name];
  return (
    <div className={`form-field${hasError ? ' has-error' : ''}`}>
      <label>{label} *</label>
      <input type={type} value={fields[name]} onChange={e => onChange(name, e.target.value)} data-field={name} />
      {hasError && <span className="error" data-role="error">{label} is required</span>}
    </div>
  );
}

function SelectField({ label, name, options, fields, errors, onChange }) {
  const hasError = errors[name];
  return (
    <div className={`form-field${hasError ? ' has-error' : ''}`}>
      <label>{label} *</label>
      <select value={fields[name]} onChange={e => onChange(name, e.target.value)} data-field={name}>
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hasError && <span className="error" data-role="error">{label} is required</span>}
    </div>
  );
}

function prefillFromRecord(rec) {
  return {
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

export default function App({ initialData }) {
  const firstRec = initialData?.[0];
  const [fields, setFields] = useState(firstRec ? prefillFromRecord(firstRec) : { ...EMPTY_FIELDS });
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!initialData && typeof window !== 'undefined') {
      const config = window.__BENCHMARK_CONFIG__;
      fetch(config.dataUrl)
        .then(r => r.json())
        .then(data => { if (data[0]) setFields(prefillFromRecord(data[0])); });
    }
  }, [initialData]);

  const handleChange = useCallback((name, value) => {
    setFields(prev => ({ ...prev, [name]: value }));
    setErrors(prev => {
      if (prev[name]) { const next = { ...prev }; delete next[name]; return next; }
      return prev;
    });
  }, []);

  const validate = useCallback((stepNum) => {
    const required = REQUIRED[stepNum] || [];
    const newErrors = {};
    for (const f of required) {
      if (!fields[f]?.trim()) newErrors[f] = true;
    }
    if (stepNum === 3 && fields.accountType === 'business') {
      if (!fields.companyName?.trim()) newErrors.companyName = true;
      if (!fields.taxId?.trim()) newErrors.taxId = true;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fields]);

  const handleNext = useCallback(() => {
    if (validate(step)) setStep(s => s + 1);
  }, [step, validate]);

  const handlePrev = useCallback(() => {
    setErrors({});
    setStep(s => s - 1);
  }, []);

  const handleSubmit = useCallback(() => {
    document.dispatchEvent(new CustomEvent('benchmark:form-submit', { detail: fields }));
  }, [fields]);

  return (
    <div className="app">
      <div className="form-progress">
        {[1,2,3,4].map(s => (
          <span key={s} className={`step-dot${s === step ? ' active' : ''}${s < step ? ' done' : ''}`}>{s}</span>
        ))}
      </div>

      {step === 1 && (
        <div className="form-step" data-step="1">
          <h2>Contact Information</h2>
          <Field label="First Name" name="firstName" fields={fields} errors={errors} onChange={handleChange} />
          <Field label="Last Name" name="lastName" fields={fields} errors={errors} onChange={handleChange} />
          <Field label="Email" name="email" fields={fields} errors={errors} onChange={handleChange} type="email" />
          <Field label="Phone" name="phone" fields={fields} errors={errors} onChange={handleChange} type="tel" />
          <div className="form-actions">
            <button onClick={handleNext} data-role="next-step">Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="form-step" data-step="2">
          <h2>Address</h2>
          <Field label="Street" name="street" fields={fields} errors={errors} onChange={handleChange} />
          <Field label="City" name="city" fields={fields} errors={errors} onChange={handleChange} />
          <SelectField label="State" name="state" options={US_STATES} fields={fields} errors={errors} onChange={handleChange} />
          <Field label="ZIP" name="zip" fields={fields} errors={errors} onChange={handleChange} />
          <SelectField label="Country" name="country" options={COUNTRIES} fields={fields} errors={errors} onChange={handleChange} />
          <div className="form-actions">
            <button onClick={handlePrev} data-role="prev-step">Previous</button>
            <button onClick={handleNext} data-role="next-step">Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="form-step" data-step="3">
          <h2>Account Type</h2>
          <div className="form-field">
            <label>Account Type *</label>
            <select
              value={fields.accountType}
              onChange={e => handleChange('accountType', e.target.value)}
              data-role="account-type"
              data-field="accountType"
            >
              <option value="individual">Individual</option>
              <option value="business">Business</option>
            </select>
          </div>
          {fields.accountType === 'business' && (
            <>
              <Field label="Company Name" name="companyName" fields={fields} errors={errors} onChange={handleChange} />
              <Field label="Tax ID" name="taxId" fields={fields} errors={errors} onChange={handleChange} />
              <Field label="PO Number" name="poNumber" fields={fields} errors={errors} onChange={handleChange} />
            </>
          )}
          <div className="form-actions">
            <button onClick={handlePrev} data-role="prev-step">Previous</button>
            <button onClick={handleNext} data-role="next-step">Next</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="form-step" data-step="4">
          <h2>Review</h2>
          <dl className="review-list">
            <dt>Name</dt><dd>{fields.firstName} {fields.lastName}</dd>
            <dt>Email</dt><dd>{fields.email}</dd>
            <dt>Phone</dt><dd>{fields.phone}</dd>
            <dt>Address</dt><dd>{fields.street}, {fields.city}, {fields.state} {fields.zip}</dd>
            <dt>Country</dt><dd>{fields.country}</dd>
            <dt>Account Type</dt><dd>{fields.accountType}</dd>
            {fields.accountType === 'business' && (
              <>
                <dt>Company</dt><dd>{fields.companyName}</dd>
                <dt>Tax ID</dt><dd>{fields.taxId}</dd>
                {fields.poNumber && <><dt>PO Number</dt><dd>{fields.poNumber}</dd></>}
              </>
            )}
          </dl>
          <div className="form-actions">
            <button onClick={handlePrev} data-role="prev-step">Previous</button>
            <button onClick={handleSubmit} className="primary" data-role="submit">Submit</button>
          </div>
        </div>
      )}
    </div>
  );
}
