import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { BashToolCard } from "@/components/assistant-ui/bash-tool-card";
import { GlobToolCard } from "@/components/assistant-ui/glob-tool-card";
import { GrepToolCard } from "@/components/assistant-ui/grep-tool-card";
import { FetchPatentToolCard } from "@/components/assistant-ui/fetch-patent-tool-card";
import { ReadToolCard } from "@/components/assistant-ui/read-tool-card";
import { TaskToolCard } from "@/components/assistant-ui/task-tool-card";
import { TodoWriteToolCard } from "@/components/assistant-ui/todo-write-tool-card";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { WriteToolCard } from "@/components/assistant-ui/write-tool-card";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useMessage,
  useThreadRuntime,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  FolderOpenIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
} from "lucide-react";
import { usePreviewPanel } from "@/lib/previewPanelStore";
import { CompactionContext } from "@/components/agent/AgentChat";
import { type FC, useCallback, useContext, useEffect } from "react";

const GeneratingWarning: FC = () => {
  const threadRuntime = useThreadRuntime();

  useEffect(() => {
    return threadRuntime.unstable_on("run-start", () => {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
      };
      window.addEventListener("beforeunload", handler);

      const unsub = threadRuntime.unstable_on("run-end", () => {
        window.removeEventListener("beforeunload", handler);
        unsub();
      });

      return () => {
        window.removeEventListener("beforeunload", handler);
        unsub();
      };
    });
  }, [threadRuntime]);

  return (
    <AuiIf condition={({ thread }) => thread.isRunning}>
      <div className="sticky top-0 z-10 mx-auto w-full max-w-(--thread-max-width) px-2 pb-2">
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 shadow-sm dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
          <span className="shrink-0 text-base" role="img" aria-label="warning">
            ⚠
          </span>
          <span>
            Response in progress — refreshing or navigating away will lose the
            current response.
          </span>
        </div>
      </div>
    </AuiIf>
  );
};

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root @container flex h-full flex-col bg-background"
      style={{
        ["--thread-max-width" as string]: "44rem",
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth px-2 md:px-4 pt-4"
      >
        <GeneratingWarning />

        <AuiIf condition={({ thread }) => thread.isEmpty}>
          <ThreadWelcome />
        </AuiIf>

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            EditComposer,
            AssistantMessage,
          }}
        />

        <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible rounded-t-3xl pb-4 md:pb-6">
          <ThreadScrollToBottom />
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible dark:bg-background dark:hover:bg-accent"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const SUGGESTIONS = [
  {
    label: "Analyze my office action",
    description: "Upload an OA and get a full response strategy",
    prompt: "I have an office action I need help responding to. Let me upload it.",
  },
  {
    label: "Respond to a \u00A7103 rejection",
    description: "Build arguments against obviousness",
    prompt: "I need help responding to a \u00A7103 obviousness rejection.",
  },
  {
    label: "Respond to a \u00A7102 rejection",
    description: "Challenge an anticipation rejection",
    prompt: "I need help responding to a \u00A7102 anticipation rejection.",
  },
  {
    label: "Start from scratch",
    description: "Describe your situation in your own words",
    prompt: "",
  },
];

const ThreadWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root mx-auto my-auto flex w-full max-w-(--thread-max-width) grow flex-col">
      <div className="aui-thread-welcome-center flex w-full grow flex-col items-center justify-center">
        <div className="aui-thread-welcome-message flex size-full flex-col justify-center px-4">
          <h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in font-semibold text-xl md:text-2xl duration-200">
            What office action can I help you with?
          </h1>
          <p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in text-muted-foreground text-base delay-75 duration-200">
            Upload your office action, specification, claims, or prior art — I'll help you build a response strategy.
          </p>
        </div>
      </div>
      <ThreadSuggestions />
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  const threadRuntime = useThreadRuntime();

  const handleClick = useCallback(
    (prompt: string) => {
      threadRuntime.composer.setText(prompt);
    },
    [threadRuntime],
  );

  return (
    <div className="aui-thread-welcome-suggestions grid w-full @md:grid-cols-2 gap-2 pb-4">
      {SUGGESTIONS.map((suggestion) => (
        <div
          key={suggestion.label}
          className="fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200"
        >
          <Button
            variant="ghost"
            className="h-auto w-full flex-col items-start justify-start gap-1 rounded-2xl border px-4 py-3 text-left text-sm transition-colors hover:bg-muted"
            onClick={() => handleClick(suggestion.prompt)}
          >
            <span className="font-medium">{suggestion.label}</span>
            <span className="text-muted-foreground">
              {suggestion.description}
            </span>
          </Button>
        </div>
      ))}
    </div>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone className="aui-composer-attachment-dropzone flex w-full flex-col rounded-2xl border border-input bg-background px-1 pt-2 outline-none transition-shadow has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-ring/20 data-[dragging=true]:border-ring data-[dragging=true]:border-dashed data-[dragging=true]:bg-accent/50">
        <ComposerAttachments />
        <ComposerPrimitive.Input
          placeholder="Send a message..."
          className="aui-composer-input mb-1 max-h-32 min-h-14 w-full resize-none bg-transparent px-4 pt-2 pb-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
          rows={1}
          autoFocus
          aria-label="Message input"
        />
        <ComposerAction />
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const BrowseWorkspaceButton: FC = () => {
  const { isOpen, mode } = usePreviewPanel();
  const isActive = isOpen && mode === "browser";
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted-foreground/15 transition-colors",
        isActive && "bg-accent text-foreground",
      )}
      onClick={() => {
        const state = usePreviewPanel.getState();
        if (state.isOpen && state.mode === "browser") {
          state.close();
        } else {
          state.openBrowser();
        }
      }}
      aria-label="Browse workspace files"
    >
      <FolderOpenIcon className="size-4" />
      <span>Files</span>
    </button>
  );
};

const ComposerAction: FC = () => {
  return (
    <div className="aui-composer-action-wrapper relative mx-2 mb-2 flex items-center justify-between">
      <div className="flex items-center gap-1">
        <ComposerAddAttachment />
        <BrowseWorkspaceButton />
      </div>
      <AuiIf condition={({ thread }) => !thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send message"
            side="bottom"
            type="submit"
            variant="default"
            size="icon"
            className="aui-composer-send size-8 rounded-full"
            aria-label="Send message"
          >
            <ArrowUpIcon className="aui-composer-send-icon size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={({ thread }) => thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="aui-composer-cancel size-8 rounded-full"
            aria-label="Stop generating"
          >
            <SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-sm dark:bg-destructive/5 dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const CompactionNotice: FC = () => (
  <div className="mx-auto flex w-full max-w-(--thread-max-width) items-center gap-3 px-4 py-3">
    <div className="h-px flex-1 bg-border" />
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <RefreshCwIcon className="h-3 w-3" />
      Context compacted
    </span>
    <div className="h-px flex-1 bg-border" />
  </div>
);

const MaybeCompactionNotice: FC = () => {
  const compactionIds = useContext(CompactionContext);
  const messageId = useMessage((s) => s.id);
  const isLast = useMessage((s) => s.isLast);

  // Show if this message ID is explicitly marked
  const explicit = compactionIds.has(messageId);
  // Or if we have a streaming marker and this is the last message
  const streaming = compactionIds.has("__streaming__") && isLast;

  if (!explicit && !streaming) return null;
  return <CompactionNotice />;
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-assistant-message-root fade-in slide-in-from-bottom-1 relative mx-auto w-full max-w-(--thread-max-width) animate-in py-3 duration-150"
      data-role="assistant"
    >
      <MaybeCompactionNotice />
      <div className="aui-assistant-message-content wrap-break-word px-2 text-foreground leading-relaxed">
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
            tools: {
              by_name: {
                Bash: BashToolCard,
                "mcp__patent-tools__FetchPatent": FetchPatentToolCard,
                Glob: GlobToolCard,
                Grep: GrepToolCard,
                Read: ReadToolCard,
                Task: TaskToolCard,
                TodoWrite: TodoWriteToolCard,
                Write: WriteToolCard,
              },
              Fallback: ToolFallback,
            },
          }}
        />
        <MessageError />
      </div>

      <div className="aui-assistant-message-footer mt-1 ml-2 flex">
        <BranchPicker />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="aui-assistant-action-bar-root col-start-3 row-start-2 -ml-1 flex gap-1 text-muted-foreground data-floating:absolute data-floating:rounded-md data-floating:border data-floating:bg-background data-floating:p-1 data-floating:shadow-sm"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <AuiIf condition={({ message }) => message.isCopied}>
            <CheckIcon />
          </AuiIf>
          <AuiIf condition={({ message }) => !message.isCopied}>
            <CopyIcon />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger asChild>
          <TooltipIconButton
            tooltip="More"
            className="data-[state=open]:bg-accent"
          >
            <MoreHorizontalIcon />
          </TooltipIconButton>
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          className="aui-action-bar-more-content z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <ActionBarPrimitive.ExportMarkdown asChild>
            <ActionBarMorePrimitive.Item className="aui-action-bar-more-item flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
              <DownloadIcon className="size-4" />
              Export as Markdown
            </ActionBarMorePrimitive.Item>
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      className="aui-user-message-root fade-in slide-in-from-bottom-1 mx-auto grid w-full max-w-(--thread-max-width) animate-in auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-3 duration-150 [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content wrap-break-word rounded-2xl bg-muted px-4 py-2.5 text-foreground">
          <MessagePrimitive.Parts />
        </div>
        <div className="aui-user-action-bar-wrapper absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2">
          <UserActionBar />
        </div>
      </div>

      <BranchPicker className="aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit" className="aui-user-action-edit p-4">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root className="aui-edit-composer-wrapper mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
      <ComposerPrimitive.Root className="aui-edit-composer-root ml-auto flex w-full max-w-[85%] flex-col rounded-2xl bg-muted">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input min-h-14 w-full resize-none bg-transparent p-4 text-foreground text-sm outline-none"
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm">Update</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root mr-2 -ml-2 inline-flex items-center text-muted-foreground text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
