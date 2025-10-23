#!/usr/bin/env python3
"""
Reads the work_list/porfolio_list.xlsx file and generates portfolioMap.json.
Running this script ensures the React app always uses the latest Excel data.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Iterable, List
import zipfile


def normalise_text(value: str | None) -> str:
    if not value:
        return ""
    return "".join(value.split()).lower()


def clean_jsonish(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    replacements = {
        ",]": "]",
        ",\n]": "]",
        "\n]": "]",
    }
    for target, repl in replacements.items():
        cleaned = cleaned.replace(target, repl)
    return cleaned


def parse_list_field(value: str | None) -> List[str]:
    cleaned = clean_jsonish(value)
    if not cleaned:
        return []
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()]
    except json.JSONDecodeError:
        pass
    # fallback: split lines
    parts = [segment.strip() for segment in cleaned.replace("\r", "\n").split("\n")]
    return [part for part in parts if part]


def parse_object_list(value: str | None) -> List[Dict[str, str]]:
    cleaned = clean_jsonish(value)
    if not cleaned:
        return []
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return []

    results: List[Dict[str, str]] = []
    if isinstance(parsed, list):
        for item in parsed:
            if isinstance(item, dict):
                results.append(
                    {
                        key: (str(val).strip() if val is not None else "")
                        for key, val in item.items()
                    }
                )
            elif isinstance(item, str) and item.strip():
                results.append({"name": item.strip()})
    return [entry for entry in results if any(entry.values())]


def generate_work_details(
    csv_path: Path, mapping: Dict[str, str], output_path: Path
) -> None:
    if not csv_path.exists():
        print(f"No work list found at {csv_path}, skipping detail export.")
        return

    details: Dict[str, Dict[str, object]] = {}
    unmatched: List[str] = []

    with csv_path.open("r", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            raw_code = (row.get("index") or "").strip().lower()
            if raw_code in mapping:
                code = raw_code
            else:
                raw_table_name = row.get("tableName", "")
                lookup_key = normalise_text(raw_table_name) or normalise_text(
                    row.get("fullName", "")
                )
                if not lookup_key:
                    continue

                code = next(
                    (candidate for candidate, name in mapping.items()
                     if normalise_text(name) == lookup_key),
                    None,
                )

            if not code or code not in mapping:
                raw_table_name = row.get("tableName", "")
                unmatched.append(raw_table_name.strip() or raw_code)
                continue

            def normalize_multiline(value: str | None) -> str:
                text = (value or "").replace("\\n", "\n").strip()
                return text

            details[code] = {
                "fullName": (row.get("fullName") or "").replace("\n", " ").strip(),
                "h2Name": (row.get("h2Name") or "").replace("\n", " ").strip(),
                "tableName": (row.get("tableName") or "").replace("\n", " ").strip(),
                "yearBegin": (row.get("yearBegin") or "").strip(),
                "yearEnd": (row.get("yearEnd") or "").strip(),
                "intro": normalize_multiline(row.get("introd")),
                "introList": parse_list_field(row.get("introd_list")),
                "headPic": (row.get("headPic") or "").strip(),
                "tags": parse_list_field(row.get("tag")),
                "links": parse_object_list(row.get("link")),
                "coWorkers": parse_object_list(row.get("coWorker")),
                "content": row.get("content", "").strip(),
            }

    output_path.write_text(
        json.dumps(details, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        f"Generated {output_path} with {len(details)} entries."
        + (" Unmatched rows: " + ", ".join(unmatched) if unmatched else "")
    )


def build_shared_strings(zf: zipfile.ZipFile) -> Dict[int, str]:
    if "xl/sharedStrings.xml" not in zf.namelist():
        return {}

    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    strings: Dict[int, str] = {}

    for idx, si in enumerate(root):
        texts = []
        for node in si.iter():
            if node.tag.endswith("}t"):
                texts.append(node.text or "")
        strings[idx] = "".join(texts)

    return strings


def column_index(cell_ref: str) -> int:
    letters = "".join(filter(str.isalpha, cell_ref or ""))
    result = 0
    for char in letters:
        result = result * 26 + (ord(char.upper()) - ord("A") + 1)
    return result - 1 if result else 0


def read_sheet_rows(
    zf: zipfile.ZipFile, shared_strings: Dict[int, str]
) -> Iterable[List[str]]:
    sheet_xml = zf.read("xl/worksheets/sheet1.xml")
    root = ET.fromstring(sheet_xml)
    namespace = {"a": root.tag.split("}")[0].strip("{")}

    for row in root.findall(".//a:row", namespace):
        values: List[str] = []

        for cell in row.findall("a:c", namespace):
            idx = column_index(cell.get("r", ""))
            if idx >= len(values):
                values.extend([""] * (idx - len(values) + 1))

            value = cell.find("a:v", namespace)
            if value is None:
                values[idx] = ""
                continue

            text = value.text or ""
            if cell.get("t") == "s":
                text = shared_strings.get(int(text), "")

            values[idx] = text

        yield values


def generate_map(excel_path: Path) -> Dict[str, str]:
    with excel_path.open("rb") as fh, zipfile.ZipFile(fh) as zf:
        shared_strings = build_shared_strings(zf)
        rows = list(read_sheet_rows(zf, shared_strings))

    if not rows:
        return {}

    headers = rows[0]
    try:
        index_idx = headers.index("index")
    except ValueError:
        raise SystemExit("找不到 index 欄位，請確認 Excel 表頭。")

    name_candidates = ["tableName", "fullName", "h2Name"]
    name_indices = []
    for column in name_candidates:
        try:
            name_indices.append(headers.index(column))
        except ValueError:
            name_indices.append(None)

    mapping: Dict[str, str] = {}
    for row in rows[1:]:
        if index_idx >= len(row):
            continue
        code = row[index_idx].strip()
        if not code:
            continue

        name = ""
        for idx in name_indices:
            if idx is not None and idx < len(row):
                candidate = (row[idx] or "").replace("\n", " ").strip()
                if candidate:
                    name = candidate
                    break

        mapping[code] = name

    return mapping


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Generate portfolioMap.json from Excel")
    parser.add_argument(
        "--excel",
        default="src/work_list/porfolio_list.xlsx",
        help="Path to the Excel source file.",
    )
    parser.add_argument(
        "--output",
        default="src/work_list/portfolioMap.json",
        help="Path where the JSON map should be written.",
    )
    args = parser.parse_args(argv)

    excel_path = Path(args.excel)
    if not excel_path.exists():
        raise SystemExit(f"找不到 Excel 檔案：{excel_path}")

    mapping = generate_map(excel_path)

    output_path = Path(args.output)
    output_path.write_text(
        json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"Generated {output_path} with {len(mapping)} entries.")

    csv_path = excel_path.with_name("all_work_list.csv")
    work_output = Path("src/work_list/allWorkData.json")
    generate_work_details(csv_path, mapping, work_output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
