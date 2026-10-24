# Haki Afya

Haki Afya helps people in Nairobi get the SHA cover they are entitled to: find a facility that will actually cover the care they need, check a hospital bill against SHA rules before paying, and report what really happened so the next person knows.

## People

**User**:
The person holding the phone, most often a caregiver standing at the billing desk on behalf of someone else.
_Avoid_: Customer, member

**Patient**:
The person who received care. May or may not be the User.
_Avoid_: Client

## Care and services

**Care Need**:
What the User types, in their own words, about the care they are looking for. It is never treated as medical information.
_Avoid_: Symptom, condition, complaint

**Service Category**:
One entry from a fixed list (maternity, dialysis, imaging, eye care, general outpatient, surgery, cancer care, emergency) that a Care Need maps to.
_Avoid_: Department, specialty, diagnosis

**Emergency**:
The Service Category reserved for life-threatening situations; when a Care Need maps to it, the app shows only the nearest emergency units.
_Avoid_: Urgent, critical

## SHA coverage

**Contracted Facility**:
A health facility on SHA's official list of contracted facilities.
_Avoid_: SHA hospital, approved hospital, covered hospital

**Facility Level**:
The Kenyan health facility tier (Level 2 to Level 6) that determines which SHA Tariffs apply.
_Avoid_: Tier, grade

**Benefit**:
A service included in the SHA benefit package, together with its limits.
_Avoid_: Cover, coverage, package item

**Tariff**:
The amount SHA pays a facility for a Benefit at a given Facility Level.
_Avoid_: Rate, price, fee

**Coverage Report**:
A record of what a Patient actually paid for a Service Category at a Contracted Facility.
_Avoid_: Review, rating, feedback

**Verified Report**:
A Coverage Report produced by a Bill Check, backed by a bill photo.
_Avoid_: Confirmed report

**Unverified Report**:
A Coverage Report from a plain yes/no answer, without a bill photo; it carries less weight.
_Avoid_: Self-report

**Visit**:
A record, kept only on the User's device, that they chose to go to a facility for a Service Category; it prompts the follow-up question that produces a Coverage Report.
_Avoid_: Appointment, booking, trip

**Demo Facility**:
A clearly fictional facility that carries invented Coverage Reports for demonstration; real facilities only ever show real reports.
_Avoid_: Test hospital, fake hospital

## Bill Check

**Bill**:
The itemised charges a facility presents to the User for payment.
_Avoid_: Invoice, receipt

**Line Item**:
One charge on a Bill: a description, quantity and amount.
_Avoid_: Entry, row

**Flag**:
The verdict on one Line Item: Should Be Free, Above Tariff, Payable, or Unclear. A Flag states facts and a question to ask, never an accusation.
_Avoid_: Alert, warning, error, violation

**Desk Script**:
Short wording the User can say at the billing desk to dispute Flagged Line Items.
_Avoid_: Talking points

**Complaint Draft**:
A written complaint to SHA, built from a Bill Check's Flags, for the User to send.
_Avoid_: Report (that word belongs to Coverage Report)
