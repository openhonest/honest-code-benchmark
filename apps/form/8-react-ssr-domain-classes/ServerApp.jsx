import React from 'react';

const REQUIRED = {
  1: ['firstName', 'lastName', 'email', 'phone'],
  2: ['street', 'city', 'state', 'zip', 'country'],
  3: ['accountType'],
};

function isRequired(name) {
  return REQUIRED[1]?.includes(name) || REQUIRED[2]?.includes(name) || REQUIRED[3]?.includes(name);
}

function ServerField({ label, name, value, type = 'text' }) {
  return (
    <div className="form-field">
      <label>{label} {isRequired(name) ? '*' : ''}</label>
      <input
        type={type}
        value={value}
        onChange={() => {}}
        data-field={name}
      />
    </div>
  );
}

export default function ServerApp({ data }) {
  const step = 1;

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
          <ServerField label="First Name" name="firstName" value="" />
          <ServerField label="Last Name" name="lastName" value="" />
          <ServerField label="Email" name="email" value="" type="email" />
          <ServerField label="Phone" name="phone" value="" type="tel" />
          <div className="form-actions">
            <button data-role="next-step">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
