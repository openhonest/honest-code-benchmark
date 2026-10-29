import React, { useState, useEffect, useCallback } from 'react';
import {
  COUNTRIES, US_STATES, EMPTY_FIELDS,
  prefill_from_record, validate_step, validate_business,
  next_step, update_field, clear_error, format_review,
} from './lib.js';

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

export default function App({ initialData }) {
  const firstRec = initialData?.[0];
  const [fields, setFields] = useState(firstRec ? prefill_from_record(firstRec) : { ...EMPTY_FIELDS });
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!initialData && typeof window !== 'undefined') {
      const config = window.__BENCHMARK_CONFIG__;
      fetch(config.dataUrl)
        .then(r => r.json())
        .then(data => { if (data[0]) setFields(prefill_from_record(data[0])); });
    }
  }, [initialData]);

  const handleChange = useCallback((name, value) => {
    setFields(prev => update_field(prev, name, value));
    setErrors(prev => clear_error(prev, name));
  }, []);

  const handleNext = useCallback(() => {
    const result = next_step(fields, step);
    if (typeof result === 'number') {
      setErrors({});
      setStep(result);
    } else {
      setErrors(result);
    }
  }, [fields, step]);

  const handlePrev = useCallback(() => {
    setErrors({});
    setStep(s => s - 1);
  }, []);

  const handleSubmit = useCallback(() => {
    document.dispatchEvent(new CustomEvent('benchmark:form-submit', { detail: fields }));
  }, [fields]);

  const reviewLines = step === 4 ? format_review(fields) : [];

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
            {reviewLines.map(line => (
              <React.Fragment key={line.label}>
                <dt>{line.label}</dt><dd>{line.value}</dd>
              </React.Fragment>
            ))}
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
