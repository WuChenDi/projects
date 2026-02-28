'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Input } from '@cdlab996/ui/components/input'
import { Label } from '@cdlab996/ui/components/label'
import { cn } from '@cdlab996/ui/lib/utils'
import GradientText from '@cdlab996/ui/reactbits/GradientText'
import ShinyText from '@cdlab996/ui/reactbits/ShinyText'
import { CheckCircle, Download, Info, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { RetrieveClient } from '@/components/RetrieveClient'

function RetrievePageContent() {
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')
  const [retrievalCode, setRetrievalCode] = useState(codeFromUrl || '')
  const [showFiles, setShowFiles] = useState(!!codeFromUrl)

  useEffect(() => {
    if (codeFromUrl) {
      setRetrievalCode(codeFromUrl)
      setShowFiles(true)
    }
  }, [codeFromUrl])

  const handleRetrieve = () => {
    const code = retrievalCode.trim()
    if (!code) {
      alert('Please enter a retrieval code')
      return
    }

    if (code.length !== 6) {
      alert('Retrieval code must be exactly 6 characters')
      return
    }

    // Update URL and show files
    const newUrl = `/retrieve?code=${code}`
    window.history.pushState({}, '', newUrl)
    setShowFiles(true)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRetrieve()
    }
  }

  const handleBack = () => {
    window.history.pushState({}, '', '/retrieve')
    setShowFiles(false)
    setRetrievalCode('')
  }

  if (showFiles && retrievalCode) {
    return <RetrieveClient code={retrievalCode} onBack={handleBack} />
  }

  return (
    <div className="w-full max-w-4xl space-y-12 relative">
      <div className="text-center mb-8">
        <GradientText className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r mb-6">
          Retrieve Files
        </GradientText>

        <div className="mt-6">
          <ShinyText
            text="Enter your 6-character retrieval code to access shared files"
            disabled={false}
            speed={3}
            className="text-base md:text-lg text-gray-600 dark:text-gray-300"
          />
        </div>
      </div>

      <Card
        className={cn(
          'relative border-none bg-card/30 backdrop-blur-xl shadow-lg rounded-xl overflow-hidden max-w-md mx-auto',
          'transition-all duration-300',
        )}
      >
        <CardHeader className="border-b border-border/20 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg">
              <Download size={20} />
            </div>
            <div>
              <CardTitle className="text-xl">Access Files</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter your retrieval code
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="space-y-3">
            <Label htmlFor="retrieval-code">Retrieval Code</Label>
            <Input
              id="retrieval-code"
              type="text"
              value={retrievalCode}
              onChange={(e) => setRetrievalCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              placeholder="A1B2C3"
              maxLength={6}
              className="text-center text-xl font-mono font-bold h-14"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Enter the 6-character code (letters and numbers)
              </p>
              <p
                className={cn(
                  'text-xs font-medium',
                  retrievalCode.length === 6
                    ? 'text-emerald-600'
                    : retrievalCode.length > 6
                      ? 'text-red-600'
                      : 'text-muted-foreground',
                )}
              >
                {retrievalCode.length}/6
                {retrievalCode.length === 6 && (
                  <CheckCircle size={12} className="inline ml-1" />
                )}
              </p>
            </div>
          </div>

          <Button
            onClick={handleRetrieve}
            disabled={
              !retrievalCode.trim() || retrievalCode.trim().length !== 6
            }
            className={cn(
              'w-full h-12 border-none text-white font-semibold shadow-lg rounded-xl',
              'transition-all duration-300 hover:shadow-xl hover:scale-[1.02]',
              'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
            )}
          >
            <Download className="mr-2 h-4 w-4" />
            Access Files
          </Button>

          <div className="text-center pt-2">
            <p className="text-sm text-muted-foreground">
              Don't have a code?{' '}
              <Link
                href="/share"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Share files instead
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card
        className={cn(
          'relative border-none bg-card/30 backdrop-blur-xl shadow-lg rounded-xl overflow-hidden max-w-md mx-auto',
          'transition-all duration-300 hover:shadow-xl',
        )}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Info size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-lg">How it works</CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 mt-2 flex-shrink-0" />
              <span>Enter the 6-character code you received</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 mt-2 flex-shrink-0" />
              <span>View and download all shared files</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 mt-2 flex-shrink-0" />
              <span>Files expire after the set time period</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RetrievePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-4xl space-y-12 relative flex items-center justify-center min-h-[400px]">
          <Card className="border-none bg-card/30 backdrop-blur-xl shadow-lg max-w-md mx-auto">
            <CardContent className="p-12 text-center">
              <div className="space-y-6">
                <Loader2
                  size={48}
                  className="mx-auto text-primary animate-spin"
                />
                <div>
                  <CardTitle className="text-2xl mb-2">Loading...</CardTitle>
                  <p className="text-muted-foreground">
                    Please wait while we prepare the retrieve page
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <RetrievePageContent />
    </Suspense>
  )
}
