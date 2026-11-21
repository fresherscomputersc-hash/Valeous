from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

# Remove RGBColor import as it's not available in pptx.util in this version

p = r"C:\Users\ASUS\Downloads\VALUEOUS_Tech_Team_Product_Guide.pptx"
prs = Presentation(p)

def get_fill_color(shape):
    try:
        if hasattr(shape, 'fill'):
            f = shape.fill
            if f and f.type is not None:
                if f.type == 1:  # solid
                    return str(f.fore_color.rgb)
                return f"type={f.type}"
    except Exception as e:
        return f"err:{e}"
    return None

print("Slide sizes:", prs.slide_width, prs.slide_height)
for i, slide in enumerate(prs.slides, 1):
    print(f"\n--- SLIDE {i} ---")
    # background
    try:
        bg_fill = slide.background.fill
        fc = get_fill_color(bg_fill)
        if fc:
            print("  BG:", fc)
    except:
        pass
    for shape in slide.shapes:
        # Skip connectors
        if shape.shape_type == 3:  # MSO_SHAPE_TYPE.CONNECTOR
            continue
        fc = get_fill_color(shape)
        if fc:
            print(f"  [{shape.shape_type}] {shape.name}: fill={fc}")
        if shape.has_text_frame and shape.text_frame.text.strip():
            txt = shape.text_frame.text.strip().replace('\n',' | ')
            if len(txt) > 80:
                txt = txt[:80] + "..."
            print(f"    TXT: {txt}")
print("\nDone")