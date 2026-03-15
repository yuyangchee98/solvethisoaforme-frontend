---
title: "AI for Patent Prosecution: What Actually Works and What Doesn't"
description: "An honest breakdown of where AI genuinely helps in patent prosecution and where it still falls short, from someone building in this space."
pubDate: 2026-02-09
author: "Solve This OA For Me"
tags: ["ai for patents", "patent prosecution", "patent technology", "office actions"]
---

There's a gap between what AI companies claim their tools can do for patent work and what actually holds up when you try it on a real case. Some things work surprisingly well. Others are still unreliable in ways that can burn you if you're not careful.

We build AI for patent prosecution ([Solve This OA For Me](/)), so we've spent a lot of time figuring out where the line is. Here's what we've found.

## What Works Well

### Reading and Extracting Information From Documents

AI is genuinely good at reading a 40-page Office Action and pulling out structured information: which claims are rejected, under what statute, citing which references, with what rationale. This used to be something you did manually while scrolling through a PDF. Now it's reliable enough to automate.

The same applies to extracting information from patent publications and applications — identifying what a reference teaches, finding specific passages, understanding the relationship between different sections.

The key word is *extracting*. The AI reads what's there. It doesn't invent information. When a tool is designed to pull passages and cite them with locations, the output is verifiable.

### Limitation Mapping

Given a claim, a rejection, and a reference, AI can map individual claim limitations to the passages the examiner cited. It can also assess whether those passages genuinely disclose what the examiner says they disclose.

This works because it's a comparison task with concrete inputs. The claim says X. The examiner says paragraph Y teaches X. The AI reads paragraph Y and either agrees or identifies a difference. There's a right answer, and the AI can show you exactly where it looked.

We've found this to be one of the highest-value applications — it's tedious work that takes hours manually, and the AI's accuracy is high enough that attorneys spend their time *reviewing* the mapping rather than *building* it.

### Antecedent Basis and Claim Quality Checking

Checking claims for missing antecedent basis, pronoun usage, and reintroduction errors is almost perfectly suited for AI. The rules are well-defined, the input is structured text, and there's an objective right answer.

NLP-based tools can flag issues like "the processor" appearing before any introduction of "a processor," or a dependent claim re-introducing a term already defined in its parent. These are the kinds of errors that create 112(b) rejections when you're not careful during amendment — catching them before filing saves a round of prosecution.

### Finding Specific Passages in Long Documents

"Find every passage in this 50-page specification that discusses the thermal management system." AI handles this well. It's a search task with understanding — better than ctrl-F because it catches paraphrases and related discussions, but grounded in the actual document rather than generated from memory.

## What Doesn't Work (Yet)

### Generating Claim Language From Scratch

AI can suggest amendments to existing claims — adding a limitation, narrowing scope, rewording for clarity. But generating an entire independent claim from a description of an invention? The results are consistently mediocre. Claims are a specialized legal format where every word choice has prosecution and litigation implications. AI doesn't have the judgment to make those tradeoffs well.

It can produce something that *looks* like a claim. But an experienced drafter will spot problems with scope, structure, and strategy immediately.

### Prosecution Strategy

"Should I file a continuation or amend and argue?" That's a question about the client's business, the patent portfolio, the examiner's track record, and dozens of other factors the AI doesn't have access to. Tools that try to give strategic advice tend to produce generic recommendations that any first-year associate could come up with.

The useful version of AI for strategy is indirect — it does the analysis work quickly so the attorney has more time and better information to make strategic decisions.

### Predicting Examiner Behavior

Some tools claim to predict how an examiner will respond to certain arguments based on historical data. In our experience, this is too noisy to be actionable. Examiners change art units, policies shift, and individual cases are too variable. You can look at an examiner's allowance rate and get a general sense, but AI "predictions" about specific arguments aren't reliable enough to base decisions on.

### Replacing Attorney Review

This one should be obvious, but it's worth stating: no AI output in patent prosecution should go unreviewed. The accuracy on limitation mapping is high — but "high" isn't "perfect," and a missed nuance in how a reference teaches something can undermine your entire argument.

The right mental model is an associate who did thorough research and wrote up a first draft. You're going to read it critically and catch things they missed. That's faster than doing the research yourself, but it's not zero effort.

## Where It's Heading

The tools that are working best right now share a common design: they're *agentic*. Instead of taking a prompt and generating a response, they take a task and execute a multi-step workflow — reading documents, searching for passages, building structured analysis, and producing output that references specific locations in specific files.

This matters because prosecution work is inherently multi-document and multi-step. A single-shot LLM call can't read an OA, then open Reference A, find the cited passage, compare it to claim 3 element (c), and produce a grounded assessment. An agent with tools — file reading, search, structured output — can.

[Solve This OA For Me](/) uses this agentic approach. The AI reads your documents with the same tools you'd use (open file, search for passage, read surrounding context) and shows you each step. The result is analysis you can trace back to source material, not a summary generated from vibes.

If you're evaluating AI tools for prosecution, the question isn't "does it use AI?" Everything uses AI now. The question is: can it read my actual references, show me where it looked, and produce analysis I can verify? That's the bar.
