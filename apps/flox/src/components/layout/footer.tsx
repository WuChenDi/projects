import Link from 'next/link'

export function Footer() {
  return (
    <footer className="relative w-full z-10 border-t border-dashed text-sm py-6">
      <div className="flex items-center justify-center">
        Copyright © 2025-PRESENT |
        <Link href="https://github.com/WuChenDi/" className="text-primary pl-2">
          wudi
        </Link>
      </div>
    </footer>
  )
}
