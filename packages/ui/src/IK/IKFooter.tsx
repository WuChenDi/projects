interface IKFooterProps {
  year: number | string
}

export function IKFooter({ year }: IKFooterProps) {
  return (
    <footer className="relative w-full z-10 text-sm text-muted-foreground py-6">
      <div className="flex items-center justify-center">
        Copyright © {year}-PRESENT |
        <a
          href="https://github.com/WuChenDi/"
          className="pl-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          wudi
        </a>
      </div>
    </footer>
  )
}
