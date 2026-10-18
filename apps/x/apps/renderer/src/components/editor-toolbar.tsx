import { useState, useCallback, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  QuoteIcon,
  MinusIcon,
  LinkIcon,
  CodeSquareIcon,
  ExternalLinkIcon,
  Trash2Icon,
  ImageIcon,
  DownloadIcon,
  ChevronDownIcon,
  FileTextIcon,
  FileIcon,
  FileTypeIcon,
  CloudDownloadIcon,
  LoaderIcon,
  UploadCloudIcon,
  Radio,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatRelativeTime } from '@/lib/relative-time'

interface EditorToolbarProps {
  editor: Editor | null
  onSelectionHighlight?: (range: { from: number; to: number } | null) => void
  onImageUpload?: (file: File) => Promise<void> | void
  onExport?: (format: 'md' | 'pdf' | 'docx') => void
  onOpenLiveNote?: () => void
  liveState?: LivePillState
  googleDoc?: GoogleDocToolbarState
}

export interface GoogleDocToolbarState {
  title: string
  isSyncing?: 'up' | 'down' | null
  lastSyncedAt?: string
  onOpen: () => void
  onSyncDown: () => void
  onSyncUp: () => void
}

export type LivePillVariant = 'passive' | 'idle' | 'running' | 'error'
export interface LivePillState {
  variant: LivePillVariant
  label: string
}

const LIVE_PILL_VARIANT_CLASS: Record<LivePillVariant, string> = {
  passive: 'text-muted-foreground hover:bg-accent',
  idle: 'text-foreground hover:bg-accent',
  running: 'text-foreground bg-primary/10 hover:bg-primary/15 animate-pulse',
  error: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/15',
}

function GoogleDocsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path fill="#4285F4" d="M6 2h8l5 5v15H6V2Z" />
      <path fill="#AECBFA" d="M14 2v5h5l-5-5Z" />
      <path fill="#FFFFFF" d="M8.5 11h7v1.2h-7V11Zm0 2.6h7v1.2h-7v-1.2Zm0 2.6h5.2v1.2H8.5v-1.2Z" />
    </svg>
  )
}

function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path fill="#1FA463" d="M8.52 3.5h6.96l6.95 12.04h-6.96L8.52 3.5Z" />
      <path fill="#FFD04B" d="M1.57 15.54 8.52 3.5l3.48 6.02-3.48 6.02H1.57Z" />
      <path fill="#4688F1" d="M8.52 15.54h13.91L18.95 21H5.05l3.47-5.46Z" />
    </svg>
  )
}

export function EditorToolbar({
  editor,
  onSelectionHighlight,
  onImageUpload,
  onExport,
  onOpenLiveNote,
  liveState,
  googleDoc,
}: EditorToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('')
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openLinkPopover = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href || ''
    setLinkUrl(previousUrl)

    // Highlight the current selection while popover is open
    const { from, to } = editor.state.selection
    if (from !== to && onSelectionHighlight) {
      onSelectionHighlight({ from, to })
    }

    setIsLinkPopoverOpen(true)
  }, [editor, onSelectionHighlight])

  const closeLinkPopover = useCallback(() => {
    setIsLinkPopoverOpen(false)
    setLinkUrl('')
    onSelectionHighlight?.(null)
  }, [onSelectionHighlight])

  const applyLink = useCallback(() => {
    if (!editor) return

    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      // Ensure URL has protocol
      let url = linkUrl.trim()
      if (url && !url.match(/^https?:\/\//i) && !url.startsWith('mailto:')) {
        url = 'https://' + url
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
    closeLinkPopover()
  }, [editor, linkUrl, closeLinkPopover])

  const removeLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    closeLinkPopover()
  }, [editor, closeLinkPopover])

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !onImageUpload) return

    // Reset file input immediately
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // Call the upload handler (which handles placeholder insertion)
    try {
      await onImageUpload(file)
    } catch (error) {
      console.error('Failed to upload image:', error)
    }
  }, [onImageUpload])

  if (!editor) return null

  const isLinkActive = editor.isActive('link')

  return (
    <div className="editor-toolbar">
      {/* Text formatting */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        data-active={editor.isActive('bold') || undefined}
        className="data-active:bg-accent"
        title="加粗 (Ctrl+B)"
      >
        <BoldIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        data-active={editor.isActive('italic') || undefined}
        className="data-active:bg-accent"
        title="斜体 (Ctrl+I)"
      >
        <ItalicIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        data-active={editor.isActive('strike') || undefined}
        className="data-active:bg-accent"
        title="删除线"
      >
        <StrikethroughIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        data-active={editor.isActive('code') || undefined}
        className="data-active:bg-accent"
        title="行内代码"
      >
        <CodeIcon className="size-4" />
      </Button>

      <div className="separator" />

      {/* Headings */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        data-active={editor.isActive('heading', { level: 1 }) || undefined}
        className="data-active:bg-accent"
        title="标题 1"
      >
        <Heading1Icon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        data-active={editor.isActive('heading', { level: 2 }) || undefined}
        className="data-active:bg-accent"
        title="标题 2"
      >
        <Heading2Icon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        data-active={editor.isActive('heading', { level: 3 }) || undefined}
        className="data-active:bg-accent"
        title="标题 3"
      >
        <Heading3Icon className="size-4" />
      </Button>

      <div className="separator" />

      {/* Lists */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        data-active={editor.isActive('bulletList') || undefined}
        className="data-active:bg-accent"
        title="无序列表"
      >
        <ListIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        data-active={editor.isActive('orderedList') || undefined}
        className="data-active:bg-accent"
        title="有序列表"
      >
        <ListOrderedIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        data-active={editor.isActive('taskList') || undefined}
        className="data-active:bg-accent"
        title="任务列表"
      >
        <ListTodoIcon className="size-4" />
      </Button>

      <div className="separator" />

      {/* Blocks */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        data-active={editor.isActive('blockquote') || undefined}
        className="data-active:bg-accent"
        title="引用块"
      >
        <QuoteIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        data-active={editor.isActive('codeBlock') || undefined}
        className="data-active:bg-accent"
        title="代码块"
      >
        <CodeSquareIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="分隔线"
      >
        <MinusIcon className="size-4" />
      </Button>

      {/* Link with popover */}
      <Popover
        open={isLinkPopoverOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeLinkPopover()
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={openLinkPopover}
            data-active={isLinkActive || undefined}
            className="data-active:bg-accent"
            title="链接"
          >
            <LinkIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">
              {isLinkActive ? 'Edit Link' : 'Add Link'}
            </div>
            <Input
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  applyLink()
                }
                if (e.key === 'Escape') {
                  setIsLinkPopoverOpen(false)
                }
              }}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={applyLink} className="flex-1">
                {isLinkActive ? 'Update' : 'Apply'}
              </Button>
              {isLinkActive && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.open(linkUrl, '_blank')
                    }}
                    title="打开链接"
                  >
                    <ExternalLinkIcon className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={removeLink}
                    title="移除链接"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Image upload */}
      {onImageUpload && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => fileInputRef.current?.click()}
            title="插入图片"
          >
            <ImageIcon className="size-4" />
          </Button>
        </>
      )}

      {/* Export */}
      {onExport && (
        <>
          <div className="separator" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                title="导出"
              >
                <DownloadIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport('md')}>
                <FileTextIcon className="size-4 mr-2" />
                Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('pdf')}>
                <FileIcon className="size-4 mr-2" />
                PDF (.pdf)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('docx')}>
                <FileTypeIcon className="size-4 mr-2" />
                Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {googleDoc && (
        <>
          <div className="separator" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2"
                title={`Google Doc: ${googleDoc.title}`}
                disabled={Boolean(googleDoc.isSyncing)}
              >
                {googleDoc.isSyncing ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <GoogleDocsIcon className="size-4" />
                )}
                <ChevronDownIcon className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-normal text-muted-foreground">
                {googleDoc.lastSyncedAt
                  ? `Last synced ${formatRelativeTime(googleDoc.lastSyncedAt)}`
                  : 'Not synced yet'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={googleDoc.onOpen}>
                <GoogleDriveIcon className="size-4 mr-2" />
                Open Google Doc
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={googleDoc.onSyncDown} disabled={Boolean(googleDoc.isSyncing)}>
                <CloudDownloadIcon className="size-4 mr-2" />
                Sync down
              </DropdownMenuItem>
              <DropdownMenuItem onClick={googleDoc.onSyncUp} disabled={Boolean(googleDoc.isSyncing)}>
                <UploadCloudIcon className="size-4 mr-2" />
                Sync up
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {/* Live Note pill — pushed to far right */}
      {onOpenLiveNote && liveState && (
        <button
          type="button"
          onClick={onOpenLiveNote}
          title={liveState.variant === 'passive' ? 'Make this note live' : 'Live note'}
          className={`ml-auto inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${LIVE_PILL_VARIANT_CLASS[liveState.variant]}`}
        >
          <Radio className="size-3.5" />
          <span className="truncate max-w-[160px]">{liveState.label}</span>
        </button>
      )}
    </div>
  )
}
