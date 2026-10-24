"""Every user-facing string the backend produces, in English and Swahili.

Flag wording rule (document.md section 5.4): state the Tariff, the amount
charged and a question to ask. Never "illegal", "fraud" or "overcharge".
Swahili wording needs a native-speaker review before the demo.
"""

from app.models import Lang, RetakeReason

DISCLAIMER = {
    "en": "This is not legal or medical advice. Tariffs may have changed; confirm with SHA.",
    "sw": "Huu si ushauri wa kisheria wala wa kimatibabu. Viwango vya SHA huenda vimebadilika; thibitisha na SHA.",
}

_RETAKE_UNCLEAR = {
    "en": "We could not read this bill clearly. Please retake the photo flat, in good light, with the whole bill visible.",
    "sw": "Hatukuweza kusoma bili hii vizuri. Tafadhali piga picha tena bili ikiwa imelala sawa, kwenye mwanga mzuri, na bili yote ionekane.",
}

RETAKE: dict[RetakeReason, dict[str, str]] = {
    "totals_mismatch": _RETAKE_UNCLEAR,
    "low_confidence": _RETAKE_UNCLEAR,
    "not_a_bill": {
        "en": "This does not look like a hospital bill. Please take a photo of the itemised bill.",
        "sw": "Hii haionekani kuwa bili ya hospitali. Tafadhali piga picha ya bili inayoonyesha kila gharama.",
    },
    "model_error": {
        "en": "We could not check this bill right now. Please try again in a moment.",
        "sw": "Hatukuweza kukagua bili hii sasa hivi. Tafadhali jaribu tena baada ya muda mfupi.",
    },
}

UNIT = {
    "per_delivery": {"en": "per delivery", "sw": "kwa kujifungua"},
    "per_day": {"en": "per day", "sw": "kwa siku"},
    "per_session": {"en": "per session", "sw": "kwa kipindi"},
    "per_scan": {"en": "per scan", "sw": "kwa kipimo"},
    "per_trip": {"en": "per trip", "sw": "kwa safari"},
    "per_visit": {"en": "per visit", "sw": "kwa ziara"},
    "per_procedure": {"en": "per procedure", "sw": "kwa utaratibu"},
    "flat": {"en": "", "sw": ""},
}

_SOFT_REFERRAL = {
    "en": "This may be covered if you had a referral from a primary facility.",
    "sw": "Huenda hii ikalipiwa na SHA ikiwa ulipewa rufaa kutoka kituo cha msingi.",
}


def kes(amount: int) -> str:
    return f"KES {amount:,}"


def _per(amount: int, unit: str, lang: Lang) -> str:
    """'KES 3,360 per day', or just 'KES 4,500' for a flat Tariff."""
    return _join(kes(amount), UNIT[unit][lang])


def _join(*parts: str) -> str:
    return " ".join(p for p in parts if p)


_ASK_APPLIES = {"en": "Ask whether this applies to you.", "sw": "Uliza kama hili linakuhusu."}


def should_be_free(note: str, soft_referral: bool, lang: Lang) -> str:
    if soft_referral:
        return _join(note, _SOFT_REFERRAL[lang], _ASK_APPLIES[lang])
    return _join(note, {"en": "Ask why you are being charged.", "sw": "Uliza kwa nini unatozwa."}[lang])


def above_tariff(level: int, tariff: int, charged: int, unit: str, soft_referral: bool, lang: Lang) -> str:
    if lang == "sw":
        facts = (f"SHA hulipa kituo hiki cha Kiwango cha {level} {_per(tariff, unit, lang)}. "
                 f"Unatozwa {_per(charged, unit, lang)}.")
    else:
        facts = (f"SHA pays this Level {level} facility {_per(tariff, unit, lang)}. "
                 f"You are charged {_per(charged, unit, lang)}.")
    if soft_referral:
        return _join(facts, _SOFT_REFERRAL[lang], _ASK_APPLIES[lang])
    return _join(facts, {"en": "Ask why.", "sw": "Uliza kwa nini."}[lang])


def within_tariff(level: int, tariff: int, charged: int, unit: str, lang: Lang) -> str:
    if lang == "sw":
        return (f"SHA hulipa kituo hiki cha Kiwango cha {level} hadi {_per(tariff, unit, lang)}. "
                f"Unatozwa {_per(charged, unit, lang)}, ambayo haizidi kiwango cha SHA.")
    return (f"SHA pays this Level {level} facility up to {_per(tariff, unit, lang)}. "
            f"You are charged {_per(charged, unit, lang)}, which is not above the Tariff.")


NO_CHARGE = {
    "en": "There is no charge for this item.",
    "sw": "Hakuna malipo kwa gharama hii.",
}

EXCLUDED = {
    "en": "SHA Tariffs exclude this kind of item (for example a private ward, cosmetic procedures or personal comfort items), so it is payable.",
    "sw": "Viwango vya SHA havijumuishi aina hii ya gharama (kwa mfano wodi ya kibinafsi, upasuaji wa urembo au vitu vya starehe binafsi), kwa hivyo inalipwa na mgonjwa.",
}

NO_RULE = {
    "en": "We have no SHA Tariff for this item at this Facility Level in our data, so we treat it as payable. Confirm with SHA if unsure.",
    "sw": "Hatuna kiwango cha SHA cha gharama hii kwa Kiwango hiki cha kituo kwenye data yetu, kwa hivyo tunaichukulia kuwa inalipwa na mgonjwa. Thibitisha na SHA ukiwa na shaka.",
}

NOT_REGISTERED = {
    "en": "The Patient is not registered with SHA, so SHA cover does not apply to this item. You can register with SHA through the official channels listed below.",
    "sw": "Mgonjwa hajasajiliwa na SHA, kwa hivyo SHA hailipii gharama hii. Unaweza kujisajili na SHA kupitia njia rasmi zilizoorodheshwa hapa chini.",
}

UNCLEAR_READ = {
    "en": "We could not read this item clearly. Check it on the paper bill and ask the desk to explain it.",
    "sw": "Hatukuweza kusoma gharama hii vizuri. Iangalie kwenye bili na uombe maelezo kwenye dawati la malipo.",
}

UNCLEAR_OTHER = {
    "en": "We could not match this item to an SHA Benefit. Ask the desk what it is for.",
    "sw": "Hatukuweza kulinganisha gharama hii na huduma ya SHA. Uliza dawati la malipo ni ya nini.",
}

NO_BENEFIT_DATA = {
    "en": "We do not have SHA Tariff data for this service at this Facility Level yet. Confirm with SHA.",
    "sw": "Bado hatuna data ya viwango vya SHA kwa huduma hii katika Kiwango hiki cha kituo. Thibitisha na SHA.",
}

FACILITY_NOT_FOUND = "Facility not found"
RATE_LIMITED = "You already reported this facility for this service in the last 30 days."
