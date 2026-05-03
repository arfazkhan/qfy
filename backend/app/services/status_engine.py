import os
from datetime import date, datetime
from ..schemas import IDStatus

GRACE_PERIOD_DAYS = int(os.getenv("GRACE_PERIOD_DAYS", "90"))
EXPIRY_WARNING_DAYS = int(os.getenv("EXPIRY_WARNING_DAYS", "30"))

def calculate_id_status(expiry_date: date) -> dict:
    today = date.today()
    days_diff = (expiry_date - today).days

    result = {
        "days_diff": days_diff,
        "grace_period_days": GRACE_PERIOD_DAYS,
        "is_expired": days_diff < 0,
        "days_left": max(0, days_diff),
        "days_expired": max(0, -days_diff),
        "grace_days_remaining": 0
    }

    if days_diff > EXPIRY_WARNING_DAYS:
        result["status"] = IDStatus.ACTIVE
        result["message"] = "ID is active and valid."
    elif 0 <= days_diff <= EXPIRY_WARNING_DAYS:
        result["status"] = IDStatus.EXPIRING_SOON
        result["message"] = f"ID expires in {days_diff} days."
    elif -GRACE_PERIOD_DAYS <= days_diff < 0:
        result["status"] = IDStatus.GRACE_PERIOD
        result["grace_days_remaining"] = GRACE_PERIOD_DAYS + days_diff
        result["message"] = f"ID expired {abs(days_diff)} days ago. {result['grace_days_remaining']} days of grace remaining."
    else:
        result["status"] = IDStatus.INVALID
        result["message"] = "ID is no longer valid (grace period exceeded)."
    
    return result
