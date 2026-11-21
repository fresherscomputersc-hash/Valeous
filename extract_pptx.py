from pptx import Presentation
from pptx.util import Emu
p = r"C:\Users\ASUS\Downloads\VALUEOUS_Tech_Team_Product_Guide.pptx"
prs = Presentation(p)
print("Slides:", len(prs.slides))
for i, slide in enumerate(prs.slides, 1):
    print("\n" + "="*80)
    print(f"SLIDE {i}")
    print("="*80)
    for shape in slide.shapes:
        if shape.has_text_frame:
            text = shape.text_frame.text.strip()
            if text:
                print(text)
        if shape.shape_type == 13:  # picture
            print("[PICTURE]", shape.name)