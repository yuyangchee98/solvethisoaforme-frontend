---
title: "The Antecedent Basis Mistakes Examiners Catch (That AI Can Catch First)"
description: "Common antecedent basis errors in patent claims that lead to 112(b) rejections, and how automated checking tools catch them before filing."
pubDate: 2026-03-09
author: "Solve This OA For Me"
tags: ["antecedent basis", "patent claims", "112 rejections", "claim drafting", "ai for patents"]
---

Every patent prosecutor has gotten a 112(b) rejection for an antecedent basis error they should have caught. You amend a claim to add a limitation referencing "the signal processor," except nowhere in the claim chain did you introduce "a signal processor." Or you write a dependent claim that introduces "a memory" when the independent claim already defined "a memory" three limitations up.

These errors are embarrassing because they're mechanical, not substantive. You know the rules. You just missed it in a 23-claim set at the end of a long day.

The examiner won't miss it. And now you've burned a round of prosecution on something that had nothing to do with the merits.

## The Errors That Come Up Most Often

### The Missing Introduction

The most basic antecedent basis error: using "the" or "said" to refer to an element that was never introduced with "a," "an," or "one or more."

```
1. A system comprising:
   a processor configured to receive data from the sensor...
```

What sensor? The claim never introduced one. You meant to write "a sensor" somewhere upstream, or this claim was supposed to depend from a claim that introduces the sensor. Either way, it's a 112(b) rejection.

This one is easy to catch in a three-element claim. It gets hard in a claim with 15 limitations spread across an independent and four levels of dependency. Your eyes glaze over. The examiner's don't.

### The Accidental Reintroduction

```
1. A method comprising:
   storing data in a database;
   retrieving, by a processor, the data from the database.

2. The method of claim 1, further comprising:
   analyzing, by a processor, the retrieved data.
```

Claim 2 introduces "a processor" — but claim 1 already introduced "a processor." Is this the same processor or a different one? The examiner will flag this as indefinite. You meant to write "the processor."

Reintroductions are particularly common in dependent claims that were drafted at a different time than the independent claim, or when multiple people work on the same claim set.

### Pronouns

```
1. A device comprising:
   a first module and a second module, wherein it is configured to process data.
```

"It" — which one? Patent claims don't allow pronouns like "it," "its," "they," or "them" because the antecedent is ambiguous. You have to use the full noun phrase every time.

Most drafters know this rule. Most drafters also occasionally write "its" in a long wherein clause without noticing.

### Scope Ambiguity After Amendment

This is the sneaky one. Your original claim 1 introduced "a controller." During prosecution, you amend claim 1 to add a limitation about "a processing unit." Now your dependent claim 3 references "the controller" — but wait, did your amendment accidentally delete the limitation that introduced the controller? If the amendment rewrote the claim and the introduction got lost, every downstream reference to "the controller" is now lacking antecedent basis.

This is where amendments create new problems. You're focused on responding to the examiner's rejection, and you don't notice that your rewrite broke the antecedent chain for an element three claims downstream.

## Why Manual Checking Fails at Scale

You can check a single claim for antecedent basis errors in a minute. But real prosecution involves claim sets of 15-25 claims, with amendments across multiple rounds. After the second or third amendment, the claim set has been rewritten enough that you'd need to re-check every dependency chain from scratch.

Nobody does this. You check the claims you amended, maybe glance at the dependent claims, and file. If you introduced a new error in a claim you didn't think you touched — because you changed its parent — you won't catch it until the examiner does.

## Automated Checking

This is one of the areas where AI genuinely outperforms manual work. Not because it's smarter, but because it doesn't get tired and it checks everything.

A good automated checker runs every claim through multiple validators:

**Antecedent check** — traces every "the X" and "said X" back through the claim dependency chain to find a matching "a X" or "an X." If it doesn't find one, it flags it.

**Pronoun check** — flags any use of "it," "its," "they," "their," or "them" in claim language. These are almost never acceptable in claims.

**Reintroduction check** — identifies when a dependent claim uses "a X" for an element that was already introduced in a parent claim. Suggests changing to "the X."

**Prepositional scope check** — flags phrases where a prepositional attachment is ambiguous and could be read as modifying the wrong element.

The point isn't that these errors are hard to understand. Any patent attorney knows what antecedent basis is. The point is that checking for them across 20+ claims after multiple rounds of amendment is tedious enough that things slip through. A tool that does it instantly, every time, before you file — that's worth having in your workflow.

## When to Check

The most valuable time to run an antecedent basis check is right after amending claims in response to an Office Action. That's when you're most likely to have introduced new errors — you were focused on substantive changes and may not have traced every downstream reference.

It's also useful during initial drafting, especially for large claim sets or when multiple people contribute to the claims. And before filing any continuation or divisional, since those often involve reworking claims from a parent application.

This is the kind of mechanical checking that should be automated out of your workflow entirely. Whether you build your own script or use a tool that does it for you, the goal is the same: never burn a round of prosecution on an error you could have caught in seconds.
