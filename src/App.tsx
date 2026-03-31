import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import {
  Menu,
  MessageSquarePlus,
  Copy,
  Share2,
  LayoutDashboard,
  Trash2,
  LogOut,
  Sun,
  Moon,
  X,
} from 'lucide-react'

type Role = 'user' | 'assistant'

type Conversation = {
  id: string
  user_id: string
  title: string
  created_at: string
}

type ChatMessage = {
  id: string
  conversation_id: string
  role: Role
  content: string
  created_at: string
}

type ThemeMode = 'light' | 'dark'
type ResponseStyle = 'balanced' | 'concise' | 'detailed'
type PromptPurpose = 'general' | 'coding' | 'business' | 'study' | 'writing'

const CHAT_API = 'https://valtry-llama3-2-3b-quantized.hf.space/v1/chat/completions'
const STOP_API = 'https://valtry-llama3-2-3b-quantized.hf.space/v1/stop'

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

async function streamCompletion(
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
) {
  const response = await fetch(CHAT_API, {
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
    throw new Error('Could not start streaming response.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n')
    buffer = parts.pop() || ''

    for (const part of parts) {
      const line = part.trim()
      if (!line.startsWith('data:')) continue

      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue

      try {
        const parsed = JSON.parse(payload)
        const token = parsed?.choices?.[0]?.delta?.content
        if (typeof token === 'string' && token.length > 0) {
          onToken(token)
        }
      } catch {
        // Ignore malformed stream chunks from edge providers.
      }
    }
  }
}

function CopyableCodeBlock({
  language,
  children,
}: {
  language?: string
  children: string
}) {
  const textContent = children.replace(/\n$/, '')
  const label = language || 'code'
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    await navigator.clipboard.writeText(textContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="code-shell">
      <div className="code-topbar">
        <span>{label}</span>
        <button type="button" onClick={onCopy} className="ghost-button">
          {copied ? 'Copied' : 'Copy Code'}
        </button>
      </div>
      <SyntaxHighlighter
        language={label}
        style={oneDark}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: 0, background: 'transparent' }}
      >
        {textContent}
      </SyntaxHighlighter>
    </div>
  )
}

function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
        redirectTo: window.location.origin,
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
        <p className="badge">Llama AI</p>
        <h1>Your AI Workspace</h1>
        <p className="muted-text">Fast chats, clean answers, and saved conversations.</p>

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
          <input
            type="password"
            placeholder="Password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

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

      </div>
    </div>
  )
}

type ChatWorkspaceProps = {
  conversations: Conversation[]
  activeConversationId: string | null
  activeMessages: ChatMessage[]
  promptPurpose: PromptPurpose
  promptCards: string[]
  draft: string
  isGenerating: boolean
  generatingConversationId: string | null
  error: string
  notice: string
  pendingDeleteTitle: string | null
  sidebarOpen: boolean
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
  setDraft: React.Dispatch<React.SetStateAction<string>>
  onSendOrStop: () => Promise<void>
  sendMessage: (input: string) => Promise<void>
  onNewChat: () => Promise<void>
  onShareMessage: (content: string) => Promise<void>
  onShareConversation: (conversationId: string) => Promise<void>
  onDeleteConversationRequest: (conversationId: string) => void
  onConfirmDeleteConversation: () => Promise<void>
  onCancelDeleteConversation: () => void
  onSelectConversation: (conversationId: string) => void
  endRef: React.RefObject<HTMLDivElement | null>
}

function ChatWorkspace({
  conversations,
  activeConversationId,
  activeMessages,
  promptPurpose,
  promptCards,
  draft,
  isGenerating,
  generatingConversationId,
  error,
  notice,
  pendingDeleteTitle,
  sidebarOpen,
  setSidebarOpen,
  setDraft,
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
}: ChatWorkspaceProps) {
  const navigate = useNavigate()

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <p className="badge">Llama AI</p>
          <button className="icon-button" onClick={() => setSidebarOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <button className="new-chat" onClick={() => void onNewChat()}>
          <MessageSquarePlus size={16} />
          New Chat
        </button>

        <div className="conversation-list">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-row ${
                activeConversationId === conv.id ? 'active' : ''
              }`}
            >
              <button
                className="conversation-item"
                onClick={() => onSelectConversation(conv.id)}
              >
                {conv.title}
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
          ))}
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

        <main className="message-scroll">
          {activeMessages.length === 0 ? (
            <section className="empty-state">
              <h3>How can I help today?</h3>
              <p>Pick a suggestion or type your own message.</p>
              <p className="purpose-label">Purpose: {PURPOSE_LABELS[promptPurpose]}</p>
              <div className="suggestion-grid">
                {promptCards.map((prompt) => (
                  <button
                    key={prompt}
                    className="suggestion-card"
                    onClick={() => void sendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="message-list">
              {activeMessages.map((message, index) => {
                const isPendingAssistant =
                  message.role === 'assistant' &&
                  !message.content.trim() &&
                  isGenerating &&
                  index === activeMessages.length - 1

                return (
                  <article
                    key={message.id}
                    className={`message-row ${
                      message.role === 'user' ? 'user-row' : 'assistant-row'
                    }`}
                  >
                    <div className={`bubble ${message.role}`}>
                      {isPendingAssistant ? (
                        <div className="thinking-inline">
                          <span className="thinking-dot"></span>
                          <span className="thinking-dot"></span>
                          <span className="thinking-dot"></span>
                          <p>Thinking...</p>
                        </div>
                      ) : message.role === 'assistant' ? (
                        <>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code: ({ className, children, ...props }) => {
                                const code = String(children)
                                const language = className?.replace('language-', '')
                                const isBlock = Boolean(language) || code.includes('\n')

                                if (isBlock) {
                                  return (
                                    <CopyableCodeBlock language={language}>
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

                          <div className="message-actions">
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => void navigator.clipboard.writeText(message.content)}
                            >
                              <Copy size={14} />
                              Copy
                            </button>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => void onShareMessage(message.content)}
                            >
                              <Share2 size={14} />
                              Share
                            </button>
                          </div>
                        </>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
          <div ref={endRef} />
        </main>

        <footer className="composer-wrap">
          {error && <p className="error-text">{error}</p>}
          {notice && <p className="notice-text">{notice}</p>}
          <div className="composer">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type your message..."
              rows={1}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  if (
                    isGenerating &&
                    activeConversationId !== generatingConversationId
                  ) {
                    return
                  }
                  void onSendOrStop()
                }
              }}
            />
            <button
              className={`send-button ${
                isGenerating && activeConversationId === generatingConversationId
                  ? 'stop'
                  : 'send'
              }`}
              onClick={() => {
                if (isGenerating && activeConversationId !== generatingConversationId) {
                  return
                }
                void onSendOrStop()
              }}
              disabled={isGenerating && activeConversationId !== generatingConversationId}
            >
              {isGenerating && activeConversationId === generatingConversationId
                ? 'Stop'
                : isGenerating
                  ? 'Busy'
                  : 'Send'}
            </button>
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
              <button className="ghost-button" onClick={onCancelDeleteConversation}>
                Cancel
              </button>
              <button className="settings-item danger" onClick={() => void onConfirmDeleteConversation()}>
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
  onSavePersonalization: (
    name: string,
    style: ResponseStyle,
    purpose: PromptPurpose,
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
  onSavePersonalization,
  onClearChats,
  onLogout,
}: DashboardProps) {
  const navigate = useNavigate()
  const [nameDraft, setNameDraft] = useState(displayName)
  const [styleDraft, setStyleDraft] = useState<ResponseStyle>(responseStyle)
  const [purposeDraft, setPurposeDraft] = useState<PromptPurpose>(promptPurpose)

  useEffect(() => {
    setNameDraft(displayName)
    setStyleDraft(responseStyle)
    setPurposeDraft(promptPurpose)
  }, [displayName, responseStyle, promptPurpose])

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
          <h2>User Dashboard</h2>
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
          <div>
            <h3>{nameDraft || 'User'}</h3>
            <p className="muted-text">{email}</p>
            <p className="meta-line">ID: {userId.slice(0, 8)}... · Joined: {joinedAt}</p>
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

        <section className="personalize-panel">
          <h3>Personalization</h3>
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

            <label className="field-block" htmlFor="response-style">
              Response Style
              <select
                id="response-style"
                value={styleDraft}
                onChange={(event) =>
                  setStyleDraft(event.target.value as ResponseStyle)
                }
              >
                <option value="balanced">Balanced</option>
                <option value="concise">Concise</option>
                <option value="detailed">Detailed</option>
              </select>
            </label>

            <label className="field-block" htmlFor="prompt-purpose">
              Purpose
              <select
                id="prompt-purpose"
                value={purposeDraft}
                onChange={(event) =>
                  setPurposeDraft(event.target.value as PromptPurpose)
                }
              >
                <option value="general">General</option>
                <option value="coding">Coding</option>
                <option value="business">Business</option>
                <option value="study">Study</option>
                <option value="writing">Writing</option>
              </select>
            </label>
          </div>

          <button
            className="secondary-button"
            onClick={() =>
              onSavePersonalization(nameDraft.trim(), styleDraft, purposeDraft)
            }
          >
            Save Preferences
          </button>
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
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingConversationId, setGeneratingConversationId] = useState<string | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [streamTick, setStreamTick] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [displayName, setDisplayName] = useState('')
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('balanced')
  const [pendingDeleteConversationId, setPendingDeleteConversationId] = useState<string | null>(null)
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

  const getConversationLink = (conversationId: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('c', conversationId)
    return url.toString()
  }

  const onShareConversation = async (conversationId: string) => {
    const url = getConversationLink(conversationId)
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
    setPromptCards(pickRandomPrompts(purpose))
    showNotice('Preferences saved.')
  }

  const activeMessages = useMemo(() => {
    if (!activeConversationId) return []
    return messagesMap[activeConversationId] || []
  }, [activeConversationId, messagesMap])

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

  const refreshPromptCards = (purpose = promptPurpose) => {
    setPromptCards(pickRandomPrompts(purpose))
  }

  useEffect(() => {
    if (!session?.user) return

    const keyPrefix = session.user.id
    const storedName = localStorage.getItem(`display-name:${keyPrefix}`)
    const storedStyle = localStorage.getItem(`response-style:${keyPrefix}`)
    const storedPurpose = localStorage.getItem(`prompt-purpose:${keyPrefix}`)

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

    setPromptPurpose(resolvedPurpose)
    setPromptCards(pickRandomPrompts(resolvedPurpose))
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

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setBooting(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (booting) return
    if (session && location.pathname === '/auth') {
      navigate('/chat', { replace: true })
      return
    }
    if (!session && location.pathname !== '/auth') {
      navigate('/auth', { replace: true })
    }
  }, [session, booting, location.pathname, navigate])

  useEffect(() => {
    if (!session?.user || !supabase) {
      setConversations([])
      setActiveConversationId(null)
      setMessagesMap({})
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeMessages.length, isGenerating, streamTick, isThinking])

  const refreshMessages = async (conversationId: string) => {
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

    setMessagesMap((prev) => ({
      ...prev,
      [conversationId]: (data || []) as ChatMessage[],
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

  const ensureConversation = async () => {
    if (activeConversationId) return activeConversationId
    return createConversation()
  }

  const sendMessage = async (input: string) => {
    if (!supabase || !session?.user) return

    const prompt = input.trim()
    if (!prompt || isGenerating) return

    const conversationId = await ensureConversation()
    if (!conversationId) return

    navigate(`/chat/${slugify(prompt)}?c=${conversationId}`)

    const userMessage: ChatMessage = {
      id: safeId('user'),
      conversation_id: conversationId,
      role: 'user',
      content: prompt,
      created_at: new Date().toISOString(),
    }

    setError('')
    setDraft('')

    const isFirstMessage = (messagesMap[conversationId] || []).length === 0
    if (isFirstMessage) {
      void updateConversationTitle(conversationId, deriveTitle(prompt))
    }

    setMessagesMap((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), userMessage],
    }))

    const assistantId = safeId('assistant')
    let assistantBuffer = ''

    const assistantMessage: ChatMessage = {
      id: assistantId,
      conversation_id: conversationId,
      role: 'assistant',
      content: '',
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
    setIsThinking(true)
    let hasFirstToken = false

    try {
      await streamCompletion(
        {
          user_id: session.user.id,
          conversation_id: conversationId,
          messages: [{ role: 'user', content: prompt }],
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
      )
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
      setIsThinking(false)
      abortRef.current = null
      await refreshMessages(conversationId)
    }
  }

  const onSendOrStop = async () => {
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

    await sendMessage(draft)
  }

  const onNewChat = async () => {
    if (isGenerating) return
    refreshPromptCards()
    await createConversation()
  }

  const onClearChats = async () => {
    if (!supabase || !session?.user) return

    const ids = conversations.map((item) => item.id)
    if (ids.length > 0) {
      await supabase.from('messages').delete().in('conversation_id', ids)
    }

    await supabase.from('conversations').delete().eq('user_id', session.user.id)

    setConversations([])
    setMessagesMap({})
    setActiveConversationId(null)
    navigate('/chat')
  }

  const onShareMessage = async (content: string) => {
    const link = activeConversationId
      ? getConversationLink(activeConversationId)
      : window.location.origin

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
    setActiveConversationId(conversationId)
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
    <Routes>
      <Route path="/auth" element={booting ? <div className="screen-loader">Loading...</div> : session ? <Navigate to="/chat" replace /> : <AuthScreen />} />
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
              activeMessages={activeMessages}
              promptPurpose={promptPurpose}
              promptCards={promptCards}
              draft={draft}
              isGenerating={isGenerating}
              generatingConversationId={generatingConversationId}
              error={error}
              notice={notice}
              pendingDeleteTitle={pendingDeleteTitle}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              setDraft={setDraft}
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
              onSavePersonalization={onSavePersonalization}
              onClearChats={onClearChats}
              onLogout={onLogout}
            />
          )
        }
      />
      <Route path="*" element={<Navigate to={session ? '/chat' : '/auth'} replace />} />
    </Routes>
  )
}

export default App
