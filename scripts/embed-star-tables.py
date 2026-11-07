"""Writes src/names/star-tables.ts from the C# StarTables.cs (path as argument). Do not edit the output by hand."""
import json
import pathlib
import re
import sys

src = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')


def const(name):
    m = re.search(r'public const string ' + name + r' =(.*?);', src, re.S)
    return ''.join(json.loads('"' + s + '"') for s in re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1)))


highest = int(re.search(r'HipparcosHighest = (\d+);', src).group(1))
head = [line for line in src.splitlines() if line.startswith('//') and 'auto-generated' not in line]
out = ['// Written by scripts/embed-star-tables.py from the C# UniverseGenerator StarTables.cs; do not edit.', *head,
       f'export const proper = {json.dumps(const("Proper"), ensure_ascii=False)};',
       f'export const designations = {json.dumps(const("Designations"), ensure_ascii=False)};',
       f'export const hipparcosHighest = {highest};',
       f'export const hipparcosGaps = {json.dumps(const("HipparcosGaps"))};', '']
pathlib.Path('src/names/star-tables.ts').write_text('\n'.join(out), encoding='utf-8', newline='\n')
