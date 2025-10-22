import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <aside className="panel panel-left">
        <h1>Left Panel</h1>
        <p>Use this space for navigation, profile details, or any supporting content.</p>
      </aside>
      <main className="panel panel-right">
        <h2>Right Panel</h2>
        <p>This wider area works well for showcasing projects or other primary content.</p>
      </main>
    </div>
  );
}

export default App;
