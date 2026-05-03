from datetime import date, datetime
from ..schemas import IDStatus
import os

GRACE_PERIOD_DAYS = int(os.getenv("GRACE_PERIOD_DAYS", "90"))
EXPIRY_WARNING_DAYS = int(os.getenv("EXPIRY_WARNING_DAYS", "30"))

def calculate_id_status(expiry_date: date) -> tuple[IDStatus, str]:
    today = date.today()
    days_diff = (expiry_date - today).days

    if days_diff > EXPIRY_WARNING_DAYS:
        return IDStatus.ACTIVE, "ID is active and valid."
    
    if 0 <= days_diff <= EXPIRY_WARNING_DAYS:
        return IDStatus.EXPIRING_SOON, f"ID expires in {days_diff} days."
    
    if -GRACE_PERIOD_DAYS <= days_diff < 0:
        grace_remaining = GRACE_PERIOD_DAYS + days_diff
        return IDStatus.GRACE_PERIOD, f"ID expired {abs(days_diff)} days ago. {grace_remaining} days of grace remaining."
    
    return IDStatus.INVALID, "ID is no longer valid (grace period exceeded)."
