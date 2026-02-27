import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_FIELDS } from '@/lib/currencies'
import { ConverterField, ExchangeRates } from '@/types/currency'

export const useCurrencyConverter = (rates: ExchangeRates) => {
  const [fields, setFields] = useState<ConverterField[]>(DEFAULT_FIELDS)
  const [updating, setUpdating] = useState(false)
  const [lastInputIndex, setLastInputIndex] = useState(0)

  useEffect(() => {
    if (Object.keys(rates).length > 0 && fields[lastInputIndex]?.amount) {
      convert(lastInputIndex)
    }
  }, [rates])

  const getUsedCurrencies = (excludeIndex?: number) => {
    return fields
      .filter((_, index) => index !== excludeIndex)
      .map((field) => field.currency)
  }

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const parseAmount = (amountStr: string): number => {
    return parseFloat(amountStr.replace(/,/g, ''))
  }

  const convert = useCallback(
    (sourceIndex: number, currentFields?: ConverterField[]) => {
      if (updating) return
      setUpdating(true)

      const fieldsToUse = currentFields || fields
      const sourceField = fieldsToUse[sourceIndex]
      const sourceAmount = parseAmount(sourceField.amount)
      const sourceCurrency = sourceField.currency

      if (!sourceField.amount || sourceField.amount === '') {
        setFields((prev) =>
          prev.map((field, index) =>
            index === sourceIndex ? field : { ...field, amount: '' },
          ),
        )
        setUpdating(false)
        return
      }

      if (isNaN(sourceAmount)) {
        setUpdating(false)
        return
      }

      setFields((prev) =>
        prev.map((field, index) => {
          if (index === sourceIndex) return field

          const targetCurrency = field.currency
          let result = 0

          if (sourceCurrency === targetCurrency) {
            result = sourceAmount
          } else if (
            rates[sourceCurrency] &&
            rates[sourceCurrency][targetCurrency]
          ) {
            result = sourceAmount * rates[sourceCurrency][targetCurrency]
          }

          return {
            ...field,
            amount: formatAmount(result),
          }
        }),
      )

      setUpdating(false)
    },
    [fields, rates, updating],
  )

  const handleAmountChange = (index: number, value: string) => {
    setLastInputIndex(index)

    setFields((prev) => {
      const newFields = prev.map((field, i) =>
        i === index ? { ...field, amount: value } : field,
      )

      setTimeout(() => convert(index, newFields), 0)

      return newFields
    })
  }

  const handleCurrencyChange = (index: number, currency: string) => {
    setFields((prev) => {
      const newFields = prev.map((field, i) =>
        i === index ? { ...field, currency } : field,
      )

      setTimeout(() => convert(lastInputIndex, newFields), 0)

      return newFields
    })
  }

  return {
    fields,
    getUsedCurrencies,
    handleAmountChange,
    handleCurrencyChange,
  }
}
