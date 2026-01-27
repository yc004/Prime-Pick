# photo_selector/xmp_writer.py
import os
import xml.etree.ElementTree as ET
from xml.dom import minidom

# Register namespaces to avoid "ns0" prefixes
NAMESPACES = {
    'x': "adobe:ns:meta/",
    'rdf': "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    'xmp': "http://ns.adobe.com/xap/1.0/",
    'dc': "http://purl.org/dc/elements/1.1/",
    'lr': "http://ns.adobe.com/lightroom/1.0/",
    'crs': "http://ns.adobe.com/camera-raw-settings/1.0/",  # For awareness, not modifying
}

for prefix, uri in NAMESPACES.items():
    ET.register_namespace(prefix, uri)

class XMPWriter:
    def __init__(self):
        self.ns_rdf = "{" + NAMESPACES['rdf'] + "}"
        self.ns_xmp = "{" + NAMESPACES['xmp'] + "}"
        self.ns_dc = "{" + NAMESPACES['dc'] + "}"
        self.ns_lr = "{" + NAMESPACES['lr'] + "}"

    def write_xmp(self, image_path, rating=0, label=None, keywords=None):
        """
        Writes or updates the sidecar XMP file for the given image.
        
        Args:
            image_path (str): Path to the .jpg file.
            rating (int): 0-5.
            label (str): Label string (e.g. 'Red', 'Rejected', 'Select').
            keywords (list): List of strings to add as keywords.
        """
        if keywords is None:
            keywords = []

        # Determine XMP path (image.jpg -> image.xmp)
        base_name = os.path.splitext(image_path)[0]
        xmp_path = base_name + ".xmp"

        if os.path.exists(xmp_path):
            tree = self._parse_xmp(xmp_path)
        else:
            tree = self._create_new_xmp()

        root = tree.getroot()
        rdf_root = root.find(f".//{self.ns_rdf}RDF")
        if rdf_root is None:
            # Should not happen in valid new XMP, but possible in corrupted existing files
            rdf_root = ET.SubElement(root, f"{self.ns_rdf}RDF")

        # Find or create the main Description node
        # Usually rdf:Description rdf:about=""
        description = rdf_root.find(f".//{self.ns_rdf}Description")
        if description is None:
            description = ET.SubElement(rdf_root, f"{self.ns_rdf}Description")
            description.set(f"{self.ns_rdf}about", "")

        # 1. Update Rating
        self._update_simple_tag(description, f"{self.ns_xmp}Rating", str(rating))

        # 2. Update Label
        if label:
            self._update_simple_tag(description, f"{self.ns_xmp}Label", str(label))
        
        # 3. Update Keywords (dc:subject)
        if keywords:
            self._add_keywords(description, keywords)

        # Save back
        self._save_xmp(tree, xmp_path)
        return xmp_path

    def _create_new_xmp(self):
        x_xmpmeta = ET.Element(f"{{adobe:ns:meta/}}xmpmeta")
        x_xmpmeta.set(f"{{adobe:ns:meta/}}xmptk", "Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21")
        
        rdf = ET.SubElement(x_xmpmeta, f"{self.ns_rdf}RDF")
        desc = ET.SubElement(rdf, f"{self.ns_rdf}Description")
        desc.set(f"{self.ns_rdf}about", "")
        
        # Ensure namespaces are declared in the Description tag for compatibility
        # ET handles this via register_namespace, but explicit attributes help sometimes
        # We rely on the global register_namespace for the output
        
        return ET.ElementTree(x_xmpmeta)

    def _parse_xmp(self, path):
        try:
            return ET.parse(path)
        except ET.ParseError:
            print(f"Warning: Corrupted XMP found at {path}. Overwriting with new structure.")
            return self._create_new_xmp()

    def _update_simple_tag(self, parent, tag_name, value):
        # Check if tag exists
        element = parent.find(tag_name)
        if element is not None:
            element.text = value
        else:
            element = ET.SubElement(parent, tag_name)
            element.text = value

    def _add_keywords(self, parent, new_keywords):
        # Structure: <dc:subject><rdf:Bag><rdf:li>Keyword</rdf:li>...</rdf:Bag></dc:subject>
        subject = parent.find(f"{self.ns_dc}subject")
        if subject is None:
            subject = ET.SubElement(parent, f"{self.ns_dc}subject")
        
        bag = subject.find(f"{self.ns_rdf}Bag")
        if bag is None:
            bag = ET.SubElement(subject, f"{self.ns_rdf}Bag")

        # Get existing keywords to avoid duplicates
        existing_keywords = set()
        for li in bag.findall(f"{self.ns_rdf}li"):
            if li.text:
                existing_keywords.add(li.text)

        # Add new ones
        for kw in new_keywords:
            if kw not in existing_keywords:
                li = ET.SubElement(bag, f"{self.ns_rdf}li")
                li.text = kw

    def _save_xmp(self, tree, path):
        # Use simple write first
        try:
            # We want to use UTF-8 and include the XML declaration
            # However, ElementTree doesn't pretty print by default.
            # We can use minidom for pretty printing if desired, but 
            # safe/minimal modification is better for XMP.
            # Let's just write it out.
            tree.write(path, encoding="utf-8", xml_declaration=True)
        except Exception as e:
            print(f"Error writing XMP {path}: {e}")

# Simple test function
if __name__ == "__main__":
    writer = XMPWriter()
    # Mock image path
    test_img = "test_image.jpg"
    
    # 1. New file test
    print("Creating new XMP...")
    writer.write_xmp(test_img, rating=4, label="Blue", keywords=["AI/Test", "AI/Sharp"])
    
    with open("test_image.xmp", "r", encoding="utf-8") as f:
        print(f.read())
        
    # 2. Update existing test
    print("\nUpdating existing XMP...")
    writer.write_xmp(test_img, rating=5, keywords=["AI/Updated"])
    
    with open("test_image.xmp", "r", encoding="utf-8") as f:
        print(f.read())
        
    # Cleanup
    if os.path.exists("test_image.xmp"):
        os.remove("test_image.xmp")
