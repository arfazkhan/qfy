from datetime import date
from typing import List
from .business_models import Business, BusinessDocument

def compute_business_status(business: Business, docs: List[BusinessDocument]) -> str:
    """
    Computes the compliance status of a business based on CR expiry,
    document presence, and linked identity validity.
    """
    today = date.today()
    
    # Tier 1: INVALID - CR Expired
    if business.cr_expiry < today:
        return "INVALID"
    
    # Extract doc types for easier checking
    present_docs = {doc.document_type: doc for doc in docs}
    
    # Critical Docs (must have and must be valid)
    critical_docs = ["Commercial License", "Authorization Letter"]
    
    # Tier 2: NON_COMPLIANT 
    # Check Owner ID (Required)
    if not business.owner_id:
        return "NON_COMPLIANT"
    
    # Note: We can't check owner.expiry_date here because 'owner' is a relationship 
    # that might not be loaded. This logic should be handled by the caller or 
    # the relationship should be joined.
    # For now, we assume the caller handles individual expiry check if needed,
    # or we can pass the owner status in.
    
    # Check Critical Document Presence and Expiry
    for doc_type in critical_docs:
        doc = present_docs.get(doc_type)
        if not doc:
            return "NON_COMPLIANT"
        if doc.expiry_date and doc.expiry_date < today:
            return "NON_COMPLIANT"
            
    # Tier 3: PARTIAL
    # Optional Docs / Linked People
    if not business.authorized_person_id:
        return "PARTIAL"
        
    optional_docs = ["Authorized Signatures", "Authorized Person"]
    for doc_type in optional_docs:
        doc = present_docs.get(doc_type)
        if not doc:
            return "PARTIAL"
        if doc.expiry_date and doc.expiry_date < today:
            return "PARTIAL"
            
    # Tier 4: COMPLIANT
    return "COMPLIANT"
