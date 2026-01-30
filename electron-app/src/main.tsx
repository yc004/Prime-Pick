import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './style.css'
import ThemeRoot from './components/ThemeRoot.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeRoot>
      <App />
    </ThemeRoot>
  </React.StrictMode>,
)
