// Arm 7 server tree. Plain function components, no hooks. It renders the
// step the shared client renders first; the browser hydrates it with
// ../shared-client/App.jsx.
import React from 'react';
import { STEP_COUNT, STEP_LAYOUT, is_required, step_dot_class } from './lib.js';

const noop = () => {};
const STEPS = Array.from({ length: STEP_COUNT }, (_, i) => i + 1);

function Field({ label, name, type, fields, errors }) {
  const hasError = errors[name];
  return (
    <div className={`form-field${hasError ? ' has-error' : ''}`}>
      <label>{label} {is_required(name) ? '*' : ''}</label>
      <input type={type} value={fields[name]} onChange={noop} data-field={name} />
      {hasError && <span className="error" data-role="error">{label} is required</span>}
    </div>
  );
}

export default function App({ view }) {
  const { step, fields, errors } = view;
  const layout = STEP_LAYOUT[step];
  return (
    <div className="app">
      <div className="form-progress">
        {STEPS.map(s => (
          <span key={s} className={step_dot_class(s, step)}>{s}</span>
        ))}
      </div>

      <div className="form-step" data-step={String(step)}>
        <h2>{layout.title}</h2>
        {layout.fields.map(f => (
          <Field key={f.name} label={f.label} name={f.name} type={f.type} fields={fields} errors={errors} />
        ))}
        <div className="form-actions">
          <button data-role="next-step">Next</button>
        </div>
      </div>
    </div>
  );
}
