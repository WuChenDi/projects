'use client'

import { Button } from '@cdlab996/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Field } from '@cdlab996/ui/components/field'
import { Input } from '@cdlab996/ui/components/input'
import { Label } from '@cdlab996/ui/components/label'
import { Separator } from '@cdlab996/ui/components/separator'
import { cn } from '@cdlab996/ui/lib/utils'
import { CheckCircle, ChevronDown, Download, Info, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout'
import { RetrieveClient } from '@/components/RetrieveClient'

const HOW_IT_WORKS = [
  'Enter the 6-character code you received',
  'View and download all shared files',
  'Files expire after the set time period',
]

function RetrievePageContent() {
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')
  const [retrievalCode, setRetrievalCode] = useState(codeFromUrl || '')
  const [showFiles, setShowFiles] = useState(!!codeFromUrl)
  const [showHowItWorks, setShowHowItWorks] = useState(true)

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
    window.history.pushState({}, '', `/retrieve?code=${code}`)
    setShowFiles(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRetrieve()
    }
  }

  const handleBack = () => {
    window.history.pushState({}, '', '/retrieve')
    setShowFiles(false)
    setRetrievalCode('')
  }

  return (
    <PageContainer scrollable={false}>
      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
          {/* Left panel: input */}
          <div className="space-y-4">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Retrieve Files</CardTitle>
                <CardDescription>
                  Enter your 6-character retrieval code to access shared files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Field>
                  <Label htmlFor="retrieval-code">Retrieval Code</Label>
                  <Input
                    id="retrieval-code"
                    type="text"
                    value={retrievalCode}
                    onChange={(e) =>
                      setRetrievalCode(e.target.value.toUpperCase())
                    }
                    onKeyDown={handleKeyDown}
                    placeholder="A1B2C3"
                    maxLength={6}
                    className="text-center text-xl"
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
                </Field>

                <Button
                  onClick={handleRetrieve}
                  disabled={
                    !retrievalCode.trim() || retrievalCode.trim().length !== 6
                  }
                  className="w-full bg-linear-to-r from-emerald-500 to-teal-500 border-none text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="size-4" />
                  Access Files
                </Button>

                <div className="text-center">
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

            {/* How it works — collapsible card, contextual help near the input */}
            <Card className="p-0 shadow-none">
              <div
                className="flex items-center justify-between p-4 cursor-pointer rounded-lg"
                onClick={() => setShowHowItWorks(!showHowItWorks)}
              >
                <div className="flex items-center gap-2.5">
                  <Info className="size-4 text-primary" />
                  <span className="text-base font-medium">How it works</span>
                </div>
                <ChevronDown
                  className={cn(
                    'size-4 text-muted-foreground transition-transform duration-200',
                    showHowItWorks && 'rotate-180',
                  )}
                />
              </div>

              {showHowItWorks && (
                <div className="px-4 pb-4 space-y-3">
                  {HOW_IT_WORKS.map((step, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static list
                    <div key={index} className="flex items-start gap-3">
                      <div className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {step}
                      </p>
                    </div>
                  ))}
                  <Separator />
                  <p className="text-muted-foreground text-xs text-center">
                    Files are automatically deleted after expiry
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Right panel: results only */}
          {showFiles && retrievalCode ? (
            <RetrieveClient code={retrievalCode} onBack={handleBack} />
          ) : (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Result</CardTitle>
                <CardDescription>
                  Your retrieved files will appear here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <div className="p-4 rounded-full bg-muted/50">
                    <Download size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter a retrieval code on the left to access shared files
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  )
}

export default function RetrievePage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <Card className="shadow-none max-w-md mx-auto">
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
        </PageContainer>
      }
    >
      <RetrievePageContent />
    </Suspense>
  )
}
