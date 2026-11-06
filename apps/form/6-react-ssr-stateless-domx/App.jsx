import React, { useState, useEffect, useCallback, useRef } from 'react';
import { collect, apply, observe } from 'stateless-dataos';

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

const stateManifest = {
  step:   { selector: '#form-state', read: 'data:step',   write: 'data:step' },
  fields: { selector: '#form-state', read: 'data:fields', write: 'data:fields' },
  errors: { selector: '#form-state', read: 'data:errors', write: 'data:errors' },
};

// The DOM element #form-state is the single source of truth. Writes go
// through domx apply(); every handler reads the current state back from the
// DOM, so a second input event that arrives before React re-renders does
// not overwrite the first with a stale copy.
let notify = null;

function writeState(updates) {
  apply(stateManifest, updates);
  if (notify) notify();
}

function readState() {
  return collect(stateManifest);
}

function parseJSON(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// SSR-safe version of useDomState: the server render and the first client
// render use the initial values; the DOM is read only after hydration.
function useDomStateSSR(manifest) {
  const [domState, setDomState] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setDomState(collect(manifest));
    notify = sync;
    sync();
    setReady(true);
    const unsub = observe(manifest, sync);
    return () => { notify = null; unsub(); };
  }, []);

  return { domState, ready };
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

function updateField(name, value) {
  const current = readState();
  const next = { ...parseJSON(current.fields, EMPTY_FIELDS), [name]: value };
  const errs = { ...parseJSON(current.errors, {}) };
  delete errs[name];
  writeState({ fields: JSON.stringify(next), errors: JSON.stringify(errs) });
}

function Field({ label, name, fields, errors, type = 'text' }) {
  const hasError = errors[name];
  return (
    <div className={`form-field${hasError ? ' has-error' : ''}`}>
      <label>{label} *</label>
      <input
        type={type}
        value={fields[name]}
        onChange={e => updateField(name, e.target.value)}
        data-field={name}
      />
      {hasError && <span className="error" data-role="error">{label} is required</span>}
    </div>
  );
}

function SelectField({ label, name, options, fields, errors }) {
  const hasError = errors[name];
  return (
    <div className={`form-field${hasError ? ' has-error' : ''}`}>
      <label>{label} *</label>
      <select
        value={fields[name]}
        onChange={e => updateField(name, e.target.value)}
        data-field={name}
      >
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hasError && <span className="error" data-role="error">{label} is required</span>}
    </div>
  );
}

export default function App({ initialData }) {
  const { domState, ready } = useDomStateSSR(stateManifest);
  // Prefill from the first record, computed once so that later renders
  // (and the seeding effect below) see the same values the server rendered.
  const initialRef = useRef(null);
  if (initialRef.current === null) {
    initialRef.current = initialData?.[0] ? prefillFromRecord(initialData[0]) : EMPTY_FIELDS;
  }
  const initialFields = initialRef.current;

  const step = ready ? (parseInt(domState.step, 10) || 1) : 1;
  const fields = ready ? parseJSON(domState.fields, initialFields) : initialFields;
  const errors = ready ? parseJSON(domState.errors, {}) : {};

  // CSR fallback: fetch data if no SSR data provided
  useEffect(() => {
    if (!initialData && typeof window !== 'undefined') {
      const config = window.__BENCHMARK_CONFIG__;
      fetch(config.dataUrl)
        .then(r => r.json())
        .then(data => {
          const rec = data[0];
          if (!rec) return;
          writeState({
            step: '1',
            fields: JSON.stringify(prefillFromRecord(rec)),
            errors: '{}',
          });
        });
    }
  }, [initialData]);

  // The server already rendered #form-state with the initial values, so
  // there is nothing to seed after hydration.

  const handleNext = useCallback(() => {
    const current = readState();
    const stepNum = parseInt(current.step, 10) || 1;
    const f = parseJSON(current.fields, initialFields);
    const required = REQUIRED[stepNum] || [];
    const newErrors = {};
    for (const key of required) {
      if (!f[key]?.trim()) newErrors[key] = true;
    }
    if (stepNum === 3 && f.accountType === 'business') {
      if (!f.companyName?.trim()) newErrors.companyName = true;
      if (!f.taxId?.trim()) newErrors.taxId = true;
    }
    if (Object.keys(newErrors).length > 0) {
      writeState({ errors: JSON.stringify(newErrors) });
    } else {
      writeState({ step: String(stepNum + 1), errors: '{}' });
    }
  }, []);

  const handlePrev = useCallback(() => {
    const stepNum = parseInt(readState().step, 10) || 1;
    writeState({ step: String(Math.max(stepNum - 1, 1)), errors: '{}' });
  }, []);

  const handleSubmit = useCallback(() => {
    const detail = parseJSON(readState().fields, initialFields);
    document.dispatchEvent(new CustomEvent('benchmark:form-submit', { detail }));
  }, []);

  return (
    <div className="app">
      <div id="form-state"
        data-step="1"
        data-fields={JSON.stringify(initialFields)}
        data-errors="{}"
        style={{ display: 'none' }}
      />

      <div className="form-progress">
        {[1,2,3,4].map(s => (
          <span key={s} className={`step-dot${s === step ? ' active' : ''}${s < step ? ' done' : ''}`}>{s}</span>
        ))}
      </div>

      {step === 1 && (
        <div className="form-step" data-step="1">
          <h2>Contact Information</h2>
          <Field label="First Name" name="firstName" fields={fields} errors={errors} />
          <Field label="Last Name" name="lastName" fields={fields} errors={errors} />
          <Field label="Email" name="email" fields={fields} errors={errors} type="email" />
          <Field label="Phone" name="phone" fields={fields} errors={errors} type="tel" />
          <div className="form-actions">
            <button onClick={handleNext} data-role="next-step">Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="form-step" data-step="2">
          <h2>Address</h2>
          <Field label="Street" name="street" fields={fields} errors={errors} />
          <Field label="City" name="city" fields={fields} errors={errors} />
          <SelectField label="State" name="state" options={US_STATES} fields={fields} errors={errors} />
          <Field label="ZIP" name="zip" fields={fields} errors={errors} />
          <SelectField label="Country" name="country" options={COUNTRIES} fields={fields} errors={errors} />
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
              onChange={e => updateField('accountType', e.target.value)}
              data-role="account-type"
              data-field="accountType"
            >
              <option value="individual">Individual</option>
              <option value="business">Business</option>
            </select>
          </div>
          {fields.accountType === 'business' && (
            <>
              <Field label="Company Name" name="companyName" fields={fields} errors={errors} />
              <Field label="Tax ID" name="taxId" fields={fields} errors={errors} />
              <Field label="PO Number" name="poNumber" fields={fields} errors={errors} />
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
