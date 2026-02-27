import { Input } from '@cdlab996/ui/components/input'
import { CURRENCY_CONFIG } from '@/lib/currencies'

interface AmountInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  currency: string
}

export default function AmountInput(props: AmountInputProps) {
  const { value, onChange, placeholder, currency } = props

  const getCurrencySymbol = (currencyValue: string) => {
    const crypto = CURRENCY_CONFIG.crypto.find((c) => c.value === currencyValue)
    const fiat = CURRENCY_CONFIG.fiat.find((f) => f.value === currencyValue)
    if (crypto) return crypto.symbol || crypto.value
    if (fiat) return fiat.symbol || fiat.value
    return ''
  }

  const currencySymbol = getCurrencySymbol(currency)

  return (
    <div className="relative flex-1">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${currencySymbol ? 'pr-12 sm:pr-16' : ''} text-base`}
        style={{ fontSize: '16px' }}
      />
      {currencySymbol && (
        <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-xs sm:text-sm max-w-[3rem] sm:max-w-none truncate">
          {currencySymbol}
        </div>
      )}
    </div>
  )
}
