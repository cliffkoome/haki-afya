# Demo bills

Five invented SAMPLE bills for the demo. Each one says **SAMPLE BILL - DEMO DATA** on it and comes from a
**Demo Facility** (`is_demo = true`), so no real facility is ever shown a made-up charge.

Regenerate with `python scripts/make_demo_bills.py` from `backend/`. The tables below are computed by the
real rules engine over `data/tariffs.json`, so if a Tariff changes, regenerate and re-check.

> **Caveat.** The Tariffs these bills exercise are only as good as `data/tariffs.json`. Check each rule
> against its `source_url` before the demo. `research.md` section 4.4 lists figures that conflict or could
> not be confirmed (delivery and caesarean by level, ICU, CT). These samples avoid ICU and CT on purpose.
> Gemma's read of a photo may differ from the expected result; try every bill on the live app before the pitch.

| File | Facility | Balance (KES) | Expected in question (KES) | What it shows |
|---|---|---|---|---|
| `sample-1-delivery.jpg` | Demo Hospital Kilimani (Level 4) | 25,800 | **18,280** | The headline demo: 🔴 delivery, 🟡 ward, 🟢 supplements. Matches the brief's KES 18,280 example. |
| `sample-2-fair.jpg` | Demo Health Centre Kibera (Level 3) | 2,550 | **0** | Every Line Item 🟢 and "Looks fair". Shows the app is for accuracy, not against facilities. |
| `sample-3-caesarean.jpg` | Demo County Hospital Kasarani (Level 5) | 70,750 | **50,640** | Level 5. 🔴 caesarean, 🟡 ward, 🟢 private room (excluded) and medicines. Largest amount in question. |
| `sample-4-dialysis.jpg` | Demo Renal Centre South C (Level 4) | 53,300 | **11,050** | Not maternity: 🟡 dialysis (per session) and 🟡 ambulance, with a quantity above 1. |
| `sample-5-messy-photo.jpg` | Demo Hospital Embakasi (Level 4) | 19,860 | **0** | Tilted, dim, slightly blurred photo of a receipt. ⚪ Unclear for the coded line; ward within Tariff is 🟢. Also the best bill to show the retake path if the read fails. |

## Suggested demo order

1. `sample-1-delivery.jpg`: the main story.
2. `sample-2-fair.jpg`: "Looks fair", so the room sees the app is not one-sided.
3. `sample-3-caesarean.jpg` or `sample-4-dialysis.jpg`: breadth beyond a single service.
4. `sample-5-messy-photo.jpg`: robustness, and the Unclear Flag. Keep it as the retake demo if the read fails.

## Expected results

### `sample-1-delivery.jpg`: Normal delivery, ward above Tariff

Facility: **Demo Hospital Kilimani** (`d001`, Level 4). Answers to give: registered **Yes**, referral **Neither**.

| Line Item | Qty x unit | Amount | Expected Flag | In question |
|---|---|---|---|---|
| Normal delivery package | 1 x 15,000 | 15,000 | 🔴 Should Be Free | 15,000 |
| Ward (2 days) | 2 x 5,000 | 10,000 | 🟡 Above Tariff | 3,280 |
| Multivitamin | 1 x 800 | 800 | 🟢 Payable | 0 |

Total 25,800 · SHA deduction 0 · balance 25,800 · **amount in question 18,280**.

### `sample-2-fair.jpg`: A fair bill

Facility: **Demo Health Centre Kibera** (`d002`, Level 3). Answers to give: registered **Yes**, referral **Referred**.

| Line Item | Qty x unit | Amount | Expected Flag | In question |
|---|---|---|---|---|
| Consultation | 1 x 500 | 500 | 🟢 Payable | 0 |
| Laboratory: full blood count, malaria test | 1 x 1,200 | 1,200 | 🟢 Payable | 0 |
| Pharmacy: antibiotics, pain relief | 1 x 850 | 850 | 🟢 Payable | 0 |
| Ward bed charge (2 days) | 2 x 2,240 | 4,480 | 🟢 Payable | 0 |

Total 7,030 · SHA deduction 4,480 · balance 2,550 · **amount in question 0**.

### `sample-3-caesarean.jpg`: Caesarean, ward above Tariff, private room

Facility: **Demo County Hospital Kasarani** (`d006`, Level 5). Answers to give: registered **Yes**, referral **Referred**.

| Line Item | Qty x unit | Amount | Expected Flag | In question |
|---|---|---|---|---|
| Caesarean section package | 1 x 48,000 | 48,000 | 🔴 Should Be Free | 48,000 |
| General ward (3 days) | 3 x 4,800 | 14,400 | 🟡 Above Tariff | 2,640 |
| Private room upgrade (3 days) | 3 x 2,000 | 6,000 | 🟢 Payable | 0 |
| Take-home medicines | 1 x 2,350 | 2,350 | 🟢 Payable | 0 |

Total 70,750 · SHA deduction 0 · balance 70,750 · **amount in question 50,640**.

### `sample-4-dialysis.jpg`: Dialysis sessions and ambulance above Tariff

Facility: **Demo Renal Centre South C** (`d008`, Level 4). Answers to give: registered **Yes**, referral **Referred**.

| Line Item | Qty x unit | Amount | Expected Flag | In question |
|---|---|---|---|---|
| Haemodialysis session | 3 x 13,500 | 40,500 | 🟡 Above Tariff | 8,550 |
| Nephrologist consultation | 1 x 3,000 | 3,000 | 🟢 Payable | 0 |
| Pre-dialysis laboratory panel | 1 x 2,800 | 2,800 | 🟢 Payable | 0 |
| Ambulance transfer | 1 x 7,000 | 7,000 | 🟡 Above Tariff | 2,500 |

Total 53,300 · SHA deduction 0 · balance 53,300 · **amount in question 11,050**.

### `sample-5-messy-photo.jpg`: Hard photo with an unclear line

Facility: **Demo Hospital Embakasi** (`d007`, Level 4). Answers to give: registered **Yes**, referral **Referred**.

| Line Item | Qty x unit | Amount | Expected Flag | In question |
|---|---|---|---|---|
| Ward bed charge (2 days) | 2 x 3,360 | 6,720 | 🟢 Payable | 0 |
| Misc charge (code 77B) | 1 x 9,500 | 9,500 | ⚪ Unclear | 0 |
| Doctor consultation | 1 x 2,000 | 2,000 | 🟢 Payable | 0 |
| Pharmacy | 1 x 1,640 | 1,640 | 🟢 Payable | 0 |

Total 19,860 · SHA deduction 0 · balance 19,860 · **amount in question 0**.

