export function escapeXml(text: string): string {
  const ssmlTags: string[] = []
  let tempText = text.replace(
    /<break\s+time=["'](\d+(?:\.\d+)?[ms]s?)["']\s*\/>/g,
    (match) => {
      ssmlTags.push(match)
      return `__SSML_TAG_${ssmlTags.length - 1}__`
    },
  )

  tempText = tempText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

  return tempText.replace(
    /__SSML_TAG_(\d+)__/g,
    (_, index) => ssmlTags[parseInt(index)],
  )
}

export function splitText(text: string, maxLength = 5000): string[] {
  const segments: string[] = []
  let remainingText = text.trim()

  const punctuationGroups = [
    ['\n', '\r\n'],
    [
      '。',
      '！',
      '？',
      '.',
      '!',
      '?',
      '。',
      '！',
      '？',
      '︒',
      '︕',
      '︖',
      '｡',
      '!',
      '?',
      '।',
      '॥',
      '؟',
      '۔',
      '។',
      '៕',
      '။',
      '၏',
      '¿',
      '¡',
      '‼',
      '⁇',
      '⁈',
      '⁉',
      '‽',
      '~',
    ],
    ['；', ';', '；', '︔', '︐', '؛', '፤', '꛶'],
    [
      '，',
      '：',
      ',',
      ':',
      '、',
      '，',
      '：',
      '︑',
      '︓',
      '､',
      ':',
      '،',
      '፣',
      '፥',
      '၊',
      '၌',
      '،',
      '؍',
      '׀',
      '，',
    ],
    [
      '、',
      '…',
      '―',
      '─',
      '-',
      '—',
      '–',
      '‥',
      '〳',
      '〴',
      '〵',
      '᠁',
      '᠂',
      '᠃',
      '᭛',
      '᭜',
      '᭝',
      '᱾',
      '᱿',
      '⁂',
      '※',
      '〽',
      '〜',
    ],
    [' ', '\t', '　', '〿', '〮', '〯', '᠀', '᭟', '᭠', '᳓', '᳔', '᳕'],
  ]

  while (remainingText.length > 0) {
    let splitIndex = remainingText.length
    let currentLength = 0
    let bestSplitIndex = -1
    // let bestPriorityFound = -1;

    for (let i = 0; i < remainingText.length; i++) {
      currentLength += remainingText.charCodeAt(i) > 127 ? 2 : 1
      if (currentLength > maxLength) {
        splitIndex = i
        for (
          let priority = 0;
          priority < punctuationGroups.length;
          priority++
        ) {
          let searchLength = 0
          for (let j = i; j >= 0 && searchLength <= 300; j--) {
            searchLength += remainingText.charCodeAt(j) > 127 ? 2 : 1
            if (punctuationGroups[priority].includes(remainingText[j])) {
              // bestPriorityFound = priority;
              bestSplitIndex = j
              break
            }
          }
          if (bestSplitIndex > -1) break
        }
        break
      }
    }

    if (bestSplitIndex > 0) {
      splitIndex = bestSplitIndex + 1
    }

    segments.push(remainingText.substring(0, splitIndex))
    remainingText = remainingText.substring(splitIndex).trim()
  }

  return segments
}
