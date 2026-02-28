import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="relative w-full border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-400 py-6 md:py-8">
      <div className="container mx-auto px-4 flex items-center justify-center">
        Copyright © 2025-PRESENT |
        <Link
          href="https://github.com/WuChenDi/"
          className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 pl-2"
        >
          wudi
        </Link>
      </div>
    </footer>
  )
}
