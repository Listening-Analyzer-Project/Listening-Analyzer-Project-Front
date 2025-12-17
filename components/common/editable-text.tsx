"use client"

import type React from "react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { cn, darkenColor, getTextColorForBackground, lightenColor } from "@/lib/utils"
import { showErrorToast } from "@/lib/utils/toasts/toast-handler"

interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  autoSelectOnClick?: boolean
  allowEmpty?: boolean
  defaultValue?: string
  placeholder?: string
  autoWidth?: boolean
  width?: string | number
  editWidth?: string | number
  fontSize?: string | number
  fontSizeRatio?: number
  fontWeight?: React.CSSProperties['fontWeight']
  rounded?: boolean
  mode?: "text" | "button"
  textAlign?: "left" | "center" | "right"
  visualMode?: "default" | "border"
  emptyInputAtFocus?: boolean
  className?: string
  inputClassName?: string
  displayClassName?: string
  style?: React.CSSProperties
  inputStyle?: React.CSSProperties 
  mainColor?: string
  darkTextColor?: string
  lightTextColor?: string
  transitionDuration?: string
}

const DEFAULT_TEXT_IF_VOID = "Click to edit ..."
const DEFAULT_MAIN_COLOR = "#E0E0E0"
const DEFAULT_DARK_TEXT_COLOR = "#000000"
const DEFAULT_LIGHT_TEXT_COLOR = "#ffffff"
const DEFAULT_TRANSITION_DURATION = "0.8s"

export function EditableText({
  value,
  onChange,
  autoSelectOnClick = true,
  allowEmpty = false,
  defaultValue,
  placeholder,
  width = "120px",
  autoWidth = false,
  editWidth,
  fontSize = 16,
  fontSizeRatio = 0.6,
  fontWeight,
  rounded = false,
  mode = "text",
  textAlign = "left",
  visualMode = "default",
  emptyInputAtFocus = false,
  className,
  inputClassName,
  displayClassName,
  style,
  inputStyle,
  mainColor = DEFAULT_MAIN_COLOR,
  darkTextColor = DEFAULT_DARK_TEXT_COLOR,
  lightTextColor = DEFAULT_LIGHT_TEXT_COLOR,
  transitionDuration = DEFAULT_TRANSITION_DURATION,
}: EditableTextProps) {
  // 1. Hook State
  const [isEditing, setIsEditing] = useState(false)
  const [editingValue, setEditingValue] = useState("")
  const [currentWidth, setCurrentWidth] = useState<string | number>(width)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isInitialMount, setIsInitialMount] = useState(true)
  const [hasRendered, setHasRendered] = useState(false)
  const [isInDelayedTransition, setIsInDelayedTransition] = useState(false)

  // 2. Refs
  const prevValueRef = useRef<string>(value)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const measurerRef = useRef<HTMLSpanElement | null>(null)
  const displayRef = useRef<HTMLDivElement | null>(null)

  // 3. Constants & Derived State
  const resolvedDefault = defaultValue || DEFAULT_TEXT_IF_VOID
  const resolvedPlaceholder = placeholder ?? resolvedDefault
  
  const darkenedMainColor = darkenColor(mainColor, 10)
  const lightenedMainColor = lightenColor(mainColor, 95)
  
  const numericFontSizePx = useMemo(() => {
    if (typeof fontSize === "number") return fontSize
    if (typeof fontSize === "string") return parseFloat(fontSize) || 16
    return 16
  }, [fontSize])

  const numericHeightPx = numericFontSizePx / fontSizeRatio
  const calculatedHeight = `${numericHeightPx}px`
  const calculatedFontSize = `${numericFontSizePx}px`

  const verticalSpacePx = Math.max(0, numericHeightPx - numericFontSizePx)
  const verticalPaddingPx = Math.max(0, Math.floor(verticalSpacePx / 2))
  const baseHorizontalPaddingPx = Math.max(Math.round(verticalPaddingPx * 1.3), 1)
  const horizontalPaddingPx = rounded
    ? Math.max(baseHorizontalPaddingPx + Math.round(numericHeightPx * 0.15), 1)
    : baseHorizontalPaddingPx

  const borderRadiusPx = rounded ? Math.round(numericHeightPx / 2) : Math.round(numericHeightPx * 0.125)
  const borderRadius = `${borderRadiusPx}px`

  const textStyle: React.CSSProperties = {
    fontFamily: "inherit",
    fontSize: calculatedFontSize,
    lineHeight: "inherit",
    minHeight: calculatedHeight,
    height: calculatedHeight,
    textAlign: textAlign,
    fontWeight: fontWeight,
    ...style,
  }

  const commonWidthStyle: React.CSSProperties = {
    width: currentWidth,
  }

  const alignmentStyle: React.CSSProperties = autoWidth
    ? { textAlign: isEditing && editingValue === "" ? ("left" as const) : ("center" as const) }
    : { textAlign: textAlign }

  const shouldAnimate =
    isTransitioning || (hasRendered && (autoWidth || (!autoWidth && editWidth !== undefined && editWidth !== width)))
  
  const transitionStyle = {
    transition: shouldAnimate ? `width ${transitionDuration}` : "none",
  }

  const defaultFontWeightClass = fontWeight ? "" : (mode === "button" ? "font-semibold" : "font-normal")
  const finalClassName = cn(defaultFontWeightClass, className)

  const effectiveType = "text"
  const displayText = value === "" ? defaultValue || resolvedPlaceholder : value
  const isPlaceholderLook = value === ""

  // 4. Effects
  useLayoutEffect(() => {
    if (!autoWidth) return

    const measurer = measurerRef.current
    if (!measurer) return

    const textToMeasure = isEditing
      ? editingValue === ""
        ? resolvedPlaceholder
        : editingValue
      : value === ""
        ? resolvedPlaceholder
        : value

    measurer.textContent = textToMeasure || " "
    const textWidth = Math.ceil(measurer.getBoundingClientRect().width)
    const finalPaddingPx = horizontalPaddingPx
    const SAFETY_OFFSET_PX = 2
    const computedWidth = textWidth + Math.ceil(finalPaddingPx * 2) + SAFETY_OFFSET_PX
    const calculatedWidth = Math.max(Math.ceil(computedWidth), 1)

    if (isInitialMount) {
      setCurrentWidth(calculatedWidth)
      setIsInitialMount(false)
      setTimeout(() => setHasRendered(true), 0)
    } else if (!isInDelayedTransition) {
      if (hasRendered && isEditing) {
        setIsTransitioning(true)
        setCurrentWidth(calculatedWidth)
      } else if (!isEditing) {
        setCurrentWidth(calculatedWidth)
      }
    }
  }, [
    autoWidth,
    value,
    editingValue,
    isEditing,
    resolvedPlaceholder,
    width,
    numericFontSizePx,
    horizontalPaddingPx,
    isInitialMount,
    hasRendered,
    isInDelayedTransition,
  ])

  useEffect(() => {
    if (isTransitioning) {
      const endTimer = setTimeout(() => {
        setIsTransitioning(false)
        setIsInDelayedTransition(false)
      }, Number.parseFloat(transitionDuration) * 1000)

      return () => {
        clearTimeout(endTimer)
      }
    }
  }, [isTransitioning, transitionDuration])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (autoSelectOnClick && !emptyInputAtFocus) inputRef.current.select()
    }
  }, [isEditing, autoSelectOnClick, emptyInputAtFocus])

  // 5. Functions
  const getDisplayStyles = () => {
    if (visualMode === "default") {
      if (mode === "button") {
        const textColor = getTextColorForBackground(mainColor, darkTextColor, lightTextColor)
        const hoverTextColor = getTextColorForBackground(darkenedMainColor, darkTextColor, lightTextColor)
        return {
          backgroundColor: mainColor,
          color: textColor,
          border: "none",
          hover: {
            backgroundColor: darkenedMainColor,
            color: hoverTextColor,
            border: "none",
          },
        }
      }
      return {
        backgroundColor: "transparent",
        color: darkTextColor,
        border: "none",
        hover: {
          backgroundColor: mainColor,
          color: getTextColorForBackground(mainColor, darkTextColor, lightTextColor),
          border: "none",
        },
      }
    }
    if (mode === "button") {
      return {
        backgroundColor: "transparent",
        color: darkTextColor,
        border: `1px solid ${mainColor}`,
        hover: {
          backgroundColor: lightenedMainColor,
          color: darkTextColor,
          border: `1px solid ${mainColor}`,
        },
      }
    }
    return {
      backgroundColor: "transparent",
      color: darkTextColor,
      border: "1px solid transparent",
      hover: {
        backgroundColor: "transparent",
        color: darkTextColor,
        border: `1px solid ${mainColor}`,
      },
    }
  }

  const getEditingStyles = () => {
    const editingBackgroundColor = "white"
    if (mode === "button" && visualMode === "default") {
      return {
        backgroundColor: editingBackgroundColor,
        border: `1px solid ${mainColor}`,
        color: darkTextColor,
      }
    }
    return {
      backgroundColor: editingBackgroundColor,
      border: `1px solid ${mainColor}`,
      color: darkTextColor,
    }
  }

  const startEditing = () => {
    prevValueRef.current = value
    const initialEditingValue = emptyInputAtFocus ? "" : value

    if (!autoWidth && editWidth !== undefined && editWidth !== width) {
      setCurrentWidth(width)
      setIsEditing(true)
      setEditingValue(initialEditingValue)
      setIsHovered(false)

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true)
          setCurrentWidth(editWidth)
        })
      })
    } else {
      setIsEditing(true)
      setEditingValue(initialEditingValue)
      setIsHovered(false)
    }
  }

  const finishEditing = () => {
    const current = editingValue
    let final: string

    if (current === "" || current.trim() === "") {
      if (emptyInputAtFocus) {
        final = prevValueRef.current
      } else {
        if (!allowEmpty) {
            showErrorToast("You cannot enter an empty input", "Erreur")
            cancelEditing()
            return
        }
        final = ""
      }
    } else {
      final = current
    }

    if (final === prevValueRef.current) {
        cancelEditing()
        return
    }

    if (!autoWidth && editWidth !== undefined && editWidth !== width) {
      setCurrentWidth(editWidth)
      onChange(final)
      setIsEditing(false)
      setEditingValue("")

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true)
          setCurrentWidth(width)
        })
      })
    } else {
      onChange(final)
      setIsEditing(false)
      setEditingValue("")
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditingValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") finishEditing()
    else if (e.key === "Escape") cancelEditing()
  }

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (autoSelectOnClick && !emptyInputAtFocus) {
      ;(e.target as HTMLInputElement).select()
    }
  }

  // 6. Render Logic
  const displayStyles = getDisplayStyles()
  const editingStyles = getEditingStyles()
  const currentDisplayStyles = {
    backgroundColor: isHovered
      ? displayStyles.hover?.backgroundColor || displayStyles.backgroundColor
      : displayStyles.backgroundColor,
    color: isHovered ? displayStyles.hover?.color || displayStyles.color : displayStyles.color,
    border: isHovered ? displayStyles.hover?.border || displayStyles.border : displayStyles.border,
  }

  if (isEditing) {
    return (
      <div style={{ display: "inline-block", position: "relative" }}>
        <Input
          ref={inputRef}
          value={editingValue}
          onChange={(e) => setEditingValue((e.target as HTMLInputElement).value)}
          onBlur={finishEditing}
          onKeyDown={handleKeyDown}
          onClick={handleInputClick}
          className={cn(
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "h-auto",
            "py-0",
            "inline-flex items-center box-border leading-none",
            autoWidth && "justify-center",
            !autoWidth && textAlign === "center" && "justify-center",
            !autoWidth && textAlign === "right" && "justify-end",
            !autoWidth && textAlign === "left" && "justify-start",
            inputClassName,
            finalClassName,
          )}
          style={{
            ...textStyle,
            ...commonWidthStyle,
            ...alignmentStyle,
            ...inputStyle,
            backgroundColor: editingStyles.backgroundColor,
            color: editingStyles.color,
            border: editingStyles.border,
            borderRadius: borderRadius,
            paddingLeft: `${horizontalPaddingPx}px`,
            paddingRight: `${horizontalPaddingPx}px`,
            ...transitionStyle,
          }}
          placeholder={resolvedPlaceholder}
          type={effectiveType}
          autoFocus
        />
        {autoWidth && (
          <span
            ref={measurerRef}
            className="absolute invisible h-0 overflow-hidden whitespace-pre pl-0 pr-0"
            style={{
              fontFamily: textStyle.fontFamily,
              fontSize: textStyle.fontSize,
              lineHeight: textStyle.lineHeight,
              fontWeight: fontWeight || (mode === "button" ? "600" : "400"),
            }}
            aria-hidden
          />
        )}
      </div>
    )
  }

  return (
    <div
      ref={displayRef}
      onClick={startEditing}
      className={cn(
        "cursor-pointer",
        "flex items-center overflow-hidden box-border leading-none",
        autoWidth && "justify-center",
        !autoWidth && textAlign === "center" && "justify-center",
        !autoWidth && textAlign === "right" && "justify-end",
        !autoWidth && textAlign === "left" && "justify-start",
        displayClassName,
        finalClassName
      )}
      style={{
        ...textStyle,
        ...commonWidthStyle,
        ...alignmentStyle,
        backgroundColor: currentDisplayStyles.backgroundColor,
        color: currentDisplayStyles.color,
        border: currentDisplayStyles.border,
        borderRadius: borderRadius,
        paddingLeft: `${horizontalPaddingPx}px`,
        paddingRight: `${horizontalPaddingPx}px`,
        ...transitionStyle,
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") startEditing()
      }}
      aria-label="Editable text — cliquer pour éditer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        className={cn(isPlaceholderLook && "text-gray-400 italic", "block w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap", finalClassName)}
        title={displayText}
      >
        {displayText}
      </span>
      {autoWidth && (
        <span
          ref={measurerRef}
          className="absolute invisible h-0 overflow-hidden whitespace-pre pl-0 pr-0"
          style={{
            fontFamily: textStyle.fontFamily,
            fontSize: textStyle.fontSize,
            lineHeight: textStyle.lineHeight,
            fontWeight: fontWeight || (mode === "button" ? "600" : "400"),
          }}
          aria-hidden
        />
      )}
    </div>
  )
}

export default EditableText
