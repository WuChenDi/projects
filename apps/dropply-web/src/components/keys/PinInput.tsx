'use client'

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@cdlab/ui/components/input-otp'
import { REGEXP_ONLY_DIGITS } from 'input-otp'

interface PinInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
}

export function PinInput({ value, onChange, onComplete }: PinInputProps) {
  return (
    <InputOTP
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      value={value}
      onChange={onChange}
      onComplete={onComplete}
    >
      <InputOTPGroup>
        {Array.from({ length: 6 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length OTP slots
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}
