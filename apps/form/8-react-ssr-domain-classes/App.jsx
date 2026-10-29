import React, { useState, useEffect, useCallback } from 'react';
import { FormModel } from './domain.js';

const COUNTRIES = ['US','CA','MX','GB','DE','FR','JP','AU','BR','IN'];
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

function Field({ label, name, model, onUpdate, type = 'text' }) {
  const hasError = model.errors[name];
  return (
    <div className={`form-field${hasError ? ' has-error' : ''}`}>
      <label>{label} *</label>
      <input
        type={type}
        value={model.fields[name]}
        onChange={e => { model.setField(name, e.target.value); onUpdate(); }}
        data-field={name}
      />
      {hasError && <span className="error" data-role="error">{label} is required</span>}
    </div>
  );
}

function SelectField({ label, name, options, model, onUpdate }) {
  const hasError = model.errors[name];
  return (
    <div className={`form-field${hasError ? ' has-error' : ''}`}>
      <label>{label} *</label>
      <select value={model.fields[name]} onChange={e => { model.setField(name, e.target.value); onUpdate(); }} data-field={name}>
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hasError && <span className="error" data-role="error">{label} is required</span>}
    </div>
  );
}

export default function App({ initialData }) {
  const [model] = useState(() => FormModel.fromData(initialData));
  const [, forceUpdate] = useState(0);

  const update = useCallback(() => forceUpdate(c => c + 1), []);

  useEffect(() => {
    if (!initialData && typeof window !== 'undefined') {
      const config = window.__BENCHMARK_CONFIG__;
      fetch(config.dataUrl)
        .then(r => r.json())
        .then(data => { model.prefill(data[0]); update(); });
    }
  }, [initialData, model, update]);

  const step = model.step;
  const fields = model.fields;

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
          <Field label="First Name" name="firstName" model={model} onUpdate={update} />
          <Field label="Last Name" name="lastName" model={model} onUpdate={update} />
          <Field label="Email" name="email" model={model} onUpdate={update} type="email" />
          <Field label="Phone" name="phone" model={model} onUpdate={update} type="tel" />
          <div className="form-actions">
            <button onClick={() => { model.nextStep(); update(); }} data-role="next-step">Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="form-step" data-step="2">
          <h2>Address</h2>
          <Field label="Street" name="street" model={model} onUpdate={update} />
          <Field label="City" name="city" model={model} onUpdate={update} />
          <SelectField label="State" name="state" options={US_STATES} model={model} onUpdate={update} />
          <Field label="ZIP" name="zip" model={model} onUpdate={update} />
          <SelectField label="Country" name="country" options={COUNTRIES} model={model} onUpdate={update} />
          <div className="form-actions">
            <button onClick={() => { model.prevStep(); update(); }} data-role="prev-step">Previous</button>
            <button onClick={() => { model.nextStep(); update(); }} data-role="next-step">Next</button>
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
              onChange={e => { model.setField('accountType', e.target.value); update(); }}
              data-role="account-type"
              data-field="accountType"
            >
              <option value="individual">Individual</option>
              <option value="business">Business</option>
            </select>
          </div>
          {model.isBusiness() && (
            <>
              <Field label="Company Name" name="companyName" model={model} onUpdate={update} />
              <Field label="Tax ID" name="taxId" model={model} onUpdate={update} />
              <Field label="PO Number" name="poNumber" model={model} onUpdate={update} />
            </>
          )}
          <div className="form-actions">
            <button onClick={() => { model.prevStep(); update(); }} data-role="prev-step">Previous</button>
            <button onClick={() => { model.nextStep(); update(); }} data-role="next-step">Next</button>
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
            {model.isBusiness() && (
              <>
                <dt>Company</dt><dd>{fields.companyName}</dd>
                <dt>Tax ID</dt><dd>{fields.taxId}</dd>
                {fields.poNumber && <><dt>PO Number</dt><dd>{fields.poNumber}</dd></>}
              </>
            )}
          </dl>
          <div className="form-actions">
            <button onClick={() => { model.prevStep(); update(); }} data-role="prev-step">Previous</button>
            <button
              onClick={() => {
                const detail = model.submit();
                document.dispatchEvent(new CustomEvent('benchmark:form-submit', { detail }));
              }}
              className="primary"
              data-role="submit"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
