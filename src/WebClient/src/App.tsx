import React from 'react';
import Routing from './routes/Routing';
import { ToastContainer } from 'react-toastify';
import './App.css';

function App() {
  return (
    <div className="App">
      <Routing />
      <ToastContainer />
    </div>
  );
}

export default App;