import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  SiGmail,
  SiGo,
  SiGnubash,
  SiHtml5,
  SiImessage,
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
  SiTelegram,
  SiTypescript,
  SiWhatsapp,
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
  ArrowDown,
  ArrowLeft,
  Menu,
  MessageSquarePlus,
  Cpu,
  Check,
  Loader2,
  Play,
  Pause,
  Copy,
  Share2,
  Link2,
  Download,
  Eye,
  EyeOff,
  RotateCcw,
  Keyboard,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Mic,
  SendHorizontal,
  Square,
  ImagePlus,
  LayoutDashboard,
  Trash2,
  LogOut,
  Sun,
  Moon,
  X,
  Volume2,
  Sparkles,
  Palette,
  Shield,
  Mail,
  Lock,
  User,
  MoreHorizontal,
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

type ConversationGroupKey = 'today' | 'yesterday' | 'previous7' | 'older'

type ShareDialogData = {
  title: string
  url: string
  createdAt: string
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
    'Write email',
    'Summarize text',
    'Explain simply',
    'Brainstorm ideas',
    'Plan my day',
    'Create checklist',
  ],
  coding: [
    'Debug this code',
    'Explain this code',
    'Write unit tests',
    'Optimize performance',
    'Generate SQL query',
    'Refactor this function',
  ],
  business: [
    'Write marketing copy',
    'Draft sales email',
    'Create business plan',
    'Analyze competitors',
    'Build pitch deck outline',
    'Generate ad headlines',
  ],
  study: [
    'Explain this topic',
    'Create study plan',
    'Quiz me on this',
    'Summarize chapter',
    'Make flashcards',
    'Solve step by step',
  ],
  writing: [
    'Rewrite for clarity',
    'Fix grammar',
    'Summarize this text',
    'Write social post',
    'Generate blog outline',
    'Improve tone',
  ],
}

const PROMPT_HELP_TEXT: Record<string, string> = {
  'Write email': 'Draft a professional email with clear tone and structure.',
  'Plan my day': 'Organize your tasks, priorities, and schedule quickly.',
  'Summarize text': 'Summarize long text into key points and actionable takeaways.',
  'Explain simply': 'Break complex topics into easy, plain-language explanations.',
  'Brainstorm ideas': 'Generate practical ideas for projects, content, or strategy.',
  'Meeting notes': 'Convert rough notes into clean actionable summaries.',
  'Create checklist': 'Create a practical checklist for your next task.',
  'Debug this code': 'Find likely bugs and propose targeted fixes fast.',
  'Explain this code': 'Break code down line by line in plain language.',
  'Write unit tests': 'Generate practical unit tests for your function or module.',
  'Optimize performance': 'Suggest performance improvements and cleaner alternatives.',
  'Generate SQL query': 'Write SQL for filtering, joins, grouping, and reporting.',
  'Refactor this function': 'Improve readability and maintainability without changing behavior.',
  'Write marketing copy': 'Create clear, persuasive copy for products and campaigns.',
  'Draft sales email': 'Write conversion-focused sales outreach emails quickly.',
  'Create business plan': 'Turn an idea into a structured business plan.',
  'Analyze competitors': 'Compare competitors and identify positioning opportunities.',
  'Build pitch deck outline': 'Create a slide-by-slide pitch deck structure.',
  'Generate ad headlines': 'Produce ad headline options optimized for clicks.',
  'Explain this topic': 'Teach a topic simply with examples and key points.',
  'Create study plan': 'Build a study schedule with milestones and review cycles.',
  'Quiz me on this': 'Generate quiz questions to test understanding quickly.',
  'Summarize chapter': 'Extract key ideas from chapters into compact notes.',
  'Make flashcards': 'Turn concepts into fast-review flashcard prompts.',
  'Solve step by step': 'Provide stepwise solutions with reasoning at each stage.',
  'Rewrite for clarity': 'Rewrite text to be clearer and easier to read.',
  'Fix grammar': 'Correct grammar, punctuation, and wording issues.',
  'Summarize this text': 'Condense text while preserving core meaning.',
  'Write social post': 'Draft engaging social media posts with strong hooks.',
  'Generate blog outline': 'Create a logical blog structure with section ideas.',
  'Improve tone': 'Adapt writing tone to audience and context.',
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

const VOICE_OPTION_VALUE_SEPARATOR = '::'

const makeVoiceOptionValue = (voice: SpeechSynthesisVoice) =>
  [voice.voiceURI || '', voice.name || '', voice.lang || '']
    .map((part) => encodeURIComponent(part))
    .join(VOICE_OPTION_VALUE_SEPARATOR)

const parseVoiceOptionValue = (value: string) => {
  const parts = value.split(VOICE_OPTION_VALUE_SEPARATOR)
  if (parts.length !== 3) return null

  return {
    voiceURI: decodeURIComponent(parts[0] || ''),
    name: decodeURIComponent(parts[1] || ''),
    lang: decodeURIComponent(parts[2] || ''),
  }
}

const findVoiceBySelection = (voices: SpeechSynthesisVoice[], selection: string) => {
  if (!selection || selection === 'default') return null

  const parsed = parseVoiceOptionValue(selection)
  // Backward-compatible path for previously saved raw voiceURI values.
  if (!parsed) {
    return voices.find((voice) => voice.voiceURI === selection) || null
  }

  if (parsed.name && parsed.lang && parsed.voiceURI) {
    const exactMatch = voices.find(
      (voice) =>
        voice.name === parsed.name &&
        voice.lang.toLowerCase() === parsed.lang.toLowerCase() &&
        voice.voiceURI === parsed.voiceURI,
    )
    if (exactMatch) return exactMatch
  }

  if (parsed.name && parsed.lang) {
    const nameAndLangMatch = voices.find(
      (voice) => voice.name === parsed.name && voice.lang.toLowerCase() === parsed.lang.toLowerCase(),
    )
    if (nameAndLangMatch) return nameAndLangMatch
  }

  if (parsed.name) {
    const nameOnlyMatch = voices.find((voice) => voice.name === parsed.name)
    if (nameOnlyMatch) return nameOnlyMatch
  }

  if (parsed.voiceURI) {
    const uriMatch = voices.find((voice) => voice.voiceURI === parsed.voiceURI)
    if (uriMatch) return uriMatch
  }

  return null
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
    <div className={`model-dropdown ${isOpen ? 'open' : ''}`}>
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
  onOpen?: () => void
  previewingValue: string | null
  triggerClassName?: string
  menuClassName?: string
}

function VoiceDropdown({
  value,
  options,
  onChange,
  onPreview,
  onOpen,
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
      onOpen?.()
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
    <div className={`model-dropdown ${isOpen ? 'open' : ''}`}>
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

const CONVERSATION_GROUP_LABELS: Record<ConversationGroupKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  previous7: 'Previous 7 Days',
  older: 'More than 7 Days',
}

function getConversationGroupKey(createdAt: string, now = new Date()): ConversationGroupKey {
  const createdDate = new Date(createdAt)
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startCreated = new Date(
    createdDate.getFullYear(),
    createdDate.getMonth(),
    createdDate.getDate(),
  )
  const diffDays = Math.floor((startToday.getTime() - startCreated.getTime()) / 86_400_000)

  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays <= 7) return 'previous7'
  return 'older'
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
  const [confirmPassword, setConfirmPassword] = useState('')
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

  const toggleAuthMode = () => {
    setIsSignUp((prev) => !prev)
    setShowPassword(false)
  }

  const onEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return

    if (isSignUp && username.trim().length < 2) {
      showAuthPopup('error', 'Please enter a username with at least 2 characters.')
      return
    }

    if (isSignUp && password !== confirmPassword) {
      showAuthPopup('error', 'Passwords do not match.')
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

  const authTabLabels = isSignUp
    ? { left: 'Log in', right: 'Sign up' }
    : { left: 'Log in', right: 'Sign up' }

  return (
    <div className="auth-wrap auth-v2">
      <div className="auth-v2-bg auth-v2-bg-desktop" aria-hidden="true" />
      <div className="auth-v2-bg auth-v2-bg-mobile" aria-hidden="true" />

      <main className="auth-v2-main">
        <section className="auth-v2-hero">
          <img src="/llama_logo_transparent.png" alt="Llama AI" className="auth-v2-logo" />
          <h1>
            Welcome to <span>Llama AI</span>
          </h1>
          <p className="auth-v2-subtitle">
            Sign in or create an account to continue.
          </p>
        </section>

        <section className="auth-v2-card">
          <div className="auth-v2-segmented" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={`auth-v2-segment ${!isSignUp ? 'active' : ''}`}
              onClick={() => setIsSignUp(false)}
              aria-pressed={!isSignUp}
            >
              {authTabLabels.left}
            </button>
            <button
              type="button"
              className={`auth-v2-segment ${isSignUp ? 'active' : ''}`}
              onClick={() => setIsSignUp(true)}
              aria-pressed={isSignUp}
            >
              {authTabLabels.right}
            </button>
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

          <form onSubmit={onEmail} className="auth-v2-form">
            {isSignUp && (
              <div className="auth-v2-input-wrap">
                <User size={18} />
                <input
                  type="text"
                  placeholder="Username"
                  required
                  minLength={2}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
            )}

            {isSignUp && (
              <div className="auth-v2-input-wrap">
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            )}

            {!isSignUp && (
              <div className="auth-v2-input-wrap">
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            )}

            <div className="auth-v2-input-wrap auth-v2-password-wrap">
              <Lock size={18} />
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
                  className="auth-v2-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>

            {isSignUp && (
              <div className="auth-v2-input-wrap auth-v2-password-wrap">
                <Lock size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                {confirmPassword.length > 0 && (
                  <button
                    type="button"
                    className="auth-v2-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}
              </div>
            )}

            {!isSignUp && (
              <button
                type="button"
                className="auth-v2-forgot"
                onClick={() => showAuthPopup('error', 'Password reset flow will be added soon.')}
              >
                Forgot password?
              </button>
            )}

            <button
              type="submit"
              className="auth-v2-submit"
              disabled={pending || !supabase}
            >
              {pending ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Continue'}
            </button>
          </form>

          <div className="auth-v2-divider auth-v2-divider-bottom" aria-hidden="true">
            <span />
            <em>or</em>
            <span />
          </div>

          <button
            type="button"
            onClick={onGoogle}
            className="auth-v2-google auth-v2-google-secondary"
            disabled={pending || !supabase}
          >
            <svg className="auth-v2-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isSignUp ? 'Sign up with Google' : 'Continue with Google'}
          </button>

          {isSignUp && (
            <button type="button" className="auth-v2-switch" onClick={toggleAuthMode}>
              Already have an account? <strong>Log in</strong>
            </button>
          )}
        </section>
      </main>
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

  const landingFeatures = [
    {
      title: 'Write email',
      description: 'Draft polished emails for work, support, follow-ups, and outreach.',
      icon: <Sparkles size={18} />,
    },
    {
      title: 'Summarize text',
      description: 'Condense articles, notes, and documents into clear key points.',
      icon: <LayoutDashboard size={18} />,
    },
    {
      title: 'Brainstorm ideas',
      description: 'Generate practical ideas for content, business, and daily work.',
      icon: <Palette size={18} />,
    },
    {
      title: 'Explain simply',
      description: 'Turn difficult topics into easy explanations anyone can understand.',
      icon: <Cpu size={18} />,
    },
  ]

  return (
    <div className="landing-wrap">
      <header className="landing-topbar">
        <div className="landing-brand">
          <img className="landing-brand-mark" src="/brand_logo_zoom.png" alt="Llama AI logo" />
          <p>Llama AI</p>
        </div>

        <nav className="landing-nav" aria-label="Primary">
          <span>Chat</span>
          <span>Features</span>
          <span>Pricing</span>
          <span>Resources</span>
        </nav>

        <div className="landing-topbar-actions">
          <button className="landing-topbar-link" type="button" onClick={secondaryAction}>
            Log in
          </button>
          <button className="landing-nav-button landing-nav-button-strong" type="button" onClick={primaryAction}>
            Sign up
          </button>
        </div>
      </header>

      <main className="landing-hero">
        <section className="landing-hero-copy">
          <h1>
            Your AI Assistant,
            <br />
            <span>Anytime.</span>
          </h1>
          <p className="landing-subtext landing-subtext-center">
            Boost your productivity with Llama AI to organize tasks, generate ideas, and
            summarize information effortlessly.
          </p>
          <button className="landing-hero-cta" type="button" onClick={primaryAction}>
            Get Started
          </button>
        </section>

        <section className="landing-hero-visual" aria-hidden="true">
          <img className="landing-hero-logo" src="/llama_logo_transparent.png" alt="" />
        </section>
      </main>

      <section className="landing-feature-section" aria-label="Features">
        <h2>
          How <span>Llama AI</span> can help you
        </h2>
        <p>Discover the powerful features that make Llama AI your ideal AI assistant.</p>
        <div className="landing-feature-grid">
          {landingFeatures.map((feature) => (
            <article key={feature.title} className="landing-feature-card">
              <span className="landing-feature-icon" aria-hidden="true">
                {feature.icon}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-bottom-cta" aria-label="Get started">
        <h2>Effortless assistance at your fingertips.</h2>
        <p>
          Join <strong>Llama AI</strong> today and transform your productivity with an
          intelligent AI assistant available 24/7.
        </p>
        <button className="landing-hero-cta" type="button" onClick={primaryAction}>
          Get Started
        </button>
      </section>
    </div>
  )
}

type ChatWorkspaceProps = {
  conversations: Conversation[]
  activeConversationId: string | null
  activeConversationModel: AIModel
  activeMessages: ChatMessage[]
  scrollAnchorMessageId: string | null
  promptCards: string[]
  draft: string
  selectedModel: AIModel
  enterToSend: boolean
  readAfterSend: boolean
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
  promptCards,
  draft,
  selectedModel,
  enterToSend,
  readAfterSend,
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
  const scrollAnimationFrameRef = useRef<number | null>(null)
  const anchorAppliedRef = useRef(false)
  const lastAnchoredMessageIdRef = useRef<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const voiceBaseDraftRef = useRef('')
  const voiceFinalTranscriptRef = useRef('')
  const lastVoiceTapAtRef = useRef(0)
  const keepVoiceListeningRef = useRef(false)
  const voiceRestartTimerRef = useRef<number | null>(null)
  const maxComposerHeight = 180
  const [isListening, setIsListening] = useState(false)
  const [isVoiceSupported, setIsVoiceSupported] = useState(false)
  const [readingMessageId, setReadingMessageId] = useState<string | null>(null)
  const [isReadPaused, setIsReadPaused] = useState(false)
  const [readElapsedMs, setReadElapsedMs] = useState(0)
  const [readProgress, setReadProgress] = useState(0)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const readTickRef = useRef<number | null>(null)
  const readStartedAtRef = useRef<number | null>(null)
  const readBoundaryCharRef = useRef(0)
  const readTextLengthRef = useRef(1)
  const readWaveRef = useRef<HTMLDivElement | null>(null)
  const estimatedReadDurationRef = useRef(1)
  const [readWaveBarCount, setReadWaveBarCount] = useState(64)
  const previousIsGeneratingRef = useRef(isGenerating)
  const lastAutoReadMessageIdRef = useRef<string | null>(null)
  const liveReadMessageIdRef = useRef<string | null>(null)
  const liveReadLastLengthRef = useRef(0)
  const liveReadPendingTextRef = useRef('')
  const liveReadQueueRef = useRef<string[]>([])
  const liveReadSpeakingRef = useRef(false)
  const isGeneratingRef = useRef(isGenerating)
  const lastScrollTopRef = useRef(0)
  const hasScrolledUpRef = useRef(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [showScrollToLatest, setShowScrollToLatest] = useState(false)
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
    const nextHeight = Math.min(maxComposerHeight, textarea.scrollHeight)
    textarea.style.height = `${Math.max(52, nextHeight)}px`
    textarea.style.overflowY = textarea.scrollHeight > maxComposerHeight ? 'auto' : 'hidden'
  }

  useEffect(() => {
    if (!readingMessageId) return

    const container = readWaveRef.current
    if (!container) return

    const updateBarCount = () => {
      const width = container.clientWidth || 0
      const target = Math.max(52, Math.floor(width / 6.2))
      setReadWaveBarCount(target)
    }

    updateBarCount()

    const observer = new ResizeObserver(() => updateBarCount())
    observer.observe(container)
    return () => observer.disconnect()
  }, [readingMessageId])

  const readWaveBars = useMemo(() => {
    return Array.from({ length: readWaveBarCount }, (_, index) => {
      const harmonicA = (Math.sin(index * 0.58) + 1) / 2
      const harmonicB = (Math.sin(index * 0.19 + 0.9) + 1) / 2
      const harmonicC = (Math.sin(index * 1.04 + 0.4) + 1) / 2
      const energy = harmonicA * 0.52 + harmonicB * 0.28 + harmonicC * 0.2
      return Math.round(4 + energy * 15)
    })
  }, [readWaveBarCount])

  const readWaveDynamics = useMemo(() => {
    return readWaveBars.map((_, index) => {
      if (isReadPaused) {
        return { scale: 0.62, trackOpacity: 0.26, fillOpacity: 0.9 }
      }

      const t = readElapsedMs / 145
      const pulseA = (Math.sin(t + index * 0.82) + 1) / 2
      const pulseB = (Math.sin(t * 0.57 + index * 0.27) + 1) / 2
      const pulseC = (Math.sin(t * 0.34 + index * 0.11 + 2.2) + 1) / 2
      const energy = 0.18 + pulseA * 0.58 + pulseB * 0.28 + pulseC * 0.2
      const scale = Math.min(1.82, 0.52 + energy)
      const trackOpacity = Math.min(0.42, 0.14 + energy * 0.2)
      const fillOpacity = Math.min(1, 0.78 + energy * 0.22)
      return { scale, trackOpacity, fillOpacity }
    })
  }, [isReadPaused, readElapsedMs, readWaveBars])

  const readProgressPercent = Math.max(0, Math.min(100, readProgress * 100))

  const formatReadElapsed = (elapsedMs: number) => {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const clearReadTick = () => {
    if (readTickRef.current) {
      window.clearInterval(readTickRef.current)
      readTickRef.current = null
    }
  }

  const resetReadPlayer = () => {
    clearReadTick()
    setReadingMessageId(null)
    setIsReadPaused(false)
    setReadElapsedMs(0)
    setReadProgress(0)
    readStartedAtRef.current = null
    readBoundaryCharRef.current = 0
    readTextLengthRef.current = 1
    estimatedReadDurationRef.current = 1
    synthRef.current = null
  }

  const resetLiveReadStreamState = () => {
    liveReadMessageIdRef.current = null
    liveReadLastLengthRef.current = 0
    liveReadPendingTextRef.current = ''
    liveReadQueueRef.current = []
    liveReadSpeakingRef.current = false
  }

  const stopReadAloud = () => {
    window.speechSynthesis.cancel()
    resetLiveReadStreamState()
    resetReadPlayer()
  }

  const queueLiveReadChunks = (incomingText: string, flushRemainder: boolean) => {
    if (incomingText) {
      liveReadPendingTextRef.current += incomingText
    }

    const chunks: string[] = []
    let pending = liveReadPendingTextRef.current

    while (true) {
      const boundaryIndex = pending.search(/[.!?\n]/)
      if (boundaryIndex === -1) break

      const chunk = pending.slice(0, boundaryIndex + 1).trim()
      if (chunk) {
        chunks.push(chunk)
      }
      pending = pending.slice(boundaryIndex + 1)
    }

    if (flushRemainder) {
      const remainder = pending.trim()
      if (remainder) {
        chunks.push(remainder)
      }
      pending = ''
    }

    liveReadPendingTextRef.current = pending
    return chunks
  }

  const speakNextLiveChunk = () => {
    if (liveReadSpeakingRef.current) return

    const messageId = liveReadMessageIdRef.current
    if (!messageId) return

    const nextChunk = liveReadQueueRef.current.shift()
    if (!nextChunk) {
      if (!isGeneratingRef.current && !liveReadPendingTextRef.current.trim()) {
        lastAutoReadMessageIdRef.current = messageId
        resetLiveReadStreamState()
        resetReadPlayer()
      }
      return
    }

    const utterance = new SpeechSynthesisUtterance(nextChunk)
    utterance.lang = voiceLanguage
    if (readVoiceUri && readVoiceUri !== 'default') {
      const selectedVoice = findVoiceBySelection(window.speechSynthesis.getVoices(), readVoiceUri)
      if (selectedVoice) {
        utterance.voice = selectedVoice
        utterance.lang = selectedVoice.lang || voiceLanguage
      }
    }

    liveReadSpeakingRef.current = true
    setReadingMessageId(messageId)

    utterance.onstart = () => {
      if (!readStartedAtRef.current) {
        readStartedAtRef.current = Date.now()
      }
      setIsReadPaused(false)
      beginReadTick()
    }

    utterance.onend = () => {
      liveReadSpeakingRef.current = false
      synthRef.current = null
      speakNextLiveChunk()
    }

    utterance.onerror = () => {
      liveReadSpeakingRef.current = false
      synthRef.current = null
      speakNextLiveChunk()
    }

    synthRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const beginReadTick = () => {
    clearReadTick()
    const startAt = readStartedAtRef.current ?? Date.now()
    readStartedAtRef.current = startAt

    readTickRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startAt
      setReadElapsedMs(elapsed)
      const boundaryProgress = Math.min(
        0.99,
        readBoundaryCharRef.current / Math.max(1, readTextLengthRef.current),
      )
      const fallbackProgress = Math.min(0.995, elapsed / estimatedReadDurationRef.current)
      const blendedProgress =
        boundaryProgress > 0
          ? Math.max(boundaryProgress, Math.min(boundaryProgress + 0.06, fallbackProgress))
          : fallbackProgress

      setReadProgress((current) => Math.max(current, blendedProgress))
    }, 140)
  }

  const smoothScrollToBottom = (durationMs = 220) => {
    const container = messageScrollRef.current
    if (!container) return

    if (scrollAnimationFrameRef.current) {
      window.cancelAnimationFrame(scrollAnimationFrameRef.current)
      scrollAnimationFrameRef.current = null
    }

    const startTop = container.scrollTop
    const targetTop = container.scrollHeight - container.clientHeight
    const distance = targetTop - startTop

    if (distance <= 0) return

    const startTime = performance.now()
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / durationMs)
      const eased = easeInOutCubic(progress)
      container.scrollTop = startTop + distance * eased

      if (progress < 1) {
        scrollAnimationFrameRef.current = window.requestAnimationFrame(step)
      } else {
        scrollAnimationFrameRef.current = null
      }
    }

    scrollAnimationFrameRef.current = window.requestAnimationFrame(step)
  }

  const updateScrollToLatestVisibility = () => {
    const container = messageScrollRef.current
    if (!container || visibleMessages.length === 0) {
      setShowScrollToLatest(false)
      return
    }

    const currentTop = container.scrollTop
    const previousTop = lastScrollTopRef.current
    const isScrollingUp = currentTop < previousTop
    const isScrollingDown = currentTop > previousTop
    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight)

    if (distanceFromBottom <= 120) {
      setShowScrollToLatest(false)
      hasScrolledUpRef.current = false
      lastScrollTopRef.current = currentTop
      return
    }

    if (isScrollingUp) {
      hasScrolledUpRef.current = true
      setShowScrollToLatest(false)
    } else if (isScrollingDown && hasScrolledUpRef.current) {
      setShowScrollToLatest(true)
    }

    lastScrollTopRef.current = currentTop
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
      smoothScrollToBottom(320)
    })
  }, [activeConversationId, generatingConversationId, isGenerating, visibleMessages])

  useEffect(() => {
    if (!activeConversationId) return
    if (visibleMessages.length === 0) return
    if (scrollAnchorMessageId) return
    if (isGenerating && activeConversationId === generatingConversationId) return

    requestAnimationFrame(() => {
      smoothScrollToBottom(380)
    })
  }, [
    activeConversationId,
    generatingConversationId,
    isGenerating,
    scrollAnchorMessageId,
    visibleMessages.length,
  ])

  useEffect(() => {
    const container = messageScrollRef.current
    if (!container) return

    const onScroll = () => {
      updateScrollToLatestVisibility()
    }

    lastScrollTopRef.current = container.scrollTop
    hasScrolledUpRef.current = false
    setShowScrollToLatest(false)
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', onScroll)
    }
  }, [activeConversationId, isGenerating, visibleMessages.length])

  const getSpeechRecognitionCtor = useCallback(() => {
    const speechApi =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (globalThis as any).SpeechRecognition ||
      (globalThis as any).webkitSpeechRecognition

    return typeof speechApi === 'function' ? speechApi : null
  }, [])

  const createSpeechRecognition = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor()
    if (!SpeechRecognitionCtor) return null

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = voiceLanguage
    recognition.continuous = true
    recognition.interimResults = true

    const clearVoiceRestartTimer = () => {
      if (voiceRestartTimerRef.current) {
        window.clearTimeout(voiceRestartTimerRef.current)
        voiceRestartTimerRef.current = null
      }
    }

    const restartRecognition = () => {
      if (!keepVoiceListeningRef.current) return
      clearVoiceRestartTimer()
      voiceRestartTimerRef.current = window.setTimeout(() => {
        if (!keepVoiceListeningRef.current) return
        try {
          recognition.start()
        } catch {
          // Browser might still be transitioning states; we'll retry on next onend.
        }
      }, 140)
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0]?.transcript || ''
        if (!chunk) continue

        if (event.results[i].isFinal) {
          voiceFinalTranscriptRef.current += chunk
        } else {
          interimTranscript += chunk
        }
      }

      const base = voiceBaseDraftRef.current
      const spacer = base && !base.endsWith(' ') ? ' ' : ''
      const combined = `${voiceFinalTranscriptRef.current}${interimTranscript}`.trimStart()
      setDraft(`${base}${spacer}${combined}`)
    }

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onerror = (event: any) => {
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        keepVoiceListeningRef.current = false
        setIsListening(false)
        return
      }

      if (keepVoiceListeningRef.current) {
        restartRecognition()
      } else {
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      if (keepVoiceListeningRef.current) {
        restartRecognition()
        return
      }

      setIsListening(false)
      clearVoiceRestartTimer()
    }

    return recognition
  }, [getSpeechRecognitionCtor, setDraft, voiceLanguage])

  useEffect(() => {
    const recognition = createSpeechRecognition()
    if (!recognition) {
      setIsVoiceSupported(false)
      recognitionRef.current = null
      return
    }

    setIsVoiceSupported(true)
    recognitionRef.current = recognition

    return () => {
      keepVoiceListeningRef.current = false
      if (voiceRestartTimerRef.current) {
        window.clearTimeout(voiceRestartTimerRef.current)
        voiceRestartTimerRef.current = null
      }
      recognition.stop()
      recognitionRef.current = null
    }
  }, [createSpeechRecognition])

  const toggleVoiceTyping = () => {
    const recognition = recognitionRef.current
    if (!recognition) return

    if (isListening) {
      keepVoiceListeningRef.current = false
      if (voiceRestartTimerRef.current) {
        window.clearTimeout(voiceRestartTimerRef.current)
        voiceRestartTimerRef.current = null
      }
      recognition.stop()
      setIsListening(false)
      return
    }

    keepVoiceListeningRef.current = true
    voiceBaseDraftRef.current = draft.trimEnd()
    voiceFinalTranscriptRef.current = ''
    if (voiceRestartTimerRef.current) {
      window.clearTimeout(voiceRestartTimerRef.current)
      voiceRestartTimerRef.current = null
    }
    try {
      // Set immediately so mobile users get instant feedback while browser warms up mic.
      setIsListening(true)
      recognition.start()
    } catch {
      keepVoiceListeningRef.current = false
      setIsListening(false)
      window.alert('Unable to start voice typing on this browser session.')
    }
  }

  const handleVoiceButtonPress = () => {
    const now = Date.now()
    if (now - lastVoiceTapAtRef.current < 320) {
      return
    }
    lastVoiceTapAtRef.current = now

    if (!recognitionRef.current) {
      const recognition = createSpeechRecognition()
      if (recognition) {
        recognitionRef.current = recognition
        setIsVoiceSupported(true)
      }
    }

    if (!recognitionRef.current) {
      const unavailableMessage = window.isSecureContext
        ? 'Voice typing is unavailable on this mobile browser.'
        : 'Voice typing requires HTTPS (or localhost) on mobile.'
      window.alert(unavailableMessage)
      return
    }

    toggleVoiceTyping()
  }

  const handleReadAloud = (messageId: string, content: string) => {
    // Stop any currently reading message
    if (readingMessageId === messageId) {
      stopReadAloud()
      return
    }

    // Stop previous reading
    if (readingMessageId) {
      stopReadAloud()
    }

    resetLiveReadStreamState()

    // Remove markdown formatting for reading
    const plainText = content
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1') // Italic
      .replace(/```[\s\S]*?```/g, '') // Code blocks
      .replace(/`(.+?)`/g, '$1') // Inline code
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
      .replace(/#{1,6}\s/g, '') // Headers

    const utterance = new SpeechSynthesisUtterance(plainText)
    readTextLengthRef.current = Math.max(1, plainText.length)
    readBoundaryCharRef.current = 0
    utterance.lang = voiceLanguage
    if (readVoiceUri && readVoiceUri !== 'default') {
      const selectedVoice = findVoiceBySelection(window.speechSynthesis.getVoices(), readVoiceUri)
      if (selectedVoice) {
        utterance.voice = selectedVoice
        utterance.lang = selectedVoice.lang || voiceLanguage
      }
    }
    const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length
    estimatedReadDurationRef.current = Math.max(
      3800,
      Math.round(Math.max(wordCount / 2, plainText.length / 10.8) * 1000),
    )

    utterance.onstart = () => {
      readStartedAtRef.current = Date.now()
      setReadElapsedMs(0)
      setReadProgress(0)
      setIsReadPaused(false)
      beginReadTick()
    }

    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (!plainText.length) return
      readBoundaryCharRef.current = event.charIndex
      const boundaryProgress = Math.min(1, event.charIndex / plainText.length)
      setReadProgress((current) => Math.max(current, boundaryProgress))
    }

    utterance.onend = () => resetReadPlayer()
    utterance.onerror = () => resetReadPlayer()

    setReadingMessageId(messageId)
    synthRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    isGeneratingRef.current = isGenerating
    const justFinishedGenerating = previousIsGeneratingRef.current && !isGenerating
    previousIsGeneratingRef.current = isGenerating

    if (!readAfterSend) {
      if (liveReadMessageIdRef.current) {
        stopReadAloud()
      }
      return
    }

    const latestAssistantMessage = [...visibleMessages]
      .reverse()
      .find((message) => message.role === 'assistant')

    if (!latestAssistantMessage) return

    const isLiveReadingActive = liveReadMessageIdRef.current !== null
    if (!isLiveReadingActive) {
      // Only start auto-reading while current response is actively streaming.
      if (!isGenerating) return
      // While model is still "thinking" current assistant content is empty; do not read previous reply.
      if (latestAssistantMessage.content.trim().length === 0) return
    }

    // Avoid replaying the same message after stream-end refreshes.
    if (
      !isGenerating &&
      liveReadMessageIdRef.current === null &&
      lastAutoReadMessageIdRef.current === latestAssistantMessage.id
    ) {
      return
    }

    if (liveReadMessageIdRef.current !== latestAssistantMessage.id) {
      if (liveReadMessageIdRef.current === null) {
        if (latestAssistantMessage.content.trim().length === 0) return
        liveReadMessageIdRef.current = latestAssistantMessage.id
        liveReadLastLengthRef.current = 0
        liveReadPendingTextRef.current = ''
        liveReadQueueRef.current = []
        liveReadSpeakingRef.current = false
        readStartedAtRef.current = null
        setReadElapsedMs(0)
        setReadProgress(0)
      } else {
        // During active streaming, backend refresh can swap temp assistant id to persisted id.
        // Keep progress and continue; never rebind after stream has already finished.
        if (!isGenerating) {
          return
        }
        if (latestAssistantMessage.content.length < liveReadLastLengthRef.current) {
          return
        }
        liveReadMessageIdRef.current = latestAssistantMessage.id
      }
    }

    const previousLength = liveReadLastLengthRef.current
    const currentContent = latestAssistantMessage.content
    if (currentContent.length > previousLength) {
      const incomingText = currentContent.slice(previousLength)
      liveReadLastLengthRef.current = currentContent.length
      const chunks = queueLiveReadChunks(incomingText, false)
      if (chunks.length > 0) {
        liveReadQueueRef.current.push(...chunks)
      }
    }

    if (justFinishedGenerating) {
      const finalChunks = queueLiveReadChunks('', true)
      if (finalChunks.length > 0) {
        liveReadQueueRef.current.push(...finalChunks)
      }
    }

    speakNextLiveChunk()
  }, [isGenerating, readAfterSend, visibleMessages])

  const toggleReadPlayback = () => {
    if (!readingMessageId) return

    if (isReadPaused) {
      window.speechSynthesis.resume()
      readStartedAtRef.current = Date.now() - readElapsedMs
      setIsReadPaused(false)
      beginReadTick()
      return
    }

    window.speechSynthesis.pause()
    setIsReadPaused(true)
    clearReadTick()
  }

  useEffect(() => {
    return () => {
      if (scrollAnimationFrameRef.current) {
        window.cancelAnimationFrame(scrollAnimationFrameRef.current)
        scrollAnimationFrameRef.current = null
      }
      clearReadTick()
      if (synthRef.current) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

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

  const groupedConversations = useMemo(() => {
    const now = new Date()
    const buckets: Record<ConversationGroupKey, Conversation[]> = {
      today: [],
      yesterday: [],
      previous7: [],
      older: [],
    }

    conversations.forEach((conversation) => {
      const groupKey = getConversationGroupKey(conversation.created_at, now)
      buckets[groupKey].push(conversation)
    })

    const order: ConversationGroupKey[] = ['today', 'yesterday', 'previous7', 'older']
    return order
      .map((key) => ({
        key,
        label: CONVERSATION_GROUP_LABELS[key],
        items: buckets[key],
      }))
      .filter((group) => group.items.length > 0)
  }, [conversations])

  const [collapsedGroups, setCollapsedGroups] = useState<
    Partial<Record<ConversationGroupKey, boolean>>
  >({})

  const toggleGroupCollapsed = (groupKey: ConversationGroupKey) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }))
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${isGenerating ? 'streaming' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <img className="sidebar-brand-mark" src="/brand_logo_zoom.png" alt="" aria-hidden="true" />
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
            {groupedConversations.map((group) => (
              <section key={group.key} className="conversation-section">
                <button
                  type="button"
                  className="conversation-section-title"
                  onClick={() => toggleGroupCollapsed(group.key)}
                  aria-expanded={!collapsedGroups[group.key]}
                  aria-label={`${collapsedGroups[group.key] ? 'Expand' : 'Collapse'} ${group.label}`}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={collapsedGroups[group.key] ? 'collapsed' : ''}
                  />
                </button>
                {!collapsedGroups[group.key] && group.items.map((conv) => {
                  const isGeneratingConversation =
                    isGenerating && generatingConversationId === conv.id
                  return (
                    <div
                      key={conv.id}
                      className={`conversation-row ${
                        activeConversationId === conv.id ? 'active' : ''
                      } ${isGeneratingConversation ? 'generating-background generating' : ''}`}
                    >
                      <button
                        className="conversation-item"
                        onClick={() => onSelectConversation(conv.id)}
                      >
                        <span className="conversation-item-main">
                          <span className="conversation-item-icon" aria-hidden="true">
                            <img src="/llama_logo_transparent.png" alt="" />
                          </span>
                          <span className="conversation-item-title">{conv.title}</span>
                        </span>
                        {isGeneratingConversation && (
                          <span
                            className="generating-indicator"
                            title="Generating response"
                          />
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
              </section>
            ))}
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

        {readingMessageId && (
          <div className="read-aloud-player" role="status" aria-live="polite">
            <button
              type="button"
              className="read-aloud-control read-aloud-toggle"
              onClick={toggleReadPlayback}
              aria-label={isReadPaused ? 'Resume read aloud' : 'Pause read aloud'}
              title={isReadPaused ? 'Resume' : 'Pause'}
            >
              {isReadPaused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <span className="read-aloud-time">{formatReadElapsed(readElapsedMs)}</span>
            <span className="read-aloud-playhead" aria-hidden="true" />
            <div
              ref={readWaveRef}
              className={`read-aloud-wave ${isReadPaused ? 'paused' : ''}`}
              aria-hidden="true"
            >
              <div className="read-aloud-wave-track">
                {readWaveBars.map((height, index) => {
                  const dynamic = readWaveDynamics[index]
                  return (
                    <span
                      key={`track-${height}-${index}`}
                      className="read-aloud-wave-bar read-aloud-wave-bar-track"
                      style={{
                        height: `${height}px`,
                        transform: `scaleY(${dynamic.scale})`,
                        opacity: dynamic.trackOpacity,
                      }}
                    />
                  )
                })}
              </div>
              <div className="read-aloud-wave-fill" style={{ width: `${readProgressPercent}%` }}>
                {readWaveBars.map((height, index) => {
                  const dynamic = readWaveDynamics[index]
                  return (
                    <span
                      key={`fill-${height}-${index}`}
                      className="read-aloud-wave-bar read-aloud-wave-bar-fill"
                      style={{
                        height: `${height}px`,
                        transform: `scaleY(${dynamic.scale})`,
                        opacity: dynamic.fillOpacity,
                      }}
                    />
                  )
                })}
              </div>
            </div>
            <button
              type="button"
              className="read-aloud-control read-aloud-close"
              onClick={stopReadAloud}
              aria-label="Close read aloud player"
              title="Stop"
            >
              <X size={22} />
            </button>
          </div>
        )}

        <main ref={messageScrollRef} className="message-scroll">
          {visibleMessages.length === 0 ? (
            <section className="empty-state">
              <img
                className="chat-empty-logo"
                src="/llama_logo_transparent.png"
                alt="Llama AI"
              />
              <h3>
                Welcome to <span>Llama AI</span>
              </h3>
              <p>How can I assist you today?</p>
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
                    <strong>{prompt}</strong>
                    <span>{PROMPT_HELP_TEXT[prompt] || 'Tap to start with this prompt.'}</span>
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
                    {message.role === 'assistant' ? (
                      <div className="assistant-bubble-wrap">
                        <img
                          className="assistant-message-logo"
                          src="/llama_logo_transparent.png"
                          alt="Llama AI"
                        />
                        <div className="bubble assistant">
                          {isPendingAssistant ? (
                            <div className="thinking-inline">
                              <span className="thinking-dot"></span>
                              <span className="thinking-dot"></span>
                              <span className="thinking-dot"></span>
                              <p>{isAnalyzingImage ? 'Analyzing image...' : 'Thinking...'}</p>
                            </div>
                          ) : (
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
                          )}
                        </div>
                      </div>
                    ) : (
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
                      {!hasUserImage && (
                        <p>
                          {message.content
                            .replace(/\[Image:\s*[^\]]+\]/g, '')
                            .trim() || (message.content.includes('[Image:') ? 'Image sent' : message.content)}
                        </p>
                      )}
                    </div>
                    )}
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
          {showScrollToLatest && (
            <button
              type="button"
              className="scroll-to-latest-button"
              onClick={() => {
                setShowScrollToLatest(false)
                smoothScrollToBottom(420)
              }}
              aria-label="Scroll to latest response"
              title="Scroll to latest"
            >
              <ArrowDown size={18} />
            </button>
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
                  label: MODEL_ENGINE_LABELS[model],
                }))}
                onChange={setSelectedModel}
                triggerClassName="composer-select model-select-trigger composer-model-trigger"
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
              className="composer-action-button image-upload-trigger"
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
              title={selectedImageFile ? 'Change image' : 'Upload image'}
            >
              <ImagePlus size={20} />
            </button>
            <div className="composer-input-shell">
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
              <button
                type="button"
                className={`composer-inline-mic composer-action-button voice-button ${
                  isListening ? 'listening' : ''
                }`}
                onClick={handleVoiceButtonPress}
                onTouchEnd={handleVoiceButtonPress}
                aria-label={isListening ? 'Stop voice typing' : 'Start voice typing'}
                title={
                  isVoiceSupported
                    ? (isListening ? 'Stop voice typing' : 'Start voice typing')
                    : 'Voice typing unavailable'
                }
              >
                {isListening ? (
                  <Square size={14} className="mic-recording-indicator" aria-hidden="true" />
                ) : (
                  <Mic size={22} />
                )}
              </button>
            </div>
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
                className={`composer-action-button send-button ${
                  isStopState ? 'stop' : 'send'
                }`}
                onClick={() => {
                  handleComposerSendOrStop()
                }}
                disabled={isGenerating && activeConversationId !== generatingConversationId}
                aria-label={isStopState ? 'Stop generation' : 'Send message'}
              >
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
  totalResponseTokens: number
  theme: ThemeMode
  setTheme: React.Dispatch<React.SetStateAction<ThemeMode>>
  displayName: string
  responseStyle: ResponseStyle
  promptPurpose: PromptPurpose
  enterToSend: boolean
  readAfterSend: boolean
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
    readAfterSend: boolean,
    suggestionCount: 4 | 6,
    voiceLanguage: VoiceLanguage,
    readVoiceUri: string,
    confirmClearChats: boolean,
  ) => void
  onClearChats: () => Promise<void>
  onExportChats: () => void
  onLogout: () => Promise<void>
}

function Dashboard({
  email,
  userId,
  joinedAt,
  totalConversations,
  totalMessages,
  totalResponseTokens,
  theme,
  setTheme,
  displayName,
  responseStyle,
  promptPurpose,
  enterToSend,
  readAfterSend,
  suggestionCount,
  voiceLanguage,
  readVoiceUri,
  confirmClearChats,
  onSavePersonalization,
  onSaveExperienceSettings,
  onClearChats,
  onExportChats,
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
  const refreshReadVoiceOptionsRef = useRef<(() => void) | null>(null)
  const [confirmClearDraft, setConfirmClearDraft] = useState(confirmClearChats)
  const [personalizationSaveState, setPersonalizationSaveState] = useState<'idle' | 'saved'>('idle')
  const [experienceSaveState, setExperienceSaveState] = useState<'idle' | 'saved'>('idle')
  const [dashboardView, setDashboardView] = useState<
    'main' | 'personalization' | 'chat' | 'ai' | 'voice' | 'appearance' | 'privacy'
  >('main')
  const [themeDraft, setThemeDraft] = useState<ThemeMode>(theme)
  const [readAfterSendDraft, setReadAfterSendDraft] = useState(readAfterSend)
  const [chatExportEnabled, setChatExportEnabled] = useState(false)
  const [dataAnalyticsEnabled, setDataAnalyticsEnabled] = useState(false)
  const [chatExportDraft, setChatExportDraft] = useState(false)
  const [dataAnalyticsDraft, setDataAnalyticsDraft] = useState(false)

  useEffect(() => {
    setNameDraft(displayName)
    setStyleDraft(responseStyle)
    setPurposeDraft(promptPurpose)
    setEnterToSendDraft(enterToSend)
    setSuggestionCountDraft(suggestionCount)
    setVoiceLanguageDraft(voiceLanguage)
    setReadVoiceUriDraft(readVoiceUri)
    setConfirmClearDraft(confirmClearChats)
    setReadAfterSendDraft(readAfterSend)
    setThemeDraft(theme)
  }, [
    displayName,
    responseStyle,
    promptPurpose,
    enterToSend,
    suggestionCount,
    voiceLanguage,
    readVoiceUri,
    confirmClearChats,
    readAfterSend,
    theme,
  ])

  useEffect(() => {
    if (dashboardView === 'appearance') {
      setThemeDraft(theme)
    }
  }, [dashboardView, theme])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedChatExport = window.localStorage.getItem(`chat-export-enabled:${userId}`)
    const storedDataAnalytics = window.localStorage.getItem(`data-analytics-enabled:${userId}`)
    const nextChatExportEnabled = storedChatExport === 'true'
    const nextDataAnalyticsEnabled = storedDataAnalytics === 'true'

    setChatExportEnabled(nextChatExportEnabled)
    setDataAnalyticsEnabled(nextDataAnalyticsEnabled)
    setChatExportDraft(nextChatExportEnabled)
    setDataAnalyticsDraft(nextDataAnalyticsEnabled)
  }, [userId])

  useEffect(() => {
    if (dashboardView === 'privacy') {
      setChatExportDraft(chatExportEnabled)
      setDataAnalyticsDraft(dataAnalyticsEnabled)
    }
  }, [dashboardView, chatExportEnabled, dataAnalyticsEnabled])

  useEffect(() => {
    setPreviewingVoiceUri(null)
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setReadVoiceOptions([{ value: 'default', label: 'Default voice (Auto)' }])
      return
    }

    const synth = window.speechSynthesis
    let pollTimer: number | null = null
    let pollAttempts = 0
    const updateVoiceOptions = () => {
      const voices = synth.getVoices().filter((voice) => Boolean(voice.voiceURI || voice.name))
      const filtered = voices.filter((voice) =>
        matchesVoiceLanguage(voice.lang || '', voiceLanguageDraft),
      )
      const languageScopedVoices = filtered.length > 0 ? filtered : voices
      // Keep both local and online voices; some mobile browsers expose distinct voices as online-only.
      const sourceVoices = [...languageScopedVoices].sort((a, b) => {
        if (a.localService === b.localService) return 0
        return a.localService ? -1 : 1
      })

      const mapped = sourceVoices.map((voice) => ({
        value: makeVoiceOptionValue(voice),
        label: `${formatVoiceDisplayName(voice.name)} (${voice.lang || 'Unknown'})${
          voice.localService ? '' : ' - Online'
        }`,
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
        !findVoiceBySelection(sourceVoices, readVoiceUriDraft)
      ) {
        setReadVoiceUriDraft('default')
      }

      if (sourceVoices.length > 0 && pollTimer) {
        window.clearInterval(pollTimer)
        pollTimer = null
      }
    }

    refreshReadVoiceOptionsRef.current = updateVoiceOptions

    updateVoiceOptions()
    synth.addEventListener('voiceschanged', updateVoiceOptions)

    // Some mobile browsers load voices late and do not reliably fire voiceschanged.
    pollTimer = window.setInterval(() => {
      pollAttempts += 1
      updateVoiceOptions()
      if (pollAttempts >= 20 && pollTimer) {
        window.clearInterval(pollTimer)
        pollTimer = null
      }
    }, 400)

    return () => {
      refreshReadVoiceOptionsRef.current = null
      synth.removeEventListener('voiceschanged', updateVoiceOptions)
      if (pollTimer) {
        window.clearInterval(pollTimer)
      }
    }
  }, [voiceLanguageDraft, readVoiceUriDraft])

  const handleReadVoiceDropdownOpen = () => {
    refreshReadVoiceOptionsRef.current?.()

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const synth = window.speechSynthesis
    if (synth.getVoices().length > 0) return

    try {
      // Mobile browsers may expose voices only after a user-gesture speak/cancel cycle.
      const unlockUtterance = new SpeechSynthesisUtterance(' ')
      unlockUtterance.volume = 0
      synth.speak(unlockUtterance)
      window.setTimeout(() => {
        synth.cancel()
        refreshReadVoiceOptionsRef.current?.()
      }, 150)
    } catch {
      // Ignore warm-up failures; fallback option remains available.
    }
  }

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

  const onPreviewVoice = (voiceSelection: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const synth = window.speechSynthesis
    if (previewingVoiceUri === voiceSelection) {
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

    if (voiceSelection !== 'default') {
      const selectedVoice = findVoiceBySelection(synth.getVoices(), voiceSelection)
      if (selectedVoice) {
        utterance.voice = selectedVoice
        utterance.lang = selectedVoice.lang || voiceLanguageDraft
      }
    }

    utterance.onend = () => {
      setPreviewingVoiceUri((current) => (current === voiceSelection ? null : current))
      previewUtteranceRef.current = null
    }
    utterance.onerror = () => {
      setPreviewingVoiceUri((current) => (current === voiceSelection ? null : current))
      previewUtteranceRef.current = null
    }

    setPreviewingVoiceUri(voiceSelection)
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

  const saveExperienceDraft = () => {
    onSaveExperienceSettings(
      enterToSendDraft,
      readAfterSendDraft,
      suggestionCountDraft,
      voiceLanguageDraft,
      readVoiceUriDraft,
      confirmClearDraft,
    )
    flashSavedState(setExperienceSaveState)
  }

  const savePersonalizationDraft = () => {
    onSavePersonalization(nameDraft.trim(), styleDraft, purposeDraft)
    flashSavedState(setPersonalizationSaveState)
  }

  const savePrivacyDraft = () => {
    setChatExportEnabled(chatExportDraft)
    setDataAnalyticsEnabled(dataAnalyticsDraft)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`chat-export-enabled:${userId}`, String(chatExportDraft))
      window.localStorage.setItem(`data-analytics-enabled:${userId}`, String(dataAnalyticsDraft))
    }

    setDashboardView('main')
  }

  const dashboardTitleMap: Record<typeof dashboardView, string> = {
    main: 'User Dashboard',
    personalization: 'Personalization',
    chat: 'Chat Experience',
    ai: 'AI Behavior',
    voice: 'Voice & Audio',
    appearance: 'Appearance',
    privacy: 'Data & Privacy',
  }

  const purposeOptions = Object.keys(PURPOSE_LABELS) as PromptPurpose[]

  const quickRows = [
    {
      icon: <User size={16} />,
      label: 'Display Name',
      value: nameDraft || 'Set your name',
    },
    {
      icon: theme === 'light' ? <Sun size={16} /> : <Moon size={16} />,
      label: 'Theme',
      value: theme === 'light' ? 'Light' : 'Dark',
    },
    {
      icon: <Sparkles size={16} />,
      label: 'Purpose',
      value: PURPOSE_LABELS[purposeDraft],
    },
    {
      icon: <Keyboard size={16} />,
      label: 'Enter Behavior',
      value: enterToSendDraft ? 'Enter sends message' : 'Enter adds new line',
    },
  ]

  const dashboardOptions = [
    {
      key: 'personalization' as const,
      icon: <User size={18} />,
      title: 'Personalization',
      desc: 'Change your display name, set purposes',
    },
    {
      key: 'chat' as const,
      icon: <MessageSquarePlus size={18} />,
      title: 'Chat Experience',
      desc: 'Adjust input methods, key behavior, language',
    },
    {
      key: 'ai' as const,
      icon: <Cpu size={18} />,
      title: 'AI Behavior',
      desc: 'Configure response style, cards, memory',
    },
    {
      key: 'voice' as const,
      icon: <Mic size={18} />,
      title: 'Voice & Audio',
      desc: 'Manage voice input, output, and preferences',
    },
    {
      key: 'appearance' as const,
      icon: <Palette size={18} />,
      title: `Theme: ${theme === 'light' ? 'Light' : 'Dark'}`,
      desc: 'Adaptive colors and display preferences',
    },
    {
      key: 'privacy' as const,
      icon: <Shield size={18} />,
      title: 'Data & Privacy',
      desc: 'Chat export, analytics, and safety controls',
    },
  ]

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="dashv2-head">
      <button
        type="button"
        className="dashv2-round"
        onClick={() => (dashboardView === 'main' ? navigate('/chat') : setDashboardView('main'))}
        aria-label={dashboardView === 'main' ? 'Back to chat' : 'Back to dashboard'}
      >
        <ArrowLeft size={18} />
      </button>
      <h2>{title}</h2>
    </div>
  )

  return (
    <div className="dashboard-screen">
      <div className="dashboard-card dashboard-card-v2">
        <SectionHeader title={dashboardTitleMap[dashboardView]} />

        <section className="dashv2-profile">
          <div className="dashv2-avatar">{initials || 'U'}</div>
          <div className="dashv2-profile-copy">
            <h3>{nameDraft || 'User'}</h3>
            <p>{email}</p>
            <small>ID: {userId.slice(0, 8)}... · Joined: {joinedAt}</small>
          </div>
        </section>

        {dashboardView === 'main' && (
          <>
            <section className="dashv2-quick-card">
              {quickRows.map((row) => (
                <div key={row.label} className="dashv2-quick-row">
                  <span className="dashv2-quick-label">{row.icon} {row.label}</span>
                  <span className="dashv2-quick-value">{row.value}</span>
                </div>
              ))}
              <div className="dashv2-quick-row">
                <span className="dashv2-quick-label"><MessageSquarePlus size={16} /> Conversations</span>
                <span className="dashv2-quick-value">{totalConversations}</span>
              </div>
              <div className="dashv2-quick-row">
                <span className="dashv2-quick-label"><Cpu size={16} /> Messages</span>
                <span className="dashv2-quick-value">{totalMessages}</span>
              </div>
              <div className="dashv2-quick-row">
                <span className="dashv2-quick-label"><Cpu size={16} /> Tokens Usage</span>
                <span className="dashv2-quick-value">{totalResponseTokens.toLocaleString()}</span>
              </div>
            </section>

            <section className="dashv2-option-stack">
              {dashboardOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className="dashv2-option"
                  onClick={() => setDashboardView(option.key)}
                >
                  <span className="dashv2-option-icon">{option.icon}</span>
                  <span className="dashv2-option-copy">
                    <strong>{option.title}</strong>
                    <small>{option.desc}</small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </section>

            <section className="dashv2-footer-actions">
              <button className="dashv2-flat-action" onClick={() => void onLogout()}>
                <LogOut size={16} />
                Logout
              </button>
              <button className="dashv2-flat-action danger" onClick={() => void onClearChats()}>
                <X size={16} />
                Clear all chats
              </button>
            </section>
          </>
        )}

        {dashboardView === 'personalization' && (
          <section className="dashv2-section-card">
            <label className="dashv2-field" htmlFor="display-name-v2">
              <span>Display Name</span>
              <input
                id="display-name-v2"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="Your display name"
              />
            </label>

            <div className="dashv2-field">
              <span>Purpose</span>
              <div className="dashv2-chip-grid">
                {purposeOptions.map((purpose) => (
                  <button
                    key={purpose}
                    type="button"
                    className={`dashv2-chip ${purposeDraft === purpose ? 'active' : ''}`}
                    onClick={() => setPurposeDraft(purpose)}
                  >
                    {PURPOSE_LABELS[purpose]}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" className="dashv2-save" onClick={savePersonalizationDraft}>
              {personalizationSaveState === 'saved' ? 'Saved' : 'Save'}
            </button>
          </section>
        )}

        {dashboardView === 'chat' && (
          <section className="dashv2-section-card">
            <label className="dashv2-field">
              <span>Enter Key Behavior</span>
              <button
                type="button"
                className="dashv2-inline-button"
                onClick={() => setEnterToSendDraft((prev) => !prev)}
              >
                {enterToSendDraft ? 'Enter sends message' : 'Enter adds new line'}
                <ChevronRight size={16} />
              </button>
            </label>

            <label className="dashv2-field">
              <span>Voice Language</span>
              <CustomDropdown
                value={voiceLanguageDraft}
                options={(Object.keys(VOICE_LANGUAGE_LABELS) as VoiceLanguage[]).map((lang) => ({
                  value: lang,
                  label: VOICE_LANGUAGE_LABELS[lang],
                }))}
                onChange={setVoiceLanguageDraft}
              />
            </label>

            <label className="dashv2-field">
              <span>Clear Chat Safety</span>
              <button
                type="button"
                className="dashv2-inline-button"
                onClick={() => setConfirmClearDraft((prev) => !prev)}
              >
                {confirmClearDraft ? 'Ask before clearing chats' : 'Clear chats immediately'}
                <ChevronRight size={16} />
              </button>
            </label>

            <button type="button" className="dashv2-save" onClick={saveExperienceDraft}>
              {experienceSaveState === 'saved' ? 'Saved' : 'Save'}
            </button>
          </section>
        )}

        {dashboardView === 'ai' && (
          <section className="dashv2-section-card">
            <label className="dashv2-field">
              <span>Response Style</span>
              <CustomDropdown
                value={styleDraft}
                options={(Object.keys(RESPONSE_STYLE_LABELS) as ResponseStyle[]).map((style) => ({
                  value: style,
                  label: RESPONSE_STYLE_LABELS[style],
                }))}
                onChange={setStyleDraft}
              />
            </label>

            <label className="dashv2-field">
              <span>Suggestion Cards</span>
              <CustomDropdown
                value={String(suggestionCountDraft) as '4' | '6'}
                options={[
                  { value: '4', label: '4 cards' },
                  { value: '6', label: '6 cards' },
                ]}
                onChange={(value) => setSuggestionCountDraft(value === '6' ? 6 : 4)}
              />
            </label>

            <button
              type="button"
              className="dashv2-save"
              onClick={() => {
                savePersonalizationDraft()
                saveExperienceDraft()
              }}
            >
              Save
            </button>
          </section>
        )}

        {dashboardView === 'voice' && (
          <section className="dashv2-section-card">
            <label className="dashv2-field">
              <span>Voice Input</span>
              <CustomDropdown
                value={voiceLanguageDraft}
                options={(Object.keys(VOICE_LANGUAGE_LABELS) as VoiceLanguage[]).map((lang) => ({
                  value: lang,
                  label: VOICE_LANGUAGE_LABELS[lang],
                }))}
                onChange={setVoiceLanguageDraft}
              />
            </label>

            <label className="dashv2-field">
              <span>Read Voice</span>
              <VoiceDropdown
                value={readVoiceUriDraft}
                options={readVoiceOptions}
                onChange={setReadVoiceUriDraft}
                onPreview={onPreviewVoice}
                onOpen={handleReadVoiceDropdownOpen}
                previewingValue={previewingVoiceUri}
              />
            </label>

            <label className="dashv2-switch-row">
              <span>
                Read Responses Aloud
                <small>Messages will be read aloud after sending</small>
              </span>
              <button
                type="button"
                className={`dashv2-toggle ${readAfterSendDraft ? 'on' : ''}`}
                onClick={() => setReadAfterSendDraft((prev) => !prev)}
                aria-label="Toggle read responses aloud"
              >
                <span />
              </button>
            </label>

            <button type="button" className="dashv2-save" onClick={saveExperienceDraft}>
              {experienceSaveState === 'saved' ? 'Saved' : 'Save'}
            </button>
          </section>
        )}

        {dashboardView === 'appearance' && (
          <section className="dashv2-section-card">
            <label className="dashv2-field">
              <span>Adaptive Colors</span>
              <button
                type="button"
                className="dashv2-inline-button"
                onClick={() =>
                  setThemeDraft((prev) => (prev === 'light' ? 'dark' : 'light'))
                }
              >
                {themeDraft === 'light' ? 'Light (Default)' : 'Dark'}
                <ChevronRight size={16} />
              </button>
            </label>

            <label className="dashv2-field">
              <span>Notifications</span>
              <button type="button" className="dashv2-inline-button" onClick={() => {}}>
                Enabled
                <ChevronRight size={16} />
              </button>
            </label>

            <button
              type="button"
              className="dashv2-save"
              onClick={() => {
                setTheme(themeDraft)
                setDashboardView('main')
              }}
            >
              Save
            </button>
          </section>
        )}

        {dashboardView === 'privacy' && (
          <section className="dashv2-section-card">
            <label className="dashv2-field">
              <span>Tokens Usage</span>
              <div className="dashv2-inline-value">
                Tokens, {totalResponseTokens.toLocaleString()}
              </div>
            </label>

            <label className="dashv2-switch-row">
              <span>
                Data Analytics
                <small>Allow collection of anonymous usage data</small>
              </span>
              <button
                type="button"
                className={`dashv2-toggle ${dataAnalyticsDraft ? 'on' : ''}`}
                onClick={() => setDataAnalyticsDraft((prev) => !prev)}
                aria-label="Toggle data analytics"
              >
                <span />
              </button>
            </label>

            <label className="dashv2-field">
              <span>Data Storage</span>
              <div className="dashv2-inline-value">
                30 days (Default)
              </div>
            </label>

            <label className="dashv2-switch-row">
              <span>
                Chat Export
                <small>Enable export and download of chat history</small>
              </span>
              <button
                type="button"
                className={`dashv2-toggle ${chatExportDraft ? 'on' : ''}`}
                onClick={() => setChatExportDraft((prev) => !prev)}
                aria-label="Toggle chat export"
              >
                <span />
              </button>
            </label>

            <button
              type="button"
              className="dashv2-save"
              onClick={onExportChats}
              disabled={!chatExportDraft}
              aria-disabled={!chatExportDraft}
            >
              <Download size={16} />
              Export chats (.json)
            </button>

            <button type="button" className="dashv2-save danger" onClick={() => void onClearChats()}>
              <X size={16} />
              Clear all chats
            </button>

            <button type="button" className="dashv2-save" onClick={savePrivacyDraft}>
              Save
            </button>
          </section>
        )}
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
  const [copiedSharedMessageId, setCopiedSharedMessageId] = useState<string | null>(null)
  const [readingSharedMessageId, setReadingSharedMessageId] = useState<string | null>(null)

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

  const handleCopySharedMessage = (messageId: string, content: string) => {
    void navigator.clipboard.writeText(content)
    setCopiedSharedMessageId(messageId)
    setTimeout(() => setCopiedSharedMessageId(null), 2000)
  }

  const handleReadSharedMessage = (messageId: string, content: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    if (readingSharedMessageId === messageId) {
      window.speechSynthesis.cancel()
      setReadingSharedMessageId(null)
      return
    }

    window.speechSynthesis.cancel()

    const plainText = content
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/#{1,6}\s/g, '')

    const utterance = new SpeechSynthesisUtterance(plainText)
    setReadingSharedMessageId(messageId)
    utterance.onend = () => setReadingSharedMessageId(null)
    utterance.onerror = () => setReadingSharedMessageId(null)
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

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
              <img className="shared-brand-mark" src="/brand_logo_zoom.png" alt="" aria-hidden="true" />
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
                    {message.role === 'assistant' ? (
                      <div className="assistant-bubble-wrap shared-assistant-bubble-wrap">
                        <img
                          className="assistant-message-logo shared-assistant-logo"
                          src="/llama_logo_transparent.png"
                          alt="Llama AI"
                        />
                        <div className="bubble assistant">
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
                        </div>
                      </div>
                    ) : (
                      <div className="bubble user">
                        <p>
                          {message.content
                            .replace(/\[Image:\s*[^\]]+\]/g, '')
                            .trim() ||
                            (message.content.includes('[Image:')
                              ? 'Image sent'
                              : message.content)}
                        </p>
                      </div>
                    )}
                    <div className="message-actions message-actions-outside shared-message-actions">
                      <button
                        type="button"
                        className={`ghost-button action-btn message-action-icon ${copiedSharedMessageId === message.id ? 'copied' : ''}`}
                        onClick={() => handleCopySharedMessage(message.id, message.content)}
                        title={copiedSharedMessageId === message.id ? 'Copied' : 'Copy'}
                        aria-label={copiedSharedMessageId === message.id ? 'Copied' : 'Copy'}
                      >
                        {copiedSharedMessageId === message.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                      {message.role === 'assistant' && (
                        <button
                          type="button"
                          className={`ghost-button action-btn message-action-icon ${readingSharedMessageId === message.id ? 'reading' : ''}`}
                          onClick={() => handleReadSharedMessage(message.id, message.content)}
                          title={readingSharedMessageId === message.id ? 'Reading...' : 'Read aloud'}
                          aria-label={readingSharedMessageId === message.id ? 'Reading' : 'Read aloud'}
                        >
                          {readingSharedMessageId === message.id ? (
                            <Loader2 size={16} className="action-icon-spin" />
                          ) : (
                            <Volume2 size={16} />
                          )}
                        </button>
                      )}
                      {message.role === 'assistant' && (
                        <span className="message-model-pill" title="Model used">
                          <Cpu size={16} />
                          {MODEL_ENGINE_LABELS[messageModel || 'llama']}
                        </span>
                      )}
                    </div>
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
  const [readAfterSend, setReadAfterSend] = useState(false)
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
  const [shareDialogData, setShareDialogData] = useState<ShareDialogData | null>(null)
  const [shareDialogCopied, setShareDialogCopied] = useState(false)
    const estimateTokenCount = (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return 0
      const words = trimmed.split(/\s+/).length
      // Approximation for GPT-style tokenization across plain text responses.
      return Math.max(1, Math.round(words * 1.33))
    }

    const totalResponseTokens = useMemo(() => {
      return Object.values(messagesMap)
        .flat()
        .filter((message) => message.role === 'assistant')
        .reduce((sum, message) => sum + estimateTokenCount(message.content), 0)
    }, [messagesMap])

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

  const formatShareCreatedAt = (createdAt: string) => {
    const date = new Date(createdAt)
    const now = new Date()

    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diffDays = Math.floor((startToday.getTime() - startDate.getTime()) / 86_400_000)
    const timeLabel = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)

    if (diffDays <= 0) return `Created Today, ${timeLabel}`
    if (diffDays === 1) return `Created Yesterday, ${timeLabel}`
    return `Created ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)}, ${timeLabel}`
  }

  const closeShareDialog = () => {
    setShareDialogData(null)
    setShareDialogCopied(false)
  }

  const openShareUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
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
    const conversation = conversations.find((item) => item.id === conversationId)
    const title = conversation?.title || 'Llama AI Conversation'
    const createdAt = conversation?.created_at || new Date().toISOString()

    setShareDialogCopied(false)
    setShareDialogData({ title, url, createdAt })
  }

  const onCopyShareLink = async () => {
    if (!shareDialogData) return
    const copied = await copyText(shareDialogData.url)
    if (copied) {
      setShareDialogCopied(true)
      showNotice('Conversation link copied.')
    } else {
      showNotice('Could not copy conversation link.')
    }
  }

  const onShareViaMessages = () => {
    if (!shareDialogData) return
    const payload = encodeURIComponent(`${shareDialogData.title}\n${shareDialogData.url}`)
    openShareUrl(`sms:?&body=${payload}`)
  }

  const onShareViaEmail = () => {
    if (!shareDialogData) return
    const subject = encodeURIComponent(`Shared chat: ${shareDialogData.title}`)
    const body = encodeURIComponent(`${shareDialogData.title}\n\n${shareDialogData.url}`)
    openShareUrl(`mailto:?subject=${subject}&body=${body}`)
  }

  const onShareViaWhatsApp = () => {
    if (!shareDialogData) return
    const text = encodeURIComponent(`${shareDialogData.title}\n${shareDialogData.url}`)
    openShareUrl(`https://wa.me/?text=${text}`)
  }

  const onShareViaTelegram = () => {
    if (!shareDialogData) return
    const text = encodeURIComponent(shareDialogData.title)
    const url = encodeURIComponent(shareDialogData.url)
    openShareUrl(`https://t.me/share/url?url=${url}&text=${text}`)
  }

  const onShareViaMore = async () => {
    if (!shareDialogData) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareDialogData.title,
          text: shareDialogData.title,
          url: shareDialogData.url,
        })
        showNotice('Conversation shared.')
        return
      } catch {
        // fallback to clipboard below
      }
    }

    await onCopyShareLink()
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
    nextReadAfterSend: boolean,
    nextSuggestionCount: 4 | 6,
    nextVoiceLanguage: VoiceLanguage,
    nextReadVoiceUri: string,
    nextConfirmClearChats: boolean,
  ) => {
    if (!session?.user) return

    setEnterToSend(nextEnterToSend)
    setReadAfterSend(nextReadAfterSend)
    setSuggestionCount(nextSuggestionCount)
    setVoiceLanguage(nextVoiceLanguage)
    setReadVoiceUri(nextReadVoiceUri)
    setConfirmClearChats(nextConfirmClearChats)

    localStorage.setItem(`enter-to-send:${session.user.id}`, String(nextEnterToSend))
    localStorage.setItem(`read-after-send:${session.user.id}`, String(nextReadAfterSend))
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
    const storedReadAfterSend = localStorage.getItem(`read-after-send:${keyPrefix}`)
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
    setReadAfterSend(storedReadAfterSend === 'true')
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
        void refreshMessages(conversationId, true)
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
          void refreshMessages(conversationId, true)
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
      user_id: session.user.id,
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

  const onExportChats = () => {
    if (!session?.user) return

    if (conversations.length === 0) {
      showNotice('No chats available to export yet.')
      return
    }

    const exportPayload = {
      exported_at: new Date().toISOString(),
      user_id: session.user.id,
      totals: {
        conversations: conversations.length,
        messages: Object.values(messagesMap).reduce((sum, items) => sum + items.length, 0),
      },
      conversations: conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        created_at: conversation.created_at,
        is_shared: conversation.is_shared ?? false,
        messages: (messagesMap[conversation.id] || [])
          .slice()
          .sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          )
          .map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            created_at: message.created_at,
            model: getMessageModel(message),
          })),
      })),
    }

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    link.href = url
    link.download = `llama-ai-chat-export-${timestamp}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    showNotice('Chat export downloaded.')
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
                promptCards={promptCards}
                draft={draft}
                selectedModel={selectedModel}
                enterToSend={enterToSend}
                readAfterSend={readAfterSend}
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
                totalResponseTokens={totalResponseTokens}
                theme={theme}
                setTheme={setTheme}
                displayName={displayName}
                responseStyle={responseStyle}
                promptPurpose={promptPurpose}
                enterToSend={enterToSend}
                readAfterSend={readAfterSend}
                suggestionCount={suggestionCount}
                voiceLanguage={voiceLanguage}
                readVoiceUri={readVoiceUri}
                confirmClearChats={confirmClearChats}
                onSavePersonalization={onSavePersonalization}
                onSaveExperienceSettings={onSaveExperienceSettings}
                onClearChats={onClearChats}
                onExportChats={onExportChats}
                onLogout={onLogout}
              />
            )
          }
        />
        <Route path="*" element={<Navigate to={session ? '/chat' : '/'} replace />} />
      </Routes>

      {shareDialogData && (
        <div className="modal-backdrop" onClick={closeShareDialog}>
          <div className="share-chat-modal" onClick={(event) => event.stopPropagation()}>
            <div className="share-chat-modal-head">
              <span className="share-chat-head-icon" aria-hidden="true">
                <Share2 size={16} />
              </span>
              <h3>Share Chat</h3>
              <button
                type="button"
                className="icon-button"
                onClick={closeShareDialog}
                aria-label="Close share dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="share-chat-card">
              <img src="/llama_logo_transparent.png" alt="Llama AI" className="share-chat-logo" />
              <div className="share-chat-copy">
                <p>{shareDialogData.title}</p>
                <span>{formatShareCreatedAt(shareDialogData.createdAt)}</span>
              </div>
            </div>

            <div className="share-chat-actions-grid">
              <button type="button" className="share-action-tile" onClick={() => void onCopyShareLink()}>
                <span className="share-action-icon">{shareDialogCopied ? <Check size={20} /> : <Link2 size={20} />}</span>
                <span>{shareDialogCopied ? 'Copied' : 'Copy Link'}</span>
              </button>
              <button type="button" className="share-action-tile" onClick={onShareViaMessages}>
                <span className="share-action-icon share-action-icon-messages"><SiImessage size={20} /></span>
                <span>Messages</span>
              </button>
              <button type="button" className="share-action-tile" onClick={onShareViaEmail}>
                <span className="share-action-icon share-action-icon-email"><SiGmail size={20} /></span>
                <span>Email</span>
              </button>
              <button type="button" className="share-action-tile" onClick={onShareViaWhatsApp}>
                <span className="share-action-icon share-action-icon-whatsapp"><SiWhatsapp size={20} /></span>
                <span>WhatsApp</span>
              </button>
              <button type="button" className="share-action-tile" onClick={onShareViaTelegram}>
                <span className="share-action-icon share-action-icon-telegram"><SiTelegram size={20} /></span>
                <span>Telegram</span>
              </button>
              <button type="button" className="share-action-tile" onClick={() => void onShareViaMore()}>
                <span className="share-action-icon"><MoreHorizontal size={20} /></span>
                <span>More</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
