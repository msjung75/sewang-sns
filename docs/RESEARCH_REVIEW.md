# Owner research review

The authenticated /ops screen shows collected source metadata, dates, verification limits, and three evidence-linked topic candidates. Topic selection, further research, and hold decisions are bound to the exact research snapshot hash. They do not approve a report or book a message.

Public news feed results remain unverified until original sources are checked. Search noise is retained in the evidence history but excluded from topic suggestions. A source being reachable does not establish factual accuracy. Original-author reposts are not independent corroboration. Missing publication dates and conflicting reporting periods remain visible.

The private Mac synchronizer uploads bounded source summaries when local collection changes. No source content, credentials or research snapshot is committed to this repository. Existing SNS post data and fetch schedules remain unchanged.

Owner choices are checked by the existing 15-minute assistant automation. A selected topic becomes a separate review draft after source checks; further-research requests receive research notes. Existing reports are not overwritten. Approval is still required before translation, and final sending requires separate review of the actual message, audience, cost and reservation.

Password setup is available after owner login under 비밀번호 설정·변경. First setup needs only a new 12–128 character password and confirmation. Later changes require the current password. Only a salted scrypt digest reaches private storage; rotating the password invalidates old sessions. Enter passwords directly in the form, never in chat. The password configuration endpoint is internal and cannot be accessed through the generic browser proxy.

## Publication history and overlap checks

The owner can search imported Instagram, YouTube, Naver and public weekly-report history by text, channel, date and category. The cumulative metadata archive is updated before and after the existing daily fetch; original posts.json and the cron time are preserved. The public report center supplies titles and descriptions only; PDF bodies are not indexed. Missing/deleted/uncollected material and truncated captions remain explicit coverage limits.

Candidates show deterministic trigram screening (Jaccard >=0.25), the existing category-within-14-days rule, and snapshot-bound reviewed topic-overlap notes where available. These are screening signals rather than a semantic duplication guarantee. A full-body exact match requires both an actual full body and the full_body scope flag. Photo/video reuse requires separate review.

Selecting a flagged candidate requires an explicit review checkbox plus a difference note. The BFF rechecks both source snapshot hash and publication history version, strips UI-only acknowledgement fields, and sends only the existing strict decision fields upstream. Additional research/hold remain possible without acknowledging selection. Automated report preparation must also check publication history before drafting.

Instagram case studies can be reused as attributed, dated examples in a deeper weekly report. A cross-channel match is a review opportunity, not an automatic ban. Repeating the weekly report's market-trend category is expected, so the 14-day category-only warning is not applied to target_platform=report. Reused cases never become new market statistics, sales proof, or permission to reuse photographs. The 2026-10-25 test draft remains unpublished and unapproved.
