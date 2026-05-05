from datetime import date, timedelta
from typing import List, Tuple

def compute_business_status(
    business, 
    docs: List,
    members_raw: List = None, # Expecting list of (BusinessMember, User) or similar
    owner: any = None,
    authorized_person: any = None,
    manager: any = None
) -> Tuple[str, List[dict]]:
    """
    Computes the compliance status of a business with severity-coded reasons.
    Returns (status, List[{type, message, severity}])
    """
    today = date.today()
    reasons = []
    
    grace_period = timedelta(days=30)
    expiring_soon_period = timedelta(days=60)
    
    # 1. CR CHECK (Business CR)
    if business.cr_expiry < today:
        reasons.append({
            "type": "CR_INVALID",
            "message": f"Commercial Registration (CR) expired on {business.cr_expiry.isoformat()}",
            "severity": "HIGH"
        })

    # 2. DOCUMENT CHECK
    required_doc_types = [
        "Authorization Letter",
        "Commercial License",
        "Establishment Card",
        "Authorized Signatures",
        "Manager Trade License"
    ]
    
    # If Company Owner, add specific required doc
    if business.owner_type == 'COMPANY':
        required_doc_types.append("Owner Corporate CR")
        
    present_docs = {doc.document_type: doc for doc in docs}
    
    for doc_type in required_doc_types:
        doc = present_docs.get(doc_type)
        if not doc:
            # Different severity for different documents based on user instructions
            severity = "HIGH"
            if doc_type in ["Authorization Letter", "Authorized Signatures"]:
                severity = "MEDIUM"
                
            reasons.append({
                "type": "DOC_MISSING",
                "message": f"Missing required document: {doc_type}",
                "severity": severity
            })
        elif doc.expiry_date:
            if doc.expiry_date < today:
                severity = "HIGH" if (today - doc.expiry_date) > grace_period else "MEDIUM"
                reasons.append({
                    "type": "DOC_EXPIRED",
                    "message": f"Expired document: {doc_type} (expired on {doc.expiry_date.isoformat()})",
                    "severity": severity
                })
            elif doc.expiry_date <= today + expiring_soon_period:
                reasons.append({
                    "type": "DOC_EXPIRING",
                    "message": f"Document expiring soon: {doc_type} ({doc.expiry_date.isoformat()})",
                    "severity": "LOW"
                })

    # 3. PEOPLE CHECK (All linked members)
    check_list = []
    
    # helper to get attribute safely from potentially a Row or Object
    def get_attr(obj, attr, default=None):
        if hasattr(obj, attr):
            return getattr(obj, attr)
        try:
            return obj[attr]
        except:
            return default

    if members_raw:
        for m in members_raw:
            # m could be (BusinessMember, User) or a Row with those
            user = None
            role = "MEMBER"
            
            if hasattr(m, "User"):
                user = m.User
            elif isinstance(m, (list, tuple)) and len(m) > 1:
                user = m[1]
                
            if hasattr(m, "BusinessMember"):
                role = m.BusinessMember.role
            elif isinstance(m, (list, tuple)) and len(m) > 0:
                role = m[0].role if hasattr(m[0], 'role') else "MEMBER"

            if user:
                role_labels = {
                    'OWNER': "Business Owner",
                    'MANAGER': "Manager Incharge",
                    'AUTHORIZED': "Authorized Person"
                }
                label = role_labels.get(role, str(role).title())
                
                user_employer = get_attr(user, "employer")
                if role == 'OWNER' and business.owner_type == 'COMPANY' and user_employer == business.owner_company_name:
                    label = "Representative (Owner)"
                check_list.append((user, label))
    else:
        # Fallback to legacy objects
        if owner: check_list.append((owner, "Business Owner" if business.owner_type != 'COMPANY' else "Representative (Owner)"))
        if authorized_person: check_list.append((authorized_person, "Authorized Person"))
        if manager: check_list.append((manager, "Manager Incharge"))

    # Also check for missing core roles
    has_manager = any(l == "Manager Incharge" for _, l in check_list)
    has_auth = any(l == "Authorized Person" for _, l in check_list)
    has_owner = any(l in ["Business Owner", "Representative (Owner)"] for _, l in check_list)

    if not has_manager and not business.manager_id:
        reasons.append({"type": "PEOPLE_MISSING", "message": "Missing required stakeholder: Manager Incharge", "severity": "HIGH"})
    
    if not has_auth and not business.authorized_person_id:
        reasons.append({"type": "PEOPLE_MISSING", "message": "Missing required stakeholder: Authorized Person", "severity": "MEDIUM"})

    if not has_owner and not business.owner_id:
        reasons.append({"type": "PEOPLE_MISSING", "message": "Missing required stakeholder: Business Owner", "severity": "HIGH"})

    for person, display_label in check_list:
        p_expiry = get_attr(person, "expiry_date")
        p_name = get_attr(person, "name", "Unknown")
        
        if p_expiry:
            if p_expiry < today:
                severity = "HIGH" if (today - p_expiry) > grace_period else "MEDIUM"
                reasons.append({
                    "type": "PEOPLE_EXPIRED",
                    "message": f"Stakeholder ID expired: {display_label} ({p_name})",
                    "severity": severity
                })
            elif p_expiry <= today + expiring_soon_period:
                reasons.append({
                    "type": "PEOPLE_EXPIRING",
                    "message": f"Stakeholder ID expiring soon: {display_label} ({p_name})",
                    "severity": "LOW"
                })

    # Final Status Determination
    if any(r["severity"] == "HIGH" for r in reasons):
        return "NON_COMPLIANT", reasons
    if any(r["severity"] == "MEDIUM" for r in reasons):
        return "PARTIAL", reasons
    if any(r["severity"] == "LOW" for r in reasons):
        return "WARNING", reasons
        
    return "COMPLIANT", []
