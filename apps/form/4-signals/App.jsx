import React, { useEffect, useCallback } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { fields, step, errors, prefill, setField, nextStep, prevStep } from './store.js';

const COUNTRIES = ['US','CA','MX','GB','DE','FR','JP','AU','BR','IN'];
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

function Field({ label, name, type = 'text' }) {
  useSignals();
  const f = fields.value;
  const e = errors.value;
  return (
    <div className={`form-field${e[name] ? ' has-error' : ''}`}>
      <label>{label} *</label>
      <input type={type} value={f[name]} onChange={ev => setField(name, ev.target.value)} data-field={name} />
      {e[name] && <span className="error" data-role="error">{label} is required</span>}
    </div>
  );
}

function SelectField({ label, name, options }) {
  useSignals();
  const f = fields.value;
  const e = errors.value;
  return (
    <div className={`form-field${e[name] ? ' has-error' : ''}`}>
      <label>{label} *</label>
      <select value={f[name]} onChange={ev => setField(name, ev.target.value)} data-field={name}>
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {e[name] && <span className="error" data-role="error">{label} is required</span>}
    </div>
  );
}

export default function App() {
  useSignals();

  useEffect(() => {
    const config = window.__BENCHMARK_CONFIG__;
    fetch(config.dataUrl)
      .then(r => r.json())
      .then(data => { if (data[0]) prefill(data[0]); });
  }, []);

  const f = fields.value;
  const s = step.value;

  const handleSubmit = useCallback(() => {
    document.dispatchEvent(new CustomEvent('benchmark:form-submit', { detail: f }));
  }, [f]);

  return (
    <div className="app">
      <div className="form-progress">
        {[1,2,3,4].map(n => (
          <span key={n} className={`step-dot${n === s ? ' active' : ''}${n < s ? ' done' : ''}`}>{n}</span>
        ))}
      </div>

      {s === 1 && (
        <div className="form-step" data-step="1">
          <h2>Contact Information</h2>
          <Field label="First Name" name="firstName" />
          <Field label="Last Name" name="lastName" />
          <Field label="Email" name="email" type="email" />
          <Field label="Phone" name="phone" type="tel" />
          <div className="form-actions">
            <button onClick={nextStep} data-role="next-step">Next</button>
          </div>
        </div>
      )}

      {s === 2 && (
        <div className="form-step" data-step="2">
          <h2>Address</h2>
          <Field label="Street" name="street" />
          <Field label="City" name="city" />
          <SelectField label="State" name="state" options={US_STATES} />
          <Field label="ZIP" name="zip" />
          <SelectField label="Country" name="country" options={COUNTRIES} />
          <div className="form-actions">
            <button onClick={prevStep} data-role="prev-step">Previous</button>
            <button onClick={nextStep} data-role="next-step">Next</button>
          </div>
        </div>
      )}

      {s === 3 && (
        <div className="form-step" data-step="3">
          <h2>Account Type</h2>
          <div className="form-field">
            <label>Account Type *</label>
            <select
              value={f.accountType}
              onChange={e => setField('accountType', e.target.value)}
              data-role="account-type"
              data-field="accountType"
            >
              <option value="individual">Individual</option>
              <option value="business">Business</option>
            </select>
          </div>
          {f.accountType === 'business' && (
            <>
              <Field label="Company Name" name="companyName" />
              <Field label="Tax ID" name="taxId" />
              <Field label="PO Number" name="poNumber" />
            </>
          )}
          <div className="form-actions">
            <button onClick={prevStep} data-role="prev-step">Previous</button>
            <button onClick={nextStep} data-role="next-step">Next</button>
          </div>
        </div>
      )}

      {s === 4 && (
        <div className="form-step" data-step="4">
          <h2>Review</h2>
          <dl className="review-list">
            <dt>Name</dt><dd>{f.firstName} {f.lastName}</dd>
            <dt>Email</dt><dd>{f.email}</dd>
            <dt>Phone</dt><dd>{f.phone}</dd>
            <dt>Address</dt><dd>{f.street}, {f.city}, {f.state} {f.zip}</dd>
            <dt>Country</dt><dd>{f.country}</dd>
            <dt>Account Type</dt><dd>{f.accountType}</dd>
            {f.accountType === 'business' && (
              <>
                <dt>Company</dt><dd>{f.companyName}</dd>
                <dt>Tax ID</dt><dd>{f.taxId}</dd>
                {f.poNumber && <><dt>PO Number</dt><dd>{f.poNumber}</dd></>}
              </>
            )}
          </dl>
          <div className="form-actions">
            <button onClick={prevStep} data-role="prev-step">Previous</button>
            <button onClick={handleSubmit} className="primary" data-role="submit">Submit</button>
          </div>
        </div>
      )}
    </div>
  );
}
