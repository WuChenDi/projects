'use client'

import { Button } from '@cdlab996/ui/components/button'
import { Card, CardContent, CardHeader } from '@cdlab996/ui/components/card'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-6">
      <Card className="mx-auto w-full max-w-xl rounded-2xl border-none bg-card/20 p-6 backdrop-blur-lg md:p-8">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold md:text-3xl">Oh no!</h1>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-sm text-muted-foreground md:text-base">
            Something went wrong. This may be temporary — please try again.
          </p>
          <Button onClick={() => reset()} className="w-full" size="lg">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
