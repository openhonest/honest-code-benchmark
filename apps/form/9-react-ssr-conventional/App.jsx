// Arm 9 server tree, written the conventional way: context providers, custom
// hooks, a domain model, switch rendering and wrapper components. The browser
// hydrates it with ../shared-client/App.jsx, so the markup must match that
// client's first render.
import React from 'react';
import { ThemeProvider, ErrorBoundary, Layout, DataLoader, createStore } from './patterns.jsx';

const noop = () => {};
const [FormProvider, useForm] = createStore('RegistrationForm');

function useField(name) {
  const form = useForm();
  return { value: form.fields[name], required: form.isRequired(name), hasError: form.hasError(name) };
}

function Field({ label, name, type = 'text' }) {
  const { value, required, hasError } = useField(name);
  return (
    <div className={`form-field${hasError ? ' has-error' : ''}`}>
      <label>{label} {required ? '*' : ''}</label>
      <input type={type} value={value} onChange={noop} data-field={name} />
      {hasError && <span className="error" data-role="error">{label} is required</span>}
    </div>
  );
}

function Progress() {
  const form = useForm();
  return (
    <div className="form-progress">
      {form.steps.map(s => (
        <span key={s} className={`step-dot${s === form.step ? ' active' : ''}${s < form.step ? ' done' : ''}`}>{s}</span>
      ))}
    </div>
  );
}

function ContactStep() {
  return (
    <div className="form-step" data-step="1">
      <h2>Contact Information</h2>
      <Field label="First Name" name="firstName" />
      <Field label="Last Name" name="lastName" />
      <Field label="Email" name="email" type="email" />
      <Field label="Phone" name="phone" type="tel" />
      <div className="form-actions">
        <button data-role="next-step">Next</button>
      </div>
    </div>
  );
}

// Only the first step renders on the server; the client owns later steps.
function CurrentStep() {
  const { step } = useForm();
  switch (step) {
    case 1:
      return <ContactStep />;
    default:
      return null;
  }
}

export default function App({ form }) {
  return (
    <ErrorBoundary>
      <FormProvider value={form}>
        <ThemeProvider>
          <Layout>
            <DataLoader ready={form != null}>
              <Progress />
              <CurrentStep />
            </DataLoader>
          </Layout>
        </ThemeProvider>
      </FormProvider>
    </ErrorBoundary>
  );
}
