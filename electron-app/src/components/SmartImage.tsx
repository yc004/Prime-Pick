import React, { useEffect, useMemo, useState } from 'react'

type Status = 'idle' | 'loading' | 'loaded' | 'error'

interface Props {
  primarySrc?: string
  fallbackSrc?: string
  alt?: string
  className?: string
  draggable?: boolean
  onClick?: React.MouseEventHandler<HTMLImageElement>
  placeholder?: React.ReactNode
}

const SmartImage: React.FC<Props> = ({ primarySrc, fallbackSrc, alt, className, draggable, onClick, placeholder }) => {
  const initial = useMemo(() => primarySrc ?? fallbackSrc, [primarySrc, fallbackSrc])
  const [src, setSrc] = useState<string | undefined>(initial)
  const [status, setStatus] = useState<Status>(initial ? 'loading' : 'idle')

  useEffect(() => {
    const next = primarySrc ?? fallbackSrc
    setSrc(next)
    setStatus(next ? 'loading' : 'idle')
  }, [primarySrc, fallbackSrc])

  if (!src || status === 'error') return <>{placeholder ?? null}</>

  return (
    <img
      key={src}
      src={src}
      alt={alt}
      className={className}
      decoding="async"
      loading="eager"
      draggable={draggable}
      onClick={onClick}
      onLoad={() => setStatus('loaded')}
      onError={() => {
        if (src === primarySrc && fallbackSrc && fallbackSrc !== primarySrc) {
          setSrc(fallbackSrc)
          setStatus('loading')
          return
        }
        setStatus('error')
      }}
    />
  )
}

export default SmartImage
