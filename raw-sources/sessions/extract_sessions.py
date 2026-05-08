#!/usr/bin/env python3
"""Extract key information from Pi session JSONL files for wiki ingestion."""

import json
import sys
from pathlib import Path
from collections import defaultdict

def extract_text_from_content(content):
    """Extract text from Pi message content array."""
    texts = []
    for item in content:
        if isinstance(item, dict):
            t = item.get('text', item.get('thinking', ''))
            if t:
                texts.append(t)
    return ' '.join(texts)

def extract_session_info(filepath):
    """Extract tree structure and key content from a Pi session JSONL."""
    events = []
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    # Build parent-child tree
    nodes = {}
    roots = []
    for event in events:
        eid = event.get('id')
        if not eid:
            continue
        nodes[eid] = {
            'event': event,
            'children': [],
            'parent': event.get('parentId')
        }

    for eid, node in nodes.items():
        parent_id = node['parent']
        if parent_id and parent_id in nodes:
            nodes[parent_id]['children'].append(eid)
        elif not parent_id:
            roots.append(eid)

    # Extract key messages (user/assistant text)
    messages = []
    forks = []
    tool_calls = []
    errors = []
    files_read = set()
    files_written = set()
    commands_run = []
    search_queries = []
    model_changes = []

    for eid, node in nodes.items():
        event = node['event']
        etype = event.get('type', '')

        if etype == 'message':
            msg = event.get('message', {})
            role = msg.get('role', '')
            content = msg.get('content', [])
            text = extract_text_from_content(content)

            if role == 'user' and text:
                messages.append(('user', text[:800]))
            elif role == 'assistant' and text:
                messages.append(('assistant', text[:800]))

            # Extract tool calls from assistant messages
            if role == 'assistant' and content:
                for item in content:
                    if isinstance(item, dict) and item.get('type') == 'toolCall':
                        tool = item.get('name', '')
                        args = item.get('arguments', {})
                        tool_calls.append((tool, str(args)[:300]))
                        if tool == 'read':
                            path = args.get('path', '')
                            if path:
                                files_read.add(path)
                        elif tool == 'write':
                            path = args.get('path', '')
                            if path:
                                files_written.add(path)
                        elif tool == 'bash':
                            cmd = args.get('command', '')
                            if cmd:
                                commands_run.append(cmd[:300])
                        elif tool == 'web_search':
                            queries = args.get('queries', [])
                            for q in queries:
                                search_queries.append(q[:300])
                            q = args.get('query', '')
                            if q:
                                search_queries.append(q[:300])

        elif etype == 'fork':
            forks.append(event)
        elif etype == 'model_change':
            model_changes.append(event.get('modelId', ''))
        elif etype in ('error', 'rate_limit', 'fetch_failure'):
            errors.append(f"{etype}: {str(event)[:200]}")

    # Count stats
    stats = {
        'total_events': len(events),
        'roots': len(roots),
        'forks': len(forks),
        'user_messages': len([m for m in messages if m[0] == 'user']),
        'assistant_messages': len([m for m in messages if m[0] == 'assistant']),
        'tool_calls': len(tool_calls),
        'errors': len(errors),
        'files_read': len(files_read),
        'files_written': len(files_written),
        'commands': len(commands_run),
        'searches': len(search_queries),
        'models': list(set(model_changes)),
    }

    # Get first few user prompts to understand topic
    first_prompts = [text for role, text in messages if role == 'user'][:5]

    # Get unique tools used
    tools_used = defaultdict(int)
    for tool, _ in tool_calls:
        tools_used[tool] += 1

    return {
        'filename': Path(filepath).name,
        'filepath': str(filepath),
        'stats': stats,
        'first_prompts': first_prompts,
        'tools_used': dict(tools_used),
        'files_read': sorted(files_read)[:30],
        'files_written': sorted(files_written)[:30],
        'commands': commands_run[:10],
        'searches': search_queries[:10],
        'errors': errors[:5],
        'has_forks': len(forks) > 0,
    }

if __name__ == '__main__':
    sessions_dir = Path('/Users/michael.voigt/.pi/agent/sessions/--Users-michael.voigt-devel-AI-aiAgentResearch-agents-pi-mono--')
    if not sessions_dir.exists():
        print(f"Sessions directory not found: {sessions_dir}")
        sys.exit(1)

    session_files = sorted(sessions_dir.glob('*.jsonl'))
    print(f"Found {len(session_files)} session files\n")

    for sf in session_files:
        print(f"=== {sf.name} ===")
        try:
            info = extract_session_info(sf)
            print(f"  Events: {info['stats']['total_events']}")
            print(f"  Roots: {info['stats']['roots']}, Forks: {info['stats']['forks']}")
            print(f"  User msgs: {info['stats']['user_messages']}, Assistant msgs: {info['stats']['assistant_messages']}")
            print(f"  Tool calls: {info['stats']['tool_calls']}, Errors: {info['stats']['errors']}")
            print(f"  Files read: {info['stats']['files_read']}, Written: {info['stats']['files_written']}")
            print(f"  Commands: {info['stats']['commands']}, Searches: {info['stats']['searches']}")
            print(f"  Models: {info['stats']['models']}")
            print(f"  Tools: {info['tools_used']}")
            print(f"  First prompts:")
            for i, p in enumerate(info['first_prompts'], 1):
                print(f"    {i}. {p[:150]}...")
            if info['files_read']:
                print(f"  Key files read:")
                for f in info['files_read'][:15]:
                    print(f"    - {f}")
            if info['files_written']:
                print(f"  Key files written:")
                for f in info['files_written'][:10]:
                    print(f"    - {f}")
            if info['errors']:
                print(f"  Errors:")
                for e in info['errors']:
                    print(f"    - {e}")
            print()
        except Exception as e:
            import traceback
            print(f"  ERROR: {e}")
            traceback.print_exc()
            print()
