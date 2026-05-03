import re
from datetime import datetime, date

def validate_qid(qid: str) -> bool:
    """Validates if the QID is exactly 11 digits."""
    return bool(re.match(r"^\d{11}$", qid))

def normalize_date(date_str: str) -> date:
    """
    Normalizes various date formats into a date object.
    Supports: DD/MM/YYYY, MM/YYYY, YYYY-MM-DD
    """
    # Remove any non-alphanumeric characters except separators
    clean_date = re.sub(r"[^0-9/-]", "", date_str)
    
    formats = ["%d/%m/%Y", "%m/%Y", "%Y-%m-%d"]
    for fmt in formats:
        try:
            dt = datetime.strptime(clean_date, fmt)
            if fmt == "%m/%Y":
                # For MM/YYYY, default to the last day of the month
                import calendar
                last_day = calendar.monthrange(dt.year, dt.month)[1]
                return date(dt.year, dt.month, last_day)
            return dt.date()
        except ValueError:
            continue
    
    raise ValueError(f"Unsupported date format: {date_str}")
