---
title: "How Agentic AI Reads Prior Art Differently Than ChatGPT"
description: "Why pasting a patent into ChatGPT gives you unreliable analysis, and how agentic AI tools that read documents with verifiable tool calls solve the problem."
pubDate: 2026-02-23
author: "Solve This OA For Me"
tags: ["agentic ai", "prior art", "patent prosecution", "chatgpt", "office actions"]
---

You've probably tried this: upload an Office Action PDF to ChatGPT, ask it to analyze the 103 rejection, and see what comes back.

The response sounds authoritative. It summarizes the examiner's position, identifies the cited references, and tells you which claim elements are mapped to which passages. Sometimes it even suggests arguments.

Then you check the references. And you find that the passage it quoted from Reference A doesn't exist. Or it does exist, but it says something different from what the AI described. Or the paragraph number is wrong. Or it attributed an argument to the wrong reference entirely.

This isn't a bug in ChatGPT. It's a fundamental limitation of how single-shot language models interact with documents.

## The Problem With Paste-and-Prompt

When you upload a PDF to a general-purpose LLM, here's what happens:

1. The model receives the text content of the document (or an image-based representation of it)
2. It processes everything in one pass
3. It generates a response based on its understanding of the full context

This works for summarization. It often works for simple questions ("what statute is claim 1 rejected under?"). But it breaks down for the kind of analysis patent prosecution requires, for a few reasons:

**It can't cross-reference documents.** A 103 rejection involves the OA, the claims, and at least two references. If you paste all of them into the context window, the model has to hold everything in attention simultaneously. Details blur. It starts confusing which reference taught what.

**It generates, it doesn't retrieve.** When the model says "paragraph [0042] of Smith discloses a processor configured to analyze input data," it's not looking up paragraph [0042]. It's generating text that seems consistent with what it read. Sometimes that's accurate. Sometimes it's a plausible-sounding fabrication.

**You can't verify the path.** The model gives you a conclusion but doesn't show you the steps it took. Did it actually read the relevant passage? Did it consider the surrounding context? You have no way to know. You either trust it or you go read the reference yourself — which defeats the purpose.

## How Agentic AI Works Differently

An agentic system doesn't process everything in one shot. It breaks the task into steps and executes them with tools — the same kinds of tools you'd use: open a file, search for a term, read a specific section, compare two passages.

Here's what this looks like in practice when [Solve This OA For Me](/) analyzes an Office Action:

**Step 1: Read the OA.** The agent opens the Office Action file and extracts each rejection — the statutory basis, the claims at issue, the references cited, and the examiner's specific element-by-element mappings.

**Step 2: Open the references.** For each cited reference, the agent opens the actual document. Not a summary. The file itself, in the workspace. If it's a patent publication number and the file isn't uploaded, it can fetch it.

**Step 3: Find cited passages.** The examiner says "column 5, lines 12-34 of Smith teaches a thermal regulation module." The agent searches Smith for that passage, reads it, and reads the surrounding context to understand what Smith is actually describing.

**Step 4: Compare.** The agent compares what the passage says to what the claim requires. Not in the abstract — with specific text from specific locations.

**Step 5: Assess.** Based on what it actually found in the reference, the agent decides whether the examiner's mapping holds up for each limitation. If there's a gap, it identifies what the reference is missing and why.

Each of these steps produces a visible artifact. You see the agent open a file (with the filename and page count). You see it search for a term (with the query and match count). You see it read a passage (with the actual text). Every step is a card in the interface that you can click to inspect.

## Why This Matters for Prosecution

The difference between "the AI says paragraph [0042] is relevant" and "the AI opened Smith.pdf, searched for 'thermal regulation,' found it at paragraph [0042], read paragraphs [0040]-[0045] for context, and determined that Smith describes passive cooling rather than active thermal regulation" is the difference between guessing and analysis.

With the agentic approach:

**You can trace every claim.** If the agent says a limitation isn't met by the reference, you can see exactly which passage it read and what it found. Click the card, read the passage yourself, and decide whether you agree.

**Hallucination becomes obvious.** When the agent reads a file, the file contents appear in the tool output. If it claims the reference says X, you can verify that immediately. There's no gap between what the AI "saw" and what you can see.

**Multi-reference analysis actually works.** A 103 with a primary and secondary reference requires understanding what each reference teaches individually, then how the examiner combines them. An agent can read each reference in separate steps, build an understanding of each, and then analyze the combination — rather than trying to hold everything in one context window.

**You can redirect mid-analysis.** If the agent's assessment of limitation (c) doesn't account for something you know about the reference, you can tell it. "Look at paragraph [0055] of Smith — it describes active cooling in an alternative embodiment." The agent goes and reads that paragraph and updates its analysis. You can't do this with a static report.

## The Tradeoff

Agentic analysis is slower than a single-shot LLM response. ChatGPT gives you an answer in 10 seconds. An agentic system that reads multiple documents, searches for passages, and builds a limitation-by-limitation analysis takes a few minutes.

But a 10-second answer you can't trust isn't saving you time. You were going to read the references anyway. The question is whether the tool did reliable work that reduces your reading, or whether it produced something you have to independently verify against the source material.

A few minutes of agentic analysis that you can spot-check by clicking through the tool cards is genuinely faster than the alternative — whether that alternative is doing it manually or fact-checking a hallucination-prone summary.

## Trying It

If you've been using ChatGPT for OA analysis and getting mixed results, the issue probably isn't your prompting. It's the architecture. A model that can't open files, can't search documents, and can't show you where it looked will always be unreliable for multi-document comparison tasks.

[Solve This OA For Me](/) is built on the agentic approach. Upload your OA and references, and watch the agent work through them step by step. You can [start with a day pass](/) — try it on an OA where you already know the answer, and see whether the agent finds the same gaps you did. That's the fastest way to calibrate trust.
