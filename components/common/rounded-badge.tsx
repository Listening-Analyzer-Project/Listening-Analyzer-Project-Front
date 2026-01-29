"use client"

import { cn, getTextColorForBackground } from "@/lib/utils"
import type React from "react"
import { useLayoutEffect, useMemo, useRef, useState } from "react"

interface RoundedBadgeProps {
  value: string
  // onChange kept for potential API compatibility, but unused in display-only mode
  onChange?: (value: string) => void
  fontSize?: string | number
  fontSizeRatio?: number
  fontWeight?: React.CSSProperties['fontWeight']
  className?: string
  style?: React.CSSProperties
  mainColor?: string
  darkTextColor?: string
  lightTextColor?: string
  transitionDuration?: string
}

const DEFAULT_MAIN_COLOR = "#E0E0E0"
const DEFAULT_DARK_TEXT_COLOR = "#000000"
const DEFAULT_LIGHT_TEXT_COLOR = "#ffffff"
const DEFAULT_TRANSITION_DURATION = "0.8s"

export function RoundedBadge({
  value,
  fontSize = 12,
  fontSizeRatio = 0.5,
  fontWeight = "500",
  className,
  style,
  mainColor = DEFAULT_MAIN_COLOR,
  darkTextColor = DEFAULT_DARK_TEXT_COLOR,
  lightTextColor = DEFAULT_LIGHT_TEXT_COLOR,
  transitionDuration = DEFAULT_TRANSITION_DURATION,
}: RoundedBadgeProps) {
  // 1. State for auto-width
  const [currentWidth, setCurrentWidth] = useState<string | number>("auto")
  const [isInitialMount, setIsInitialMount] = useState(true)
  const [hasRendered, setHasRendered] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // 2. Refs
  const measurerRef = useRef<HTMLSpanElement | null>(null)

  // 3. Constants & Derived State
  const numericFontSizePx = useMemo(() => {
    if (typeof fontSize === "number") return fontSize
    if (typeof fontSize === "string") return parseFloat(fontSize) || 12
    return 12
  }, [fontSize])

  const numericHeightPx = numericFontSizePx / fontSizeRatio
  const calculatedHeight = `${numericHeightPx}px`
  const calculatedFontSize = `${numericFontSizePx}px`

  // Padding logic from EditableText
  const verticalSpacePx = Math.max(0, numericHeightPx - numericFontSizePx)
  const verticalPaddingPx = Math.max(0, Math.floor(verticalSpacePx / 2))
  const baseHorizontalPaddingPx = Math.max(Math.round(verticalPaddingPx * 1.3), 1)
  // Always rounded logic:
  const horizontalPaddingPx = Math.max(baseHorizontalPaddingPx + Math.round(numericHeightPx * 0.15), 1)

  const borderRadiusPx = Math.round(numericHeightPx / 2)
  const borderRadius = `${borderRadiusPx}px`

  const textStyle: React.CSSProperties = {
    fontFamily: "inherit",
    fontSize: calculatedFontSize,
    lineHeight: "inherit",
    minHeight: calculatedHeight,
    height: calculatedHeight,
    textAlign: "center",
    fontWeight: fontWeight,
    ...style,
  }

  const shouldAnimate = isTransitioning || (hasRendered && isInitialMount === false)

  const transitionStyle = {
    transition: shouldAnimate ? `width ${transitionDuration}` : "none",
  }

  // Display Styles (Button Mode imitation)
  const textColor = getTextColorForBackground(mainColor, darkTextColor, lightTextColor)
  
  const displayStyles = {
    backgroundColor: mainColor,
    color: textColor,
    border: `1px solid ${mainColor}`,
  }

  // 4. Effects (Auto-width logic)
  useLayoutEffect(() => {
    const measurer = measurerRef.current
    if (!measurer) return

    measurer.textContent = value || " "
    const textWidth = Math.ceil(measurer.getBoundingClientRect().width)
    const finalPaddingPx = horizontalPaddingPx
    const SAFETY_OFFSET_PX = 2
    const computedWidth = textWidth + Math.ceil(finalPaddingPx * 2) + SAFETY_OFFSET_PX
    const calculatedWidth = Math.max(Math.ceil(computedWidth), 1)

    if (isInitialMount) {
      setCurrentWidth(calculatedWidth)
      setIsInitialMount(false)
      setTimeout(() => setHasRendered(true), 0)
    } else {
        // Simple update without complex editing transitions
        setCurrentWidth(calculatedWidth)
    }
  }, [
    value,
    numericFontSizePx,
    horizontalPaddingPx,
    isInitialMount,
    // Add other deps if they affect width
    fontSize,
    fontSizeRatio,
    fontWeight
  ])

  return (
    <div
      className={cn(
        "inline-flex items-center overflow-hidden box-border justify-center",
        className
      )}
      style={{
        ...textStyle,
        width: currentWidth,
        backgroundColor: displayStyles.backgroundColor,
        color: displayStyles.color,
        border: displayStyles.border,
        borderRadius: borderRadius,
        paddingLeft: `${horizontalPaddingPx}px`,
        paddingRight: `${horizontalPaddingPx}px`,
        verticalAlign: "middle",
        ...transitionStyle,
      }}
    >
      <span
        className="block w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
        title={value}
      >
        {value}
      </span>
      <span
        ref={measurerRef}
        className="absolute invisible h-0 overflow-hidden whitespace-pre pl-0 pr-0"
        style={{
          fontFamily: textStyle.fontFamily,
          fontSize: textStyle.fontSize,
          lineHeight: textStyle.lineHeight,
          fontWeight: fontWeight,
        }}
        aria-hidden
      />
    </div>
  )
}
