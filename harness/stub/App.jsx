import React from 'react';

function Row({ row }) {
  return (
    <tr>
      <td>{row.id}</td>
      <td>{row.name}</td>
      <td>{row.department}</td>
      <td>{row.salary.toLocaleString()}</td>
      <td>{row.active ? 'Yes' : 'No'}</td>
    </tr>
  );
}

export default function App({ rows, renderTime }) {
  const [count, setCount] = React.useState(0);
  const [inputVal, setInputVal] = React.useState('');

  function handleClick() {
    // Deliberate busy work to produce a Long Task when row count is high
    let sum = 0;
    for (let i = 0; i < rows.length * 100; i++) {
      sum += Math.sqrt(i);
    }
    setCount(c => c + 1);
  }

  return (
    <div>
      <h1>Stub Application</h1>
      <p>Rows: {rows.length} | Clicks: {count} | Sum placeholder</p>
      <div>
        <button id="interact-btn" onClick={handleClick}>Click me</button>
        <input
          id="interact-input"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          placeholder="Type here"
        />
      </div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Dept</th>
            <th>Salary</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => <Row key={row.id} row={row} />)}
        </tbody>
      </table>
    </div>
  );
}
