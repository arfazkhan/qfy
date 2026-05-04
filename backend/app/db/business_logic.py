from datetime import date
from typing import List
from .business_models import Business, BusinessDocument

def compute_business_status(
    business: Business, 
    docs: List[BusinessDocument],
    owner: any = None,
    authorized_person: any = None,
    manager: any = None
) -> str:
    """
    Computes the compliance status of a business based on CR expiry,
    document presence, and linked identity validity (Owner, Authorized Person, Manager).
    """
    today = date.today()
    
    # LAYER 1: BUSINESS VALIDITY (CR Expiry)
    if business.cr_expiry < today:
        return "INVALID"
    
    # LAYER 2: DOCUMENT CHECK
    # Required documents per final MVP spec
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
            return "NON_COMPLIANT"
        if doc.expiry_date and doc.expiry_date < today:
            return "NON_COMPLIANT"

    # LAYER 3: LINKED PEOPLE CHECK
    people = [
        ("Owner", owner, business.owner_id),
        ("Authorized Person", authorized_person, business.authorized_person_id),
        ("Manager", manager, business.manager_id)
    ]
    
    has_warnings = False
    
    for label, person, person_id in people:
        # Check if linked
        if not person_id:
            return "NON_COMPLIANT"
            
        # If person object provided, check expiry
        if person:
            if person.expiry_date < today:
                return "NON_COMPLIANT"
            
            # Check for warnings (e.g., grace period)
            # This logic should match the frontend/backend status logic for individuals
            # For now, if it's within 30 days of expiry, we flag it.
            # Assuming person.status or similar check
            from datetime import timedelta
            if person.expiry_date <= today + timedelta(days=30):
                has_warnings = True

    if has_warnings:
        return "PARTIAL"
        
    return "COMPLIANT"
