import re
from dataclasses import dataclass

PATTERNS=[("JWT",re.compile(r"\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b")),("EMAIL",re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",re.I)),("URL",re.compile(r"https?://[^\s]+",re.I)),("PHONE",re.compile(r"(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)")),("API_KEY",re.compile(r"\b(?:sk|pk|api)[-_][A-Za-z0-9_-]{16,}\b",re.I)),("TOKEN",re.compile(r"\b(?:token|bearer)\s+[A-Za-z0-9._-]{12,}\b",re.I)),("PERSON",re.compile(r"\b(?:Juan|María|Maria|José|Jose|Ana|Carlos|Luis|Laura|Pedro|Sofía|Sofia|Miguel)\b",re.I))]

@dataclass
class MaskResult: masked_text: str; detected_entities: list[dict]; warnings: list[str]

class PrivacyShield:
    def mask(self, content:str, client_name:str|None=None, company_name:str|None=None)->MaskResult:
        text=content; entities=[]; counters={}
        explicit=[("CLIENT",client_name),("COMPANY",company_name)]
        for kind,value in explicit:
            if value:
                counters[kind]=counters.get(kind,0)+1; label=f"[{kind}_{counters[kind]}]"; text=re.sub(re.escape(value),label,text,flags=re.I); entities.append({"type":kind,"replacement":label})
        for kind,pattern in PATTERNS:
            def replace(match):
                counters[kind]=counters.get(kind,0)+1; label=f"[{kind}_{counters[kind]}]"; entities.append({"type":kind,"replacement":label}); return label
            text=pattern.sub(replace,text)
        return MaskResult(text,entities,["Heuristic masking requires human review; it is not a guarantee of anonymization."])

privacy_shield=PrivacyShield()
