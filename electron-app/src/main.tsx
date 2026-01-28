import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App.tsx'
import './style.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: antdTheme.darkAlgorithm,
        token: {
          colorPrimary: '#22C55E',
          colorInfo: '#38BDF8',
          colorBgBase: '#020617',
          colorBgContainer: '#0B1220',
          colorBgElevated: '#0F172A',
          colorBorder: '#1E293B',
          colorTextBase: '#F8FAFC',
          colorTextSecondary: '#94A3B8',
          borderRadius: 10,
          fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        },
        components: {
          Layout: {
            bodyBg: '#020617',
            headerBg: '#020617',
            siderBg: '#0B1220',
          },
          Button: {
            controlHeight: 36,
          },
          Input: {
            controlHeight: 36,
          },
          Select: {
            controlHeight: 36,
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
