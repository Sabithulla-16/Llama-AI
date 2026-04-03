import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { IconType } from 'react-icons'
import {
  SiC,
  SiCss,
  SiDotnet,
  SiGo,
  SiGnubash,
  SiHtml5,
  SiJavascript,
  SiJson,
  SiKotlin,
  SiLess,
  SiMarkdown,
  SiOpenjdk,
  SiPhp,
  SiPostgresql,
  SiPython,
  SiRuby,
  SiRust,
  SiSass,
  SiSwift,
  SiTypescript,
  SiYaml,
} from 'react-icons/si'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import {
  Menu,
  MessageSquarePlus,
  Cpu,
  Check,
  Loader2,
  Play,
  Pause,
  Copy,
  Share2,
  Download,
  Eye,
  EyeOff,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Mic,
  SendHorizontal,
  Square,
  ImagePlus,
  LayoutDashboard,
  Trash2,
  LogIn,
  LogOut,
  Sun,
  Moon,
  X,
  Volume2,
} from 'lucide-react'

type Role = 'user' | 'assistant'

type Conversation = {
  id: string
  user_id: string
  title: string
  is_shared?: boolean | null
  share_token?: string | null
  created_at: string
}

type ChatMessage = {
  id: string
  conversation_id: string
  role: Role
  content: string
  model?: AIModel | null
  model_used?: AIModel | null
  created_at: string
}

type ThemeMode = 'light' | 'dark'
type ResponseStyle = 'balanced' | 'concise' | 'detailed'
type PromptPurpose = 'general' | 'coding' | 'business' | 'study' | 'writing'
type AIModel = 'llama' | 'qwen' | 'coder' | 'mini' | 'smart'
type VoiceLanguage = 'en-US' | 'en-GB'
type GenerationOptions = {
  isRegenerate?: boolean
  replaceAssistantMessageId?: string
  replaceAssistantCreatedAt?: string
  replaceAssistantContent?: string
  overrideModel?: AIModel
  anchorMessageId?: string
  originalPromptMessageId?: string
  regeneratePromptContent?: string
}

const API_BASE =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    'https://valtry-llama3-2-3b-quantized.hf.space').replace(/\/+$/, '')
const STOP_API = `${API_BASE}/v1/stop`
const IMAGE_STREAM_API = `${API_BASE}/v1/chat/image/stream`
const MODEL_ENDPOINTS: Record<AIModel, string> = {
  llama: '/v1/chat/llama',
  qwen: '/v1/chat/qwen',
  coder: '/v1/chat/coder',
  mini: '/v1/chat/mini',
  smart: '/v1/chat/smart',
}
const MODEL_LABELS: Record<AIModel, string> = {
  llama: 'General',
  qwen: 'Fast',
  coder: 'Coding',
  mini: 'Very Fast',
  smart: 'Fast + Smart',
}
const MODEL_ENGINE_LABELS: Record<AIModel, string> = {
  llama: 'Llama',
  qwen: 'Qwen',
  coder: 'Coder',
  mini: 'Mini',
  smart: 'Smart',
}

const COMPOSER_MODEL_OPTIONS: AIModel[] = ['llama', 'coder']

const isAIModel = (value: unknown): value is AIModel =>
  typeof value === 'string' && value in MODEL_ENDPOINTS

const getMessageModel = (message: ChatMessage): AIModel | null => {
  const candidate = message.model ?? message.model_used
  return isAIModel(candidate) ? candidate : null
}
const PURPOSE_PROMPTS: Record<PromptPurpose, string[]> = {
  general: [
    'Explain AI',
    'Plan my day',
    'Summarize text',
    'Meeting notes',
    'Give ideas',
    'Quick checklist',
  ],
  coding: [
    'Write Python',
    'Fix bug fast',
    'Regex help',
    'SQL query',
    'Refactor code',
    'Code review',
  ],
  business: [
    'Startup ideas',
    'Product copy',
    'Landing page',
    'Pitch outline',
    'Roadmap draft',
    'Market angle',
  ],
  study: [
    'Study plan',
    'Concept notes',
    'Quiz me',
    'Explain simply',
    'Revision list',
    'Topic summary',
  ],
  writing: [
    'Email draft',
    'Rewrite concise',
    'Blog outline',
    'Headline ideas',
    'Tone improve',
    'Proofread text',
  ],
}

const PURPOSE_LABELS: Record<PromptPurpose, string> = {
  general: 'General',
  coding: 'Coding',
  business: 'Business',
  study: 'Study',
  writing: 'Writing',
}

const RESPONSE_STYLE_LABELS: Record<ResponseStyle, string> = {
  balanced: 'Balanced',
  concise: 'Concise',
  detailed: 'Detailed',
}

const VOICE_LANGUAGE_LABELS: Record<VoiceLanguage, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
}

const voicePrimaryTag = (language: string) => language.toLowerCase().split('-')[0] || ''

const matchesVoiceLanguage = (voiceLang: string, selectedLanguage: VoiceLanguage) => {
  const voice = voiceLang.toLowerCase()
  const selected = selectedLanguage.toLowerCase()
  const primary = voicePrimaryTag(voice)
  return (
    voice === selected ||
    primary === voicePrimaryTag(selected) ||
    primary === 'en'
  )
}

const formatVoiceDisplayName = (rawName: string) => {
  let name = rawName.trim()
  name = name.replace(/^(microsoft|google|apple|samsung|amazon)\s+/i, '')
  if (name.includes(' - ')) {
    name = name.split(' - ')[0]?.trim() || name
  }
  name = name.replace(/multilingual/gi, ' ')
  name = name.replace(/online/gi, ' ')
  name = name.replace(/\s*\([^)]*\)\s*$/, '').trim()
  name = name.replace(/\s{2,}/g, ' ').trim()
  return name || rawName
}

type DropdownOption<T extends string> = {
  value: T
  label: string
}

type CustomDropdownProps<T extends string> = {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  triggerClassName?: string
  menuClassName?: string
}

function CustomDropdown<T extends string>({
  value,
  options,
  onChange,
  triggerClassName = 'composer-select model-select-trigger',
  menuClassName = 'model-select-menu',
}: CustomDropdownProps<T>) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('down')

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!isOpen) return
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setIsOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const toggleMenu = () => {
    if (!isOpen) {
      const trigger = triggerRef.current
      if (trigger) {
        const rect = trigger.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top
        setMenuDirection(spaceBelow < 220 && spaceAbove > spaceBelow ? 'up' : 'down')
      }
    }
    setIsOpen((prev) => !prev)
  }

  const selectedOption =
    options.find((option) => option.value === value) || options[0]

  return (
    <div className="model-dropdown">
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        onClick={toggleMenu}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.label || ''}</span>
        <ChevronDown size={16} />
      </button>
      {isOpen && (
        <div
          ref={menuRef}
          className={`${menuClassName} ${menuDirection}`}
          role="listbox"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`model-select-option ${
                value === option.value ? 'active' : ''
              }`}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              role="option"
              aria-selected={value === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type VoiceDropdownProps = {
  value: string
  options: DropdownOption<string>[]
  onChange: (value: string) => void
  onPreview: (value: string) => void
  previewingValue: string | null
  triggerClassName?: string
  menuClassName?: string
}

function VoiceDropdown({
  value,
  options,
  onChange,
  onPreview,
  previewingValue,
  triggerClassName = 'composer-select model-select-trigger',
  menuClassName = 'model-select-menu',
}: VoiceDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [menuDirection, setMenuDirection] = useState<'up' | 'down'>('down')

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!isOpen) return
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setIsOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const toggleMenu = () => {
    if (!isOpen) {
      const trigger = triggerRef.current
      if (trigger) {
        const rect = trigger.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top
        setMenuDirection(spaceBelow < 220 && spaceAbove > spaceBelow ? 'up' : 'down')
      }
    }
    setIsOpen((prev) => !prev)
  }

  const selectedOption =
    options.find((option) => option.value === value) || options[0]

  return (
    <div className="model-dropdown">
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        onClick={toggleMenu}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.label || ''}</span>
        <ChevronDown size={16} />
      </button>
      {isOpen && (
        <div
          ref={menuRef}
          className={`${menuClassName} ${menuDirection}`}
          role="listbox"
        >
          {options.map((option) => {
            const isPreviewing = previewingValue === option.value
            return (
              <div
                key={option.value}
                className={`voice-select-option ${value === option.value ? 'active' : ''}`}
              >
                <button
                  type="button"
                  className="voice-select-choice"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  role="option"
                  aria-selected={value === option.value}
                >
                  {option.label}
                </button>
                <button
                  type="button"
                  className={`voice-preview-button ${isPreviewing ? 'playing' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onPreview(option.value)
                  }}
                  title={isPreviewing ? 'Pause preview' : 'Play preview'}
                  aria-label={isPreviewing ? 'Pause preview' : 'Play preview'}
                >
                  {isPreviewing ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function pickRandomPrompts(purpose: PromptPurpose, count = 4) {
  const pool = PURPOSE_PROMPTS[purpose] || PURPOSE_PROMPTS.general
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

function safeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function createShareToken() {
  return crypto.randomUUID().replace(/-/g, '')
}

function cleanAssistantOutput(raw: string) {
  const lines = raw.split('\n')
  const cleanedLines: string[] = []
  let inFence = false

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      cleanedLines.push(line)
      continue
    }

    if (inFence) {
      cleanedLines.push(line)
      continue
    }

    if (/^\s*(\*\*\*+|---+|___+)\s*$/.test(line)) {
      continue
    }

    cleanedLines.push(line.replace(/^\s{0,3}#{1,6}\s+/g, ''))
  }

  const cleaned = cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()

  return cleaned
}

function getImageTagValue(content: string) {
  const match = content.match(/\[Image:\s*([^\]]+)\]/i)
  return match?.[1]?.trim().toLowerCase() || null
}

function getPromptSignatureValue(content: string) {
  return content.replace(/\[Image:\s*[^\]]+\]/gi, '').trim().toLowerCase()
}

function mapImageDataToFetchedMessageIds(
  previousMessages: ChatMessage[],
  fetchedMessages: ChatMessage[],
  imageDataMap: Record<string, string>,
) {
  const sourceByTag = new Map<string, string[]>()

  previousMessages.forEach((message) => {
    if (message.role !== 'user') return
    const tag = getImageTagValue(message.content)
    const dataUrl = imageDataMap[message.id]
    if (!tag || !dataUrl) return

    const queue = sourceByTag.get(tag) || []
    queue.push(dataUrl)
    sourceByTag.set(tag, queue)
  })

  const mapped: Record<string, string> = {}

  fetchedMessages.forEach((message) => {
    if (message.role !== 'user') return
    if (imageDataMap[message.id]) return

    const tag = getImageTagValue(message.content)
    if (!tag) return

    const queue = sourceByTag.get(tag)
    if (!queue || queue.length === 0) return

    const dataUrl = queue.shift()
    if (dataUrl) {
      mapped[message.id] = dataUrl
    }
  })

  return mapped
}

function resolveImageFromPromptSignature(
  message: ChatMessage,
  imagePromptDataMap: Record<string, string[]>,
  promptImageCursor: Record<string, number>,
) {
  const promptSignature = getPromptSignatureValue(message.content)
  const mapKey = `${message.conversation_id}::${promptSignature}`
  const candidates = imagePromptDataMap[mapKey]
  if (!candidates || candidates.length === 0) return undefined

  const cursor = promptImageCursor[mapKey] || 0
  const source = candidates[cursor]
  promptImageCursor[mapKey] = cursor + 1
  return source
}

function deriveTitle(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return 'New Chat'
  return normalized.length > 52 ? `${normalized.slice(0, 52)}...` : normalized
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70) || 'chat'
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

async function streamCompletion(
  apiUrl: string,
  payload: {
    user_id: string
    conversation_id: string
    messages: Pick<ChatMessage, 'role' | 'content'>[]
    temperature?: number
    max_tokens?: number
    stream?: boolean
  },
  signal: AbortSignal,
  onToken: (token: string) => void,
  onDone?: (meta: { conversation_id?: string }) => void,
) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      user_id: payload.user_id,
      conversation_id: payload.conversation_id,
      messages: payload.messages,
      temperature: payload.temperature ?? 0.7,
      max_tokens: payload.max_tokens ?? 512,
      stream: payload.stream ?? true,
    }),
    signal,
  })

  if (!response.ok || !response.body) {
    const details = `HTTP ${response.status} ${response.statusText}`.trim()
    throw new Error(`Could not start streaming response (${details}) from ${apiUrl}.`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let dataLines: string[] = []
  let didSignalDone = false

  const signalDone = (meta: { conversation_id?: string }) => {
    if (didSignalDone) return
    didSignalDone = true
    onDone?.(meta)
  }

  const dispatchEvent = () => {
    const payloadText = dataLines.join('\n').trim()
    dataLines = []

    if (!payloadText) return
    if (payloadText === '[DONE]') {
      signalDone({})
      return
    }

    try {
      const parsed = JSON.parse(payloadText)
      if (parsed?.done === true) {
        signalDone({ conversation_id: parsed?.conversation_id })
        return
      }

      const token = parsed?.choices?.[0]?.delta?.content
      if (typeof token === 'string' && token.length > 0) {
        onToken(token)
      }
    } catch {
      // Ignore malformed stream chunks from edge providers.
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      if (buffer.trim()) {
        const trailing = buffer.endsWith('\n') ? buffer : `${buffer}\n`
        buffer = trailing
      }
    } else {
      buffer += decoder.decode(value, { stream: true })
    }

    const parts = buffer.split(/\r?\n/)
    buffer = parts.pop() || ''

    for (const part of parts) {
      const line = part.trimEnd()
      if (!line) {
        dispatchEvent()
        continue
      }

      if (line.startsWith(':')) continue

      if (line.startsWith('event:')) continue

      if (!line.startsWith('data:')) continue

      const dataPayload = line.slice(5).trimStart()
      dataLines.push(dataPayload)

      // React immediately when backend emits done:true on a data line.
      if (dataPayload && dataPayload !== '[DONE]') {
        try {
          const parsedInline = JSON.parse(dataPayload)
          if (parsedInline?.done === true) {
            signalDone({ conversation_id: parsedInline?.conversation_id })
          }
        } catch {
          // Ignore partial or non-JSON lines.
        }
      }
    }

    if (done) {
      if (dataLines.length > 0) {
        dispatchEvent()
      }
      break
    }
  }
}

async function streamImageCompletion(
  apiUrl: string,
  payload: {
    user_id: string
    conversation_id: string
    prompt: string
    file: File
  },
  signal: AbortSignal,
  onToken: (token: string) => void,
  onVisionDone?: () => void,
  onDone?: () => void,
) {
  const formData = new FormData()
  formData.append('user_id', payload.user_id)
  formData.append('conversation_id', payload.conversation_id)
  formData.append('prompt', payload.prompt)
  formData.append('file', payload.file)

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
    },
    body: formData,
    signal,
  })

  if (!response.ok || !response.body) {
    const details = `HTTP ${response.status} ${response.statusText}`.trim()
    throw new Error(`Could not start image streaming response (${details}) from ${apiUrl}.`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let currentEvent = 'message'
  let dataLines: string[] = []
  let didSignalVisionDone = false
  let didSignalDone = false

  const signalVisionDone = () => {
    if (didSignalVisionDone) return
    didSignalVisionDone = true
    onVisionDone?.()
  }

  const signalDone = () => {
    if (didSignalDone) return
    didSignalDone = true
    onDone?.()
  }

  const dispatchEvent = () => {
    const payloadText = dataLines.join('\n').trim()
    const eventName = currentEvent
    currentEvent = 'message'
    dataLines = []

    if (!payloadText) return
    if (payloadText === '[DONE]') {
      signalDone()
      return
    }

    try {
      const parsed = JSON.parse(payloadText)

      if (eventName === 'vision_done' && parsed?.status === 'done') {
        signalVisionDone()
        return
      }

      if (parsed?.done === true) {
        signalDone()
        return
      }

      const token = parsed?.choices?.[0]?.delta?.content
      if (typeof token === 'string' && token.length > 0) {
        onToken(token)
      }
    } catch {
      // Ignore malformed stream chunks from edge providers.
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      if (buffer.trim()) {
        const trailing = buffer.endsWith('\n') ? buffer : `${buffer}\n`
        buffer = trailing
      }
    } else {
      buffer += decoder.decode(value, { stream: true })
    }

    const parts = buffer.split(/\r?\n/)
    buffer = parts.pop() || ''

    for (const part of parts) {
      const line = part.trimEnd()
      if (!line) {
        dispatchEvent()
        continue
      }

      if (line.startsWith(':')) continue

      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim() || 'message'
        continue
      }

      if (!line.startsWith('data:')) continue

      const dataPayload = line.slice(5).trimStart()
      dataLines.push(dataPayload)

      if (!dataPayload || dataPayload === '[DONE]') {
        if (dataPayload === '[DONE]') {
          signalDone()
        }
        continue
      }

      try {
        const parsedInline = JSON.parse(dataPayload)
        if (currentEvent === 'vision_done' && parsedInline?.status === 'done') {
          signalVisionDone()
        }
        if (parsedInline?.done === true) {
          signalDone()
        }
      } catch {
        // Ignore partial or non-JSON lines.
      }
    }

    if (done) {
      if (dataLines.length > 0) {
        dispatchEvent()
      }
      break
    }
  }
}

function CopyableCodeBlock({
  language,
  meta,
  children,
}: {
  language?: string
  meta?: string
  children: string
}) {
  const textContent = children.replace(/\n$/, '')
  const lines = textContent.split('\n')
  const totalLines = lines.length
  const MAX_COLLAPSED_LINES = 24

  const parseMeta = (rawMeta?: string) => {
    const text = (rawMeta || '').trim()
    const fileMatch =
      text.match(/(?:file|filename|title)=\"([^\"]+)\"/i) ||
      text.match(/(?:file|filename|title)=([^\s]+)/i)

    const braceLines = text.match(/\{([^}]+)\}/)
    const hlLines =
      text.match(/hl_lines=\"([^\"]+)\"/i) ||
      text.match(/highlight=\"([^\"]+)\"/i)

    const lineSpec = braceLines?.[1] || hlLines?.[1] || ''
    const highlightSet = new Set<number>()

    lineSpec
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .forEach((token) => {
        const range = token.match(/^(\d+)-(\d+)$/)
        if (range) {
          const start = Number(range[1])
          const end = Number(range[2])
          if (Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start) {
            for (let i = start; i <= end; i += 1) highlightSet.add(i)
          }
          return
        }

        const single = Number(token)
        if (Number.isFinite(single) && single > 0) highlightSet.add(single)
      })

    return {
      fileName: fileMatch?.[1],
      highlightSet,
    }
  }

  const getLanguageFileExtension = (rawLanguage?: string) => {
    const normalized = (rawLanguage || '').toLowerCase()
    if (['ts', 'tsx', 'typescript'].includes(normalized)) return 'ts'
    if (['js', 'jsx', 'javascript'].includes(normalized)) return 'js'
    if (['py', 'python'].includes(normalized)) return 'py'
    if (['java'].includes(normalized)) return 'java'
    if (['c'].includes(normalized)) return 'c'
    if (['cpp', 'c++', 'cc', 'cxx'].includes(normalized)) return 'cpp'
    if (['cs', 'csharp'].includes(normalized)) return 'cs'
    if (['go', 'golang'].includes(normalized)) return 'go'
    if (['rust', 'rs'].includes(normalized)) return 'rs'
    if (['php'].includes(normalized)) return 'php'
    if (['rb', 'ruby'].includes(normalized)) return 'rb'
    if (['swift'].includes(normalized)) return 'swift'
    if (['kt', 'kotlin'].includes(normalized)) return 'kt'
    if (['sql', 'postgres', 'postgresql', 'plsql'].includes(normalized)) return 'sql'
    if (['json'].includes(normalized)) return 'json'
    if (['html'].includes(normalized)) return 'html'
    if (['css'].includes(normalized)) return 'css'
    if (['scss', 'sass'].includes(normalized)) return 'scss'
    if (['less'].includes(normalized)) return 'less'
    if (['bash', 'shell', 'sh', 'zsh'].includes(normalized)) return 'sh'
    if (['yaml', 'yml'].includes(normalized)) return 'yml'
    if (['markdown', 'md'].includes(normalized)) return 'md'
    return 'txt'
  }

  const getCommonFileName = (rawLanguage?: string) => {
    const normalized = (rawLanguage || '').toLowerCase()
    if (['ts', 'tsx', 'typescript'].includes(normalized)) return 'index.ts'
    if (['js', 'jsx', 'javascript'].includes(normalized)) return 'index.js'
    if (['py', 'python'].includes(normalized)) return 'main.py'
    if (['java'].includes(normalized)) return 'Main.java'
    if (['c'].includes(normalized)) return 'main.c'
    if (['cpp', 'c++', 'cc', 'cxx'].includes(normalized)) return 'main.cpp'
    if (['cs', 'csharp'].includes(normalized)) return 'Program.cs'
    if (['go', 'golang'].includes(normalized)) return 'main.go'
    if (['rust', 'rs'].includes(normalized)) return 'main.rs'
    if (['php'].includes(normalized)) return 'index.php'
    if (['rb', 'ruby'].includes(normalized)) return 'main.rb'
    if (['swift'].includes(normalized)) return 'main.swift'
    if (['kt', 'kotlin'].includes(normalized)) return 'Main.kt'
    if (['sql', 'postgres', 'postgresql', 'plsql'].includes(normalized)) return 'query.sql'
    if (['json'].includes(normalized)) return 'data.json'
    if (['html'].includes(normalized)) return 'index.html'
    if (['css'].includes(normalized)) return 'styles.css'
    if (['scss', 'sass'].includes(normalized)) return 'styles.scss'
    if (['less'].includes(normalized)) return 'styles.less'
    if (['bash', 'shell', 'sh', 'zsh'].includes(normalized)) return 'script.sh'
    if (['yaml', 'yml'].includes(normalized)) return 'config.yml'
    if (['markdown', 'md'].includes(normalized)) return 'README.md'
    return `snippet.${getLanguageFileExtension(rawLanguage)}`
  }
  const getLanguageBadgeMeta = (
    rawLanguage?: string,
  ): { label: string; icon?: IconType; color: string; fallback: string } => {
    const normalized = (rawLanguage || 'code').toLowerCase()

    if (['ts', 'tsx', 'typescript'].includes(normalized)) {
      return { label: 'TypeScript', icon: SiTypescript, color: '#3178c6', fallback: 'TS' }
    }
    if (['js', 'jsx', 'javascript'].includes(normalized)) {
      return { label: 'JavaScript', icon: SiJavascript, color: '#f7df1e', fallback: 'JS' }
    }
    if (['py', 'python'].includes(normalized)) {
      return { label: 'Python', icon: SiPython, color: '#3776ab', fallback: 'PY' }
    }
    if (['java'].includes(normalized)) {
      return { label: 'Java', icon: SiOpenjdk, color: '#ea2d2e', fallback: 'JV' }
    }
    if (['c'].includes(normalized)) {
      return { label: 'C', icon: SiC, color: '#a8b9cc', fallback: 'C' }
    }
    if (['cpp', 'c++', 'cc', 'cxx'].includes(normalized)) {
      return { label: 'C++', icon: SiC, color: '#659ad2', fallback: 'C++' }
    }
    if (['csharp', 'cs'].includes(normalized)) {
      return { label: 'C#', icon: SiDotnet, color: '#512bd4', fallback: 'C#' }
    }
    if (['go', 'golang'].includes(normalized)) {
      return { label: 'Go', icon: SiGo, color: '#00add8', fallback: 'GO' }
    }
    if (['rust', 'rs'].includes(normalized)) {
      return { label: 'Rust', icon: SiRust, color: '#dea584', fallback: 'RS' }
    }
    if (['php'].includes(normalized)) {
      return { label: 'PHP', icon: SiPhp, color: '#777bb4', fallback: 'PHP' }
    }
    if (['rb', 'ruby'].includes(normalized)) {
      return { label: 'Ruby', icon: SiRuby, color: '#cc342d', fallback: 'RB' }
    }
    if (['swift'].includes(normalized)) {
      return { label: 'Swift', icon: SiSwift, color: '#f05138', fallback: 'SW' }
    }
    if (['kotlin', 'kt'].includes(normalized)) {
      return { label: 'Kotlin', icon: SiKotlin, color: '#7f52ff', fallback: 'KT' }
    }
    if (['sql', 'postgres', 'postgresql', 'plsql'].includes(normalized)) {
      return { label: 'SQL', icon: SiPostgresql, color: '#336791', fallback: 'SQL' }
    }
    if (['json'].includes(normalized)) {
      return { label: 'JSON', icon: SiJson, color: '#f0b429', fallback: '{}' }
    }
    if (['html'].includes(normalized)) {
      return { label: 'HTML', icon: SiHtml5, color: '#e34f26', fallback: 'HT' }
    }
    if (['css'].includes(normalized)) {
      return { label: 'CSS', icon: SiCss, color: '#1572b6', fallback: 'CS' }
    }
    if (['scss', 'sass'].includes(normalized)) {
      return { label: normalized.toUpperCase(), icon: SiSass, color: '#cc6699', fallback: 'SC' }
    }
    if (['less'].includes(normalized)) {
      return { label: 'LESS', icon: SiLess, color: '#1d365d', fallback: 'LS' }
    }
    if (['bash', 'shell', 'sh', 'zsh'].includes(normalized)) {
      return { label: 'Shell', icon: SiGnubash, color: '#89e051', fallback: '$>' }
    }
    if (['yaml', 'yml'].includes(normalized)) {
      return { label: 'YAML', icon: SiYaml, color: '#cb171e', fallback: 'YM' }
    }
    if (['markdown', 'md'].includes(normalized)) {
      return { label: 'Markdown', icon: SiMarkdown, color: '#8b949e', fallback: 'MD' }
    }

    return {
      label: rawLanguage || 'Code',
      fallback: '</>',
      color: '#5c6bc0',
    }
  }

  const languageMeta = getLanguageBadgeMeta(language)
  const { fileName: fileNameFromMeta, highlightSet } = parseMeta(meta)
  const defaultFileName = getCommonFileName(language)
  const fileName = fileNameFromMeta || defaultFileName
  const LanguageIcon = languageMeta.icon
  const showLineNumbers = totalLines > 3
  const [isExpanded, setIsExpanded] = useState(totalLines <= MAX_COLLAPSED_LINES)
  const [copied, setCopied] = useState(false)

  const isCollapsible = totalLines > MAX_COLLAPSED_LINES
  const isCollapsed = isCollapsible && !isExpanded
  const collapsedBodyStyle = isCollapsed
    ? { maxHeight: `${MAX_COLLAPSED_LINES * 1.55}em`, overflow: 'hidden' }
    : undefined
  const hasNestedFencedBlocks =
    !language && /(^|\n)\s*```[a-zA-Z0-9_-]+/.test(textContent) && /```\s*$/.test(textContent)

  const onCopy = async () => {
    await navigator.clipboard.writeText(textContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const onDownload = () => {
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`code-shell ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="code-topbar">
        <span className="code-language-badge">
          <span
            className="code-language-icon"
            style={{ color: languageMeta.color }}
            aria-hidden="true"
          >
            {LanguageIcon ? <LanguageIcon size={13} /> : languageMeta.fallback}
          </span>
          <span>{languageMeta.label}</span>
        </span>
        <span className="code-file-pill" title={fileName}>{fileName}</span>
        <span className="code-topbar-meta">{totalLines} lines</span>
        <div className="code-toolbar-group">
          {isCollapsible && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="ghost-button code-button"
            >
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              <span className="code-button-label">{isExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
          )}
          <button type="button" onClick={onDownload} className="ghost-button code-button">
            <Download size={13} />
            <span className="code-button-label">Download</span>
          </button>
          <button type="button" onClick={onCopy} className="ghost-button code-button">
            <Copy size={13} />
            <span className="code-button-label">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <div className="code-body" style={collapsedBodyStyle}>
        {hasNestedFencedBlocks ? (
          <div className="embedded-markdown-code">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ node, className, children, ...props }) => {
                  const nestedCode = String(children)
                  const nestedLanguage = className?.replace('language-', '')
                  const nestedMeta =
                    ((node as { data?: { meta?: string }; meta?: string } | undefined)
                      ?.data?.meta ||
                      (node as { meta?: string } | undefined)?.meta ||
                      '')
                  const isBlock = Boolean(nestedLanguage) || nestedCode.includes('\n')

                  if (isBlock) {
                    return (
                      <CopyableCodeBlock language={nestedLanguage} meta={nestedMeta}>
                        {nestedCode}
                      </CopyableCodeBlock>
                    )
                  }

                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                },
              }}
            >
              {textContent}
            </ReactMarkdown>
          </div>
        ) : (
          <SyntaxHighlighter
            language={language || 'text'}
            style={vscDarkPlus}
            showLineNumbers={showLineNumbers}
            wrapLongLines
            wrapLines
            lineProps={(lineNumber) =>
              highlightSet.has(lineNumber)
                ? { className: 'code-line-highlight' }
                : { className: 'code-line' }
            }
            lineNumberStyle={{ color: 'rgba(181, 199, 229, 0.45)', minWidth: '2.4em' }}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: 0, background: 'transparent', padding: '14px' }}
          >
            {textContent}
          </SyntaxHighlighter>
        )}
        {isCollapsed && <div className="code-fade" aria-hidden="true" />}
      </div>
      {isCollapsed && (
        <div className="code-status-note">
          Showing first {MAX_COLLAPSED_LINES} of {totalLines} lines.
        </div>
      )}
    </div>
  )
}

function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [authPopup, setAuthPopup] = useState<{
    type: 'error' | 'success'
    message: string
  } | null>(null)

  const showAuthPopup = (type: 'error' | 'success', message: string) => {
    setAuthPopup({ type, message })
    window.setTimeout(() => setAuthPopup(null), 3200)
  }

  const normalizeAuthError = (message: string, signUpFlow: boolean) => {
    const text = message.toLowerCase()

    if (text.includes('user already registered') || text.includes('already exists')) {
      return 'Account already exists. Please sign in instead.'
    }

    if (
      text.includes('invalid login credentials') ||
      text.includes('invalid email or password')
    ) {
      return 'Login failed. Check your email and password and try again.'
    }

    if (text.includes('email not confirmed')) {
      return 'Please confirm your email before signing in.'
    }

    if (text.includes('password')) {
      return signUpFlow
        ? 'Password is too weak. Use at least 6 characters.'
        : 'Incorrect password. Please try again.'
    }

    if (text.includes('network') || text.includes('fetch')) {
      return 'Network error. Please check your internet and try again.'
    }

    return signUpFlow
      ? 'Could not create account. Please try again.'
      : 'Could not sign in. Please try again.'
  }

  const onGoogle = async () => {
    if (!supabase) return
    setPending(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/chat`,
      },
    })

    if (error) {
      showAuthPopup('error', normalizeAuthError(error.message, false))
    }
    setPending(false)
  }

  const onEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return

    if (isSignUp && username.trim().length < 2) {
      showAuthPopup('error', 'Please enter a username with at least 2 characters.')
      return
    }

    setPending(true)

    const payload = { email, password }
    const result = isSignUp
      ? await supabase.auth.signUp({
          ...payload,
          options: {
            data: {
              full_name: username.trim(),
            },
          },
        })
      : await supabase.auth.signInWithPassword(payload)

    if (result.error) {
      showAuthPopup('error', normalizeAuthError(result.error.message, isSignUp))
    } else if (isSignUp) {
      showAuthPopup('success', 'Account created. You can now sign in.')
    }

    setPending(false)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-layout">
          <section className="auth-marketing">
            <div className="auth-orb auth-orb-one" />
            <div className="auth-orb auth-orb-two" />
            <img className="auth-logo-mark" src="/favicon.svg" alt="" aria-hidden="true" />
            <p className="auth-eyebrow">Llama AI Workspace</p>
            <h1>Intelligence, organized.</h1>
            <p className="muted-text">
              Sign in to a premium chat system for fast conversations, shared links,
              and saved context.
            </p>

            <div className="auth-visual">
              <div className="auth-visual-card auth-visual-card-one">
                <span className="auth-visual-line auth-line-long" />
                <span className="auth-visual-line auth-line-medium" />
                <span className="auth-visual-line auth-line-short" />
              </div>
              <div className="auth-visual-card auth-visual-card-two">
                <span className="auth-visual-line auth-line-short" />
                <span className="auth-visual-line auth-line-long" />
              </div>
            </div>
          </section>

          <section className="auth-panel">
            <div className="auth-panel-head">
              <div>
                <p className="auth-panel-kicker">Secure access</p>
                <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
              </div>
            </div>

            {!supabase && (
              <p className="error-text">
                Missing Supabase keys. Set VITE_SUPABASE_URL and
                VITE_SUPABASE_ANON_KEY.
              </p>
            )}

            {authPopup && (
              <div className={`auth-popup ${authPopup.type}`} role="alert">
                {authPopup.message}
              </div>
            )}

            <button
              type="button"
              onClick={onGoogle}
              className="primary-button"
              disabled={pending || !supabase}
            >
              Continue with Google
            </button>

            <div className="divider">or</div>

            <form onSubmit={onEmail} className="auth-form">
              {isSignUp && (
                <input
                  type="text"
                  placeholder="Username"
                  required
                  minLength={2}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              )}
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => {
                    const nextPassword = event.target.value
                    setPassword(nextPassword)
                    if (nextPassword.length === 0) {
                      setShowPassword(false)
                    }
                  }}
                />
                {password.length > 0 && (
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="secondary-button"
                disabled={pending || !supabase}
              >
                {pending ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <button
              type="button"
              className="text-button"
              onClick={() => setIsSignUp((prev) => !prev)}
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </button>
          </section>
        </div>

      </div>
    </div>
  )
}

type LandingPageProps = {
  session: Session | null
}

function LandingPage({ session }: LandingPageProps) {
  const navigate = useNavigate()

  const primaryAction = () => {
    navigate(session ? '/chat' : '/auth')
  }

  const secondaryAction = () => {
    navigate(session ? '/dashboard' : '/auth')
  }

  return (
    <div className="landing-wrap">
      <div className="landing-noise" aria-hidden="true" />
      <header className="landing-topbar">
        <div className="landing-brand">
          <img className="landing-brand-mark" src="/favicon.svg" alt="" aria-hidden="true" />
          <p>Llama AI</p>
        </div>
      </header>

      <main className="landing-hero">
        <section className="landing-copy">
          <p className="landing-kicker">Practical intelligence studio</p>
          <h1>
            Chat faster.
            <span>Share cleanly.</span>
            Stay in flow.
          </h1>
          <p className="landing-subtext">
            A focused AI workspace with model-aware responses, image understanding,
            and one-click public sharing for read-only threads.
          </p>
          <div className="landing-actions">
            <button className="landing-cta-primary" onClick={primaryAction}>
              <MessageSquarePlus size={16} />
              {session ? 'Open Workspace' : 'Start Free'}
            </button>
            <button className="landing-cta-secondary" onClick={secondaryAction}>
              <LayoutDashboard size={16} />
              {session ? 'Open Dashboard' : 'Create Account'}
            </button>
          </div>
        </section>

        <section className="landing-stage" aria-label="Platform highlights">
          <article className="landing-panel landing-panel-main">
            <div className="landing-panel-head">
              <span className="landing-pill">Live</span>
              <span className="landing-panel-title">Model-aware answers</span>
            </div>
            <div className="landing-wave" />
            <div className="landing-metrics">
              <div>
                <strong>5</strong>
                <span>Engine profiles</span>
              </div>
              <div>
                <strong>1</strong>
                <span>Tap regenerate</span>
              </div>
              <div>
                <strong>∞</strong>
                <span>Thread continuity</span>
              </div>
            </div>
          </article>

          <article className="landing-panel landing-panel-mini rotate-left">
            <Cpu size={16} />
            <p>Adaptive model labels in every assistant reply.</p>
          </article>

          <article className="landing-panel landing-panel-mini rotate-right">
            <Share2 size={16} />
            <p>Public links open in read-only mode without login.</p>
          </article>
        </section>
      </main>

      <section className="landing-detail-grid" aria-label="Platform details">
        <article className="landing-detail-card">
          <p className="landing-detail-kicker">Why teams pick this</p>
          <h3>Built for real workflows, not toy prompts.</h3>
          <ul className="landing-detail-list">
            <li>
              <Check size={14} />
              Model labels on each answer for transparency.
            </li>
            <li>
              <Check size={14} />
              Regenerate keeps your thread context in place.
            </li>
            <li>
              <Check size={14} />
              Image prompts stay attached to conversation history.
            </li>
            <li>
              <Check size={14} />
              Shared links are read-only for safer collaboration.
            </li>
          </ul>
        </article>

        <article className="landing-detail-card">
          <p className="landing-detail-kicker">How it works</p>
          <h3>Three-step loop from idea to output.</h3>
          <div className="landing-timeline">
            <div className="landing-timeline-item">
              <span>01</span>
              <p>Start a focused prompt or upload an image.</p>
            </div>
            <div className="landing-timeline-item">
              <span>02</span>
              <p>Choose the model profile that matches your intent.</p>
            </div>
            <div className="landing-timeline-item">
              <span>03</span>
              <p>Regenerate, refine, and share the final thread.</p>
            </div>
          </div>
        </article>

        <article className="landing-detail-card landing-detail-cta">
          <p className="landing-detail-kicker">Ready to launch</p>
          <h3>Jump into your workspace now.</h3>
          <p>
            Continue with Google or email, then begin a new chat immediately.
          </p>
          <div className="landing-actions">
            <button className="landing-cta-primary" onClick={primaryAction}>
              <MessageSquarePlus size={16} />
              {session ? 'Go to Chat' : 'Get Started'}
            </button>
            <button className="landing-cta-secondary" onClick={() => navigate('/auth')}>
              <LogIn size={16} />
              Open Sign In
            </button>
          </div>
        </article>
      </section>

      <section className="landing-faq-section" aria-label="Frequently asked questions">
        <div className="landing-faq-head">
          <p className="landing-detail-kicker">FAQ</p>
          <h3>Questions answered before you sign in.</h3>
          <p>
            A few quick answers about how the workspace behaves and what you can do
            with shared conversations.
          </p>
        </div>

        <div className="landing-faq-list">
          <details className="landing-faq-item" open>
            <summary>Can I use it without creating a new workflow?</summary>
            <p>
              Yes. Start with chat, upload images, regenerate responses, and share
              read-only links without changing how you already work.
            </p>
          </details>
          <details className="landing-faq-item">
            <summary>What happens when I share a conversation?</summary>
            <p>
              Shared conversations open in a public read-only page. Recipients can
              view the thread without logging in and cannot continue it.
            </p>
          </details>
          <details className="landing-faq-item">
            <summary>Does image input stay attached to the conversation?</summary>
            <p>
              Yes. Uploaded images remain tied to the message history, so regenerate
              and review flows keep the correct context.
            </p>
          </details>
          <details className="landing-faq-item">
            <summary>Is this optimized for mobile?</summary>
            <p>
              The landing page and auth screen are both responsive, and the landing
              page scrolls naturally on smaller devices.
            </p>
          </details>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <p className="landing-footer-brand">Llama AI Workspace</p>
          <p className="landing-footer-text">
            Focused chat, public sharing, image prompts, and clean thread management.
          </p>
        </div>

        <div className="landing-footer-links">
          <button onClick={primaryAction}>Open Chat</button>
          <button onClick={() => navigate('/dashboard')}>Dashboard</button>
        </div>
      </footer>
    </div>
  )
}

type ChatWorkspaceProps = {
  conversations: Conversation[]
  activeConversationId: string | null
  activeConversationModel: AIModel
  activeMessages: ChatMessage[]
  scrollAnchorMessageId: string | null
  promptPurpose: PromptPurpose
  promptCards: string[]
  draft: string
  selectedModel: AIModel
  enterToSend: boolean
  voiceLanguage: VoiceLanguage
  readVoiceUri: string
  isAnalyzingImage: boolean
  isGenerating: boolean
  generatingConversationId: string | null
  error: string
  notice: string
  pendingDeleteTitle: string | null
  sidebarOpen: boolean
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
  setDraft: React.Dispatch<React.SetStateAction<string>>
  setSelectedModel: React.Dispatch<React.SetStateAction<AIModel>>
  onSendOrStop: (
    input: string,
    imageFile?: File | null,
    imageDataUrl?: string | null,
    options?: GenerationOptions,
  ) => Promise<void>
  sendMessage: (
    input: string,
    imageFile?: File | null,
    imageDataUrl?: string | null,
    options?: GenerationOptions,
  ) => Promise<void>
  onNewChat: () => Promise<void>
  onShareMessage: (content: string) => Promise<void>
  onShareConversation: (conversationId: string) => Promise<void>
  onDeleteConversationRequest: (conversationId: string) => void
  onConfirmDeleteConversation: () => Promise<void>
  onCancelDeleteConversation: () => void
  onSelectConversation: (conversationId: string) => void
  endRef: React.RefObject<HTMLDivElement | null>
  imageDataMap: Record<string, string>
  imageTagDataMap: Record<string, string>
  imagePromptDataMap: Record<string, string[]>
}

function ChatWorkspace({
  conversations,
  activeConversationId,
  activeConversationModel,
  activeMessages,
  scrollAnchorMessageId,
  promptPurpose,
  promptCards,
  draft,
  selectedModel,
  enterToSend,
  voiceLanguage,
  readVoiceUri,
  isAnalyzingImage,
  isGenerating,
  generatingConversationId,
  error,
  notice,
  pendingDeleteTitle,
  sidebarOpen,
  setSidebarOpen,
  setDraft,
  setSelectedModel,
  onSendOrStop,
  sendMessage,
  onNewChat,
  onShareMessage,
  onShareConversation,
  onDeleteConversationRequest,
  onConfirmDeleteConversation,
  onCancelDeleteConversation,
  onSelectConversation,
  endRef,
  imageDataMap,
  imageTagDataMap,
  imagePromptDataMap,
}: ChatWorkspaceProps) {
  const navigate = useNavigate()
  const visibleMessages = useMemo(() => {
    const normalizePrompt = (value: string) =>
      value.replace(/\[Image:\s*[^\]]+\]/gi, '').replace(/\s+/g, ' ').trim().toLowerCase()

    return activeMessages.reduce<ChatMessage[]>((accumulator, message) => {
      const previous = accumulator[accumulator.length - 1]
      if (
        previous &&
        previous.role === message.role &&
        message.role === 'user' &&
        normalizePrompt(previous.content) === normalizePrompt(message.content)
      ) {
        return accumulator
      }

      accumulator.push(message)
      return accumulator
    }, [])
  }, [activeMessages])

  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const messageScrollRef = useRef<HTMLElement | null>(null)
  const anchorAppliedRef = useRef(false)
  const lastAnchoredMessageIdRef = useRef<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const voiceBaseDraftRef = useRef('')
  const maxComposerHeight = 260
  const [isListening, setIsListening] = useState(false)
  const [isVoiceSupported, setIsVoiceSupported] = useState(false)
  const [readingMessageId, setReadingMessageId] = useState<string | null>(null)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const clearSelectedImage = () => {
    setSelectedImageFile(null)
    setPreviewImageUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      clearSelectedImage()
      return
    }
    setSelectedImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setPreviewImageUrl(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const resizeComposerTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    const nextHeight = Math.min(textarea.scrollHeight, maxComposerHeight)
    textarea.style.height = `${Math.max(nextHeight, 42)}px`
  }

  useEffect(() => {
    const textarea = composerTextareaRef.current
    if (!textarea) return

    resizeComposerTextarea(textarea)
  }, [draft])

  useLayoutEffect(() => {
    if (!scrollAnchorMessageId) return
    if (
      lastAnchoredMessageIdRef.current === scrollAnchorMessageId &&
      anchorAppliedRef.current
    ) {
      return
    }

    const container = messageScrollRef.current
    const target = document.getElementById(`message-${scrollAnchorMessageId}`)
    if (!container || !target) return

    anchorAppliedRef.current = false
    requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const nextTop = container.scrollTop + (targetRect.top - containerRect.top) - 12
      container.scrollTop = Math.max(0, nextTop)
      anchorAppliedRef.current = true
      lastAnchoredMessageIdRef.current = scrollAnchorMessageId
    })
  }, [scrollAnchorMessageId, visibleMessages.length])

  useEffect(() => {
    if (!anchorAppliedRef.current) return
    if (!isGenerating || activeConversationId !== generatingConversationId) return

    const assistantHasContent = visibleMessages.some(
      (message) => message.role === 'assistant' && message.content.trim().length > 0,
    )

    if (!assistantHasContent) return

    requestAnimationFrame(() => {
      const container = messageScrollRef.current
      if (!container) return
      container.scrollTop = container.scrollHeight
    })
  }, [activeConversationId, generatingConversationId, isGenerating, visibleMessages])

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      setIsVoiceSupported(false)
      return
    }

    setIsVoiceSupported(true)
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = voiceLanguage
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }

      const base = voiceBaseDraftRef.current
      const spacer = base && !base.endsWith(' ') ? ' ' : ''
      setDraft(`${base}${spacer}${transcript.trimStart()}`)
    }

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [setDraft, voiceLanguage])

  const toggleVoiceTyping = () => {
    const recognition = recognitionRef.current
    if (!recognition) return

    if (isListening) {
      recognition.stop()
      return
    }

    voiceBaseDraftRef.current = draft.trimEnd()
    try {
      recognition.start()
    } catch {
      // Ignore repeated start errors from some browsers.
    }
  }

  const handleReadAloud = (messageId: string, content: string) => {
    // Stop any currently reading message
    if (readingMessageId === messageId) {
      window.speechSynthesis.cancel()
      setReadingMessageId(null)
      return
    }

    // Stop previous reading
    if (readingMessageId) {
      window.speechSynthesis.cancel()
    }

    // Remove markdown formatting for reading
    const plainText = content
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1') // Italic
      .replace(/```[\s\S]*?```/g, '') // Code blocks
      .replace(/`(.+?)`/g, '$1') // Inline code
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
      .replace(/#{1,6}\s/g, '') // Headers

    const utterance = new SpeechSynthesisUtterance(plainText)
    utterance.lang = voiceLanguage
    if (readVoiceUri && readVoiceUri !== 'default') {
      const selectedVoice = window.speechSynthesis
        .getVoices()
        .find((voice) => voice.voiceURI === readVoiceUri)
      if (selectedVoice) {
        utterance.voice = selectedVoice
        utterance.lang = selectedVoice.lang || voiceLanguage
      }
    }
    utterance.onend = () => setReadingMessageId(null)
    utterance.onerror = () => setReadingMessageId(null)

    setReadingMessageId(messageId)
    synthRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const handleCopyMessage = (messageId: string, content: string) => {
    void navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  const handleRegenerateMessage = async (
    messageId: string,
    messageModel: AIModel,
    messageContent: string,
    messageCreatedAt: string,
  ) => {
    if (isGenerating) return

    const messageIndex = activeMessages.findIndex((message) => message.id === messageId)
    if (messageIndex <= 0) return

    const promptImageCursor: Record<string, number> = {}

    for (let index = messageIndex - 1; index >= 0; index -= 1) {
      const candidate = activeMessages[index]
      if (candidate?.role !== 'user') continue

      const promptText = candidate.content.replace(/\[Image:\s*[^\]]+\]/g, '').trim()
      const regeneratePrompt =
        promptText || (candidate.content.includes('[Image:') ? 'Analyze this image' : '')

      if (!regeneratePrompt) return

      const imageTagMatch = candidate.content.match(/\[Image:\s*([^\]]+)\]/)
      const imageTag = imageTagMatch?.[1]?.trim().toLowerCase()
      const imageTagKey = imageTag ? `${candidate.conversation_id}::${imageTag}` : null
      const promptSignatureImage = resolveImageFromPromptSignature(
        candidate,
        imagePromptDataMap,
        promptImageCursor,
      )
      const userImageSrc =
        imageDataMap[candidate.id] ||
        (imageTagKey ? imageTagDataMap[imageTagKey] : undefined) ||
        promptSignatureImage

      let regenerateImageFile: File | null = null
      if (userImageSrc) {
        const blob = await (await fetch(userImageSrc)).blob()
        const imageFileName = imageTagMatch?.[1]?.trim() || 'image.png'
        regenerateImageFile = new File([blob], imageFileName, {
          type: blob.type || 'image/png',
        })
      }

      void onSendOrStop(regeneratePrompt, regenerateImageFile, userImageSrc, {
        isRegenerate: true,
        replaceAssistantMessageId: messageId,
        replaceAssistantCreatedAt: messageCreatedAt,
        replaceAssistantContent: messageContent,
        overrideModel: messageModel,
        anchorMessageId: candidate.id,
        originalPromptMessageId: candidate.id,
        regeneratePromptContent: candidate.content,
      })
      return
    }
  }

  const isStopState =
    isGenerating && activeConversationId === generatingConversationId

  const handleComposerSendOrStop = () => {
    if (isGenerating && activeConversationId !== generatingConversationId) {
      return
    }

    const imageFile = selectedImageFile
    const imageUrl = previewImageUrl
    void onSendOrStop(draft, imageFile, imageUrl)

    // When a message with image is submitted, clear the composer preview card.
    if (!isStopState && imageFile) {
      clearSelectedImage()
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${isGenerating ? 'streaming' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <img className="sidebar-brand-mark" src="/favicon.svg" alt="" aria-hidden="true" />
            <p>Llama AI</p>
          </div>
          <button className="icon-button" onClick={() => setSidebarOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <button className="new-chat" onClick={() => void onNewChat()}>
          <MessageSquarePlus size={16} />
          New Chat
        </button>

        <div className="conversations-container">
          <div className="conversation-list">
            {conversations.map((conv) => {
              const isBackgroundGenerating = isGenerating && generatingConversationId === conv.id && activeConversationId !== conv.id
              return (
                <div
                  key={conv.id}
                  className={`conversation-row ${
                    activeConversationId === conv.id ? 'active' : ''
                  } ${isBackgroundGenerating ? 'generating-background' : ''}`}
                >
                  <button
                    className="conversation-item"
                    onClick={() => onSelectConversation(conv.id)}
                  >
                    {conv.title}
                    {isBackgroundGenerating && (
                      <span className="generating-indicator" title="Generating response in background" />
                    )}
                  </button>
                  <div className="conversation-actions">
                    <button
                      className="conversation-share"
                      onClick={() => void onShareConversation(conv.id)}
                      aria-label="Share conversation"
                    >
                      <Share2 size={14} />
                    </button>
                    <button
                      className="conversation-delete"
                      onClick={() => onDeleteConversationRequest(conv.id)}
                      aria-label="Delete conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <button className="sidebar-settings" onClick={() => navigate('/dashboard')}>
          <LayoutDashboard size={16} />
          Dashboard
        </button>
      </aside>

      <div className="chat-pane">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} />
          </button>
          <h2>{conversations.find((item) => item.id === activeConversationId)?.title || 'Llama AI'}</h2>
          <div className="topbar-actions">
            <button
              className="icon-button"
              onClick={() =>
                activeConversationId && void onShareConversation(activeConversationId)
              }
              disabled={!activeConversationId}
              aria-label="Share active conversation"
            >
              <Share2 size={18} />
            </button>
            <button className="icon-button" onClick={() => navigate('/dashboard')}>
              <LayoutDashboard size={18} />
            </button>
          </div>
        </header>

        <main ref={messageScrollRef} className="message-scroll">
          {visibleMessages.length === 0 ? (
            <section className="empty-state">
              <h3>How can I help today?</h3>
              <p>Pick a suggestion or type your own message.</p>
              <p className="purpose-label">Purpose: {PURPOSE_LABELS[promptPurpose]}</p>
              <div className="suggestion-grid">
                {promptCards.map((prompt) => (
                  <button
                    key={prompt}
                    className="suggestion-card"
                    onClick={() => {
                      void sendMessage(prompt, selectedImageFile)
                      clearSelectedImage()
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="message-list">
              {(() => {
                const promptImageCursor: Record<string, number> = {}
                return visibleMessages.map((message, index) => {
                const isPendingAssistant =
                  message.role === 'assistant' &&
                  !message.content.trim() &&
                  isGenerating &&
                  index === visibleMessages.length - 1
                const userImageTagMatch =
                  message.role === 'user'
                    ? message.content.match(/\[Image:\s*([^\]]+)\]/)
                    : null
                const imageTag = userImageTagMatch?.[1]?.trim().toLowerCase()
                const imageTagKey = imageTag
                  ? `${message.conversation_id}::${imageTag}`
                  : null
                const promptSignatureImage =
                  message.role === 'user'
                    ? resolveImageFromPromptSignature(
                        message,
                        imagePromptDataMap,
                        promptImageCursor,
                      )
                    : undefined
                const userImageSrc =
                  (message.role === 'user' && imageDataMap[message.id]) ||
                  (imageTagKey ? imageTagDataMap[imageTagKey] : undefined) ||
                  promptSignatureImage
                const hasUserImage = Boolean(userImageSrc)
                const userPromptText =
                  message.role === 'user'
                    ? message.content.replace(/\[Image:\s*[^\]]+\]/g, '').trim()
                    : ''
                const messageModel =
                  message.role === 'assistant'
                    ? getMessageModel(message) || activeConversationModel
                    : null

                return (
                  <article
                    key={message.id}
                    id={`message-${message.id}`}
                    className={`message-row ${
                      message.role === 'user' ? 'user-row' : 'assistant-row'
                    }`}
                  >
                    <div
                      className={`bubble ${message.role} ${
                        message.role === 'user' && hasUserImage ? 'with-image' : ''
                      }`}
                    >
                      {message.role === 'user' && hasUserImage && (
                        <div className="message-image-card">
                          <img
                            src={userImageSrc}
                            alt="Uploaded image"
                            className="message-image"
                            onClick={() => {
                              if (!userImageSrc) return
                              setPreviewImageUrl(userImageSrc)
                              setShowImageModal(true)
                            }}
                          />
                          {userPromptText && <p className="message-image-caption">{userPromptText}</p>}
                        </div>
                      )}
                      {isPendingAssistant ? (
                        <div className="thinking-inline">
                          <span className="thinking-dot"></span>
                          <span className="thinking-dot"></span>
                          <span className="thinking-dot"></span>
                          <p>{isAnalyzingImage ? 'Analyzing image...' : 'Thinking...'}</p>
                        </div>
                      ) : message.role === 'assistant' ? (
                        <>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code: ({ node, className, children, ...props }) => {
                                const code = String(children)
                                const language = className?.replace('language-', '')
                                const meta =
                                  ((node as { data?: { meta?: string }; meta?: string } | undefined)
                                    ?.data?.meta ||
                                    (node as { meta?: string } | undefined)?.meta ||
                                    '')
                                const isBlock = Boolean(language) || code.includes('\n')

                                if (isBlock) {
                                  return (
                                    <CopyableCodeBlock language={language} meta={meta}>
                                      {code}
                                    </CopyableCodeBlock>
                                  )
                                }

                                return (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                )
                              },
                            }}
                          >
                            {cleanAssistantOutput(message.content)}
                          </ReactMarkdown>
                        </>
                      ) : (
                        !hasUserImage && (
                          <p>
                            {message.content
                              .replace(/\[Image:\s*[^\]]+\]/g, '')
                              .trim() || (message.content.includes('[Image:') ? 'Image sent' : message.content)}
                          </p>
                        )
                      )}
                    </div>
                    {!isPendingAssistant && message.role === 'assistant' && (
                      <div className="message-actions message-actions-outside">
                        <button
                          type="button"
                          className="ghost-button action-btn message-action-icon"
                          onClick={() =>
                            void handleRegenerateMessage(
                              message.id,
                              messageModel || activeConversationModel,
                              message.content,
                              message.created_at,
                            )
                          }
                          title="Regenerate"
                          aria-label="Regenerate"
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button
                          type="button"
                          className={`ghost-button action-btn message-action-icon ${copiedMessageId === message.id ? 'copied' : ''}`}
                          onClick={() => handleCopyMessage(message.id, message.content)}
                          title={copiedMessageId === message.id ? 'Copied' : 'Copy'}
                          aria-label={copiedMessageId === message.id ? 'Copied' : 'Copy'}
                        >
                          {copiedMessageId === message.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                        <button
                          type="button"
                          className={`ghost-button action-btn message-action-icon ${readingMessageId === message.id ? 'reading' : ''}`}
                          onClick={() => handleReadAloud(message.id, message.content)}
                          title={readingMessageId === message.id ? 'Reading...' : 'Read aloud'}
                          aria-label={readingMessageId === message.id ? 'Reading' : 'Read aloud'}
                        >
                          {readingMessageId === message.id ? (
                            <Loader2 size={16} className="action-icon-spin" />
                          ) : (
                            <Volume2 size={16} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="ghost-button action-btn message-action-icon"
                          onClick={() => void onShareMessage(message.content)}
                          title="Share"
                          aria-label="Share"
                        >
                          <Share2 size={16} />
                        </button>
                        <span className="message-model-pill" title="Model used">
                          <Cpu size={16} />
                          {MODEL_ENGINE_LABELS[messageModel || activeConversationModel]}
                        </span>
                      </div>
                    )}
                  </article>
                )
              })
              })()}
            </div>
          )}
          <div ref={endRef} />
        </main>

        <footer className="composer-wrap">
          {error && <p className="error-text">{error}</p>}
          {notice && <p className="notice-text">{notice}</p>}
          {!selectedImageFile && (
            <div className="composer-options">
              <CustomDropdown
                value={selectedModel}
                options={COMPOSER_MODEL_OPTIONS.map((model) => ({
                  value: model,
                  label: MODEL_LABELS[model],
                }))}
                onChange={setSelectedModel}
              />
            </div>
          )}
          {selectedImageFile && previewImageUrl && (
            <div className="composer-image-preview">
              <button
                type="button"
                className="composer-image-preview-button"
                onClick={() => setShowImageModal(true)}
                title="Open image preview"
              >
                <img
                  src={previewImageUrl}
                  alt={selectedImageFile.name || 'Selected image'}
                  className="composer-image-preview-thumb"
                />
                <span className="composer-image-preview-meta">
                  <strong>{selectedImageFile.name}</strong>
                  <span>Image attached</span>
                </span>
              </button>
              <button
                type="button"
                onClick={clearSelectedImage}
                title="Remove selected image"
                className="composer-image-preview-close"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <div className="composer">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="image-file-input"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                handleImageSelect(file)
              }}
            />
            <button
              type="button"
              className="image-upload-trigger"
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
              title={selectedImageFile ? 'Change image' : 'Upload image'}
            >
              <ImagePlus size={20} />
            </button>
            <textarea
              ref={composerTextareaRef}
              value={draft}
              onChange={(event) => {
                const target = event.currentTarget
                resizeComposerTextarea(target)
                setDraft(event.target.value)
              }}
              placeholder="Type your message..."
              rows={1}
              onKeyDown={(event) => {
                const shouldSend =
                  event.key === 'Enter' &&
                  (enterToSend ? !event.shiftKey : (event.ctrlKey || event.metaKey))

                if (shouldSend) {
                  event.preventDefault()
                  handleComposerSendOrStop()
                }
              }}
            />
            {showImageModal && previewImageUrl && (
              <div className="image-modal-overlay" onClick={() => setShowImageModal(false)}>
                <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="image-modal-close"
                    onClick={() => setShowImageModal(false)}
                    title="Close preview"
                  >
                    <X size={24} />
                  </button>
                  <img src={previewImageUrl} alt="Image preview" className="image-modal-img" />
                </div>
              </div>
            )}
            <div className="composer-actions">
              <button
                type="button"
                className={`composer-action-button voice-button ${
                  isListening ? 'listening' : ''
                }`}
                onClick={toggleVoiceTyping}
                disabled={!isVoiceSupported}
                aria-label={isListening ? 'Stop voice typing' : 'Start voice typing'}
                title={isVoiceSupported ? 'Voice typing' : 'Voice typing unavailable'}
              >
                {isListening && <span className="action-ring-loader" aria-hidden="true" />}
                <Mic size={22} />
              </button>

              <button
                type="button"
                className={`composer-action-button send-button ${
                  isStopState ? 'stop' : 'send'
                }`}
                onClick={() => {
                  handleComposerSendOrStop()
                }}
                disabled={isGenerating && activeConversationId !== generatingConversationId}
                aria-label={isStopState ? 'Stop generation' : 'Send message'}
              >
                {isStopState && <span className="action-ring-loader" aria-hidden="true" />}
                {isStopState ? (
                  <Square size={18} />
                ) : (
                  <SendHorizontal size={22} />
                )}
              </button>
            </div>
          </div>
        </footer>
      </div>

      {pendingDeleteTitle && (
        <div className="modal-backdrop" onClick={onCancelDeleteConversation}>
          <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Delete conversation?</h3>
            <p>
              This will permanently remove <strong>{pendingDeleteTitle}</strong> and
              all its messages.
            </p>
            <div className="confirm-actions">
              <button className="ghost-button confirm-action" onClick={onCancelDeleteConversation}>
                Cancel
              </button>
              <button className="settings-item danger confirm-action" onClick={() => void onConfirmDeleteConversation()}>
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type DashboardProps = {
  email: string
  userId: string
  joinedAt: string
  totalConversations: number
  totalMessages: number
  theme: ThemeMode
  setTheme: React.Dispatch<React.SetStateAction<ThemeMode>>
  displayName: string
  responseStyle: ResponseStyle
  promptPurpose: PromptPurpose
  enterToSend: boolean
  suggestionCount: 4 | 6
  voiceLanguage: VoiceLanguage
  readVoiceUri: string
  confirmClearChats: boolean
  onSavePersonalization: (
    name: string,
    style: ResponseStyle,
    purpose: PromptPurpose,
  ) => void
  onSaveExperienceSettings: (
    enterToSend: boolean,
    suggestionCount: 4 | 6,
    voiceLanguage: VoiceLanguage,
    readVoiceUri: string,
    confirmClearChats: boolean,
  ) => void
  onClearChats: () => Promise<void>
  onLogout: () => Promise<void>
}

function Dashboard({
  email,
  userId,
  joinedAt,
  totalConversations,
  totalMessages,
  theme,
  setTheme,
  displayName,
  responseStyle,
  promptPurpose,
  enterToSend,
  suggestionCount,
  voiceLanguage,
  readVoiceUri,
  confirmClearChats,
  onSavePersonalization,
  onSaveExperienceSettings,
  onClearChats,
  onLogout,
}: DashboardProps) {
  const navigate = useNavigate()
  const saveResetTimerRef = useRef<number | null>(null)
  const [nameDraft, setNameDraft] = useState(displayName)
  const [styleDraft, setStyleDraft] = useState<ResponseStyle>(responseStyle)
  const [purposeDraft, setPurposeDraft] = useState<PromptPurpose>(promptPurpose)
  const [enterToSendDraft, setEnterToSendDraft] = useState(enterToSend)
  const [suggestionCountDraft, setSuggestionCountDraft] = useState<4 | 6>(suggestionCount)
  const [voiceLanguageDraft, setVoiceLanguageDraft] = useState<VoiceLanguage>(voiceLanguage)
  const [readVoiceUriDraft, setReadVoiceUriDraft] = useState(readVoiceUri)
  const [previewingVoiceUri, setPreviewingVoiceUri] = useState<string | null>(null)
  const previewUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [readVoiceOptions, setReadVoiceOptions] = useState<Array<DropdownOption<string>>>([
    { value: 'default', label: 'Default voice (Auto)' },
  ])
  const [confirmClearDraft, setConfirmClearDraft] = useState(confirmClearChats)
  const [personalizationSaveState, setPersonalizationSaveState] = useState<'idle' | 'saved'>('idle')
  const [experienceSaveState, setExperienceSaveState] = useState<'idle' | 'saved'>('idle')

  useEffect(() => {
    setNameDraft(displayName)
    setStyleDraft(responseStyle)
    setPurposeDraft(promptPurpose)
    setEnterToSendDraft(enterToSend)
    setSuggestionCountDraft(suggestionCount)
    setVoiceLanguageDraft(voiceLanguage)
    setReadVoiceUriDraft(readVoiceUri)
    setConfirmClearDraft(confirmClearChats)
  }, [
    displayName,
    responseStyle,
    promptPurpose,
    enterToSend,
    suggestionCount,
    voiceLanguage,
    readVoiceUri,
    confirmClearChats,
  ])

  useEffect(() => {
    setPreviewingVoiceUri(null)
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setReadVoiceOptions([{ value: 'default', label: 'Default voice (Auto)' }])
      return
    }

    const synth = window.speechSynthesis
    const updateVoiceOptions = () => {
      const voices = synth.getVoices()
      const filtered = voices.filter((voice) =>
        matchesVoiceLanguage(voice.lang || '', voiceLanguageDraft),
      )
      // Online/Natural voices often hang on some browsers; prefer local voices for stability.
      const stableVoices = filtered.filter((voice) => voice.localService)
      const sourceVoices = stableVoices.length > 0 ? stableVoices : filtered

      const mapped = sourceVoices.map((voice) => ({
        value: voice.voiceURI,
        label: formatVoiceDisplayName(voice.name),
      }))
      const seen = new Set<string>()
      const unique = mapped.filter((voice) => {
        if (seen.has(voice.value)) return false
        seen.add(voice.value)
        return true
      })
      setReadVoiceOptions([
        { value: 'default', label: 'Default voice (Auto)' },
        ...unique,
      ])

      if (
        readVoiceUriDraft !== 'default' &&
        !sourceVoices.some((voice) => voice.voiceURI === readVoiceUriDraft)
      ) {
        setReadVoiceUriDraft('default')
      }
    }

    updateVoiceOptions()
    synth.addEventListener('voiceschanged', updateVoiceOptions)
    return () => synth.removeEventListener('voiceschanged', updateVoiceOptions)
  }, [voiceLanguageDraft, readVoiceUriDraft])

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      if (saveResetTimerRef.current) {
        window.clearTimeout(saveResetTimerRef.current)
      }
    }
  }, [])

  const onPreviewVoice = (voiceUri: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const synth = window.speechSynthesis
    if (previewingVoiceUri === voiceUri) {
      synth.cancel()
      setPreviewingVoiceUri(null)
      previewUtteranceRef.current = null
      return
    }

    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(
      'This is a sample voice preview for your selected voice.',
    )
    utterance.lang = voiceLanguageDraft

    if (voiceUri !== 'default') {
      const selectedVoice = synth
        .getVoices()
        .find((voice) => voice.voiceURI === voiceUri)
      if (selectedVoice) {
        utterance.voice = selectedVoice
        utterance.lang = selectedVoice.lang || voiceLanguageDraft
      }
    }

    utterance.onend = () => {
      setPreviewingVoiceUri((current) => (current === voiceUri ? null : current))
      previewUtteranceRef.current = null
    }
    utterance.onerror = () => {
      setPreviewingVoiceUri((current) => (current === voiceUri ? null : current))
      previewUtteranceRef.current = null
    }

    setPreviewingVoiceUri(voiceUri)
    previewUtteranceRef.current = utterance
    synth.speak(utterance)
  }

  const flashSavedState = (setter: React.Dispatch<React.SetStateAction<'idle' | 'saved'>>) => {
    setter('saved')
    if (saveResetTimerRef.current) {
      window.clearTimeout(saveResetTimerRef.current)
    }
    saveResetTimerRef.current = window.setTimeout(() => {
      setter('idle')
    }, 1400)
  }

  const initials = (nameDraft || email || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <div className="dashboard-screen">
      <div className="dashboard-card">
        <div className="dashboard-head">
          <div className="dashboard-head-copy">
            <p className="dashboard-eyebrow">Workspace settings</p>
            <h2>User Dashboard</h2>
            <p className="muted-text">Tune your profile, chat experience, and app behavior.</p>
          </div>
          <button
            className="icon-button"
            onClick={() => navigate('/chat')}
            aria-label="Close dashboard"
          >
            <X size={16} />
          </button>
        </div>

        <section className="profile-panel">
          <div className="avatar-pill">{initials}</div>
          <div className="profile-copy">
            <h3>{nameDraft || 'User'}</h3>
            <p className="muted-text">{email}</p>
            <p className="meta-line">ID: {userId.slice(0, 8)}... · Joined: {joinedAt}</p>
            <div className="dashboard-badges">
              <span className="dashboard-badge">Theme: {theme}</span>
              <span className="dashboard-badge">Purpose: {PURPOSE_LABELS[promptPurpose]}</span>
              <span className="dashboard-badge">
                {enterToSend ? 'Enter sends' : 'Enter adds newline'}
              </span>
            </div>
          </div>
        </section>

        <section className="usage-grid">
          <article className="usage-card">
            <p className="usage-label">Conversations</p>
            <p className="usage-value">{totalConversations}</p>
          </article>
          <article className="usage-card">
            <p className="usage-label">Messages</p>
            <p className="usage-value">{totalMessages}</p>
          </article>
          <article className="usage-card">
            <p className="usage-label">Theme</p>
            <p className="usage-value usage-text">{theme}</p>
          </article>
        </section>

        <section className="dashboard-layout">
          <section className="personalize-panel">
            <div className="panel-head">
              <div>
                <p className="panel-kicker">Profile</p>
                <h3>Personalization</h3>
              </div>
              <button
                type="button"
                className="secondary-button dashboard-save-button"
                onClick={() => {
                  onSavePersonalization(nameDraft.trim(), styleDraft, purposeDraft)
                  flashSavedState(setPersonalizationSaveState)
                }}
              >
                {personalizationSaveState === 'saved' ? 'Saved' : 'Save preferences'}
              </button>
            </div>
            <div className="personalize-grid">
              <label className="field-block" htmlFor="display-name">
                Display Name
                <input
                  id="display-name"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  placeholder="Your name"
                />
              </label>

              <label className="field-block">
                Response Style
                <CustomDropdown
                  value={styleDraft}
                  options={(Object.keys(RESPONSE_STYLE_LABELS) as ResponseStyle[]).map(
                    (style) => ({
                      value: style,
                      label: RESPONSE_STYLE_LABELS[style],
                    }),
                  )}
                  onChange={setStyleDraft}
                />
              </label>

              <label className="field-block">
                Purpose
                <CustomDropdown
                  value={purposeDraft}
                  options={(Object.keys(PURPOSE_LABELS) as PromptPurpose[]).map(
                    (purpose) => ({
                      value: purpose,
                      label: PURPOSE_LABELS[purpose],
                    }),
                  )}
                  onChange={setPurposeDraft}
                />
              </label>
            </div>
          </section>

          <section className="personalize-panel">
            <div className="panel-head">
              <div>
                <p className="panel-kicker">Experience</p>
                <h3>Chat Experience</h3>
              </div>
              <button
                type="button"
                className="secondary-button dashboard-save-button"
                onClick={() => {
                  onSaveExperienceSettings(
                    enterToSendDraft,
                    suggestionCountDraft,
                    voiceLanguageDraft,
                    readVoiceUriDraft,
                    confirmClearDraft,
                  )
                  flashSavedState(setExperienceSaveState)
                }}
              >
                {experienceSaveState === 'saved' ? 'Saved' : 'Save experience'}
              </button>
            </div>
            <div className="personalize-grid">
              <label className="field-block">
                Enter Key Behavior
                <button
                  type="button"
                  className="settings-item"
                  onClick={() => setEnterToSendDraft((prev) => !prev)}
                >
                  {enterToSendDraft ? 'Enter sends message' : 'Enter adds new line'}
                </button>
              </label>

              <label className="field-block">
                Voice Language
                <CustomDropdown
                  value={voiceLanguageDraft}
                  options={(Object.keys(VOICE_LANGUAGE_LABELS) as VoiceLanguage[]).map(
                    (lang) => ({
                      value: lang,
                      label: VOICE_LANGUAGE_LABELS[lang],
                    }),
                  )}
                  onChange={setVoiceLanguageDraft}
                />
              </label>

              <label className="field-block">
                Read Voice
                <VoiceDropdown
                  value={readVoiceUriDraft}
                  options={readVoiceOptions}
                  onChange={setReadVoiceUriDraft}
                  onPreview={onPreviewVoice}
                  previewingValue={previewingVoiceUri}
                />
              </label>

              <label className="field-block">
                Suggestion Cards
                <CustomDropdown
                  value={String(suggestionCountDraft) as '4' | '6'}
                  options={[
                    { value: '4', label: '4 cards' },
                    { value: '6', label: '6 cards' },
                  ]}
                  onChange={(value) => setSuggestionCountDraft(value === '6' ? 6 : 4)}
                />
              </label>

              <label className="field-block">
                Clear Chats Safety
                <button
                  type="button"
                  className="settings-item"
                  onClick={() => setConfirmClearDraft((prev) => !prev)}
                >
                  {confirmClearDraft ? 'Ask before clearing chats' : 'Clear chats immediately'}
                </button>
              </label>
            </div>
          </section>
        </section>

        <div className="dashboard-grid">
          <button
            className="settings-item"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            Theme: {theme === 'light' ? 'Light' : 'Dark'}
          </button>

          <button className="settings-item danger" onClick={() => void onClearChats()}>
            <X size={16} />
            Clear all chats
          </button>

          <button className="settings-item" onClick={() => void onLogout()}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

function SharedConversationView() {
  const navigate = useNavigate()
  const { shareToken } = useParams<{ shareToken: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('Shared Conversation')
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const visibleMessages = useMemo(() => {
    const normalized = (value: string) =>
      value.replace(/\[Image:\s*[^\]]+\]/gi, '').replace(/\s+/g, ' ').trim().toLowerCase()

    return messages.reduce<ChatMessage[]>((accumulator, message) => {
      const previous = accumulator[accumulator.length - 1]
      if (
        previous &&
        previous.role === message.role &&
        message.role === 'user' &&
        normalized(previous.content) === normalized(message.content)
      ) {
        return accumulator
      }

      accumulator.push(message)
      return accumulator
    }, [])
  }, [messages])

  useEffect(() => {
    if (!supabase) {
      setError('Shared conversations are unavailable: Supabase is not configured.')
      setLoading(false)
      return
    }

    const token = (shareToken || '').trim()
    if (!token) {
      setError('Invalid share link.')
      setLoading(false)
      return
    }

    let active = true

    const loadSharedConversation = async () => {
      setLoading(true)
      setError('')

      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('id, title')
        .eq('share_token', token)
        .eq('is_shared', true)
        .maybeSingle()

      if (!active) return

      if (conversationError) {
        setError(conversationError.message)
        setLoading(false)
        return
      }

      if (!conversation?.id) {
        setError('This shared conversation is unavailable or no longer shared.')
        setLoading(false)
        return
      }

      setTitle(conversation.title || 'Shared Conversation')

      const { data: sharedMessages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })

      if (!active) return

      if (messagesError) {
        setError(messagesError.message)
        setLoading(false)
        return
      }

      setMessages((sharedMessages || []) as ChatMessage[])
      setLoading(false)
    }

    void loadSharedConversation()

    return () => {
      active = false
    }
  }, [shareToken])

  return (
    <div className="shared-page">
      <section className="shared-card">
        <header className="shared-head">
          <div className="shared-head-copy">
            <div className="shared-brand">
              <img className="shared-brand-mark" src="/favicon.svg" alt="" aria-hidden="true" />
              <p>Shared Link</p>
            </div>
            <h2>{title}</h2>
          </div>
          <button className="shared-auth-button" onClick={() => navigate('/auth')}>
            Login / Signup
          </button>
        </header>

        <p className="shared-readonly-note">
          View-only conversation. Replies are disabled for shared links.
        </p>

        {loading ? (
          <div className="screen-loader shared-loader">Loading shared conversation...</div>
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : visibleMessages.length === 0 ? (
          <div className="empty-state shared-empty-state">
            <h3>No messages to display</h3>
            <p>This shared conversation does not have visible messages yet.</p>
          </div>
        ) : (
          <div className="shared-message-scroll">
            <div className="message-list">
              {visibleMessages.map((message) => {
                const messageModel =
                  message.role === 'assistant'
                    ? getMessageModel(message)
                    : null

                return (
                  <article
                    key={message.id}
                    className={`message-row ${message.role === 'user' ? 'user-row' : 'assistant-row'}`}
                  >
                    <div className={`bubble ${message.role}`}>
                      {message.role === 'assistant' ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: ({ node, className, children, ...props }) => {
                              const code = String(children)
                              const language = className?.replace('language-', '')
                              const meta =
                                ((node as { data?: { meta?: string }; meta?: string } | undefined)
                                  ?.data?.meta ||
                                  (node as { meta?: string } | undefined)?.meta ||
                                  '')
                              const isBlock = Boolean(language) || code.includes('\n')

                              if (isBlock) {
                                return (
                                  <CopyableCodeBlock language={language} meta={meta}>
                                    {code}
                                  </CopyableCodeBlock>
                                )
                              }

                              return (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              )
                            },
                          }}
                        >
                          {cleanAssistantOutput(message.content)}
                        </ReactMarkdown>
                      ) : (
                        <p>
                          {message.content
                            .replace(/\[Image:\s*[^\]]+\]/g, '')
                            .trim() ||
                            (message.content.includes('[Image:')
                              ? 'Image sent'
                              : message.content)}
                        </p>
                      )}
                    </div>
                    {message.role === 'assistant' && (
                      <div className="message-actions message-actions-outside">
                        <span className="message-model-pill" title="Model used">
                          <Cpu size={16} />
                          {MODEL_ENGINE_LABELS[messageModel || 'llama']}
                        </span>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState<Session | null>(null)
  const [booting, setBooting] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  )
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({})
  const [promptPurpose, setPromptPurpose] = useState<PromptPurpose>('general')
  const [promptCards, setPromptCards] = useState<string[]>(() =>
    pickRandomPrompts('general'),
  )
  const [draft, setDraft] = useState('')
  const [selectedModel, setSelectedModel] = useState<AIModel>('llama')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingConversationId, setGeneratingConversationId] = useState<string | null>(null)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [, setIsThinking] = useState(false)
  const [, setStreamTick] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [displayName, setDisplayName] = useState('')
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('balanced')
  const [enterToSend, setEnterToSend] = useState(true)
  const [voiceLanguage, setVoiceLanguage] = useState<VoiceLanguage>('en-US')
  const [readVoiceUri, setReadVoiceUri] = useState('default')
  const [suggestionCount, setSuggestionCount] = useState<4 | 6>(4)
  const [confirmClearChats, setConfirmClearChats] = useState(true)
  const [imageDataMap, setImageDataMap] = useState<Record<string, string>>({})
  const [imageTagDataMap, setImageTagDataMap] = useState<Record<string, string>>({})
  const [imagePromptDataMap, setImagePromptDataMap] = useState<Record<string, string[]>>({})
  const [scrollAnchorMessageId, setScrollAnchorMessageId] = useState<string | null>(null)
  const [pendingDeleteConversationId, setPendingDeleteConversationId] = useState<string | null>(null)
  const [pendingClearChats, setPendingClearChats] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const noticeTimerRef = useRef<number | null>(null)

  const showNotice = (message: string) => {
    setNotice(message)
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current)
    }

    noticeTimerRef.current = window.setTimeout(() => {
      setNotice('')
    }, 2000)
  }

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      document.body.removeChild(textarea)
      return copied
    }
  }

  const getConversationLink = (shareToken: string) => {
    const url = new URL(window.location.href)
    url.pathname = `/shared/${encodeURIComponent(shareToken)}`
    url.search = ''
    url.hash = ''
    return url.toString()
  }

  const ensureConversationIsShared = async (conversationId: string) => {
    if (!supabase) return null

    const existing = conversations.find((item) => item.id === conversationId)
    if (existing?.is_shared && existing.share_token) {
      return existing.share_token
    }

    const token = createShareToken()

    const { data: updatedConversation, error: shareError } = await supabase
      .from('conversations')
      .update({ is_shared: true, share_token: token })
      .eq('id', conversationId)
      .select('id, is_shared, share_token')
      .single()

    if (shareError || !updatedConversation?.share_token) {
      setError(shareError?.message || 'Could not create a public share link.')
      return null
    }

    setConversations((prev) =>
      prev.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              is_shared: updatedConversation.is_shared,
              share_token: updatedConversation.share_token,
            }
          : item,
      ),
    )

    return updatedConversation.share_token as string
  }

  const onShareConversation = async (conversationId: string) => {
    const shareToken = await ensureConversationIsShared(conversationId)
    if (!shareToken) return

    const url = getConversationLink(shareToken)
    const title =
      conversations.find((item) => item.id === conversationId)?.title ||
      'Llama AI Conversation'

    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        showNotice('Conversation shared.')
        return
      } catch {
        // Fallback to clipboard when share target is not available.
      }
    }

    const copied = await copyText(url)
    showNotice(copied ? 'Conversation link copied.' : 'Could not share conversation.')
  }

  const onSavePersonalization = (
    name: string,
    style: ResponseStyle,
    purpose: PromptPurpose,
  ) => {
    if (!session?.user) return

    const safeName = name || session.user.email?.split('@')[0] || 'User'
    setDisplayName(safeName)
    setResponseStyle(style)
    setPromptPurpose(purpose)
    localStorage.setItem(`display-name:${session.user.id}`, safeName)
    localStorage.setItem(`response-style:${session.user.id}`, style)
    localStorage.setItem(`prompt-purpose:${session.user.id}`, purpose)
    setPromptCards(pickRandomPrompts(purpose, suggestionCount))
    showNotice('Preferences saved.')
  }

  const onSaveExperienceSettings = (
    nextEnterToSend: boolean,
    nextSuggestionCount: 4 | 6,
    nextVoiceLanguage: VoiceLanguage,
    nextReadVoiceUri: string,
    nextConfirmClearChats: boolean,
  ) => {
    if (!session?.user) return

    setEnterToSend(nextEnterToSend)
    setSuggestionCount(nextSuggestionCount)
    setVoiceLanguage(nextVoiceLanguage)
    setReadVoiceUri(nextReadVoiceUri)
    setConfirmClearChats(nextConfirmClearChats)

    localStorage.setItem(`enter-to-send:${session.user.id}`, String(nextEnterToSend))
    localStorage.setItem(
      `suggestion-count:${session.user.id}`,
      String(nextSuggestionCount),
    )
    localStorage.setItem(`voice-language:${session.user.id}`, nextVoiceLanguage)
    localStorage.setItem(`read-voice-uri:${session.user.id}`, nextReadVoiceUri)
    localStorage.setItem(
      `confirm-clear-chats:${session.user.id}`,
      String(nextConfirmClearChats),
    )

    setPromptCards(pickRandomPrompts(promptPurpose, nextSuggestionCount))
    showNotice('Experience settings saved.')
  }

  const activeMessages = useMemo(() => {
    if (!activeConversationId) return []
    return messagesMap[activeConversationId] || []
  }, [activeConversationId, messagesMap])

  const activeConversationModel: AIModel = useMemo(() => {
    if (!activeConversationId) return selectedModel
    const messages = messagesMap[activeConversationId] || []
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i]
      if (message.role !== 'assistant') continue
      const model = getMessageModel(message)
      if (model) return model
    }
    return selectedModel
  }, [activeConversationId, messagesMap, selectedModel])

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-mode') as ThemeMode | null
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme-mode', theme)
  }, [theme])

  const refreshPromptCards = (purpose = promptPurpose, count = suggestionCount) => {
    setPromptCards(pickRandomPrompts(purpose, count))
  }

  useEffect(() => {
    if (!session?.user) return

    const keyPrefix = session.user.id
    const storedName = localStorage.getItem(`display-name:${keyPrefix}`)
    const storedStyle = localStorage.getItem(`response-style:${keyPrefix}`)
    const storedPurpose = localStorage.getItem(`prompt-purpose:${keyPrefix}`)
    const storedEnterToSend = localStorage.getItem(`enter-to-send:${keyPrefix}`)
    const storedSuggestionCount = localStorage.getItem(`suggestion-count:${keyPrefix}`)
    const storedVoiceLanguage = localStorage.getItem(`voice-language:${keyPrefix}`)
    const storedReadVoiceUri = localStorage.getItem(`read-voice-uri:${keyPrefix}`)
    const storedConfirmClear = localStorage.getItem(`confirm-clear-chats:${keyPrefix}`)

    setDisplayName(
      storedName ||
        session.user.user_metadata?.full_name ||
        session.user.email?.split('@')[0] ||
        'User',
    )

    if (
      storedStyle === 'balanced' ||
      storedStyle === 'concise' ||
      storedStyle === 'detailed'
    ) {
      setResponseStyle(storedStyle)
    }

    const resolvedPurpose: PromptPurpose =
      storedPurpose === 'coding' ||
      storedPurpose === 'business' ||
      storedPurpose === 'study' ||
      storedPurpose === 'writing'
        ? storedPurpose
        : 'general'

    const resolvedSuggestionCount: 4 | 6 = storedSuggestionCount === '6' ? 6 : 4
    const resolvedVoiceLanguage: VoiceLanguage =
      storedVoiceLanguage === 'en-GB' ? 'en-GB' : 'en-US'

    setPromptPurpose(resolvedPurpose)
    setEnterToSend(storedEnterToSend !== 'false')
    setSuggestionCount(resolvedSuggestionCount)
    setVoiceLanguage(resolvedVoiceLanguage)
    setReadVoiceUri(storedReadVoiceUri || 'default')
    setConfirmClearChats(storedConfirmClear !== 'false')
    setPromptCards(pickRandomPrompts(resolvedPurpose, resolvedSuggestionCount))
  }, [session?.user])

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setBooting(false)
      return
    }

    let active = true

    const initializeAuth = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
        params.delete('code')
        const clean = `${window.location.pathname}${
          params.toString() ? `?${params.toString()}` : ''
        }`
        window.history.replaceState({}, '', clean)
      }

      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session)
      setBooting(false)
    }

    void initializeAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const isSharedRoute = location.pathname.startsWith('/shared/')
    const isLandingRoute = location.pathname === '/'
    if (booting) return
    if (session && location.pathname === '/auth') {
      navigate('/chat', { replace: true })
      return
    }
    if (!session && location.pathname !== '/auth' && !isSharedRoute && !isLandingRoute) {
      navigate('/auth', { replace: true })
    }
  }, [session, booting, location.pathname, navigate])

  useEffect(() => {
    if (!session?.user || !supabase) {
      setConversations([])
      setActiveConversationId(null)
      setMessagesMap({})
      setImageDataMap({})
      setImageTagDataMap({})
      setImagePromptDataMap({})
      return
    }

    const loadConversations = async () => {
      const { data, error: loadError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (loadError) {
        setError(loadError.message)
        return
      }

      const chats = (data || []) as Conversation[]
      setConversations(chats)

      const fromQuery = new URLSearchParams(window.location.search).get('c')
      if (fromQuery && chats.some((conv) => conv.id === fromQuery)) {
        setActiveConversationId(fromQuery)
      } else {
        setActiveConversationId((prev) => prev || chats[0]?.id || null)
      }
    }

    void loadConversations()
  }, [session?.user?.id])

  useEffect(() => {
    if (!activeConversationId || !supabase) return
    if (messagesMap[activeConversationId]) return

    const loadMessages = async () => {
      const { data, error: loadError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true })

      if (loadError) {
        setError(loadError.message)
        return
      }

      setMessagesMap((prev) => ({
        ...prev,
        [activeConversationId]: (data || []) as ChatMessage[],
      }))
    }

    void loadMessages()
  }, [activeConversationId, messagesMap, supabase])

  const refreshMessages = async (
    conversationId: string,
    preserveStreamedMessages = false,
  ) => {
    if (!supabase) return

    const { data, error: loadError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (loadError) {
      setError(loadError.message)
      return
    }
    const fetchedMessages = (data || []) as ChatMessage[]
    const previousMessages = messagesMap[conversationId] || []
    let skippedUpdate = false
    let needsAssistantRetry = false

    setMessagesMap((prev) => {
      const currentMessages = prev[conversationId] || []

      if (preserveStreamedMessages) {
        const currentHasAssistantContent = currentMessages.some(
          (message) =>
            message.role === 'assistant' && message.content.trim().length > 0,
        )
        const fetchedHasAssistantContent = fetchedMessages.some(
          (message) =>
            message.role === 'assistant' && message.content.trim().length > 0,
        )
        const fetchedHasAssistantMessage = fetchedMessages.some(
          (message) => message.role === 'assistant',
        )

        // Sometimes DB replication briefly returns an empty assistant placeholder.
        if (fetchedHasAssistantMessage && !fetchedHasAssistantContent) {
          needsAssistantRetry = true
        }

        // Avoid wiping a just-streamed answer when DB replication is a beat behind.
        if (
          currentHasAssistantContent &&
          (!fetchedHasAssistantContent || fetchedMessages.length < currentMessages.length)
        ) {
          skippedUpdate = true
          return prev
        }
      }

      return {
        ...prev,
        [conversationId]: fetchedMessages,
      }
    })

    if (skippedUpdate) {
      window.setTimeout(() => {
        void refreshMessages(conversationId)
      }, 450)
    } else {
      const remappedImageEntries = mapImageDataToFetchedMessageIds(
        previousMessages,
        fetchedMessages,
        imageDataMap,
      )

      if (Object.keys(remappedImageEntries).length > 0) {
        setImageDataMap((prev) => ({
          ...prev,
          ...remappedImageEntries,
        }))
      }

      if (preserveStreamedMessages && needsAssistantRetry) {
        window.setTimeout(() => {
          void refreshMessages(conversationId)
        }, 450)
      }
    }

    return fetchedMessages
  }

  const persistModelForLatestAssistantMessage = async (
    conversationId: string,
    model: AIModel,
  ) => {
    if (!supabase) return

    const { data: latestAssistantRows, error: loadError } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(1)

    if (loadError || !latestAssistantRows || latestAssistantRows.length === 0) {
      return
    }
    const latestAssistantId = latestAssistantRows[0]?.id as string | undefined
    if (!latestAssistantId) return

    const { error: updateError } = await supabase
      .from('messages')
      .update({ model })
      .eq('id', latestAssistantId)

    if (updateError) {
      await supabase
        .from('messages')
        .update({ model_used: model })
        .eq('id', latestAssistantId)
    }

    setMessagesMap((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map((message) =>
        message.id === latestAssistantId
          ? { ...message, model, model_used: model }
          : message,
      ),
    }))
  }

  const createConversation = async () => {
    if (!supabase || !session?.user) return null

    const payload = {
      title: 'New Chat',
    }

    const { data, error: insertError } = await supabase
      .from('conversations')
      .insert(payload)
      .select('*')
      .single()

    if (insertError || !data) {
      setError(insertError?.message || 'Could not create conversation.')
      return null
    }

    const conversation = data as Conversation
    setConversations((prev) => [conversation, ...prev])
    setMessagesMap((prev) => ({ ...prev, [conversation.id]: [] }))
    setActiveConversationId(conversation.id)
    refreshPromptCards()
    setSidebarOpen(false)
    navigate(`/chat/new-chat?c=${conversation.id}`)
    return conversation.id
  }

  const updateConversationTitle = async (conversationId: string, title: string) => {
    if (!supabase) return

    await supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId)

    setConversations((prev) =>
      prev.map((item) => (item.id === conversationId ? { ...item, title } : item)),
    )
  }

  const moveConversationToTop = (conversationId: string) => {
    setConversations((prev) => {
      const index = prev.findIndex((item) => item.id === conversationId)
      if (index <= 0) return prev

      const next = [...prev]
      const [conversation] = next.splice(index, 1)
      if (!conversation) return prev
      next.unshift(conversation)
      return next
    })
  }

  const ensureConversation = async () => {
    if (activeConversationId) return activeConversationId
    return createConversation()
  }

  const deleteDuplicateRegeneratePrompt = async (
    conversationId: string,
    regeneratePromptContent: string,
    originalPromptMessageId?: string,
  ) => {
    if (!supabase) return

    const { data: duplicateRows } = await supabase
      .from('messages')
      .select('id, created_at')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .eq('content', regeneratePromptContent)
      .order('created_at', { ascending: false })
      .limit(10)

    const duplicateIds = (duplicateRows || [])
      .map((row) => row.id as string)
      .filter((rowId) => !originalPromptMessageId || rowId !== originalPromptMessageId)

    if (duplicateIds.length === 0) return

    await supabase
      .from('messages')
      .delete()
      .in('id', duplicateIds)
      .eq('conversation_id', conversationId)
  }

  const sendMessage = async (
    input: string,
    imageFile?: File | null,
    imageDataUrl?: string | null,
    options?: GenerationOptions,
  ) => {
    if (!supabase || !session?.user) return

    const prompt = input.trim()
    if ((!prompt && !imageFile) || isGenerating) return
    const promptForRequest = prompt || 'Analyze this image'
    const isRegenerate = options?.isRegenerate === true
    const replaceAssistantMessageId = options?.replaceAssistantMessageId
    const replaceAssistantCreatedAt = options?.replaceAssistantCreatedAt
    const replaceAssistantContent = options?.replaceAssistantContent
    const overrideModel = options?.overrideModel ?? selectedModel
    const anchorMessageId = options?.anchorMessageId
    const originalPromptMessageId = options?.originalPromptMessageId
    const regeneratePromptContent = options?.regeneratePromptContent

    let conversationId = await ensureConversation()
    if (!conversationId) return
    if (!isUuid(conversationId)) {
      const recoveredConversationId = await createConversation()
      if (!recoveredConversationId || !isUuid(recoveredConversationId)) {
        setError('Could not create a valid conversation id.')
        return
      }
      conversationId = recoveredConversationId
    }

    moveConversationToTop(conversationId)

    navigate(`/chat/${slugify(promptForRequest)}?c=${conversationId}`)

    if (isRegenerate && replaceAssistantMessageId) {
      setMessagesMap((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(
          (message) => message.id !== replaceAssistantMessageId,
        ),
      }))

      let deletedFromDb = false

      if (isUuid(replaceAssistantMessageId)) {
        const { data: deletedRows } = await supabase
          .from('messages')
          .delete()
          .eq('id', replaceAssistantMessageId)
          .eq('conversation_id', conversationId)
          .eq('role', 'assistant')
          .select('id')

        deletedFromDb = Boolean(deletedRows && deletedRows.length > 0)
      }

      if (!deletedFromDb && replaceAssistantContent) {
        const { data: fallbackRows } = await supabase
          .from('messages')
          .select('id, created_at')
          .eq('conversation_id', conversationId)
          .eq('role', 'assistant')
          .eq('content', replaceAssistantContent)
          .order('created_at', { ascending: false })
          .limit(10)

        let fallbackId =
          (fallbackRows || []).find(
            (row) => row.created_at === replaceAssistantCreatedAt,
          )?.id as string | undefined

        if (!fallbackId) {
          fallbackId = fallbackRows?.[0]?.id as string | undefined
        }

        if (fallbackId) {
          await supabase
            .from('messages')
            .delete()
            .eq('id', fallbackId)
            .eq('conversation_id', conversationId)
            .eq('role', 'assistant')
        }
      }
    }

    const userContent = imageFile
      ? prompt
        ? `${prompt}\n\n[Image: ${imageFile.name}]`
        : `[Image: ${imageFile.name}]`
      : prompt

    const userId = safeId('user')
    const userMessage: ChatMessage = {
      id: userId,
      conversation_id: conversationId,
      role: 'user',
      content: userContent,
      created_at: new Date().toISOString(),
    }

    // Store image data URL for persistence in conversation
    if (imageFile && imageDataUrl) {
      setImageDataMap((prev) => ({
        ...prev,
        [userId]: imageDataUrl,
      }))
      const imageTagKey = `${conversationId}::${imageFile.name.trim().toLowerCase()}`
      setImageTagDataMap((prev) => ({
        ...prev,
        [imageTagKey]: imageDataUrl,
      }))
      const promptSignature = getPromptSignatureValue(prompt)
      const promptKey = `${conversationId}::${promptSignature}`
      setImagePromptDataMap((prev) => ({
        ...prev,
        [promptKey]: [...(prev[promptKey] || []), imageDataUrl],
      }))
    }

    setError('')
    if (!isRegenerate) {
      setDraft('')
    }

    const isFirstMessage = (messagesMap[conversationId] || []).length === 0
    if (isFirstMessage && !isRegenerate) {
      void updateConversationTitle(conversationId, deriveTitle(promptForRequest))
    }

    if (!isRegenerate) {
      setMessagesMap((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), userMessage],
      }))
    }

    const assistantId = safeId('assistant')
    let assistantBuffer = ''

    const assistantMessage: ChatMessage = {
      id: assistantId,
      conversation_id: conversationId,
      role: 'assistant',
      content: '',
      model: overrideModel,
      created_at: new Date().toISOString(),
    }

    setMessagesMap((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), assistantMessage],
    }))

    const controller = new AbortController()
    abortRef.current = controller
    setIsGenerating(true)
    setGeneratingConversationId(conversationId)
    setIsAnalyzingImage(Boolean(imageFile))
    setIsThinking(!imageFile)

    setScrollAnchorMessageId(isRegenerate ? anchorMessageId || null : userId)

    let hasFirstToken = false
    let hasVisionDone = false

    try {
      if (imageFile) {
        await streamImageCompletion(
          IMAGE_STREAM_API,
          {
            user_id: session.user.id,
            conversation_id: conversationId,
            prompt: promptForRequest,
            file: imageFile,
          },
          controller.signal,
          (token) => {
            if (!hasFirstToken) {
              hasFirstToken = true
              setIsThinking(false)
            }
            assistantBuffer += token
            setStreamTick((prev) => prev + 1)
            setMessagesMap((prev) => ({
              ...prev,
              [conversationId]: (prev[conversationId] || []).map((message) =>
                message.id === assistantId
                  ? { ...message, content: cleanAssistantOutput(assistantBuffer) }
                  : message,
              ),
            }))
          },
          () => {
            if (hasVisionDone) return
            hasVisionDone = true
            setIsAnalyzingImage(false)
            setIsThinking(true)
          },
          () => {
            setIsGenerating(false)
            setGeneratingConversationId(null)
            setIsAnalyzingImage(false)
            setIsThinking(false)
          },
        )
      } else {
        const endpoint = MODEL_ENDPOINTS[overrideModel]
        const apiUrl = `${API_BASE}${endpoint}`
        await streamCompletion(
          apiUrl,
          {
            user_id: session.user.id,
            conversation_id: conversationId,
            messages: [{ role: 'user', content: promptForRequest }],
            temperature: 0.7,
            max_tokens: 512,
            stream: true,
          },
          controller.signal,
          (token) => {
            if (!hasFirstToken) {
              hasFirstToken = true
              setIsThinking(false)
            }
            assistantBuffer += token
            setStreamTick((prev) => prev + 1)
            setMessagesMap((prev) => ({
              ...prev,
              [conversationId]: (prev[conversationId] || []).map((message) =>
                message.id === assistantId
                  ? { ...message, content: cleanAssistantOutput(assistantBuffer) }
                  : message,
              ),
            }))
          },
          (meta) => {
            if (meta.conversation_id && meta.conversation_id !== conversationId) return
            setIsGenerating(false)
            setGeneratingConversationId(null)
            setIsAnalyzingImage(false)
            setIsThinking(false)
          },
        )
      }
    } catch (streamError) {
      if (!(streamError instanceof DOMException && streamError.name === 'AbortError')) {
        setError(
          streamError instanceof Error
            ? streamError.message
            : 'Failed while generating response.',
        )
      }
    } finally {
      setIsGenerating(false)
      setGeneratingConversationId(null)
      setIsAnalyzingImage(false)
      setIsThinking(false)
      abortRef.current = null
      if (isRegenerate && regeneratePromptContent) {
        await deleteDuplicateRegeneratePrompt(
          conversationId,
          regeneratePromptContent,
          originalPromptMessageId,
        )
      }
      await refreshMessages(conversationId, true)
      await persistModelForLatestAssistantMessage(conversationId, overrideModel)
    }
  }

  const onSendOrStop = async (
    input: string,
    imageFile?: File | null,
    imageDataUrl?: string | null,
    options?: GenerationOptions,
  ) => {
    if (isGenerating) {
      const conversationId = generatingConversationId
      abortRef.current?.abort()
      try {
        if (conversationId) {
          await fetch(STOP_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_id: conversationId }),
          })
        }
      } catch {
        // Stop endpoint failure should not block local cancellation.
      }
      return
    }

    await sendMessage(input, imageFile, imageDataUrl, options)
  }

  const onNewChat = async () => {
    if (isGenerating) return
    setActiveConversationId(null)
    setDraft('')
    setError('')
    setSidebarOpen(false)
    refreshPromptCards()
    navigate('/chat/new-chat')
  }

  const onClearChats = async () => {
    if (!supabase || !session?.user) return

    if (confirmClearChats) {
      setPendingClearChats(true)
      return
    }

    await performClearChats()
  }

  const performClearChats = async () => {
    if (!supabase || !session?.user) return

    const ids = conversations.map((item) => item.id)
    if (ids.length > 0) {
      await supabase.from('messages').delete().in('conversation_id', ids)
    }

    await supabase.from('conversations').delete().eq('user_id', session.user.id)

    setConversations([])
    setMessagesMap({})
    setImageDataMap({})
    setImageTagDataMap({})
    setImagePromptDataMap({})
    setActiveConversationId(null)
    navigate('/chat')
  }

  const onCancelClearChats = () => {
    setPendingClearChats(false)
  }

  const onConfirmClearChats = async () => {
    setPendingClearChats(false)
    await performClearChats()
  }

  const onShareMessage = async (content: string) => {
    let link = window.location.origin

    if (activeConversationId) {
      const shareToken = await ensureConversationIsShared(activeConversationId)
      if (shareToken) {
        link = getConversationLink(shareToken)
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Llama AI Message',
          text: content,
          url: link,
        })
        showNotice('Message shared.')
        return
      } catch {
        // Fallback to clipboard when share is unavailable.
      }
    }

    const copied = await copyText(`${content}\n\n${link}`)
    showNotice(copied ? 'Message copied to clipboard.' : 'Could not share message.')
  }

  const onLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const onSelectConversation = (conversationId: string) => {
    const selected = conversations.find((conv) => conv.id === conversationId)
    const modelForConversation =
      (messagesMap[conversationId] || [])
        .slice()
        .reverse()
        .find((message) => message.role === 'assistant' && getMessageModel(message))
        ?.model ||
      (messagesMap[conversationId] || [])
        .slice()
        .reverse()
        .find((message) => message.role === 'assistant' && getMessageModel(message))
        ?.model_used
    moveConversationToTop(conversationId)
    setActiveConversationId(conversationId)
    if (isAIModel(modelForConversation)) {
      setSelectedModel(modelForConversation)
    }
    refreshPromptCards()
    setSidebarOpen(false)
    navigate(`/chat/${slugify(selected?.title || 'chat')}?c=${conversationId}`)
  }

  const onDeleteConversationRequest = (conversationId: string) => {
    setPendingDeleteConversationId(conversationId)
  }

  const onCancelDeleteConversation = () => {
    setPendingDeleteConversationId(null)
  }

  const onConfirmDeleteConversation = async () => {
    if (!supabase) return

    const conversationId = pendingDeleteConversationId
    if (!conversationId) return

    if (isGenerating && generatingConversationId === conversationId) {
      showNotice('Please wait until generation is finished for this conversation.')
      setPendingDeleteConversationId(null)
      return
    }

    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setPendingDeleteConversationId(null)

    const nextConversations = conversations.filter((conv) => conv.id !== conversationId)
    setConversations(nextConversations)
    setMessagesMap((prev) => {
      const copy = { ...prev }
      delete copy[conversationId]
      return copy
    })
    setImageTagDataMap((prev) => {
      const next: Record<string, string> = {}
      const keyPrefix = `${conversationId}::`
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(keyPrefix)) {
          next[key] = value
        }
      }
      return next
    })
    setImagePromptDataMap((prev) => {
      const next: Record<string, string[]> = {}
      const keyPrefix = `${conversationId}::`
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(keyPrefix)) {
          next[key] = value
        }
      }
      return next
    })

    if (activeConversationId === conversationId) {
      const nextActive = nextConversations[0]?.id || null
      setActiveConversationId(nextActive)
      if (nextActive) {
        const nextTitle =
          nextConversations.find((item) => item.id === nextActive)?.title || 'chat'
        navigate(`/chat/${slugify(nextTitle)}?c=${nextActive}`)
      } else {
        navigate('/chat')
      }
    }

    showNotice('Conversation deleted.')
  }

  const pendingDeleteTitle =
    conversations.find((conv) => conv.id === pendingDeleteConversationId)?.title || null

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            booting ? <div className="screen-loader">Loading...</div> : <LandingPage session={session} />
          }
        />
        <Route path="/auth" element={booting ? <div className="screen-loader">Loading...</div> : session ? <Navigate to="/chat" replace /> : <AuthScreen />} />
        <Route
          path="/shared/:shareToken"
          element={booting ? <div className="screen-loader">Loading...</div> : <SharedConversationView />}
        />
        <Route
          path="/chat/:querySlug?"
          element={
            booting ? (
              <div className="screen-loader">Loading...</div>
            ) : !session ? (
              <Navigate to="/auth" replace />
            ) : (
              <ChatWorkspace
                conversations={conversations}
                activeConversationId={activeConversationId}
                activeConversationModel={activeConversationModel}
                activeMessages={activeMessages}
                scrollAnchorMessageId={scrollAnchorMessageId}
                promptPurpose={promptPurpose}
                promptCards={promptCards}
                draft={draft}
                selectedModel={selectedModel}
                enterToSend={enterToSend}
                voiceLanguage={voiceLanguage}
                readVoiceUri={readVoiceUri}
                isAnalyzingImage={isAnalyzingImage}
                isGenerating={isGenerating}
                generatingConversationId={generatingConversationId}
                error={error}
                notice={notice}
                pendingDeleteTitle={pendingDeleteTitle}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                setDraft={setDraft}
                setSelectedModel={setSelectedModel}
                onSendOrStop={onSendOrStop}
                sendMessage={sendMessage}
                onNewChat={onNewChat}
                onShareMessage={onShareMessage}
                onShareConversation={onShareConversation}
                onDeleteConversationRequest={onDeleteConversationRequest}
                onConfirmDeleteConversation={onConfirmDeleteConversation}
                onCancelDeleteConversation={onCancelDeleteConversation}
                onSelectConversation={onSelectConversation}
                endRef={endRef}
                imageDataMap={imageDataMap}
                imageTagDataMap={imageTagDataMap}
                imagePromptDataMap={imagePromptDataMap}
              />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            booting ? (
              <div className="screen-loader">Loading...</div>
            ) : !session ? (
              <Navigate to="/auth" replace />
            ) : (
              <Dashboard
                email={session.user.email || 'unknown'}
                userId={session.user.id}
                joinedAt={new Date(session.user.created_at).toLocaleDateString()}
                totalConversations={conversations.length}
                totalMessages={Object.values(messagesMap).reduce(
                  (sum, items) => sum + items.length,
                  0,
                )}
                theme={theme}
                setTheme={setTheme}
                displayName={displayName}
                responseStyle={responseStyle}
                promptPurpose={promptPurpose}
                enterToSend={enterToSend}
                suggestionCount={suggestionCount}
                voiceLanguage={voiceLanguage}
                readVoiceUri={readVoiceUri}
                confirmClearChats={confirmClearChats}
                onSavePersonalization={onSavePersonalization}
                onSaveExperienceSettings={onSaveExperienceSettings}
                onClearChats={onClearChats}
                onLogout={onLogout}
              />
            )
          }
        />
        <Route path="*" element={<Navigate to={session ? '/chat' : '/'} replace />} />
      </Routes>

      {pendingClearChats && (
        <div className="modal-backdrop" onClick={onCancelClearChats}>
          <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Clear all chats?</h3>
            <p>This will permanently remove all conversations and messages.</p>
            <div className="confirm-actions">
              <button className="ghost-button confirm-action" onClick={onCancelClearChats}>
                Cancel
              </button>
              <button className="settings-item danger confirm-action" onClick={() => void onConfirmClearChats()}>
                <Trash2 size={14} />
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
