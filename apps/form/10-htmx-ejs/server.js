import ejs from 'ejs';
import { Router } from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openFormDb } from '../../lib/sqlite.js';
import { createTimer } from '../../lib/timing.js';
import { route, intParam, strParam, selectionParam, sendTimed, BadRequest } from '../../lib/http-util.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWS = join(__dirname, 'views');

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

const FIELD_LABELS = {
  firstName: 'First Name', lastName: 'Last Name', email: 'Email', phone: 'Phone',
  street: 'Street', city: 'City', state: 'State', zip: 'ZIP', country: 'Country',
  accountType: 'Account Type', companyName: 'Company Name', taxId: 'Tax ID', poNumber: 'PO Number',
};

const EMPTY_FIELDS = {
  firstName: '', lastName: '', email: '', phone: '',
  street: '', city: '', state: '', zip: '', country: '',
  accountType: 'individual', companyName: '', taxId: '', poNumber: '',
};

let db = null;

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

function validate(step, fields) {
  const required = REQUIRED[step] || [];
  const errors = {};
  for (const f of required) {
    if (!(fields[f] || '').trim()) errors[f] = true;
  }
  if (step === 3 && fields.accountType === 'business') {
    if (!(fields.companyName || '').trim()) errors.companyName = true;
    if (!(fields.taxId || '').trim()) errors.taxId = true;
  }
  return errors;
}

function parseState(query, body) {
  const src = { ...query, ...body };
  const step = intParam(src.step, 'step');
  if (step > 4) throw new BadRequest('step must be 1 to 4');
  // A field on the current step is posted twice: once from the hidden
  // state input and once from the visible input that follows it. The last
  // value wins, as in Starlette's form parsing for arm 11.
  const fields = {};
  for (const key of Object.keys(EMPTY_FIELDS)) {
    const raw = src[key] ?? EMPTY_FIELDS[key];
    fields[key] = String(Array.isArray(raw) ? raw[raw.length - 1] : raw);
  }
  let errors = {};
  try { errors = JSON.parse(src.errors || '{}'); } catch { errors = {}; }
  return { step, fields, errors };
}

async function renderContent(state, basePath, timer = createTimer()) {
  return timer.timeAsync('render', () => ejs.renderFile(join(VIEWS, '_content.ejs'), {
    step: state.step,
    fields: state.fields,
    errors: state.errors,
    basePath,
    countries: COUNTRIES,
    usStates: US_STATES,
    fieldLabels: FIELD_LABELS,
  }, { cache: true }));
}

async function sendContent(res, state, basePath) {
  const timer = createTimer();
  sendTimed(res, timer, await renderContent(state, basePath, timer));
}

const readOnly = new Map();

// Opening the database is setup and is not timed. One read-only connection
// per data size is kept for the life of the server.
export async function render(sqlitePath, opts, timer = createTimer()) {
  if (!readOnly.has(sqlitePath)) readOnly.set(sqlitePath, openFormDb(sqlitePath));
  db = readOnly.get(sqlitePath);
  const firstRec = timer.time('load', () => db.getFirst());
  const basePath = `/${opts.archetype}/10-htmx-ejs`;
  return timer.timeAsync('render', () => {
    const fields = firstRec ? prefillFromRecord(firstRec) : { ...EMPTY_FIELDS };
    return ejs.renderFile(join(VIEWS, 'page.ejs'), {
      step: 1,
      fields,
      errors: {},
      basePath,
      countries: COUNTRIES,
      usStates: US_STATES,
      fieldLabels: FIELD_LABELS,
      archetype: opts.archetype,
      arm: opts.arm,
      dataRows: opts.rows,
    }, { cache: true });
  });
}

export function partialRouter(dataDir, archetype) {
  const router = Router();
  const basePath = `/${archetype}/10-htmx-ejs`;

  router.get('/step', route(async (req, res) => {
    const state = parseState(req.query);
    state.errors = {};
    await sendContent(res, state, basePath);
  }));

  router.post('/next', route(async (req, res) => {
    const state = parseState(req.query, req.body);
    const errors = validate(state.step, state.fields);
    if (Object.keys(errors).length > 0) {
      state.errors = errors;
      await sendContent(res, state, basePath);
      return;
    }
    state.step = Math.min(state.step + 1, 4);
    state.errors = {};
    await sendContent(res, state, basePath);
  }));

  router.post('/prev', route(async (req, res) => {
    const state = parseState(req.query, req.body);
    state.step = Math.max(state.step - 1, 1);
    state.errors = {};
    await sendContent(res, state, basePath);
  }));

  router.post('/submit', route(async (req, res) => {
    const state = parseState(req.query, req.body);
    const timer = createTimer();
    const html = timer.time('render', () => `<div id="form-content"><div class="form-step" data-step="done"><h2>Submitted</h2><p>Your form has been submitted.</p></div></div>`);
    sendTimed(res, timer, html);
  }));

  return router;
}
