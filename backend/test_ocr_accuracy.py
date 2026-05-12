"""
OCR Accuracy Benchmark - Tests sample images against known ground truth.
Run: python test_ocr_accuracy.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))

import asyncio
import time
import json

from app.services.ocr_service import OCRService

GROUND_TRUTH = {
    "front.png": {
        "qid_number": "29735616408",
        "name": "HIJAS KHAN AFNAZ KHAN",
        "dob": "03/03/1997",
        "expiry_date": "12/02/2029",
        "nationality": "INDIA",
        "occupation": "محاسب",
    },
    "back.png": {
        "passport_number": "C2077663",
        "passport_expiry": "03/11/2034",
        "residency_type": "عمل",
        "employer": "الفردان للصرافة",
        "qid_number": "29735616408",  # from serial
    },
    "qid.png": {
        "qid_number": "29735616408",
        "name": "HIJAS KHAN AFNAZ KHAN",
        "dob": "03/03/1997",
        "expiry_date": "12/02/2026",
        "nationality": "INDIA",
        "occupation": "محاسب",
    },
    "combined.png": {
        "qid_number": "29535622080",
        "name": "MUHAMMED NASEEF ULAYIL KODERI",
        "dob": "05/09/1995",
        "expiry_date": "30/01/2027",
        "nationality": "INDIA",
        "passport_number": "P6075402",
    },
}


def score_field(expected, actual):
    """Score a field: 1.0 = exact match, partial for substring matches."""
    if not expected:
        return 1.0  # No expectation = pass
    if not actual:
        return 0.0

    expected_clean = str(expected).strip().upper()
    actual_clean = str(actual).strip().upper()

    if expected_clean == actual_clean:
        return 1.0

    # Partial match for names (allow substring)
    if expected_clean in actual_clean or actual_clean in expected_clean:
        return 0.7

    # For dates, try normalizing
    if '/' in expected_clean and '/' in actual_clean:
        # Strip leading zeros and compare
        e_parts = [p.lstrip('0') or '0' for p in expected_clean.split('/')]
        a_parts = [p.lstrip('0') or '0' for p in actual_clean.split('/')]
        if e_parts == a_parts:
            return 0.9

    return 0.0


async def run_benchmark():
    service = OCRService()

    print("=" * 70)
    print("  OCR ACCURACY BENCHMARK")
    print("=" * 70)

    total_fields = 0
    total_score = 0.0
    total_time = 0.0

    for filename, truth in GROUND_TRUTH.items():
        filepath = os.path.join("..", filename)
        if not os.path.exists(filepath):
            print(f"\n[SKIP] {filename} not found")
            continue

        print(f"\n{'─' * 70}")
        print(f"  Testing: {filename}")
        print(f"{'─' * 70}")

        with open(filepath, "rb") as f:
            image_bytes = f.read()

        start = time.perf_counter()
        result = await service.process_image(image_bytes, return_debug_image=False)
        elapsed = time.perf_counter() - start
        total_time += elapsed

        print(f"  Time: {elapsed:.2f}s")
        print(f"  Confidence: {result.get('confidence', 0):.2%}")
        print()

        file_score = 0.0
        file_fields = 0

        for field, expected in truth.items():
            actual = result.get(field)
            score = score_field(expected, actual)
            file_score += score
            file_fields += 1
            total_score += score
            total_fields += 1

            status = "✓" if score == 1.0 else ("~" if score > 0 else "✗")
            print(f"  {status} {field:20s} | Expected: {str(expected):30s} | Got: {str(actual):30s} | {score:.0%}")

        print(f"\n  File Score: {file_score/file_fields:.0%} ({file_score:.1f}/{file_fields})")

        # Print raw text for debugging
        raw = result.get("raw_text", [])
        if raw:
            print(f"\n  Raw OCR text ({len(raw)} blocks):")
            for line in raw[:20]:
                print(f"    > {line}")

    print(f"\n{'=' * 70}")
    print(f"  OVERALL ACCURACY: {total_score/total_fields:.1%} ({total_score:.1f}/{total_fields})")
    print(f"  TOTAL TIME: {total_time:.2f}s (avg {total_time/len(GROUND_TRUTH):.2f}s per image)")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    asyncio.run(run_benchmark())
