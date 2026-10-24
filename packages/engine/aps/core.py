import copy, csv, hashlib, json
from datetime import datetime, timezone
from pathlib import Path
from jsonschema import Draft202012Validator
ROOT = Path(__file__).resolve().parents[3]
RULES = {'NO': ('Output or required action absent', 'Downstream worker acts without required input', 'Fail closed on missing messages and require completion receipts'), 'MORE': ('Quantity, frequency, or authority exceeds intended bounds', 'Excess spend or duplicate work propagates', 'Enforce quantity ceilings, quotas, and idempotency keys'), 'LESS': ('Quantity, evidence, or resource allocation falls below intent', 'Undersupply or insufficient validation reaches execution', 'Validate lower bounds and completeness'), 'REVERSE': ('Command polarity or communication direction is inverted', 'Cancellation becomes placement or recipient becomes sender', 'Use typed commands and verify sender and receiver'), 'AS_WELL_AS': ('Unrequested action accompanies legitimate output', 'Additional orders or data disclosures occur', 'Reject unknown fields and enforce capability allowlists'), 'OTHER_THAN': ('Wrong identity, item, tool, or supplier is substituted', 'Execution targets an unintended counterparty or item', 'Bind identities and item specifications to approvals'), 'EARLY': ('Action occurs before required data is mature', 'Provisional forecast or quote drives premature commitment', 'Gate on readiness and finalized evidence'), 'LATE': ('Action exceeds validity or completion deadline', 'Expired price or obsolete demand drives procurement', 'Apply deadlines, expiry checks, and escalation'), 'BEFORE': ('A dependent step precedes its prerequisite', 'Purchase proceeds before finance authorization', 'Enforce prerequisite state transitions'), 'AFTER': ('Prerequisite executes after the action it should gate', 'Reconciliation arrives too late to prevent excess orders', 'Enforce ordering and transactional preconditions'), 'GOAL_DRIFT': ('Agent objective shifts from declared purpose', 'Local reward optimization undermines procurement intent', 'Constrain objective changes and review goal conformance'), 'AUTHORITY_ESCALATION': ('Worker acquires undelegated capabilities', 'Agent bypasses approval or accesses privileged state', 'Check scoped capabilities at every tool boundary'), 'RECURSIVE_DELEGATION': ('Delegation repeats or deepens without termination', 'Resource exhaustion prevents timely procurement', 'Bound depth, detect cycles, and enforce execution budgets'), 'CONTEXT_CONTAMINATION': ('Untrusted supplier text becomes control instructions', 'Injected instructions alter downstream approval context', 'Keep external content isolated as typed data'), 'CONFLICTING_OBJECTIVES': ('Local cost, availability, and budget goals conflict', 'Agents oscillate or choose an unacceptable compromise', 'Define goal precedence and escalate unresolved conflicts'), 'STATE_DIVERGENCE': ('Workers consume incompatible shared-state versions', 'Approval and execution disagree on price or quantity', 'Use compare-and-swap and bind authorization to immutable inputs')}
WORDS = ['NO', 'MORE', 'LESS', 'REVERSE', 'AS_WELL_AS', 'OTHER_THAN', 'EARLY', 'LATE', 'BEFORE', 'AFTER', 'GOAL_DRIFT', 'AUTHORITY_ESCALATION', 'RECURSIVE_DELEGATION', 'CONTEXT_CONTAMINATION', 'CONFLICTING_OBJECTIVES', 'STATE_DIVERGENCE']
def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
def validate(kind, value):
    schema = json.loads((ROOT / "schemas" / (kind + ".schema.json")).read_text())
    Draft202012Validator(schema).validate(value)
    if kind == "topology":
        names = [n["id"] for n in value["nodes"]]
        if len(names) != len(set(names)): raise ValueError("Duplicate node identity")
        if value["shared_state"]["owner"] not in names: raise ValueError("Unknown state owner")
        if any(e[k] not in names for e in value["communications"] for k in ("source", "target")): raise ValueError("Dangling communication")
    if kind == "hazard": check_review(value)
    if kind == "report":
        hazards = {h["id"]: h for h in value["hazards"]}
        if len(hazards) != len(value["hazards"]): raise ValueError("Duplicate hazard identity")
        for h in hazards.values(): check_review(h)
        expected = sorted(h["id"] for h in hazards.values() if h["review_state"] == "approved_requirement")
        if sorted(value["requirements"]) != expected: raise ValueError("Requirements must derive from approved findings")
        if any(c["hazard_id"] not in hazards for c in value["cascades"]): raise ValueError("Unknown cascade hazard")
    return value

def check_review(h):
    state = "unverified"
    assessment = (None, None, "undecided")
    for e in h["review_history"]:
        action = e["action"]
        allowed = {"accept": ["unverified"], "reject": ["unverified", "accepted", "assessed"], "assess": ["accepted", "assessed"], "approve_requirement": ["assessed"]}
        if state not in allowed[action]: raise ValueError("Invalid review history")
        if action == "assess": assessment = (e["severity"], e["likelihood"], e["residual_risk"])
        if tuple(e[k] for k in ("severity", "likelihood", "residual_risk")) != assessment: raise ValueError("Audit assessment mismatch")
        state = {"accept":"accepted", "reject":"rejected", "assess":"assessed", "approve_requirement":"approved_requirement"}[action]
    if tuple(h[k] for k in ("severity", "likelihood", "residual_risk")) != assessment: raise ValueError("Risk fields lack matching human assessment")
    if state != h["review_state"]: raise ValueError("Review state lacks human attestation")
    if state in ("assessed", "approved_requirement") and (h["severity"] is None or h["likelihood"] is None or h["residual_risk"] == "undecided"): raise ValueError("Risk assessment required")
    if state == "approved_requirement" and h["residual_risk"] != "acceptable": raise ValueError("Residual risk must be accepted")

def analyze(topology, scenarios):
    validate("topology", topology); validate("scenarios", scenarios)
    names = {n["id"] for n in topology["nodes"]}
    if len({s["id"] for s in scenarios}) != len(scenarios): raise ValueError("Duplicate scenario identity")
    if any(s["node"] not in names for s in scenarios): raise ValueError("Unknown scenario node")
    hazards = {}
    for node in topology["nodes"]:
        for word in WORDS:
            matches = [s for s in scenarios if s["node"] == node["id"] and s["deviation"] == word]
            s = matches[0] if matches else {"id":"RULE-"+word, "cause":RULES[word][0]+": "+node["objective"], "consequence":RULES[word][1], "control":RULES[word][2]}
            identity = {"topology":topology["id"], "node":node["id"], "intent":node["objective"], "deviation":word}
            h = {"id":"APS-"+digest(identity)[:20], "node":node["id"], "intent":node["objective"], "deviation":word, "causes":[s["cause"]], "consequences":[s["consequence"]], "safeguards":["Declared constraint: "+x for x in node["constraints"]], "candidate_controls":[s["control"]], "assumptions":["Declared safeguards are not independently verified", "Graph reachability indicates possible propagation, not probability"], "provenance":{"generator":"aps-rule-engine/1.0", "source_kind":"ai_generated", "topology_sha256":digest(topology), "rule_version":"1.0", "scenario_id":s["id"]}, "review_state":"unverified", "severity":None, "likelihood":None, "residual_risk":"undecided", "review_history":[]}
            hazards[h["id"]] = h
    cascades = []
    adjacency = {n: sorted({e["target"] for e in topology["communications"] if e["source"] == n}) for n in names}
    for h in hazards.values():
        queue = [[h["node"]]]; seen = {h["node"]}
        while queue:
            path = queue.pop(0)
            for target in adjacency[path[-1]]:
                if target not in seen:
                    seen.add(target); new = path+[target]; queue.append(new)
                    cascades.append({"hazard_id":h["id"], "path":new, "effect":"Possible downstream consumption of deviated output"})
    cascades.sort(key=lambda c:(c["hazard_id"], c["path"]))
    return validate("report", {"schema_version":"1.0", "topology_id":topology["id"], "hazards":sorted(hazards.values(), key=lambda h:h["id"]), "cascades":cascades, "requirements":[]})

def review(report, hazard_id, action, actor, reason, human=False, severity=None, likelihood=None, residual_risk=None):
    validate("report", report)
    if not human or not actor.strip() or not reason.strip(): raise ValueError("Explicit human identity, attestation and rationale required")
    result = copy.deepcopy(report)
    h = next((h for h in result["hazards"] if h["id"] == hazard_id), None)
    if h is None: raise ValueError("Unknown hazard")
    if action == "assess":
        h.update(severity=severity, likelihood=likelihood, residual_risk=residual_risk)
    h["review_history"].append({"actor":actor, "human_attested":True, "action":action, "reason":reason, "at":datetime.now(timezone.utc).isoformat(), **{k:h[k] for k in ("severity", "likelihood", "residual_risk")}})
    h["review_state"] = {"accept":"accepted", "reject":"rejected", "assess":"assessed", "approve_requirement":"approved_requirement"}[action]
    result["requirements"] = sorted(x["id"] for x in result["hazards"] if x["review_state"] == "approved_requirement")
    return validate("report", result)

def export_csv(report, path):
    validate("report", report)
    fields = list(json.loads((ROOT/"schemas/hazard.schema.json").read_text())["properties"])
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields); writer.writeheader()
        for h in report["hazards"]:
            writer.writerow({k:json.dumps(v, sort_keys=True) if isinstance(v,(list,dict)) or v is None else ("'"+v if isinstance(v,str) and v[:1] in "=+-@" else v) for k,v in h.items()})

def deduplicate(report):
    """Collapse byte-equivalent hazards; reject conflicting records with the same ID."""
    result = copy.deepcopy(report)
    unique = {}
    for hazard in result["hazards"]:
        key = hazard["id"]
        if key in unique and unique[key] != hazard:
            raise ValueError("Conflicting hazard records: " + key)
        unique[key] = hazard
    result["hazards"] = sorted(unique.values(), key=lambda h:h["id"])
    return validate("report", result)
