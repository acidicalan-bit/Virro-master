PACK_RULES={
"product-delivery":["acceptance criteria","dependency","edge case","definition of done","QA"],"ai-understanding":["audience","context","constraint","format","must not assume"],"handoff-intelligence":["sender","receiver","responsibility","decision","constraint"],"process-understanding":["step","role","input","output","exception","rule"],"data-request":["business question","metric","period","source","audience","decision","format"],"design-to-dev":["state","responsive","validation","behavior","edge case","asset"],"sales-to-delivery":["scope","promise","constraint","success criteria","client expectation"],"support-signal":["evidence","impact","reproduce","urgency","affected"],"knowledge-continuity":["previous decision","history","owner","document","onboarding"]}
EVENT_PACK={"ai_instruction":"ai-understanding","handoff":"handoff-intelligence","process":"process-understanding","data_request":"data-request","design_brief":"design-to-dev","sales_to_delivery":"sales-to-delivery","support_signal":"support-signal","knowledge_transfer":"knowledge-continuity"}

def analyze(text:str,event_type:str,pack_hint:str|None=None)->dict:
    lower=text.lower(); missing=[]
    checks=[("owner",["owner","responsable"]),("date",["date","fecha","deadline"]),("success criteria",["success","éxito","acceptance"]),("receiver",["receiver","receptor","para qa","para dev"]),("next action",["next","siguiente","debe"]),("constraints",["constraint","restricción","límite"]),("evidence",["evidence","evidencia","log","adjunto"]),("expected format",["format","formato"])]
    for name,terms in checks:
        if not any(term in lower for term in terms): missing.append(name)
    vague=any(word in lower.split() for word in ["algo","pronto","revisar","mejorar","sometimes"])
    if vague: missing.append("precise scope")
    pack=pack_hint or EVENT_PACK.get(event_type,"product-delivery")
    pack_missing=[item for item in PACK_RULES.get(pack,[]) if item.lower() not in lower][:3]
    missing=list(dict.fromkeys(missing+pack_missing)); score=max(5,100-len(missing)*8); risk="high" if score<40 else "medium" if score<70 else "low"
    questions=[f"What evidence or decision will validate {item}?" for item in missing[:5]]
    return {"readiness_score":score,"risk_level":risk,"missing_context":missing,"interpretation_risks":["Receiver may act on an unvalidated assumption"] if missing else [],"critical_questions":questions,"recommended_pack":pack,"next_action":f"Validate {missing[0]} before the information moves forward" if missing else "Proceed with human validation","safe_output":{"summary":"Masked operational information analyzed","readiness":score,"recommended_pack":pack}}
