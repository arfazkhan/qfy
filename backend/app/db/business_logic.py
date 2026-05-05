from datetime import date, timedelta
from typing import List, Tuple

def compute_business_status(
    business, 
    docs: List,
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
    
    # 1. CR CHECK
    if business.cr_expiry < today:
        reasons.append({
            "type": "CR_INVALID",
            "message": f"Commercial Registration (CR) expired on {business.cr_expiry.isoformat()}",
            "severity": "HIGH"
        })
        return "INVALID", reasons

    # 2. DOCUMENT CHECK
    required_doc_types = [
        "Authorization Letter",
        "Commercial License",
        "Establishment Card",
        "Authorized Signatures",
        "Manager Trade License"
    ]
    present_docs = {doc.document_type: doc for doc in docs}
    
    for doc_type in required_doc_types:
        doc = present_docs.get(doc_type)
        if not doc:
            reasons.append({
                "type": "DOC_MISSING",
                "message": f"Missing required document: {doc_type}",
                "severity": "HIGH"
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

    # 3. PEOPLE CHECK
    people = [
        ("Owner", owner, business.owner_id),
        ("Authorized Person", authorized_person, business.authorized_person_id),
        ("Manager", manager, business.manager_id)
    ]
    
    for label, person, person_id in people:
        if not person_id:
            reasons.append({
                "type": "PEOPLE_MISSING",
                "message": f"Missing linked stakeholder: {label}",
                "severity": "HIGH"
            })
        elif person:
            if person.expiry_date < today:
                severity = "HIGH" if (today - person.expiry_date) > grace_period else "MEDIUM"
                reasons.append({
                    "type": "PEOPLE_EXPIRED",
                    "message": f"Stakeholder ID expired: {label} ({person.name})",
                    "severity": severity
                })
            elif person.expiry_date <= today + expiring_soon_period:
                reasons.append({
                    "type": "PEOPLE_EXPIRING",
                    "message": f"Stakeholder ID expiring soon: {label} ({person.name})",
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
