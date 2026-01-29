import os
import sys
import tempfile

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from photo_selector.lr.xmp_writer import XmpWriter, NS_MAP  # noqa: E402
import xml.etree.ElementTree as ET  # noqa: E402


def _read_ai_keywords(xmp_path: str):
    tree = ET.parse(xmp_path)
    root = tree.getroot()
    rdf = root.find(f"{{{NS_MAP['rdf']}}}RDF")
    desc = rdf.find(f"{{{NS_MAP['rdf']}}}Description")
    subject_tag = f"{{{NS_MAP['dc']}}}subject"
    bag_tag = f"{{{NS_MAP['rdf']}}}Bag"
    li_tag = f"{{{NS_MAP['rdf']}}}li"
    subject = desc.find(subject_tag)
    bag = subject.find(bag_tag) if subject is not None else None
    if bag is None:
        return []
    return [li.text for li in bag.findall(li_tag) if li.text and li.text.startswith("AI/")]


def test_group_keywords_dedup_and_replace():
    with tempfile.TemporaryDirectory() as td:
        xmp_path = os.path.join(td, "a.xmp")

        XmpWriter.update_xmp(
            xmp_path,
            rating=5,
            label="Green",
            keywords=[
                "AI/Group/1",
                "AI/Group/1",
                "AI/GroupRank/1",
                "AI/GroupRank/1",
                "AI/BestInGroup",
                "AI/BestInGroup",
            ],
        )

        kws1 = _read_ai_keywords(xmp_path)
        assert kws1.count("AI/Group/1") == 1
        assert kws1.count("AI/GroupRank/1") == 1
        assert kws1.count("AI/BestInGroup") == 1

        XmpWriter.update_xmp(
            xmp_path,
            rating=4,
            label="Green",
            keywords=[
                "AI/Group/2",
                "AI/GroupRank/3",
                "AI/Similar",
            ],
        )

        kws2 = _read_ai_keywords(xmp_path)
        assert "AI/Group/1" not in kws2
        assert "AI/GroupRank/1" not in kws2
        assert "AI/BestInGroup" not in kws2
        assert kws2.count("AI/Group/2") == 1
        assert kws2.count("AI/GroupRank/3") == 1
        assert kws2.count("AI/Similar") == 1


if __name__ == "__main__":
    test_group_keywords_dedup_and_replace()
    print("ok")

