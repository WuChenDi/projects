import { Button } from '@cdlab996/ui/components/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="container mx-auto flex max-w-xl flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight">404</h1>
      <p className="mt-2 text-sm text-muted-foreground">页面不存在</p>
      <Link href="/" className="mt-6">
        <Button>回首页</Button>
      </Link>
    </main>
  )
}
