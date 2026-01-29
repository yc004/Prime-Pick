
import os
import xml.etree.ElementTree as ET
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

# Register namespaces to avoid ns0 prefixes
NS_MAP = {
    'x': "adobe:ns:meta/",
    'rdf': "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    'xmp': "http://ns.adobe.com/xap/1.0/",
    'dc': "http://purl.org/dc/elements/1.1/",
    'crs': "http://ns.adobe.com/camera-raw-settings/1.0/" # Common in LR
}

for prefix, uri in NS_MAP.items():
    ET.register_namespace(prefix, uri)

TEMPLATE = """<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/">
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>"""

class XmpWriter:
    @staticmethod
    def update_xmp(
        xmp_path: str, 
        rating: Optional[int] = None, 
        label: Optional[str] = None, 
        keywords: Optional[List[str]] = None
    ) -> bool:
        """
        Updates XMP sidecar. Returns True if file was written (changed), False otherwise.
        """
        # 1. Read or Create
        if os.path.exists(xmp_path):
            try:
                tree = ET.parse(xmp_path)
                root = tree.getroot()
            except ET.ParseError:
                logger.error(f"Corrupt XMP: {xmp_path}, skipping update to avoid data loss.")
                return False
        else:
            # Create new
            root = ET.fromstring(TEMPLATE)
            tree = ET.ElementTree(root)

        # 2. Find Description node
        # It's usually under rdf:RDF -> rdf:Description
        rdf = root.find(f"{{{NS_MAP['rdf']}}}RDF")
        if rdf is None:
            # Should not happen in valid new XMP, but possible in corrupted existing files
            rdf = ET.SubElement(root, f"{{{NS_MAP['rdf']}}}RDF")
            
        desc = rdf.find(f"{{{NS_MAP['rdf']}}}Description")
        if desc is None:
            desc = ET.SubElement(rdf, f"{{{NS_MAP['rdf']}}}Description")
            desc.set(f"{{{NS_MAP['rdf']}}}about", "")

        changed = False

        # 3. Update Rating
        if rating is not None:
            # Ensure 0-5
            rating = max(0, min(5, rating))
            rating_tag = f"{{{NS_MAP['xmp']}}}Rating"
            
            curr_rating = desc.find(rating_tag)
            if curr_rating is not None:
                if curr_rating.text != str(rating):
                    curr_rating.text = str(rating)
                    changed = True
            else:
                if rating != 0: # Only write if non-zero? Or always write?
                    # LR treats missing as 0 usually.
                    elem = ET.SubElement(desc, rating_tag)
                    elem.text = str(rating)
                    changed = True

        # 4. Update Label
        if label is not None:
            label_tag = f"{{{NS_MAP['xmp']}}}Label"
            curr_label = desc.find(label_tag)
            
            if curr_label is not None:
                # 只有当新标签与旧标签不同时才更新
                # 注意：如果原本是 "Green"，现在逻辑是 "Red"，则覆盖
                if curr_label.text != label:
                    curr_label.text = label
                    changed = True
            else:
                elem = ET.SubElement(desc, label_tag)
                elem.text = label
                changed = True
        
        # 5. Update Keywords (Subject)
        # Structure: dc:subject -> rdf:Bag -> rdf:li
        # Only sync "AI/" keywords to avoid deleting user keywords.
        if keywords is not None:
            subject_tag = f"{{{NS_MAP['dc']}}}subject"
            bag_tag = f"{{{NS_MAP['rdf']}}}Bag"
            li_tag = f"{{{NS_MAP['rdf']}}}li"
            
            subject = desc.find(subject_tag)
            if subject is None:
                subject = ET.SubElement(desc, subject_tag)
                bag = ET.SubElement(subject, bag_tag)
                changed = True
            else:
                bag = subject.find(bag_tag)
                if bag is None:
                    bag = ET.SubElement(subject, bag_tag)
                    changed = True
            
            desired_ai = {kw for kw in (keywords or []) if isinstance(kw, str) and kw.startswith("AI/")}

            seen_ai = set()
            for li in list(bag.findall(li_tag)):
                if not li.text or not li.text.startswith("AI/"):
                    continue
                if li.text in seen_ai:
                    bag.remove(li)
                    changed = True
                else:
                    seen_ai.add(li.text)

            for li in list(bag.findall(li_tag)):
                if li.text and li.text.startswith("AI/") and li.text not in desired_ai:
                    bag.remove(li)
                    changed = True

            existing = {li.text for li in bag.findall(li_tag) if li.text}
            for kw in sorted(desired_ai):
                if kw not in existing:
                    li = ET.SubElement(bag, li_tag)
                    li.text = kw
                    changed = True

        # 6. Write if changed
        if changed:
            try:
                tree.write(xmp_path, encoding='utf-8', xml_declaration=True)
                return True
            except Exception as e:
                logger.error(f"Failed to write XMP {xmp_path}: {e}")
                return False
        
        return False
