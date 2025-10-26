#!/usr/bin/env python3
"""
Generates portfolio JSON data from work_list/porfolio_list.xlsx.
If the Excel file is unavailable, falls back to work_list/all_work_list.csv.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Iterable, List, Tuple
import zipfile

import re


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
    cleaned = cleaned.replace("}\n{", "},{").replace("}\r\n{", "},{")
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
        # Fallback parser for loosely formatted JSON-like input
        fallback_results: List[Dict[str, str]] = []
        content = cleaned.strip()
        if content.startswith("[") and content.endswith("]"):
            content = content[1:-1]
        # Normalize separators
        chunks = re.split(r"}\s*,\s*{", content)
        for chunk in chunks:
            chunk = chunk.strip()
            if not chunk:
                continue
            chunk = chunk.strip("{} \n\r\t")
            if not chunk:
                continue
            entry: Dict[str, str] = {}
            # First capture well-formed quoted values
            for key, val in re.findall(r'"([^"]+)"\s*:\s*"([^"]*)"', chunk):
                entry[key] = val.strip()
            # Then capture values missing quotes (up to comma or end brace)
            for key, val in re.findall(r'"([^"]+)"\s*:\s*([^",}]+)', chunk):
                if key in entry:
                    continue
                cleaned_val = val.strip()
                if not cleaned_val:
                    continue
                if cleaned_val.lower() in {"true", "false", "null"}:
                    entry[key] = cleaned_val.lower()
                else:
                    entry[key] = cleaned_val
            if any(entry.values()):
                fallback_results.append(entry)
        return fallback_results

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


def parse_bool(value: str | None) -> bool:
    if value is None:
        return False
    normalized = value.strip().lower()
    return normalized in {"true", "1", "yes", "y"}


def parse_related_codes(value: str | None) -> List[str]:
    if not value:
        return []
    cleaned = value.replace("[", " ").replace("]", " ").strip()
    if not cleaned:
        return []
    parts = [part.strip().lower() for part in re.split(r"[,\s]+", cleaned)]
    return [part for part in parts if part]


def parse_date_key(value: str | None) -> Tuple[int, int]:
    """
    Converts date strings like '2025/10' into comparable tuples (year, month).
    Missing months default to December to indicate ongoing projects end late in the year.
    """
    if not value:
        return (0, 0)
    cleaned = (
        value.replace("年", "/")
        .replace("月", "")
        .replace(".", "/")
        .replace("-", "/")
    )
    parts = [part for part in re.split(r"[^0-9]", cleaned) if part]
    if not parts:
        return (0, 0)
    try:
        year = int(parts[0])
    except ValueError:
        year = 0
    month = 12
    if len(parts) > 1:
        try:
            month = int(parts[1])
        except ValueError:
            month = 12
    month = max(1, min(month, 12))
    return (year, month)


def normalize_multiline_text(value: str | None) -> str:
    if not value:
        return ""
    return value.replace("\\n", "\n").replace("\r", "\n").strip()


def generate_work_details_from_rows(
    rows: Iterable[Dict[str, str]],
    mapping: Dict[str, str],
    output_path: Path,
) -> None:
    details: Dict[str, Dict[str, object]] = {}
    unmatched: List[str] = []

    for row in rows:
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
                (
                    candidate
                    for candidate, name in mapping.items()
                    if normalise_text(name) == lookup_key
                ),
                None,
            )

        if not code or code not in mapping:
            raw_table_name = row.get("tableName", "") or row.get("fullName", "")
            unmatched.append((raw_table_name or raw_code).strip())
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
            "content": (row.get("content") or "").strip(),
        }

    output_path.write_text(
        json.dumps(details, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        f"Generated {output_path} with {len(details)} entries."
        + (" Unmatched rows: " + ", ".join(unmatched) if unmatched else "")
    )


def load_csv_rows(csv_path: Path) -> List[Dict[str, str]]:
    if not csv_path.exists():
        return []
    rows: List[Dict[str, str]] = []
    with csv_path.open("r", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            if not any((value or "").strip() for value in row.values()):
                continue
            rows.append({key: (value or "") for key, value in row.items()})
    return rows


def load_excel_rows(excel_path: Path) -> List[Dict[str, str]]:
    if not excel_path.exists():
        return []

    with excel_path.open("rb") as fh, zipfile.ZipFile(fh) as zf:
        shared_strings = build_shared_strings(zf)
        rows = list(read_sheet_rows(zf, shared_strings))

    if not rows:
        return []

    headers = [(header or "").strip() for header in rows[0]]
    if "index" not in headers:
        raise SystemExit("找不到 index 欄位，請確認 Excel 表頭。")
    records: List[Dict[str, str]] = []
    for raw_row in rows[1:]:
        if not any((cell or "").strip() for cell in raw_row):
            continue
        record: Dict[str, str] = {}
        for idx, header in enumerate(headers):
            if not header:
                continue
            value = raw_row[idx] if idx < len(raw_row) else ""
            record[header] = value or ""
        if record:
            records.append(record)
    return records


def build_mapping_from_rows(rows: Iterable[Dict[str, str]]) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for row in rows:
        code = (row.get("index") or "").strip().lower()
        if not code:
            continue
        candidates = [
            row.get("tableName"),
            row.get("fullName"),
            row.get("h2Name"),
        ]
        name = next(
            (
                (candidate or "").replace("\n", " ").strip()
                for candidate in candidates
                if candidate and candidate.strip()
            ),
            "",
        )
        mapping[code] = name
    return mapping


def generate_experience_data(csv_path: Path, output_path: Path) -> None:
    if not csv_path.exists():
        print(f"No experience CSV found at {csv_path}, skipping export.")
        return

    entries: List[Dict[str, object]] = []
    type_order: List[str] = []

    with csv_path.open("r", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        fieldnames = reader.fieldnames or []
        show_columns = [
            name
            for name in fieldnames
            if name and name.lower().startswith("show")
        ]
        for row in reader:
            type_name = (row.get("type") or "").strip()
            if not type_name:
                continue
            if type_name not in type_order:
                type_order.append(type_name)

            organisation = (
                row.get("organization/") or row.get("organization") or ""
            ).strip()
            role = (row.get("role") or "").strip()
            begin = (row.get("begin_m") or "").strip()
            end = (row.get("end_m") or "").strip()
            related_work = parse_related_codes(row.get("related_work"))
            description = normalize_multiline_text(row.get("introd"))
            show_default = parse_bool(row.get("show_default"))
            tags = parse_list_field(row.get("tag"))
            show_groups = [
                column.strip()
                for column in show_columns
                if column and parse_bool(row.get(column))
            ]
            if show_default and "show_default" not in show_groups:
                show_groups.append("show_default")

            entries.append(
                {
                    "type": type_name,
                    "organisation": organisation,
                    "role": role,
                    "begin": begin,
                    "end": end,
                    "relatedWorks": related_work,
                    "description": description,
                    "showDefault": show_default,
                    "showGroups": show_groups,
                    "tags": tags,
                }
            )

    payload = {
        "typeOrder": type_order,
        "entries": entries,
    }

    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        f"Generated {output_path} with {len(entries)} experience entries across {len(type_order)} types."
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


def generate_map(excel_path: Path) -> Tuple[Dict[str, str], List[Dict[str, str]]]:
    rows = load_excel_rows(excel_path)
    mapping = build_mapping_from_rows(rows)
    return mapping, rows


def generate_map_from_csv(csv_path: Path) -> Tuple[Dict[str, str], List[Dict[str, str]]]:
    rows = load_csv_rows(csv_path)
    mapping = build_mapping_from_rows(rows)
    return mapping, rows


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
    csv_path = excel_path.with_name("all_work_list.csv")

    mapping: Dict[str, str] = {}
    detail_rows: List[Dict[str, str]] = []
    if excel_path.exists():
        mapping, detail_rows = generate_map(excel_path)
    else:
        print(f"找不到 Excel 檔案：{excel_path}，改用 CSV 來源 {csv_path}。")

    if not mapping:
        mapping, csv_rows = generate_map_from_csv(csv_path)
        if not detail_rows:
            detail_rows = csv_rows
    elif not detail_rows:
        # Excel 存在但資料表無內容，嘗試改用 CSV 行資料
        detail_rows = load_csv_rows(csv_path)

    if not mapping:
        raise SystemExit("無法從 Excel 或 CSV 生成作品對照表，請確認來源資料。")

    output_path = Path(args.output)
    output_path.write_text(
        json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"Generated {output_path} with {len(mapping)} entries.")

    work_output = Path("src/work_list/allWorkData.json")
    if detail_rows:
        generate_work_details_from_rows(detail_rows, mapping, work_output)
    else:
        print("找不到可用的作品明細資料列，請確認來源檔案。")

    experience_csv = Path("src/asset/cv/experience.csv")
    experience_output = Path("src/work_list/experienceData.json")
    generate_experience_data(experience_csv, experience_output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
