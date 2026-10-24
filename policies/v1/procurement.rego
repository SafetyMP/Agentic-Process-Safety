package aps.procurement
import rego.v1

# Hard denials take precedence over human review. Trusted facts are assembled by the gateway.
default decision := {"decision": "deny", "reason": "default_deny"}

deny contains "identity_scope" if { not input.identity_ok }
deny contains "context_provenance" if { not input.context_ok }
deny contains "capability_scope" if { not input.capability_ok }
deny contains "delegation_depth" if { input.depth > input.config.max_depth }
deny contains "tool_allowlist" if { not input.action in input.config.allowlists[input.actor] }
deny contains "state_mismatch" if { not input.state_ok }
deny contains "prerequisite" if { not input.stage_ok }
deny contains "spending_cap" if { input.amount + input.spent > input.budget }
deny contains "spending_cap" if { input.amount + input.spent > input.config.spend_cap }
deny contains "approval_invalid" if { input.action == "purchase_mock"; not input.approval_ok }
deny contains "separation_of_duties" if { input.action == "purchase_mock"; input.approver == input.actor }
deny contains "adapter_contract" if { not input.payload_ok }

needs_review if {
    input.action in {"finance_mock", "purchase_mock"}
    input.amount > input.config.human_threshold
    not input.human_ok
}

decision := {"decision": "deny", "reason": concat(",", sort(deny))} if {
    count(deny) > 0
} else := {"decision": "review_required", "reason": "human_threshold"} if {
    needs_review
} else := {"decision": "allow", "reason": "policy_allow"} if {
    count(deny) == 0
    input.identity_ok
    input.context_ok
    input.capability_ok
    input.payload_ok
    input.state_ok
    input.stage_ok
    input.action in input.config.allowlists[input.actor]
}
