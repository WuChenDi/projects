'use client'

import { Card, CardContent } from '@cdlab996/ui/components/card'
import GradientText from '@cdlab996/ui/reactbits/GradientText'
import ShinyText from '@cdlab996/ui/reactbits/ShinyText'
import SpotlightCard from '@cdlab996/ui/reactbits/SpotlightCard'
import { RefreshCw } from 'lucide-react'
import AmountInput from '@/components/AmountInput'
import CurrencySelector from '@/components/CurrencySelector'
import { PageContainer } from '@/components/layout'
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter'
import { useExchangeRates } from '@/hooks/useExchangeRates'

export default function App() {
  const { rates, loading, refreshRates } = useExchangeRates()
  const {
    fields,
    getUsedCurrencies,
    handleAmountChange,
    handleCurrencyChange,
  } = useCurrencyConverter(rates)

  return (
    <PageContainer scrollable={false}>
      <div className="mx-auto relative space-y-12 ">
        <div className="text-center mb-8">
          <GradientText className="text-3xl md:text-4xl font-bold bg-gradient-to-r">
            Value Converter
          </GradientText>
          <div className="flex items-center justify-center mt-6">
            <ShinyText
              text="✨ Re-examine your purchasing power and wealth perspective through cryptocurrency"
              disabled={false}
              speed={3}
            />
          </div>
        </div>

        <Card className="relative border-none bg-card/20 backdrop-blur-lg pb-2!">
          <div
            className="absolute top-4 right-6 cursor-pointer"
            title="Refresh the exchange rate"
            onClick={refreshRates}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </div>
          <CardContent className="p-4 sm:p-6 pb-2! space-y-4 sm:space-y-6">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <SpotlightCard key={field.id}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <CurrencySelector
                      value={field.currency}
                      onChange={(currency) =>
                        handleCurrencyChange(index, currency)
                      }
                      excludeCurrencies={getUsedCurrencies(index)}
                    />
                    <AmountInput
                      value={field.amount}
                      onChange={(value) => handleAmountChange(index, value)}
                      placeholder="Enter amount"
                      currency={field.currency}
                    />
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
