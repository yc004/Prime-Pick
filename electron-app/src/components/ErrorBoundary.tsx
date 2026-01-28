import React from 'react'
import { Button, Result, Typography } from 'antd'

const { Text } = Typography

type Props = {
  title?: string
  children: React.ReactNode
}

type State = {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="h-full w-full flex items-center justify-center p-6">
        <Result
          status="error"
          title={this.props.title ?? '页面渲染失败'}
          subTitle={<Text type="secondary">{this.state.error?.message}</Text>}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          }
        />
      </div>
    )
  }
}

