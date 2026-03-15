---
title: "Why Patent Attorneys Still Spend 6 Hours on Every Office Action"
description: "The Office Action response workflow hasn't changed in decades. Most of those hours go to reading and mapping — work that AI can now handle reliably."
pubDate: 2026-03-22
author: "Solve This OA For Me"
tags: ["patent prosecution", "office actions", "productivity", "ai for patents"]
---

You'd think that after years of AI hype, responding to an Office Action would be faster by now. It's not. Most patent attorneys still spend somewhere between 4 and 8 hours on a typical OA response, and the workflow looks basically the same as it did in 2015.

Open the OA. Read the rejection. Pull up the cited references. Read them. Build a limitation chart. Read them again. Decide whether to argue or amend. Draft the response. Bill the client.

The reason this hasn't changed isn't that attorneys are stubborn. It's that the hard part — actually reading prior art and deciding whether it teaches what the examiner says it teaches — requires careful, detail-oriented analysis that generic tools couldn't handle. Until recently.

## Where the Hours Actually Go

If you track your time on an OA response, the breakdown usually looks something like this:

**~30 minutes** reading the Office Action itself. Understanding the examiner's position, which claims are rejected, under what grounds, and what references are cited.

**~2-3 hours** reading the prior art. This is the real time sink. A 103 rejection with two references means you're reading two documents — often 30-50 pages each — looking for the specific passages the examiner cited. Then you're reading the surrounding context to understand whether those passages actually support the rejection.

**~1-2 hours** mapping limitations. Going claim element by claim element, matching each one to the examiner's cited passage, and deciding whether it holds up. Is "a processing unit configured to analyze data" really disclosed by paragraph [0042] of the primary reference? You have to read [0042], read the surrounding paragraphs, understand what the reference is actually describing, and make a judgment call.

**~1 hour** on strategy and drafting. Once you know which mappings are weak, you decide your approach and write it up.

The reading and mapping is roughly 70-80% of the total time. It's also the part that doesn't require your legal judgment — it requires careful reading and comparison. That distinction matters.

## Why General AI Doesn't Help

You've probably tried pasting an OA into ChatGPT or Claude. The experience is instructive:

The model will confidently summarize the rejection. It'll tell you the examiner cited Reference A for claim elements 1-3 and Reference B for elements 4-6. Sometimes it's right. Often it's close but wrong in ways that matter — it'll attribute the wrong passage to a limitation, or describe what a reference teaches in vague terms that don't match what it actually says.

The fundamental problem is that these models aren't reading the references. They're working from whatever you pasted in, or from a PDF they can see but can't reliably parse page by page. They can't open a patent publication, navigate to column 5 lines 12-34, and verify that's where the examiner's argument actually comes from.

So you end up fact-checking the AI's output against the original documents — which is just doing the work yourself with extra steps.

## What Would Actually Save Time

The useful version of AI for OA responses would:

1. Read the Office Action and extract each rejection with its specific citations
2. Open each cited reference and find the exact passages
3. Compare each cited passage to each claim limitation and assess whether there's a real gap
4. Tell you which limitations are strong (argue) and which are weak (amend), with evidence

Not a summary. Not a generic strategy memo. A limitation-by-limitation analysis backed by actual passages from actual documents.

This is what we built [Solve This OA For Me](/) to do. The AI agent opens your documents, reads the references, searches for the examiner's cited passages, and builds the analysis while you watch. Every document it reads, every search it runs, every passage it finds appears in the interface as a card you can click to verify.

The result is that the 2-3 hours of reading and the 1-2 hours of mapping collapse into minutes. You still review the output — you should, because you're the attorney — but you're reviewing analysis instead of building it from scratch.

## A Realistic Before and After

**Before:** You receive a 103 rejection citing two references against 15 claims. You spend an afternoon reading both references, building a limitation chart in Word, highlighting the gaps, then drafting arguments. Total: 5-6 hours.

**After:** You upload the OA, your spec, and the two references. The agent reads everything, maps each limitation, and flags the weak points in the examiner's mapping. You spend 30-45 minutes reviewing the analysis, adjusting where you disagree, and asking follow-up questions. Then you write the response using the agent's analysis and draft arguments as a starting point. Total: 1.5-2 hours.

The difference isn't that AI wrote your response. It's that AI did the reading for you — and showed you exactly what it read and where.

## The Part That Stays Manual

Strategy is still yours. The decision to fight on claim 1 but amend claim 7 — that depends on prosecution history, the client's commercial goals, claim scope considerations, and your read on the examiner. AI gives you the raw material for that decision. It doesn't make it for you.

Writing the actual response is still yours too. The tool produces analysis and draft arguments, not a filed response. Your tone, your framing, your relationship with the examiner — those matter and they're not automatable.

What *is* automatable is the grunt work of reading 80 pages of prior art and building a chart. That's the part nobody went to law school for, and it's the part that eats your afternoon.

If you want to see what this looks like in practice, [grab a day pass](/) and try it on whatever OA is sitting on your desk right now. Bring your own references or let the agent fetch them. The analysis takes a few minutes; you'll know pretty quickly whether the output is useful.
