import * as React from "react"

// Tailwind breakpoints
const BREAKPOINTS = {
  MOBILE: 640,      // sm: < 640px
  TABLET: 768,      // md: < 768px
  DESKTOP: 1024,    // lg: < 1024px
  LARGE_DESKTOP: 1280, // xl: < 1280px
} as const

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.TABLET - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.TABLET)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < BREAKPOINTS.TABLET)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useDeviceType() {
  const [deviceType, setDeviceType] = React.useState<'mobile' | 'tablet' | 'desktop' | 'large-desktop' | undefined>(undefined)

  React.useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth
      if (width < BREAKPOINTS.MOBILE) {
        setDeviceType('mobile')
      } else if (width < BREAKPOINTS.TABLET) {
        setDeviceType('tablet')
      } else if (width < BREAKPOINTS.DESKTOP) {
        setDeviceType('desktop')
      } else if (width < BREAKPOINTS.LARGE_DESKTOP) {
        setDeviceType('large-desktop')
      } else {
        setDeviceType('large-desktop')
      }
    }

    updateDeviceType()

    const mediaQueries = [
      window.matchMedia(`(max-width: ${BREAKPOINTS.MOBILE - 1}px)`),
      window.matchMedia(`(min-width: ${BREAKPOINTS.MOBILE}px) and (max-width: ${BREAKPOINTS.TABLET - 1}px)`),
      window.matchMedia(`(min-width: ${BREAKPOINTS.TABLET}px) and (max-width: ${BREAKPOINTS.DESKTOP - 1}px)`),
      window.matchMedia(`(min-width: ${BREAKPOINTS.DESKTOP}px)`),
    ]

    const handleChange = () => updateDeviceType()

    mediaQueries.forEach(mq => mq.addEventListener("change", handleChange))

    return () => {
      mediaQueries.forEach(mq => mq.removeEventListener("change", handleChange))
    }
  }, [])

  return deviceType
}
