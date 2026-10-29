import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { prefill, setField, nextStep, prevStep } from './store.js';

const COUNTRIES = ['US','CA','MX','GB','DE','FR','JP','AU','BR','IN'];
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

function Field({ label, name, type = 'text' }) {
  const value = useSelector(s => s.form.fields[name]);
  const hasError = useSelector(s => !!s.form.errors[name]);
  const dispatch = useDispatch();
  return (
    <div className={`form-field${hasError ? ' has-error' : ''}`}>
      <label>{label} *</label>
      <input type={type} value={value} onChange={e => dispatch(setField({ name, value: e.target.value }))} data-field={name} />
      {hasError && <span className="error" data-role="error">{label} is required</span>}
    </div>
  );
}

function SelectField({ label, name, options }) {
  const value = useSelector(s => s.form.fields[name]);
  const hasError = useSelector(s => !!s.form.errors[name]);
  const dispatch = useDispatch();
  return (
    <div className={`form-field${hasError ? ' has-error' : ''}`}>
      <label>{label} *</label>
      <select value={value} onChange={e => dispatch(setField({ name, value: e.target.value }))} data-field={name}>
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hasError && <span className="error" data-role="error">{label} is required</span>}
    </div>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const step = useSelector(s => s.form.step);
  const fields = useSelector(s => s.form.fields);

  useEffect(() => {
    const config = window.__BENCHMARK_CONFIG__;
    fetch(config.dataUrl)
      .then(r => r.json())
      .then(data => { if (data[0]) dispatch(prefill(data[0])); });
  }, [dispatch]);

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
          <Field label="First Name" name="firstName" />
          <Field label="Last Name" name="lastName" />
          <Field label="Email" name="email" type="email" />
          <Field label="Phone" name="phone" type="tel" />
          <div className="form-actions">
            <button onClick={() => dispatch(nextStep())} data-role="next-step">Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="form-step" data-step="2">
          <h2>Address</h2>
          <Field label="Street" name="street" />
          <Field label="City" name="city" />
          <SelectField label="State" name="state" options={US_STATES} />
          <Field label="ZIP" name="zip" />
          <SelectField label="Country" name="country" options={COUNTRIES} />
          <div className="form-actions">
            <button onClick={() => dispatch(prevStep())} data-role="prev-step">Previous</button>
            <button onClick={() => dispatch(nextStep())} data-role="next-step">Next</button>
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
              onChange={e => dispatch(setField({ name: 'accountType', value: e.target.value }))}
              data-role="account-type"
              data-field="accountType"
            >
              <option value="individual">Individual</option>
              <option value="business">Business</option>
            </select>
          </div>
          {fields.accountType === 'business' && (
            <>
              <Field label="Company Name" name="companyName" />
              <Field label="Tax ID" name="taxId" />
              <Field label="PO Number" name="poNumber" />
            </>
          )}
          <div className="form-actions">
            <button onClick={() => dispatch(prevStep())} data-role="prev-step">Previous</button>
            <button onClick={() => dispatch(nextStep())} data-role="next-step">Next</button>
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
            <button onClick={() => dispatch(prevStep())} data-role="prev-step">Previous</button>
            <button onClick={handleSubmit} className="primary" data-role="submit">Submit</button>
          </div>
        </div>
      )}
    </div>
  );
}
