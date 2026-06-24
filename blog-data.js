// ============================================================
//  BLOG DATA — edit this file to add or update posts
//
//  To add a new post:
//  1. Copy one of the objects below
//  2. Give it a unique `id` (used in the URL)
//  3. Fill in `date`, `title`, and `content` (markdown)
//  4. Push to GitHub — your site updates automatically
// ============================================================

const POSTS = [

  {
    id: "test",
    date: "2026-06-24",
    title: "Test",
    content: `
## Introduction

Start writing here.
    `
  },

  {
    id: "notes-on-industry-job-search",
    date: "2026-06-20",
    title: "Notes on the Industry Job Search",
    content: `
## Overview

After finishing my PhD, I spent several months searching for industry roles. This post collects the things I wish I had known going in — about interview types, preparation, and negotiation.

I interviewed at 11 companies over 57 total interviews, plus 46 recruiter calls and 16 post-offer conversations.

## Interview types

Industry ML interviews generally fall into a few buckets:

### General coding

Standard LeetCode-style problems. Even for research roles, many companies include at least one round. Focus on arrays, graphs, and dynamic programming.

### ML coding

Implement ML algorithms from scratch — things like k-means, a transformer attention layer, or a training loop in NumPy. Practice doing this without looking things up.

### Technical discussion

A conversation about your past work, technical choices you've made, and how you'd approach open-ended problems. These reward clarity of thought more than memorization.

### Research discussion

A deep dive into your papers with a panel of researchers. Know your own work cold — especially the parts that didn't work and what you learned from them.

## Preparation

Start earlier than you think you need to. My rough timeline:

- **8 weeks out:** Refresh fundamentals (algorithms, ML basics)
- **6 weeks out:** Start LeetCode, ~3 problems per day
- **4 weeks out:** Mock interviews with peers or paid services
- **2 weeks out:** Company-specific prep, review their papers

The single highest-leverage thing I did was mock interviews. Explaining your thinking out loud is a skill that takes practice.

## Negotiation

Negotiate. Always. Even if the first offer feels good, there is almost always room to move — especially on sign-on, equity cliff, and start date.

A few things that helped me:

- Get competing offers before negotiating. Numbers move faster with real leverage.
- Be direct about what you want and why. Recruiters respond better to specifics than vague requests.
- Equity is often more flexible than base salary.

## Concluding words

The process is exhausting but finite. Keep a spreadsheet of your pipeline, take notes after every interview, and protect your energy. You'll get through it.

Good luck — feel free to reach out if you have questions.

## Appendix: learning resources

- [Cracking the Coding Interview](https://www.crackingthecodinginterview.com/)
- [Chip Huyen's ML Interviews Book](https://huyenchip.com/ml-interviews-book/)
- LeetCode Blind 75 list
- Your own papers, read from a skeptic's perspective
    `
  },

  {
    id: "on-tokenization",
    date: "2025-11-03",
    title: "A Practical Guide to Tokenization",
    content: `
## Why tokenization matters

Tokenization is the first step in any language model pipeline, yet it's often treated as a solved problem. In practice, tokenization decisions have downstream effects on model quality, inference cost, and generalization.

## BPE and its variants

Byte-pair encoding (BPE) is the most widely used algorithm today. It starts from characters (or bytes) and iteratively merges the most frequent pair of adjacent tokens.

### Byte-level BPE

GPT-2 introduced byte-level BPE, which operates on raw bytes rather than characters. This guarantees that any string can be encoded, eliminating out-of-vocabulary issues.

### Unigram language model

An alternative to BPE is the unigram language model, used in SentencePiece. Rather than merging greedily, it starts from a large vocabulary and prunes tokens whose removal hurts a likelihood objective the least.

## Common failure modes

Tokenization causes subtle bugs that are hard to catch:

- **Number splitting:** "1024" might become ["10", "24"], making arithmetic harder
- **Inconsistent whitespace:** Leading spaces often produce different tokens than the same word mid-sentence
- **Code:** Many tokenizers are trained primarily on natural language and perform poorly on code

## What I'd do differently

If you're training a model from scratch, invest time in your tokenizer. A vocabulary size of 32k–64k is a reasonable default for English, but multilingual models often benefit from larger vocabularies.

Run ablations on tokenizer choice early — it's much harder to change later.
    `
  },

  {
    id: "hello-world",
    date: "2025-08-15",
    title: "Hello, World",
    content: `
## Starting this blog

I've been meaning to start writing for a long time. This is my attempt to actually do it.

## What I plan to write about

Mostly things related to my research: language models, tokenization, inference, and the occasional field note from the job market or academia.

Some posts will be long and technical. Others will be short observations. I'll try to write things I would have wanted to read when I was earlier in my career.

## Why now

I'm finishing my PhD, which means I have a lot of thoughts to get out of my head and onto paper. Writing is how I figure out what I actually think.

If something here is useful to you, I'd love to hear about it.
    `
  }

];
