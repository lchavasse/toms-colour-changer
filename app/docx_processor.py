"""Process .docx files in-memory, changing text color using HSL matching."""

import io
from docx import Document
from docx.oxml.ns import qn
from docx.shared import RGBColor

from app.color_utils import is_color_match_hsl


def process_element(
    element,
    from_rgb: tuple[int, int, int],
    to_rgb: tuple[int, int, int],
    hue_tolerance: float,
    min_saturation: float,
) -> int:
    """
    Find all <w:color> elements within an XML element and replace matching ones.
    Returns the number of changes made.
    """
    changes = 0
    to_hex = f'{to_rgb[0]:02X}{to_rgb[1]:02X}{to_rgb[2]:02X}'

    for color_elem in element.findall('.//' + qn('w:color')):
        val = color_elem.get(qn('w:val'), '')
        if val.upper() in ('AUTO', 'NONE', ''):
            continue
        if is_color_match_hsl(val, from_rgb, hue_tolerance, min_saturation):
            color_elem.set(qn('w:val'), to_hex)
            changes += 1

    return changes


def process_document_stream(
    input_stream: io.BytesIO,
    from_rgb: tuple[int, int, int],
    to_rgb: tuple[int, int, int],
    hue_tolerance: float,
    min_saturation: float,
) -> tuple[io.BytesIO, int]:
    """
    Read a .docx from input_stream, change matching colors, return modified
    document as a BytesIO along with the total number of changes made.
    """
    doc = Document(input_stream)
    total_changes = 0

    # Body (paragraphs, tables, text boxes, shapes, etc.)
    total_changes += process_element(doc.element.body, from_rgb, to_rgb, hue_tolerance, min_saturation)

    # Headers and footers for every section
    for section in doc.sections:
        for hf in [
            section.header,
            section.footer,
            section.even_page_header,
            section.even_page_footer,
            section.first_page_header,
            section.first_page_footer,
        ]:
            if hf is not None:
                total_changes += process_element(hf._element, from_rgb, to_rgb, hue_tolerance, min_saturation)

    output = io.BytesIO()
    doc.save(output)
    output.seek(0)
    return output, total_changes
