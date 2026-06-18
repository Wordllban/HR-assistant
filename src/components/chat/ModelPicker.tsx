import { Sparkles } from 'lucide-react'
import { CHAT_MODELS } from '@/lib/models'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ModelPickerProps {
  value: string
  onChange: (model: string) => void
  disabled?: boolean
}

const freeModels = CHAT_MODELS.filter((model) => model.tier === 'free')
const premiumModels = CHAT_MODELS.filter((model) => model.tier === 'premium')

/**
 * Model selector backing the chat. Free models run on a $0 key; premium ones are
 * grouped and flagged "requires credit" — selecting one without OpenRouter credit
 * surfaces a graceful 402 in the chat panel rather than a hard failure (DECISIONS.md §15).
 */
export function ModelPicker({ value, onChange, disabled }: ModelPickerProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger size="sm" className="h-8 gap-1.5 rounded-full text-xs" aria-label="Model">
        <Sparkles className="size-3.5" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Free</SelectLabel>
          {freeModels.map((model) => (
            <SelectItem key={model.id} value={model.id} className="text-xs">
              {model.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Premium · requires credit</SelectLabel>
          {premiumModels.map((model) => (
            <SelectItem key={model.id} value={model.id} className="text-xs">
              {model.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
