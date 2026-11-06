// Conventional React building blocks for the arm 9 server tree: context
// providers, custom hooks and wrapper components. None of the wrappers adds
// DOM except Layout, which renders the app's root element.
import React, { createContext, useContext, useMemo } from 'react';

const DEFAULT_THEME = { locale: 'en-US', currency: 'USD' };
const ThemeContext = createContext(DEFAULT_THEME);

export function ThemeProvider({ theme, children }) {
  const value = useMemo(() => ({ ...DEFAULT_THEME, ...theme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useFormatters() {
  const { locale } = useTheme();
  return useMemo(() => ({
    number: n => n.toLocaleString(locale),
    money: n => n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  }), [locale]);
}

// Builds a context, its provider and a hook that fails loudly when the
// provider is missing.
export function createStore(name) {
  const Context = createContext(null);
  function Provider({ value, children }) {
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }
  Provider.displayName = `${name}Provider`;
  function useStore() {
    const value = useContext(Context);
    if (value === null) throw new Error(`${name} is used outside its provider`);
    return value;
  }
  return [Provider, useStore];
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) return <div className="app" data-role="error">Something went wrong.</div>;
    return this.props.children;
  }
}

export function Layout({ children }) {
  return <div className="app">{children}</div>;
}

export function DataLoader({ ready, children }) {
  return ready ? children : null;
}

export function sortIndicator(sortCol, sortDir, col) {
  if (sortCol !== col) return '↕';
  switch (sortDir) {
    case 'asc': return '↑';
    case 'desc': return '↓';
    default: return '↕';
  }
}

// One sort rule for every arm: ASCII lower-case strings (SQLite NOCASE
// order), numbers, booleans true first on ascending, ties on ascending id.
export function compareValues(type, a, b) {
  switch (type) {
    case 'string': {
      const al = a.toLowerCase();
      const bl = b.toLowerCase();
      return al < bl ? -1 : al > bl ? 1 : 0;
    }
    case 'number':
      return a < b ? -1 : a > b ? 1 : 0;
    case 'boolean':
      return a === b ? 0 : a ? -1 : 1;
    default:
      throw new Error(`Unknown column type: ${type}`);
  }
}

export function sortBy(items, types, col, dir) {
  if (!col || !dir || !Object.hasOwn(types, col)) return items;
  const sign = dir === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => sign * compareValues(types[col], a[col], b[col]) || (a.id < b.id ? -1 : 1));
}
