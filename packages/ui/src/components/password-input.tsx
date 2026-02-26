"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@cdlab996/ui/components/input-group"

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  defaultVisible?: boolean
  visible?: boolean
  onVisibleChange?: (visible: boolean) => void
  toggleAriaLabel?: string
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      defaultVisible = false,
      visible: controlledVisible,
      onVisibleChange,
      toggleAriaLabel = "Toggle password visibility",
      className,
      ...props
    },
    ref
  ) => {
    const [internalVisible, setInternalVisible] = React.useState(defaultVisible)
    const isControlled = controlledVisible !== undefined
    const isVisible = isControlled ? controlledVisible : internalVisible

    const toggleVisibility = () => {
      const newVisible = !isVisible

      if (!isControlled) {
        setInternalVisible(newVisible)
      }

      onVisibleChange?.(newVisible)
    }

    return (
      <InputGroup>
        <InputGroupInput
          ref={ref}
          type={isVisible ? "text" : "password"}
          className={className}
          {...props}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            onClick={toggleVisibility}
            aria-label={toggleAriaLabel}
            type="button"
          >
            {isVisible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    )
  }
)

PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
