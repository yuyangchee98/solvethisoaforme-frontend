"use client";

import type React from "react";
import { cn } from "@/lib/utils";

/**
 * Preprocess raw markdown for rendering:
 * - Convert `~~...~~` strikethrough to `<del>` (some strategy docs use this)
 * - Preserve `&emsp;` indentation on line wraps (used in claim amendments)
 */
export function preprocessMarkdown(md: string): string {
  return md
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/([^\n])\n(&emsp;)/g, "$1<br>\n$2");
}

/**
 * Shared markdown component map used by both the OA PreviewPanel and
 * the Reviewer PrimaryPane. Defines typography, lists, tables, code
 * blocks, etc. consistently across surfaces that render user-facing
 * markdown.
 */
export const markdownComponents = {
  h1: ({ className, ...props }: React.ComponentProps<"h1">) => (
    <h1
      className={cn(
        "mb-2 scroll-m-20 font-semibold text-base first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: React.ComponentProps<"h2">) => (
    <h2
      className={cn(
        "mt-3 mb-1.5 scroll-m-20 font-semibold text-sm first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: React.ComponentProps<"h3">) => (
    <h3
      className={cn(
        "mt-2.5 mb-1 scroll-m-20 font-semibold text-sm first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }: React.ComponentProps<"h4">) => (
    <h4
      className={cn(
        "mt-2 mb-1 scroll-m-20 font-medium text-sm first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }: React.ComponentProps<"p">) => (
    <p
      className={cn("my-2.5 leading-normal first:mt-0 last:mb-0", className)}
      {...props}
    />
  ),
  a: ({ className, ...props }: React.ComponentProps<"a">) => (
    <a
      className={cn(
        "text-primary underline underline-offset-2 hover:text-primary/80",
        className,
      )}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }: React.ComponentProps<"blockquote">) => (
    <blockquote
      className={cn(
        "my-2.5 border-muted-foreground/30 border-l-2 pl-3 text-muted-foreground italic",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }: React.ComponentProps<"ul">) => (
    <ul
      className={cn(
        "my-2 ml-4 list-disc marker:text-muted-foreground [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }: React.ComponentProps<"ol">) => (
    <ol
      className={cn(
        "my-2 ml-4 list-decimal marker:text-muted-foreground [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }: React.ComponentProps<"hr">) => (
    <hr
      className={cn("my-2 border-muted-foreground/20", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }: React.ComponentProps<"table">) => (
    <table
      className={cn(
        "my-2 w-full border-separate border-spacing-0 overflow-y-auto",
        className,
      )}
      {...props}
    />
  ),
  th: ({ className, ...props }: React.ComponentProps<"th">) => (
    <th
      className={cn(
        "bg-muted px-2 py-1 text-left font-medium first:rounded-tl-lg last:rounded-tr-lg",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: React.ComponentProps<"td">) => (
    <td
      className={cn(
        "border-muted-foreground/20 border-b border-l px-2 py-1 text-left last:border-r",
        className,
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }: React.ComponentProps<"tr">) => (
    <tr
      className={cn(
        "m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }: React.ComponentProps<"li">) => (
    <li className={cn("leading-normal", className)} {...props} />
  ),
  pre: ({ className, ...props }: React.ComponentProps<"pre">) => (
    <pre
      className={cn(
        "overflow-x-auto rounded-lg border border-border/50 bg-muted/30 p-3 text-xs leading-relaxed",
        className,
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }: React.ComponentProps<"code">) => {
    const isBlock = className?.includes("language-");
    return (
      <code
        className={cn(
          !isBlock &&
            "rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[0.85em]",
          className,
        )}
        {...props}
      />
    );
  },
};

/** Sanitizer schema extended with tags we use in our markdown rendering. */
export const markdownSanitizeTagNames = ["u", "del", "br", "span"];
