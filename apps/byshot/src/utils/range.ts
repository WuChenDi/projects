export const range = (start: number, end?: number) => {
  const output: number[] = []
  let from = start
  let to = end
  if (typeof to === 'undefined') {
    to = from
    from = 0
  }
  for (let i = from; i < to; i += 1) {
    output.push(i)
  }
  return output
}
