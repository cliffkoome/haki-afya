# Haki Afya: Research and Rationale

> **The hospital knows what SHA covers. The person paying doesn't.**
> Haki Afya closes that gap at the one moment it matters: the billing desk.

*Hacktoberfest Hack Day Nairobi x B54 (MLH), 24 October 2026. Prize categories: Best Use of Gemma 4, Best Open-Source AI Project.*

This document explains **why** Haki Afya exists: the problem, the evidence behind it, the gaps in existing tools, and how each design decision answers a specific failure. For *what* to build, see [`document.md`](./document.md). For terms, see [`GLOSSARY.md`](./GLOSSARY.md).

## How to read the evidence

Every external claim here was checked against reporting or primary documents on **24 Oct 2026**, and each carries a confidence tag:

| Tag | Meaning |
|---|---|
| ✅ **Confirmed** | Seen in a primary document or in two or more independent outlets |
| 🟨 **Single source** | Reported by one outlet or one survey. Real, but treat as indicative |
| ⚠️ **Conflicting** | Sources disagree. The product must not hard-code either value until a human checks the primary document |
| ❌ **Not found** | Looked for it and could not confirm it. Do not use |

Limits of this research: several primary pages (Kenya Law, the Ministry of Health tariff PDF, some Nation articles) blocked automated retrieval, so tariff figures come from search-result extracts of those pages plus secondary reporting. **Nothing in the tariff section has yet been checked by a human against the gazetted text. That check is the single most important remaining task** (see [section 9](#9-open-verification-items-for-the-team)).

---

## Contents

1. [Executive summary](#1-executive-summary)
2. [Context: SHA in 2026](#2-context-sha-in-2026)
3. [The problem: an information gap at the moment of payment](#3-the-problem-an-information-gap-at-the-moment-of-payment)
4. [Evidence](#4-evidence)
5. [Who is affected: the caregiver at the desk](#5-who-is-affected-the-caregiver-at-the-desk)
6. [Why existing tools fail, and prior art](#6-why-existing-tools-fail-and-prior-art)
7. [How Haki Afya solves it](#7-how-haki-afya-solves-it)
8. [Trust, safety and legal considerations](#8-trust-safety-and-legal-considerations)
9. [Open verification items for the team](#9-open-verification-items-for-the-team)
10. [Status, limits and roadmap](#10-status-limits-and-roadmap)
11. [Sources](#11-sources)

---

## 1. Executive summary

**The situation.** Kenya replaced NHIF with the Social Health Authority (SHA). By August 2026 the government reported **32.3 million registered members**, though parliamentary data from July 2026 indicated only **about 5 million had paid premiums**. In the same year, SHA suspended a Nairobi hospital for charging patients for covered services, a viral patient video prompted an inquiry at Kenya's largest referral hospital, and hospitals reported long payment delays from SHA.

**The root cause is structural, not a single bad actor.** The facility knows the Tariffs, the claims process and the benefit limits. The person at the billing desk, often a stressed relative paying for someone else, knows none of it. Providers who are owed money by SHA, and who see many claims rejected, have a financial incentive to recover cost from the patient. The patient has no fast, neutral way to check.

**SHA itself tells members to do this check.** Official guidance says to confirm services are accurately listed and billed at approved SHA rates *before leaving the facility*. Nothing helps a member actually do that. Haki Afya does.

**What exists today** confirms registration, lists contracted facilities, or collects general reviews. None answers the question at the desk: *"Is this charge, on this Bill, at this facility, something I should be paying?"* We found no Kenya-specific bill-checking tool. The nearest comparable we found is a 2025 hackathon-style project in India (CleanBill) that checks bills against government rate lists.

**What Haki Afya does.** Three connected features:

| Feature | Moment | What the User gets |
|---|---|---|
| **Find** | Before care | Contracted Facilities near them that offer the Service Category they need, what SHA covers there, and what other patients actually reported paying |
| **Bill Check** | At the desk | A photo of the Bill becomes, in about 30 seconds, a Flag on every Line Item, the amount in question, a Desk Script to say aloud and a Complaint Draft for SHA |
| **Report** | After care | A one-tap follow-up that creates a Coverage Report and sharpens Find for the next patient |

**Why it can be trusted.** Gemma 4 *reads* the Bill. Plain, testable code compares each charge to an open tariff dataset and produces every Flag. Wording states facts and a question, never an accusation. Bill photos are never stored. There are no accounts.

---

## 2. Context: SHA in 2026

| Fact | Detail | Confidence |
|---|---|---|
| SHA replaced NHIF | Run through the Social Health Insurance Fund (SHIF), plus the Primary Healthcare Fund (PHCF), the Emergency, Chronic and Critical Illness Fund (ECCIF) and the Public Officers Medical Scheme Fund (POMSF) | ✅ SHA suspension letter, reported by Nation, The Star |
| Registered members | 31.2M (Treasury, June 2026); 32.3M (government, August 2026) | ✅ Multiple outlets (registration counts are government claims) |
| Paying members | About 5M of 32M+ had paid premiums by July 2026 | 🟨 Parliamentary data as reported by Kenyans.co.ke |
| Tariffs depend on Facility Level | Levels 2 to 6; per-day inpatient rates differ by level | ✅ Kenya Law tariff schedule; Ministry of Health statements |
| Care is covered at "contracted" facilities | Public, faith-based and private facilities share the same cover limits | ✅ Ministry of Health clarification |
| Entitlements are conditional | Depend on registration, referral and whether care was an emergency | ✅ Ministry statements and SHA guidance |
| Emergency care in the first 24 hours is covered even for the unregistered | Anchored on Article 43(2) of the Constitution; providers who deny or delay emergency care for payment risk de-empanelment | ✅ SHA notice; President Ruto and SHA CEO statements; Standard, Kenyans.co.ke, People Daily |
| Governance has been rocky | Auditor General (March 2025) flagged procurement of the SHA system; a Ministry of Health audit reported about KES 11 billion lost to fraud from Oct 2024 to Apr 2025, mostly at private hospitals; dozens of facilities were closed or suspended. Loss figures vary by outlet (KES 5bn, 10.6bn, 11bn); no convictions recorded as of the Wikipedia summary | 🟨 Wikipedia (itself marked "citation needed" in places) |

**Why this matters for the product.** A scheme this large, this new and this contested produces confusion. Public trust in SHA is being formed *now*, one billing desk at a time. A patient who is charged for covered care learns that the cover does not work. The cost is financial, and it is also a risk to the whole scheme's credibility.

---

## 3. The problem: an information gap at the moment of payment

### 3.1 The shape of the problem

```
         WHAT THE FACILITY KNOWS                   WHAT THE USER KNOWS
         ─────────────────────────                 ───────────────────
         SHA Tariff for each service               "I'm registered."
         Which items are covered / capped          "They want KES 25,800."
         Claim status and rejection risk           "I need to take the patient home."
         How the Bill was built
                        └──────────── GAP ────────────┘
                     The decision to pay happens here.
```

At the billing desk three things are true at once:

- **Time pressure.** The Patient is being discharged, or the family has waited for hours.
- **Emotional pressure.** The User is a caregiver, often tired or frightened, rarely in a position to argue.
- **Asymmetric knowledge.** No one at the desk is obliged to explain the Tariff, and the User has nothing to check against.

The rational response is to pay. The complaint comes later, if at all, and by then the money is gone.

### 3.2 Five pain points

| # | Pain point | What it looks like | Consequence |
|---|---|---|---|
| 1 | **No way to check a charge in real time** | A caregiver is handed a multi-line Bill and cannot tell which lines SHA covers, which are capped, and which are legitimately payable | They pay, or argue without facts |
| 2 | **Rules are tiered and conditional** | Per-day caps that differ by Facility Level; rules that depend on referral; an emergency window open to everyone | Even an informed person cannot hold this in their head |
| 3 | **"Contracted" does not mean "nothing to pay"** | A facility can be on the official list and still ask patients to pay | The official list gives false reassurance when choosing where to go |
| 4 | **Complaints arrive after the money is spent** | The main escape valve is public posting, or a complaint to SHA once the damage is done | Remedy is slow, uncertain and often public |
| 5 | **Language friction** | Tariffs and benefit rules are published as formal English legal text. The User at the desk may think in Swahili | The information exists in principle and is unusable in practice |

### 3.3 Why this is hard to fix from the policy side alone

Faster claims payment and stronger enforcement are the long-term answer, and are outside the reach of a hackathon team. A patient cannot wait for reform. They need something for the next hour. That is the gap Haki Afya targets: **not replacing accountability, but giving the individual enough information to ask the right question before paying.**

---

## 4. Evidence

### 4.1 A regulator acted on it: MP Shah Hospital, June 2026 ✅

- SHA suspended **M.P. Shah Hospital** from its provider panel, effective **23 June 2026**, for **90 days pending investigation**. Reported by Nation, The Star, The Standard, Techweez and others, and SHA published a statement.
- The suspension letter (signed by SHA CEO Dr Mercy Mwangangi) cites "numerous complaints from beneficiaries" and says beneficiaries "have been required to make out-of-pocket payments for services that are fully covered."
- One cited complaint: a patient (named in the letter as Baby Thompson) was charged **KES 83,308 on 3 May 2026** for services that should have been covered by SHIF.
- The letter also cites **underbilling** of SHA's liability in other cases, which shifts cost onto patients. The problem has two faces: charging patients for covered items, and billing patterns that leave patients exposed.
- Patients already admitted continued to receive care. New patients were directed to other contracted facilities, with SHA's line **147** for referrals.
- The hospital said it would cooperate with the investigation and run an internal review.

> **Fairness note.** This was a *suspension pending investigation*, and the hospital has responded. Haki Afya does not claim any facility is guilty of anything. It gives each patient what they need to ask a question.

### 4.2 The largest public hospital: KNH, October 2026 🟨

- A patient's viral video alleged substandard care, missing test results and difficulty obtaining services under SHA at **Kenyatta National Hospital**. She said she spent **nearly KES 150,000** (including KES 45,000 at an external facility for imaging, KES 15,000 to send tissue samples to an external lab, and KES 1,500 for an ultrasound).
- On **18 October 2026**, KNH CEO Dr Richard Lesiyampe said management had opened a formal inquiry. KNH did not confirm or deny the individual claims, and invited the patient and family to a resolution meeting.
- **Treat these as allegations.** The reporting is one patient's account. The relevant point for this project is not who is right, but that **a patient had no structured way to find out what she should and should not have been paying**, and the route to being heard was a viral video.

### 4.3 The incentive structure: payment delays and rejections 🟨 / ✅

| Claim | Source | Confidence |
|---|---|---|
| Hospitals owed about **KES 35 billion** in arrears (RUPHA, the private-hospital association), with SHA freezing payments after rejecting claims "with no feedback" | Nation | ✅ Direct quote from the association's chair; another outlet cites a higher KES 76 billion figure, so the arrears amount is ⚠️ unreconciled |
| Initial claim rejection rate of **38.6%** under SHA in 2026, versus 12.4% under NHIF in 2023, across **42 public, faith-based and private facilities** | Streamline News (published 11 Sep 2026) | 🟨 One outlet's field investigation. Methodology not independently verified. Do not present it as an official statistic |
| Average claim processing time of **90 to 140 days** (versus 45 to 60 days under NHIF) | Streamline News | 🟨 Same caveat |
| Private and mission hospitals demanding **advance payments of KES 30,000 to 150,000** before some admissions | Streamline News | 🟨 Same caveat |
| RUPHA surveys: a December 2024 survey found 58% of facilities had received no payment on their claims; another found out-of-pocket payment affecting about 5 in 10 patients at faith-based and private facilities versus 2 in 10 at public hospitals | Capital FM, Citizen Digital, RUPHA | ✅ Reported by multiple outlets (older, 2024 to 2025) |
| Hospitals publicly refusing SHA payout terms ("We will not sign") | Nation | ✅ Headline and reporting confirmed; details not retrievable |

**How to read this fairly.** These figures describe *why a facility might push cost onto a patient*. They are not findings about any specific hospital. Any facility-level conclusion should come only from Coverage Reports collected by the app, shown as patterns, with Verified and Unverified counts separate.

### 4.4 What the tariffs actually say: verified, conflicting, and not found

This is where the research changed the plan most. Tariff figures matter because **every Flag is only as good as its rule**.

| Rule in the starter brief | What we found | Confidence |
|---|---|---|
| **Inpatient per-day rates: L4 3,360, L5 3,920, L6 4,480** | L4 KES 3,360 appears in the Kenya Law tariff schedule and in a Ministry of Health clarification. L5 and L6 appear in the same Ministry statement (one outlet printed L5 as 3,900, likely a typo) | ✅ L4. 🟨 L5 and L6 (verify the exact figure in the gazetted schedule) |
| **Normal delivery KES 10,000; caesarean KES 30,000, Levels 2 to 6** | Sources **conflict**. One Ministry-linked document and several explainers give **11,200 (normal) and 32,600 (caesarean)**, at least for Levels 4 to 6. Other sources cite **10,000 and 30,000** for Levels 2 to 3, attributing it to a "Legal Notice No. 78 of 2026". We could not find the legal notice text | ⚠️ **Conflicting.** The brief's "Levels 2 to 6 at 10,000 / 30,000" is probably wrong for Levels 4 to 6 |
| **ICU / HDU 28,000 per day, up to 12 days** | We could not find this. Ministry reporting on ICU and HDU describes a **per-diem rate by level (about 3,360 / 3,900 or 3,920 / 4,480)**, with household access limited to 180 days a year | ❌ **Not found, and probably wrong.** Do not ship this rule until verified |
| **Haemodialysis KES 10,650 per session, max 2 a week** | The 10,650 per-session figure appears in secondary sources. The weekly limit was not confirmed | 🟨 Amount. ❌ Limit |
| **MRI 11,000, CT 6,900** | An older article about *proposed* tariffs lists MRI at 11,000 and **CT at 9,600** (CT angio 8,000, fluoroscopy 4,000). CT 6,900 was not found | 🟨 MRI (proposed rate). ⚠️ CT conflicts |
| **Ambulance up to 25 km, KES 4,500** | Reported as a cap of KES 4,500 for evacuation within 25 km. SHA has also said it will cover the full cost of the ambulance under the emergency fund | 🟨 Amount. ⚠️ May have changed |
| **Emergency care free for the first 24 hours, registered or not** | Confirmed through SHA's directive, the Constitution (Article 43(2)), and statements by the President and SHA CEO | ✅ |
| **Tariffs may be revised** | The Ministry has said a review committee is being set up under the Social Health Insurance Regulations | ✅ So every result needs a "confirm with SHA" disclaimer |

**Takeaway:** the design rule "never invent data, cite a source for every rule" is not abstract. Four of the eight starter rules turned out to be unconfirmed or conflicting on the first outside check. A tool that shipped those numbers confidently would give wrong Flags to real people. This is exactly why Flags come from a human-verified dataset, and why every rule row carries a `source_url`.

### 4.5 SHA contact channels 🟨

Secondary sources (Kenyans.co.ke, Capital FM, SHA-linked guides) list: toll-free **147** (also **0800 720 601**), **complaints@sha.go.ke**, a 24-hour call centre set up in 2025, and in-person complaint handling at SHA's Upper Hill headquarters and branch offices. These must be **copied by a person from sha.go.ke** into `data/sha_contacts.json` before use. None of it should come from this document.

---

## 5. Who is affected: the caregiver at the desk

**Primary User:** the person at the billing desk, most often a **caregiver** (parent, spouse, adult child) paying for someone else.

| Trait | Design response |
|---|---|
| Stressed, short of time | Every screen usable one-handed in under 10 seconds; main action visible without scrolling |
| On a phone, often with limited data | Mobile-first PWA, no app-store install, client-side image downscaling to about 1,600 px |
| May think in Swahili | English and Swahili toggle on every user-facing string and every AI output |
| Not an insurance expert | Plain wording, only two one-tap questions |
| Has no leverage at the desk | A short **Desk Script** to say aloud, so they have words as well as doubts |
| Wary of being tracked | No accounts, anonymous device ID, Bill photos never stored |
| Might be in a real emergency | Emergency keywords are checked in code before any AI call and replace the whole flow with one instruction and the nearest emergency units |

**Reach.** The Communications Authority of Kenya reported smartphone penetration of about **85%** as of September 2025 (a penetration measure that includes multiple connections per person, so it overstates unique users), and **60.2 million mobile data subscriptions**, with **84.8%** of mobile broadband users on 4G. A camera-based web app is realistic for a large share of Kenyan caregivers. Smartphone access is still not universal, which is why WhatsApp and USSD are on the roadmap.

**Scope for the hackathon:** Nairobi only; English and Swahili (no Sheng).

---

## 6. Why existing tools fail, and prior art

| Existing tool | What it does well | The gap | Why |
|---|---|---|---|
| **SHA portal / USSD (*147#)** | Confirms registration; USSD is also a route to report malpractice or service denial | Cannot say whether *this charge on this Bill* is allowed | Registration and reporting tool. It has no view of the Bill and no tariff checker |
| **SHA contracted-facility list** | Lists Contracted Facilities | Does not say which services a facility offers in practice, or whether patients actually paid | It is a contract register, not a patient-experience record |
| **SHA's advice to "review your bill before leaving"** | Correct instruction | No tool to do it | Guidance, not software |
| **Google reviews** | General quality at scale | Nothing structured about SHA cover; mixes cleanliness, wait times and billing | Unstructured, not tied to a Service Category or amount |
| **Complaining on X / viral video** | Public pressure, and sometimes real action (see 4.1, 4.2) | Arrives after payment; luck-based | Retrospective by nature |
| **Asking the billing desk** | Direct | The person you ask is the person being questioned | Conflict of interest, no reference to verify against |
| **CarePay / M-Tiba** | Helps patients *pay* bills | Does not check whether the bill is correct | A payment tool, not an audit tool |

**Prior art, searched honestly.** We found **no Kenya-specific bill-checking tool**. The search was not a patent search and may have missed things. Comparable ideas exist elsewhere, which validates the approach while showing the whitespace:

| Prior art | Where | What it does | Difference |
|---|---|---|---|
| CleanBill | India (hackathon-style project, 2025) | Scan a bill, check it against government rate lists (PM-JAY, CGHS, NPPA), flag overpricing, generate a report | Closest concept. Different country, rate basis and no loop-back of patient reports |
| Hospital Price Files Finder | USA (PatientRightsAdvocate.org, 2023) | Lets users compare bills against published hospital price files | Price transparency, not insurer-coverage rules |
| Bill Sherlock | USA | Reviews an itemised bill against Medicare rates | Benchmarks price; does not apply a national insurer's coverage rules |
| General AI chatbots | Global | Users paste a bill and ask for errors (a widely reported 2025 case cut a US$195,000 bill) | No fixed rule source, no Swahili desk script, no privacy-by-design, no shared signal |

**The whitespace:** a tool that works *at the desk*, on the *specific Bill*, cites a *checkable rule*, speaks *Swahili*, and *feeds what it learns back to the next patient*. None of the above does all five.

---

## 7. How Haki Afya solves it

```
  1. FIND  (before)             2. BILL CHECK (at the desk)       3. REPORT (after)
  Care Need → Service     ──►   Photo of Bill → Flags       ──►  "Did you pay anything?"
  Category → nearby              → Desk Script                    → Coverage Report
  Contracted Facilities          → Complaint Draft                → improves FIND
          ▲                                                              │
          └───────────────── Coverage Reports loop back ─────────────────┘
```

### 7.1 Pain point to feature

| Pain point (section 3.2) | How Haki Afya answers it |
|---|---|
| 1. No way to check a charge | **Bill Check**: photo in, Flag per Line Item out, in about 30 seconds |
| 2. Rules tiered and conditional | The rules engine applies Facility Level, registration and referral/emergency answers (two one-tap questions) |
| 3. "Contracted" is not "nothing to pay" | **Coverage Reports** on each facility card, Verified and Unverified counted separately |
| 4. Complaints come too late | **Find** works before care; **Bill Check** works before paying; **Desk Script** works in the moment |
| 5. Language friction | Every string and every AI output in English and Swahili |
| Evidence trail | **Complaint Draft** addressed to SHA's official channels, with Copy and Share. Nothing is sent automatically |

### 7.2 Bill Check pipeline: AI reads, code decides

```
photo ─► [Gemma] extract + classify ─► [code] check the read ─► [code] rules ─► [Gemma] Desk Script + Complaint Draft
              JSON                         totals add up?          Flags              (English or Swahili)
                                           confidence ok?
                                           else → "retake"
```

| Step | Done by | Why |
|---|---|---|
| Extract Line Items, subtotal, SHA deduction, balance, with a category and confidence per item | **Gemma 4 vision** | Reading a photographed, possibly crumpled Bill is what a multimodal model is for, and rules cannot do it |
| Check the read: items sum to the subtotal within 1%; average confidence at least 0.6 | **Code** | A deterministic guard that catches bad reads before they become wrong Flags |
| Exactly one Flag per Line Item | **Rules engine over `data/tariffs.json`** | Auditable, unit-testable, cites a source, identical every time |
| Desk Script (3 sentences or fewer) and Complaint Draft in the User's language | **Gemma 4 text**, given only the Flags and never the image | Language generation is a model strength, and the model cannot re-decide a Flag |

**Four Flags** (wording states a fact and a question, never an accusation):

| Flag | Shown as | Trigger |
|---|---|---|
| **Should Be Free** | 🔴 | A `free` rule matches and the Patient is charged more than zero |
| **Above Tariff** | 🟡 | A `max_per_unit` rule matches and the unit price exceeds the Tariff. Amount in question = (unit price − Tariff) × quantity |
| **Payable** | 🟢 | Category `excluded` (e.g. private ward upgrade, supplements) or no rule applies |
| **Unclear** | ⚪ | Confidence below 0.6, or category `other` |

**Modifiers that keep Flags honest:**

- **Patient not registered:** only the emergency rule can apply, and only if the User said it was an emergency. This matches the verified 24-hour emergency cover (section 2). Other items are Payable and the result explains how to register.
- **No referral at Levels 4 to 6:** referral-dependent rules produce a softened message ("may be covered if you had a referral").
- **Amount in question is capped at the balance.** The app judges what the Patient is asked to pay, not what SHA already paid.

**Worked example (illustrative only).** The demo Bill uses the brief's starter figures, which section 4.4 shows are not all verified. Treat the numbers as a demonstration of the mechanism:

| Line Item | Charged | Flag | Amount in question |
|---|---|---|---|
| Normal delivery package | KES 15,000 | 🔴 Should Be Free | KES 15,000 |
| Ward, 2 days at KES 5,000 | KES 10,000 | 🟡 Above Tariff (L4 Tariff KES 3,360 per day, verified) | KES 3,280 |
| Multivitamin | KES 800 | 🟢 Payable | KES 0 |
| **Bill total** | **KES 25,800** | | **KES 18,280 in question** |

A fair Bill shows **"Looks fair ✓"**. The app is for accuracy, not against hospitals.

### 7.3 Find: choosing a facility before the problem starts

The User types a Care Need in English or Swahili, or taps one of eight Service Category chips. Emergency keywords are checked in code first. Gemma maps free text to exactly one Service Category (never a diagnosis). Results show only facilities offering that category, within 15 km, **sorted by distance only**, so no hidden blended score.

Each facility card shows: Facility Level and distance; what SHA covers for this category at this level; the **Coverage Report badge** for the last 90 days (*"4 verified · 2 unverified reports of paying for maternity"*); an optional Google rating with attribution; and **Go here**, which opens directions and saves a Visit on the device.

Find degrades gracefully: location denied → pick a Nairobi area; Gemma fails → eight chips. It never ends in a dead end.

**The insight:** the SHA list says a facility is *contracted*. Coverage Reports show whether patients *actually paid nothing* there.

### 7.4 Report: the loop that makes it better

Two or more hours after "Go here", the app asks one question: *"Did you pay anything for maternity at this facility?"*

| Answer | Result |
|---|---|
| No | Unverified Report (`paid: false`) |
| Yes + amount | Unverified Report (`paid: true`, amount) |
| Check my bill | Bill Check with the facility pre-filled → **Verified Report** backed by a Bill |
| Skip | Never asked again for this Visit |

Abuse resistance: one report per device, per facility, per Service Category, per 30 days (server-enforced); Verified and Unverified shown separately; patterns only.

**The flywheel:** every Bill Check at a listed facility creates a Verified Report; every Verified Report sharpens Find for the next patient. The accountability signal is built by patients, not asserted by us.

### 7.5 Why Gemma 4

| Need | Why Gemma 4 fits |
|---|---|
| Read a photographed paper Bill | Vision input is the core of the feature, not a bolt-on chatbot. Gemma 4's 31B model is a dense, instruction-tuned model that accepts text and images |
| Classify a Care Need in English or Swahili into a closed list | Multilingual classification into fixed categories |
| Write a short bilingual Desk Script and Complaint Draft | Controlled generation from structured input |
| Be inspectable, and later run offline | Open weights allow the roadmap goal of running Gemma locally so Bills never leave the device |

Context on the model, from third-party and model-card summaries (verify against Google's official page before quoting): Gemma 4 is an open-weight multimodal family released around **April 2026** in several sizes (reported as E2B, E4B, 12B, 26B A4B and 31B), with long context and a permissive licence reported as Apache 2.0.

**Why not let the model decide the Flag?** Because the cost of a confident mistake falls on someone else.

| If the model decided | If code decides |
|---|---|
| A hallucinated Tariff could tell a User they were wronged when they were not, or the reverse | Every Flag cites a `rule_id` and `source_url` |
| Two photos of the same Bill could produce different verdicts | Same Line Items always give the same Flags |
| Hard to audit and hard to defend | Unit-testable from fixed Line Items, no network |
| Fixing a rule means re-prompting and hoping | Fixing a rule means editing one row of `tariffs.json` |

Section 4.4 is the proof of the point: when we checked, several candidate rules turned out to be wrong, and **an editable, sourced data file is how you fix that**.

---

## 8. Trust, safety and legal considerations

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Wrong or outdated Tariff** | A wrong number gives a wrong Flag. Section 4.4 shows this is a live risk, not a theoretical one | Human verification of every rule against the gazetted schedule; `source_url` on every row; "Tariffs may have changed; confirm with SHA" on every result; review of every change to rules, Flag wording and data files |
| **Gemma misreads a Bill** | Wrong amounts give wrong Flags | Totals check, confidence threshold, retake path, **Unclear** Flag, and Gemma never makes the decision |
| **Defamation of a real hospital** | Real reputational and legal harm | Invented reports only on clearly fictional Demo Facilities (the seed script rejects anything else); patterns, never accusations; banned words ("illegal", "fraud", "overcharge") |
| **Fake or competitor-planted reports** | Could be used to smear a facility | Rate limit, Verified vs Unverified, 90-day window, pattern wording |
| **Mistaken for medical advice** | Clinical liability | Care Needs map to Service Categories only; emergency check in code first; disclaimer |
| **Privacy of Bills** | Health information is sensitive personal data under Kenya's Data Protection Act, and consent must be express, free, specific and informed | Bills processed in memory and never stored; no accounts; coordinates never stored; only anonymised results kept. Note that the Bill photo is sent to a Google-hosted model API, which the About page and consent copy should say plainly. Local Gemma is the roadmap fix |
| **Camera or location blocked** | Features unusable | HTTPS deploy; manual area picker |
| **Model slow or down** | Demo and real-use failure | 20 s timeout and graceful degradation on every call |
| **User in a real emergency** | Delay could harm | Keyword check in code before any API call; single-purpose Emergency screen with call buttons |

> **Legal caveat.** This section summarises law-firm and guidance-note sources, not the statute. Before any real-world launch beyond a hackathon demo, have a Kenyan lawyer review the Data Protection Act position (including whether registration with the Office of the Data Protection Commissioner is needed) and the defamation exposure of Coverage Report wording.

**Tone as a safety feature.** The app says "Looks fair" when a Bill is fair and uses neutral colours and words for facility patterns. That keeps it credible with facilities and regulators, which is what lets Coverage Reports have impact rather than being dismissed as a smear tool.

---

## 9. Open verification items for the team

Found during outside research. These are for **people** to resolve against primary sources. Neither Claude Code nor Gemma should fill them in.

| # | Item | Why it matters | Where to check |
|---|---|---|---|
| 1 | **Normal delivery and caesarean Tariffs by Facility Level.** 10,000 / 30,000 vs 11,200 / 32,600 | A `free` rule's Tariff figure appears in Flag text. The brief's "Levels 2 to 6 at 10,000 / 30,000" conflicts with the Ministry-linked figures for Levels 4 to 6 | Kenya Law tariff schedule (Legal Notice 56 of 2025, as consolidated to May 2026), the Gazette, and the Ministry of Health tariff PDF |
| 2 | **ICU / HDU "28,000 per day, 12 days"** | Not found anywhere. Reporting describes a per-diem by level | Same sources; if unconfirmed, remove the rule |
| 3 | **CT Tariff (6,900 vs 9,600) and MRI (11,000)** | Older article covers *proposed* rates | Same sources |
| 4 | **Haemodialysis weekly limit (2 per week)** | Amount found, limit not found | SHA benefit package |
| 5 | **Per-day inpatient rates L5 and L6** (3,920 / 4,480; one outlet printed 3,900) | Typo risk in the brief or the article | Gazetted schedule |
| 6 | **Ambulance 4,500 / 25 km vs "full cost under the emergency fund"** | May have changed with the 24-hour emergency policy | SHA notices |
| 7 | **SHA complaint channels** (147, 0800 720 601, complaints@sha.go.ke) | Secondary sources only | Copy from sha.go.ke into `sha_contacts.json` with the `source_url` |
| 8 | **Claim rejection rate (38.6%)** | Single outlet's field investigation | Do not present as official in the pitch. Say "one investigation found" and name the source |
| 9 | **Gemma 4 licence and model details** | Taken from third-party summaries | Google's official Gemma page and model card |
| 10 | **Whether `tariffs.json` is the single source of the figures in any UI, demo script and slides** | The brief's demo and the Swahili `note_sw` strings repeat figures | Search the repo for each figure once the data is verified |

**Suggested pitch wording** (accurate to what we verified): *"In June 2026 SHA suspended a Nairobi hospital after complaints that patients were charged for covered services, including one bill of KES 83,308. Hospitals report long delays getting paid by SHA, and one investigation found more than a third of claims rejected at first submission. The hospital knows what SHA covers. The person paying doesn't."*

---

## 10. Status, limits and roadmap

### 10.1 Where the build stands (24 Oct 2026)

| Area | State |
|---|---|
| **Frontend** | All planned pages built and checked headless at 390 px in English and Swahili against the mock API. Real-phone testing on the deployed URL is pending |
| **Backend** | The API contract is implemented as mock endpoints returning the example JSON. Real Gemma calls, rules engine and report storage are the next milestone |
| **Data** | `tariffs.json` holds two starter rules with empty `source_url` fields. `sha_contacts.json`, `areas.json` and `emergency_keywords.json` are empty. `facilities.csv` holds only the first Demo Facility. See section 9 |
| **Known issue** | A path-traversal weakness in the static-file route (`spa()` in `backend/app/main.py`) must be fixed before deployment: resolve the path and require it to stay inside `frontend/dist` |

### 10.2 Honest limits

- **Nairobi only,** and a small seed set of facilities.
- **Single-page Bills.** Multi-page Bills are on the roadmap.
- **Tariffs are a snapshot,** and the Ministry has said a review committee is being formed.
- **Coverage Reports start thin.** The loop is only informative with use. Until then, Demo Facilities are the only place sample reports appear, and they are labelled.
- **A Flag is a question, not a ruling.** Only SHA or the facility can resolve a dispute. The app helps the User ask well.

### 10.3 Roadmap

| Horizon | Item | Why |
|---|---|---|
| Next | Real Gemma extraction, rules engine with unit tests, real reports and ratings | Replace mocks with the real pipeline |
| Next | Verify every tariff row against the gazetted schedule; fill every `source_url` | Credibility depends on checkable sources |
| Soon | **Local Gemma (Ollama)** so Bills never leave the device | Strongest privacy story, enabled by open weights |
| Soon | WhatsApp and USSD access | Reach people without a smartphone-first flow |
| Soon | Multi-page Bills; SMS follow-up reminders | Fewer retakes; higher Report completion |
| Later | All 47 counties with automatic SHA list updates | National coverage |
| Later | Anonymised facility heatmap for journalists and SHA | Turns individual checks into system-level accountability, shared only as aggregates |

---

## 11. Sources

Retrieved or searched on 24 Oct 2026. ✅ = read directly or confirmed by multiple outlets; 🟨 = search extract or single outlet; 🔒 = page blocked automated retrieval, so figures come from search extracts.

**Enforcement and complaints**
- ✅ [MP Shah Hospital suspended from SHA (Nation)](https://nation.africa/kenya/news/mp-shah-hospital-suspended-from-sha-5507886)
- 🟨 [M.P. Shah Hospital responds to SHA suspension (The Star, 24 Jun 2026)](https://www.the-star.co.ke/news/2026-06-24-mp-shah-hospital-responds-to-sha-suspension)
- 🟨 [MP Shah: We will cooperate with SHA billing probe (The Standard)](https://www.standardmedia.co.ke/health/health-science/article/2001551234/mp-shah-we-will-cooperate-with-sha-billing-probe)
- 🟨 [SHA Statement on Temporary Suspension of M.P. Shah Hospital (PressReleaseKe)](https://pressrelease.co.ke/news/595)
- ✅ [KNH responds after viral SHA video (Nairobi Wire, 19 Oct 2026)](https://nairobiwire.com/2026/10/knh-investigates-patient-complaints-missing-test-results.html)

**Payment delays, rejections, scale**
- 🟨 [SHA digital transition: claim rejections (Streamline Feed, 11 Sep 2026)](https://streamlinefeed.co.ke/news/social-health-authority-sha-digital-transition-hospital-claims-2026)
- 🔒 [Hospitals face closure, auction over unpaid SHA claims (Nation)](https://nation.africa/kenya/health/hospitals-face-closure-auction-over-unpaid-sha-claims-lobby-warns-5343966)
- 🔒 [We will not sign: Hospitals reject SHA payout (Nation)](https://nation.africa/kenya/health/we-will-not-sign-hospitals-reject-sha-payout-5523134)
- 🔒 [Transition to SHA sparks rise in out-of-pocket costs (Nation)](https://nation.africa/kenya/health/transition-sha-sparks-rise-in-out-of-pocket-costs-for-patients-4823976)
- 🟨 [Majority of health facilities unpaid for SHA claims, RUPHA survey (Citizen Digital)](https://www.citizen.digital/news/majority-of-health-facilities-unpaid-for-sha-claims-rupha-survey-reveals-n355378)
- 🟨 [SHA payment delays plague private healthcare providers (Capital FM)](https://www.capitalfm.co.ke/business/2025/01/sha-payment-delays-plague-private-healthcare-providers-report)
- 🟨 [SHA Reaches 32.3M Members as Ksh11bn Fraud and Hospital Arrears Mount (Kenyans.co.ke)](https://www.kenyans.co.ke/news/126997-sha-reaches-323m-members-ksh11bn-fraud-and-hospital-arrears-mount)
- 🟨 [31.2 million Kenyans registered under SHA (The Star, 11 Jun 2026)](https://www.the-star.co.ke/news/2026-06-11-mbadi-312-million-kenyans-registered-under-sha)
- 🟨 [Social Health Authority Scandal (Wikipedia; contains "citation needed" sections)](https://en.wikipedia.org/wiki/Social_Health_Authority_Scandal)

**Tariffs and benefits (verify against the gazetted text)**
- 🔒 [Tariffs for Healthcare Services, Kenya Law (Legal Notice 56 of 2025, as at 8 May 2026)](https://new.kenyalaw.org/akn/ke/act/ln/2025/56/eng@2026-05-08)
- 🔒 [Ministry of Health: Tariffs to the benefit package](https://health.go.ke/sites/default/files/2024-11/TARIFFS%20TO%20THE%20BENEFIT%20PACKAGE%20TO%20THE%20SHI.pdf)
- 🔒 [SHA Tariffs 2026 RIA (Ministry of Health)](https://health.go.ke/sites/default/files/2026-04/RIA%20-SHA%20Tariffs%202026%205TH%20FEB%202026%20(1).pdf)
- ✅ [Govt clarifies SHA's benefits and tariffs after concerns (Kenyans.co.ke)](https://www.kenyans.co.ke/news/107381-govt-clarifies-shas-benefits-tariffs-after-concerns)
- 🟨 [Govt clarifies what SHA covers for patients in ICU and HDU (People Daily)](https://peopledaily.digital/news/govt-clarifies-what-sha-covers-for-patients-in-icu-and-hdu)
- 🟨 [Expectant mothers to get free delivery services in enhanced SHA package (Citizen Digital)](https://citizen.digital/article/expectant-mothers-to-get-free-delivery-services-in-enhanced-sha-package-n382577)
- 🟨 [SHA Maternity Cover Kenya 2026 (MyCyber, secondary)](https://mycyber.co.ke/sha-maternity-cover-kenya/)
- 🟨 [SHA benefits package and tariffs (MyCyber, secondary)](https://mycyber.co.ke/sha-benefits-package/)
- 🟨 [What SHA actually covers in 2026 (PayBill, secondary)](https://paybillke.com/guides/what-sha-actually-covers-kenya-2026)
- ✅ [The highs, lows and hard truths of Kenya's new health cover (Nation)](https://nation.africa/kenya/health/the-highs-lows-and-hard-truths-of-kenya-s-new-health-cover-5454816)

**Emergency cover**
- 🟨 [SHA warns hospitals against denying patients emergency care (The Standard)](https://www.standardmedia.co.ke/health-science/article/2001554436/sha-warns-hospitals-against-denying-patients-emergency-care)
- 🟨 [SHA Directs Hospitals Not to Deny Emergency Care Over Payment (Kenyans.co.ke)](https://www.kenyans.co.ke/news/125800-sha-directs-hospitals-not-deny-emergency-care-over-payment)
- 🟨 [Ruto confirms free emergency treatment for the first 24 hours (People Daily)](https://peopledaily.digital/news/ruto-confirms-free-emergency-treatment-for-accident-victims-for-the-first-24-hours/amp)

**Contacts (copy from sha.go.ke before use)**
- [SHA contracted facilities (sha.go.ke)](https://sha.go.ke/contracted-facilities/)
- 🟨 [SHA Official Contacts and Pages (Kenyans.co.ke)](https://www.kenyans.co.ke/news/114084-sha-official-contacts-and-pages)
- 🟨 [SHA sets up 24-hour call centre (Capital FM, 2025)](https://www.capitalfm.co.ke/news/2025/03/sha-sets-up-24-hour-call-center-to-provide-real-time-support/)

**Prior art and reach**
- 🟨 [CleanBill (Devfolio)](https://devfolio.co/projects/cleanbill-e762)
- 🟨 [Hospital Price Files Finder (WBRC, 2023)](https://www.wbrc.com/2023/12/16/groundbreaking-tool-empowers-patients-challenge-medical-bills/)
- 🟨 [Family uses AI to audit US$195,000 hospital bill (TechSpot)](https://www.techspot.com/news/110064-family-turns-ai-audit-195000-hospital-bill-reducing.html)
- 🟨 [Digital 2025: Kenya (DataReportal)](https://datareportal.com/reports/digital-2025-kenya)
- 🟨 [Kenya's phone penetration as of December 2025 (The Star)](https://www.the-star.co.ke/news/infographics/2026-05-07-kenyas-phone-penetration-as-of-december-2025)

**Data protection**
- 🟨 [Kenya data privacy guide (Mondaq)](https://www.mondaq.com/guides/results/20/1111/all/kenya-data-privacy)
- 🟨 [Consent as a lawful basis under Kenya's Data Protection Act (PwC Kenya)](https://www.pwc.com/ke/en/assets/pdf/consent-lawful-basis-under-kenyas-data-protection-act.pdf)
- 🟨 [Data Protection General Regulations 2021 (ODPC)](https://www.odpc.go.ke/wp-content/uploads/2024/03/THE-DATA-PROTECTION-GENERAL-REGULATIONS-2021-1.pdf)

**Technical**
- 🟨 [Gemma 4 model card (Hugging Face)](https://huggingface.co/google/gemma-4-E2B)
- [Run Gemma with the Gemini API (Google)](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api?hl=en)
- [A line-item schema for invoice extraction and the checks that catch bad reads (DEV, Damin Mutti)](https://dev.to/damin_mutti_e213ac1a11bf4/a-line-item-schema-for-invoice-extraction-and-the-checks-that-catch-bad-reads-1jn9)

---

> **Not legal or medical advice.** Haki Afya reports what a Bill says and what published SHA rules say, and suggests a question to ask. Tariffs may have changed; confirm with SHA.
