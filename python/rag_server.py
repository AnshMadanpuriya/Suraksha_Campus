#!/usr/bin/env python3
"""
Standalone Python RAG Microservice for Suraksha Campus (Port 8001).
Can be run alongside the MERN / Express server for distributed local deployment:
  python3 python/rag_server.py
"""

import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from rag_retriever import bm25_retrieve, expand_query_tokens, load_knowledge_base

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
KB_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data", "knowledge_base.json"))
DOCS = load_knowledge_base(KB_PATH)


class RagHandler(BaseHTTPRequestHandler):
    def _send_json(self, code: int, data: dict) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send_json(200, {"status": "ok", "indexed_docs": len(DOCS)})
            return
        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        if self.path != "/retrieve":
            self._send_json(404, {"error": "Not found"})
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8")
        payload = json.loads(raw or "{}")
        query = str(payload.get("query", ""))
        top_k = int(payload.get("top_k", 4))
        category = str(payload.get("category", ""))

        results = bm25_retrieve(query=query, docs=DOCS, top_k=top_k, category_hint=category)
        self._send_json(
            200,
            {
                "engine": "python-http-rag-microservice",
                "expanded_tokens": expand_query_tokens(query),
                "total_indexed_docs": len(DOCS),
                "matches": [
                    {**item["doc"], "score": item["score"]}
                    for item in results
                ],
            },
        )


if __name__ == "__main__":
    port = int(os.environ.get("PYTHON_RAG_PORT", "8001"))
    server = HTTPServer(("0.0.0.0", port), RagHandler)
    print(f"Suraksha Campus Python RAG Microservice listening on http://localhost:{port}")
    server.serve_forever()
