import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error, info) { console.error('Mosaic UI error', error, info); }
  render() {
    if (this.state.failed) return <main className="fatal-error"><h1>Something went wrong.</h1><p>Mosaic could not render this screen. Your saved account data remains in the database.</p><button onClick={() => window.location.reload()}>Reload Mosaic</button></main>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(<React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>);
