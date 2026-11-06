-- Schema for the DATAOS benchmark SQLite databases.
-- One table per archetype, same column names as the JSON fields.
-- Money stored as integer cents; booleans as 0/1.

CREATE TABLE employees (
  id         INTEGER PRIMARY KEY,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  department TEXT    NOT NULL,
  hireDate   TEXT    NOT NULL CHECK (hireDate GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  salary     INTEGER NOT NULL,
  active     INTEGER NOT NULL CHECK (active IN (0, 1))
) STRICT;

CREATE INDEX employees_name_asc   ON employees (name COLLATE NOCASE ASC, id);
CREATE INDEX employees_name_desc  ON employees (name COLLATE NOCASE DESC, id);
CREATE INDEX employees_email_asc  ON employees (email COLLATE NOCASE ASC, id);
CREATE INDEX employees_email_desc ON employees (email COLLATE NOCASE DESC, id);
CREATE INDEX employees_dept_asc   ON employees (department COLLATE NOCASE ASC, id);
CREATE INDEX employees_dept_desc  ON employees (department COLLATE NOCASE DESC, id);
CREATE INDEX employees_date_asc   ON employees (hireDate ASC, id);
CREATE INDEX employees_date_desc  ON employees (hireDate DESC, id);
CREATE INDEX employees_salary_asc  ON employees (salary ASC, id);
CREATE INDEX employees_salary_desc ON employees (salary DESC, id);
CREATE INDEX employees_active_asc  ON employees (active DESC, id);
CREATE INDEX employees_active_desc ON employees (active ASC, id);

CREATE TABLE orders (
  id           TEXT    PRIMARY KEY,
  date         TEXT    NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  customerName TEXT    NOT NULL,
  category     TEXT    NOT NULL,
  amount       INTEGER NOT NULL,
  status       TEXT    NOT NULL,
  items        INTEGER NOT NULL
) STRICT;

CREATE INDEX orders_id_asc    ON orders (id ASC);
CREATE INDEX orders_id_desc   ON orders (id DESC);
CREATE INDEX orders_date_asc  ON orders (date ASC, id);
CREATE INDEX orders_date_desc ON orders (date DESC, id);
CREATE INDEX orders_cust_asc  ON orders (customerName COLLATE NOCASE ASC, id);
CREATE INDEX orders_cust_desc ON orders (customerName COLLATE NOCASE DESC, id);
CREATE INDEX orders_cat_asc   ON orders (category COLLATE NOCASE ASC, id);
CREATE INDEX orders_cat_desc  ON orders (category COLLATE NOCASE DESC, id);
CREATE INDEX orders_amount_asc  ON orders (amount ASC, id);
CREATE INDEX orders_amount_desc ON orders (amount DESC, id);
CREATE INDEX orders_status_asc  ON orders (status COLLATE NOCASE ASC, id);
CREATE INDEX orders_status_desc ON orders (status COLLATE NOCASE DESC, id);
CREATE INDEX orders_items_asc   ON orders (items ASC, id);
CREATE INDEX orders_items_desc  ON orders (items DESC, id);

CREATE TABLE browser_records (
  id          INTEGER PRIMARY KEY,
  name        TEXT    NOT NULL,
  status      TEXT    NOT NULL,
  createdDate TEXT    NOT NULL CHECK (createdDate GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  value       INTEGER NOT NULL
) STRICT;

CREATE INDEX browser_name_asc   ON browser_records (name COLLATE NOCASE ASC, id);
CREATE INDEX browser_name_desc  ON browser_records (name COLLATE NOCASE DESC, id);
CREATE INDEX browser_status_asc  ON browser_records (status COLLATE NOCASE ASC, id);
CREATE INDEX browser_status_desc ON browser_records (status COLLATE NOCASE DESC, id);
CREATE INDEX browser_date_asc   ON browser_records (createdDate ASC, id);
CREATE INDEX browser_date_desc  ON browser_records (createdDate DESC, id);
CREATE INDEX browser_value_asc  ON browser_records (value ASC, id);
CREATE INDEX browser_value_desc ON browser_records (value DESC, id);

CREATE TABLE customers (
  id          INTEGER PRIMARY KEY,
  firstName   TEXT    NOT NULL,
  lastName    TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  phone       TEXT    NOT NULL,
  accountType TEXT    NOT NULL,
  companyName TEXT,
  taxId       TEXT,
  poNumber    TEXT,
  street      TEXT    NOT NULL,
  city        TEXT    NOT NULL,
  state       TEXT    NOT NULL,
  zip         TEXT    NOT NULL,
  country     TEXT    NOT NULL
) STRICT;

CREATE TABLE budget_lines (
  id           INTEGER PRIMARY KEY,
  category     TEXT    NOT NULL,
  description  TEXT    NOT NULL,
  q1           INTEGER NOT NULL,
  q2           INTEGER NOT NULL,
  q3           INTEGER NOT NULL,
  q4           INTEGER NOT NULL,
  budgetTarget INTEGER NOT NULL
) STRICT;

CREATE INDEX budget_cat ON budget_lines (category COLLATE NOCASE ASC, id);
