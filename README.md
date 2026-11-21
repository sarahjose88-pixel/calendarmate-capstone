# CalendarMate: an agentic AI assistant for PMs and TPMs

CalendarMate gives ServionIQ's PMs, TPMs and senior ICs back about an hour a day. It handles their
daily briefing, scheduling, email triage, conflict checks and meeting follow-ups through a team of
AI agents built in **n8n**, running on **gpt-4.1-mini** (via OpenRouter), with every run traced
in **Langfuse**.

📄 **Full submission** (business case, design, test results, cost, program charter, reflection):
see [`docs/`](docs/).

---

## What it does

| Capability | Example request | Agent |
|---|---|---|
| Daily briefing | "What does my day look like today?" | Briefing (calls the Email agent) |
| Smart scheduling | "Schedule a 30-minute meeting with sarah@company.com tomorrow at 2pm" | Scheduler (calls the Conflict Resolver) |
| Email summaries | "Summarize my unread emails" | Email |
| Conflict resolver *(extended)* | "Do I have any conflicts this week?" | Conflict Resolver |
| Meeting follow-ups *(extended)* | "Send a follow-up for today's Acme client review. Notes: …" | Follow-Up (sends only after you approve) |
| Human approval *(optional)* | "send" / "Book 1pm instead" | Scheduler, Follow-Up |

## Architecture

```
Chat ─► Date Resolver (code) ─► Input Guardrails ─► Load History ─► Build Router Input ─► Router
                                      │ fail                                                │
                                      ▼                                                     ▼
                               Guardrail reply      Briefing ─► email_agent (tool)
                                                    Scheduler ─► conflict_resolver (tool) ─► Create event + Meet
                                                    Email
                                                    Conflicts: Get events ─► Find Overlaps (code) ─► LLM explains
                                                    Follow-Up ─► Send email (after approval)
                                                    Clarify · Out of scope
```

- **Router at the top, hierarchical delegation underneath:** most requests need one specialist; the
  Briefing and Scheduler agents call a helper agent when they need one.
- **Code for arithmetic, models for language:** dates ("next Thursday") and meeting overlaps are
  computed in code; the model never does calendar maths.
- **Guardrails:** n8n's Guardrails node (jailbreak, NSFW, harassment) runs before anything else;
  an out-of-scope route declines everything that isn't the user's own calendar or email; agents
  that read email have no tools that act; sending and inferred bookings need explicit approval.

## Repository

| Folder | Contents |
|---|---|
| `workflows/calendarmate_full.json` | The complete CalendarMate workflow (43 nodes): import into n8n |
| `workflows/calendarmate_stage1.json` | Stage 1 build (router, briefing, email), kept for reference |
| `code/` | The three code steps used in the workflow: date resolver, overlap finder, router input builder |
| `test-data/seed_test_data.gs` | Google Apps Script that fills a test calendar and inbox with the data the tests need |
| `screenshots/` | Workflow canvas, chat runs, Langfuse traces, created event, sent follow-up |
| `docs/` | Submission document (Q1–Q4) |

## Run it yourself

1. **Test account:** create a fresh Gmail account; set its calendar time zone to India Standard Time.
2. **Test data:** in [script.google.com](https://script.google.com), paste `test-data/seed_test_data.gs`,
   add the **Gmail** and **Google Calendar** advanced services, then run `seedAll`.
3. **Model + tracing:** an OpenRouter key (your own OpenAI key works via BYOK), with OpenRouter's
   Observability → Langfuse destination switched on.
4. **n8n:** import `workflows/calendarmate_full.json`, then set credentials on the model nodes
   (OpenRouter), the calendar nodes (Google Calendar, and pick the calendar in each) and the Gmail nodes.
5. Click **Open chat** and try: *"What does my day look like today?"*

No credentials are stored in this repository; n8n leaves them out of exported workflows.

## Test results

- **Baseline (T1–T12):** 11 passed, 1 partial (T5: proposed slots that weren't free).
- **Edge cases (E1–E12):** 11 passed, 1 partial (E8: missed a meeting by searching too narrow a time window).
- **Fixes found by testing and re-tested:** email completeness and counts (P5–P6), scheduler style (P7),
  exact copying of emails and dates (P8), bare weekday names resolved in code (P9).
- **Measured:** ~16 s and ~7,500 tokens for a full morning briefing; ~$0.08 per user per day.

## Known limitations and next steps

- Free time is still judged by the model → move the free-slot finder into code.
- Past deadlines are not reliably marked overdue → extract deadlines, compare in code.
- New Google accounts limit guest invitations → production needs Google Workspace accounts.
- Approval before sending is enforced by the prompt → add a deterministic approval gate.
- Guardrails occasionally block harmless off-topic requests → tune on a labelled set.
