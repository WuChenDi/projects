import type { SVGProps } from 'react'

// Sink brand mark: bars narrowing from wide to a single point that drains
// downward — "many links sink into one short link". Stroke uses currentColor,
// so it inherits the surrounding text color (e.g. text-primary in the header).
export function SinkLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 6h16" />
      <path d="M7 11h10" />
      <path d="M10 16h4" />
      <path d="M12 16v4" />
    </svg>
  )
}
