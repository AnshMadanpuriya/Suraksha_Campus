#!/usr/bin/env python3
"""
Suraksha Campus - Python BM25 + Bilingual Hinglish/Hindi RAG Retriever
Retrieves authoritative NDMA, NBC Part IV, and Indian Red Cross SOP chunks
for real-time disaster safety, first-aid, medikit usage, and improvised resources.
"""

import json
import math
import os
import re
import sys
from collections import Counter
from typing import Any, Dict, List

# Bilingual Hinglish/Hindi -> English domain synonym expansion map
HINGLISH_SYNONYMS: Dict[str, List[str]] = {
    "bhukamp": ["earthquake", "seismic", "tremor", "shaking", "drop", "cover"],
    "bhookamp": ["earthquake", "seismic", "tremor", "shaking"],
    "hilna": ["shaking", "tremor", "earthquake"],
    "aag": ["fire", "flame", "burn", "extinguisher", "smoke"],
    "dhuan": ["smoke", "suffocation", "crawl"],
    "jal": ["burn", "scald", "water", "blister"],
    "jalna": ["burn", "scald"],
    "baadh": ["flood", "waterlogging", "monsoon", "water"],
    "badh": ["flood", "waterlogging", "monsoon"],
    "barish": ["rain", "monsoon", "flood"],
    "pani": ["water", "flood", "waterlogging", "ors"],
    "chot": ["injury", "wound", "cut", "bleeding", "trauma", "first", "aid"],
    "zakhm": ["wound", "cut", "laceration", "injury"],
    "khoon": ["bleeding", "blood", "pressure", "gauze"],
    "khun": ["bleeding", "blood"],
    "kam": ["minor", "mild", "scrape"],
    "halka": ["minor", "mild"],
    "jyada": ["major", "severe", "heavy", "critical"],
    "zyada": ["major", "severe", "heavy", "critical"],
    "gehri": ["major", "deep", "severe"],
    "gehra": ["major", "deep", "severe"],
    "patti": ["bandage", "gauze", "dressing", "crepe"],
    "dawa": ["medikit", "antiseptic", "first", "aid"],
    "medikit": ["medikit", "first", "aid", "gauze", "bandage", "antiseptic"],
    "moch": ["sprain", "ankle", "crepe", "rice"],
    "haddi": ["fracture", "bone", "splint", "sling"],
    "toot": ["fracture", "broken"],
    "tootna": ["fracture", "broken"],
    "reedh": ["spinal", "neck", "back"],
    "behosh": ["unconscious", "faint", "recovery", "cpr"],
    "chakkar": ["faint", "heatstroke", "ors", "dehydration"],
    "nakseer": ["nosebleed", "nose"],
    "saanp": ["snakebite", "venom", "immobilize"],
    "bijli": ["electrical", "electrocution", "mcbs", "shock", "short", "circuit"],
    "current": ["electrical", "electrocution", "shock"],
    "bhagdad": ["stampede", "crowd", "panic", "staircase"],
    "madad": ["helpline", "112", "108", "101", "emergency"],
    "number": ["helpline", "112", "108", "101"],
    "bachav": ["safety", "evacuation", "rescue", "protocol"],
    "class": ["classroom", "desk", "students"],
    "school": ["campus", "classroom", "students", "teacher"],
    "college": ["campus", "lab", "hostel", "students"],
    "hostel": ["hostel", "fire", "earthquake", "door"],
    "lab": ["lab", "chemical", "acid", "extinguisher"],
}


def tokenize(text: str) -> List[str]:
    clean = re.sub(r"[^a-z0-9\s]", " ", text.lower())
    return [tok for tok in clean.split() if len(tok) > 1]


def expand_query_tokens(query: str) -> List[str]:
    base_tokens = tokenize(query)
    expanded = list(base_tokens)
    for tok in base_tokens:
        if tok in HINGLISH_SYNONYMS:
            expanded.extend(HINGLISH_SYNONYMS[tok])
    return expanded


def load_knowledge_base(kb_path: str) -> List[Dict[str, Any]]:
    with open(kb_path, "r", encoding="utf-8") as f:
        return json.load(f)


def bm25_retrieve(
    query: str,
    docs: List[Dict[str, Any]],
    top_k: int = 4,
    category_hint: str = "",
) -> List[Dict[str, Any]]:
    if not docs:
        return []

    query_tokens = expand_query_tokens(query)
    if not query_tokens:
        return docs[:top_k]

    doc_tokens_list: List[List[str]] = []
    for doc in docs:
        combined = " ".join(
            [
                doc.get("title", ""),
                doc.get("category", ""),
                " ".join(doc.get("keywords", [])),
                " ".join(doc.get("keywords", [])),  # boost keywords 2x
                doc.get("content", ""),
                " ".join(doc.get("real_time_steps", [])),
                " ".join(doc.get("medikit_items", [])),
                " ".join(doc.get("improvised_sources", [])),
            ]
        )
        doc_tokens_list.append(tokenize(combined))

    n_docs = len(docs)
    avgdl = sum(len(t) for t in doc_tokens_list) / max(1, n_docs)
    df: Counter[str] = Counter()
    for tokens in doc_tokens_list:
        for t in set(tokens):
            df[t] += 1

    k1 = 1.5
    b = 0.75
    scored: List[Dict[str, Any]] = []

    for idx, doc in enumerate(docs):
        tokens = doc_tokens_list[idx]
        tf = Counter(tokens)
        dl = len(tokens)
        score = 0.0

        for q_tok in query_tokens:
            if q_tok not in tf:
                continue
            idf = math.log(1.0 + (n_docs - df[q_tok] + 0.5) / (df[q_tok] + 0.5))
            freq = tf[q_tok]
            denom = freq + k1 * (1.0 - b + b * (dl / max(1.0, avgdl)))
            score += idf * ((freq * (k1 + 1.0)) / max(1e-9, denom))

        # Exact keyword bonus
        doc_keywords = {k.lower() for k in doc.get("keywords", [])}
        q_lower = query.lower()
        for kw in doc_keywords:
            if kw in q_lower:
                score += 1.75

        # Optional category hint bonus
        if category_hint and category_hint.lower() in doc.get("category", "").lower():
            score += 1.25

        if score > 0:
            scored.append({"doc": doc, "score": round(score, 4)})

    scored.sort(key=lambda x: x["score"], reverse=True)

    # Always return at least top_k contextual documents if query had very generic words
    if not scored:
        fallback = [
            {"doc": d, "score": 0.25}
            for d in docs[:top_k]
        ]
        return fallback

    return scored[:top_k]


def main() -> None:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_kb = os.path.abspath(os.path.join(script_dir, "..", "data", "knowledge_base.json"))

    raw_input = sys.stdin.read().strip()
    if raw_input:
        payload = json.loads(raw_input)
    else:
        payload = {"query": " ".join(sys.argv[1:]), "top_k": 4}

    query = str(payload.get("query", "")).strip()
    top_k = int(payload.get("top_k", 4))
    category_hint = str(payload.get("category", "")).strip()
    kb_path = str(payload.get("kb_path", default_kb))

    docs = load_knowledge_base(kb_path)
    results = bm25_retrieve(query=query, docs=docs, top_k=top_k, category_hint=category_hint)
    output = {
        "engine": "python-bm25-bilingual-rag",
        "expanded_tokens": expand_query_tokens(query),
        "total_indexed_docs": len(docs),
        "matches": [
            {
                "id": item["doc"]["id"],
                "category": item["doc"]["category"],
                "title": item["doc"]["title"],
                "source": item["doc"]["source"],
                "severity": item["doc"]["severity"],
                "score": item["score"],
                "content": item["doc"]["content"],
                "real_time_steps": item["doc"].get("real_time_steps", []),
                "medikit_items": item["doc"].get("medikit_items", []),
                "improvised_sources": item["doc"].get("improvised_sources", []),
            }
            for item in results
        ],
    }
    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    main()
