#!/usr/bin/env python3
"""Recover llm-wiki files from Pi session JSONL transcripts.

Extracts all 'write' tool calls that targeted llm-wiki paths,
reconstructing the lost files from session history.
"""

import json
import os
import re
from pathlib import Path
from collections import defaultdict

SESSIONS_DIR = Path('/Users/michael.voigt/.pi/agent/sessions/--Users-michael.voigt-devel-AI-aiAgentResearch-agents-pi-mono--')
REPO_ROOT = Path('/Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono')

def extract_writes_from_session(session_file):
    """Extract all write tool calls from a session JSONL file."""
    writes = []
    with open(session_file, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue

            if event.get('type') != 'message':
                continue

            msg = event.get('message', {})
            if msg.get('role') != 'assistant':
                continue

            content = msg.get('content', [])
            for item in content:
                if not isinstance(item, dict):
                    continue
                if item.get('type') != 'toolCall':
                    continue
                if item.get('name') != 'write':
                    continue

                args = item.get('arguments', {})
                path = args.get('path', '')
                text = args.get('content', '')

                if 'llm-wiki' in path:
                    writes.append({
                        'path': path,
                        'content': text,
                        'timestamp': event.get('timestamp', ''),
                    })

    return writes

def main():
    all_writes = []
    session_files = sorted(SESSIONS_DIR.glob('*.jsonl'))

    print(f"Scanning {len(session_files)} session files...\n")

    for sf in session_files:
        writes = extract_writes_from_session(sf)
        if writes:
            print(f"  {sf.name}: {len(writes)} writes to llm-wiki")
            all_writes.extend(writes)

    print(f"\nTotal writes found: {len(all_writes)}")

    # Group by path, keep latest
    latest_writes = {}
    for w in all_writes:
        path = w['path']
        if path not in latest_writes or w['timestamp'] > latest_writes[path]['timestamp']:
            latest_writes[path] = w

    print(f"Unique files: {len(latest_writes)}")
    print("\n--- Files to recover ---")
    for path in sorted(latest_writes.keys()):
        print(f"  {path}")

    # Recover files
    recovered = 0
    for path, w in latest_writes.items():
        # Convert absolute path to repo-relative if possible
        if path.startswith(str(REPO_ROOT)):
            rel_path = path[len(str(REPO_ROOT))+1:]
        else:
            rel_path = path

        target = REPO_ROOT / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)

        with open(target, 'w') as f:
            f.write(w['content'])

        recovered += 1
        print(f"  RECOVERED: {rel_path} ({len(w['content'])} chars)")

    print(f"\nRecovered {recovered} files.")

if __name__ == '__main__':
    main()
