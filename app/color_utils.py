"""HSL-based color matching utilities."""

import colorsys
from fastapi import HTTPException


def parse_hex_color(hex_str: str) -> tuple[int, int, int]:
    """Parse a hex color string (with or without #) to (R, G, B) ints."""
    hex_str = hex_str.strip().lstrip('#')
    if len(hex_str) != 6:
        raise HTTPException(400, f"Invalid hex color: '{hex_str}' (expected 6 hex digits)")
    try:
        r = int(hex_str[0:2], 16)
        g = int(hex_str[2:4], 16)
        b = int(hex_str[4:6], 16)
        return (r, g, b)
    except ValueError:
        raise HTTPException(400, f"Invalid hex color: '{hex_str}'")


def rgb_to_hsl(r: int, g: int, b: int) -> tuple[float, float, float]:
    """Convert RGB (0-255) to HSL (hue 0-360, saturation 0-1, lightness 0-1)."""
    rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
    # colorsys uses HLS order (hue, lightness, saturation)
    h, l, s = colorsys.rgb_to_hls(rf, gf, bf)
    return (h * 360.0, s, l)


def hue_distance(h1: float, h2: float) -> float:
    """Circular distance between two hues on the 0-360° wheel."""
    diff = abs(h1 - h2) % 360.0
    return min(diff, 360.0 - diff)


def is_color_match_hsl(
    doc_hex: str,
    target_rgb: tuple[int, int, int],
    hue_tolerance: float,
    min_saturation: float = 0.15,
) -> bool:
    """
    Check if a document color (hex string) matches the target color using HSL.

    For chromatic targets: matches if hue is within hue_tolerance degrees AND
    saturation >= min_saturation (filters out near-grey colors).

    For achromatic targets (target saturation < 0.1): falls back to lightness
    comparison using the same hue_tolerance value scaled as a lightness range.
    """
    doc_hex = doc_hex.strip().upper()
    if doc_hex in ('AUTO', 'NONE', ''):
        return False

    try:
        dr = int(doc_hex[0:2], 16)
        dg = int(doc_hex[2:4], 16)
        db = int(doc_hex[4:6], 16)
    except (ValueError, IndexError):
        return False

    doc_h, doc_s, doc_l = rgb_to_hsl(dr, dg, db)
    target_h, target_s, target_l = rgb_to_hsl(*target_rgb)

    # Achromatic target (black, white, grey): compare lightness only
    if target_s < 0.1:
        lightness_tolerance = hue_tolerance / 360.0  # scale degrees → lightness range
        return abs(doc_l - target_l) <= lightness_tolerance

    # Chromatic target: hue distance + saturation floor
    if doc_s < min_saturation:
        return False
    return hue_distance(doc_h, target_h) <= hue_tolerance
