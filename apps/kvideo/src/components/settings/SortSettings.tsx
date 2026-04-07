import { sortOptions } from '@/lib/store/settings-helpers'
import type { SortOption } from '@/lib/store/settings-store'

interface SortSettingsProps {
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
}

export function SortSettings({ sortBy, onSortChange }: SortSettingsProps) {
  return (
    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)] p-6 mb-6">
      <h2 className="text-xl font-semibold text-[var(--text-color)] mb-4">
        搜索结果排序
      </h2>
      <p className="text-sm text-[var(--text-color-secondary)] mb-4">
        选择搜索结果的默认排序方式
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.keys(sortOptions) as SortOption[]).map((option) => (
          <button
            key={option}
            onClick={() => onSortChange(option)}
            className={`px-4 py-3 rounded-[var(--radius-2xl)] border text-left font-medium transition-all duration-200 cursor-pointer ${
              sortBy === option
                ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white'
                : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
            }`}
          >
            {sortOptions[option]}
          </button>
        ))}
      </div>
    </div>
  )
}
