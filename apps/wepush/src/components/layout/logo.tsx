import { Send } from 'lucide-react'
import type { ComponentProps } from 'react'

// wepush brand mark — lucide "send" (a dispatched paper plane = the push).
// Stroke uses currentColor so it inherits the surrounding text color
// (e.g. text-primary in the header / sidebar).
export function WepushLogo(props: ComponentProps<typeof Send>) {
  return <Send aria-hidden="true" {...props} />
}
