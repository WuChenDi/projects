'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Card, CardContent, CardHeader } from '@cdlab996/ui/components/card'
import GradientText from '@/components/reactbits/GradientText'
import ShinyText from '@/components/reactbits/ShinyText'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex items-center justify-center p-3 sm:p-4 md:p-6">
      <Card className="w-full max-w-xl mx-auto border-none bg-card/20 backdrop-blur-lg p-4 sm:p-6 md:p-8 transition-all duration-300 rounded-2xl">
        <CardHeader className="text-center space-y-2 sm:space-y-3">
          <GradientText className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent flex items-center justify-center gap-2 sm:gap-3">
            Oh no!
          </GradientText>
        </CardHeader>

        <CardContent className="px-2 sm:px-4 space-y-6 sm:space-y-8">
          <ShinyText
            text="There was an issue with our storefront. This could be a temporary issue, please try your action again."
            disabled={false}
            speed={3}
            className="text-xs sm:text-sm md:text-base text-gray-600 text-center dark:text-gray-400 font-medium"
          />
          <Button
            onClick={() => reset()}
            className="w-full text-white transition-all duration-300 shadow-md bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-400/30 hover:shadow-blue-500/40"
            size="lg"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
