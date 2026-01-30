import React, { useEffect, useMemo, useState } from 'react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useStore } from '../store/useStore'

type ResolvedTheme = 'dark' | 'light'

const resolveSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const ThemeRoot: React.FC<React.PropsWithChildren> = ({ children }) => {
  const themeMode = useStore((s) => s.themeMode)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(resolveSystemTheme)

  useEffect(() => {
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
    if (!mq) return
    const onChange = () => setSystemTheme(mq.matches ? 'dark' : 'light')
    onChange()
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const resolvedTheme: ResolvedTheme = themeMode === 'system' ? systemTheme : themeMode

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    if (window.electronAPI?.setWindowTheme) window.electronAPI.setWindowTheme(resolvedTheme)
  }, [resolvedTheme])

  const antdThemeConfig = useMemo(() => {
    const isDark = resolvedTheme === 'dark'
    return {
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: '#22C55E',
        colorInfo: isDark ? '#38BDF8' : '#0891B2',
        colorBgBase: isDark ? '#020617' : '#ECFEFF',
        colorBgContainer: isDark ? '#0B1220' : '#FFFFFF',
        colorBgElevated: isDark ? '#0F172A' : '#FFFFFF',
        colorBorder: isDark ? '#1E293B' : '#CBD5E1',
        colorTextBase: isDark ? '#F8FAFC' : '#0F172A',
        colorTextSecondary: isDark ? '#94A3B8' : '#475569',
        borderRadius: 10,
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
      },
      components: {
        Layout: {
          bodyBg: isDark ? '#020617' : '#ECFEFF',
          headerBg: isDark ? '#020617' : '#ECFEFF',
          siderBg: isDark ? '#0B1220' : '#FFFFFF',
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
    }
  }, [resolvedTheme])

  return (
    <ConfigProvider locale={zhCN} theme={antdThemeConfig as any}>
      {children}
    </ConfigProvider>
  )
}

export default ThemeRoot

