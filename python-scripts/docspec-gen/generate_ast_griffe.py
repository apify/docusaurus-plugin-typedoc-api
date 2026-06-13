"""griffe-based replacement for generate_ast.py (Option A).

Loads a Python package with griffe (static analysis) and emits the same docspec-shaped JSON
that `DocspecTransformer` consumes, so the TypeScript transformer + React renderer stay untouched.
Self-contained: depends only on `griffe` (no pydoc-markdown / docspec / black chain).
"""

from __future__ import annotations

import argparse
import json
import os
import re

import griffe

# --- git root discovery (verbatim behavior from generate_ast.py) ----------------------------------


def search_for_git_root(path: str) -> str | None:
    if os.path.exists(os.path.join(path, '.git')):
        return path
    parent = os.path.dirname(path)
    if parent == path:
        return None
    return search_for_git_root(parent)


# --- Google-style docstring -> JSON content -------------------------------------------------------
# Ported verbatim from ApifyGoogleProcessor._process so the emitted `docstring.content` JSON string
# is byte-compatible with the legacy pydoc-markdown pipeline. Operates on a raw docstring string.

_PARAM_RES = [
    re.compile(r'^(?P<param>\S+):\s+(?P<desc>.+)$'),
    re.compile(r'^(?P<param>\S+)\s+\((?P<type>[^)]+)\):\s+(?P<desc>.+)$'),
    re.compile(r'^(?P<param>\S+)\s+--\s+(?P<desc>.+)$'),
    re.compile(r'^(?P<param>\S+)\s+\{\[(?P<type>\S+)\]\}\s+--\s+(?P<desc>.+)$'),
    re.compile(r'^(?P<param>\S+)\s+\{(?P<type>\S+)\}\s+--\s+(?P<desc>.+)$'),
]

_KEYWORDS_MAP = {
    'Args:': 'Arguments',
    'Arguments:': 'Arguments',
    'Attributes:': 'Attributes',
    'Example:': 'Example',
    'Examples:': 'Examples',
    'Keyword Args:': 'Arguments',
    'Keyword Arguments:': 'Arguments',
    'Methods:': 'Methods',
    'Other Parameters:': 'Arguments',
    'Parameters:': 'Arguments',
    'Return:': 'Returns',
    'Returns:': 'Returns',
    'Raises:': 'Raises',
    'References:': 'References',
    'See Also:': 'See Also',
    'Todo:': 'Todo',
    'Note:': 'Note',
    'Tip:': 'Tip',
    'Info:': 'Info',
    'Warning:': 'Warning',
    'Danger:': 'Danger',
    'Warns:': 'Warns',
    'Yield:': 'Yields',
    'Yields:': 'Yields',
}


def _get_indent_size(line: str) -> int:
    return len(line) - len(line.lstrip())


def docstring_to_json_content(docstring_text: str) -> str:
    """Replicates ApifyGoogleProcessor._process: returns json.dumps({"content": [...]})."""
    content: list = []  # interleaved text strings and section dicts
    current_text_lines: list[str] = []
    current_section_lines: list = []
    in_codeblock = False
    keyword: str | None = None
    keyword_indent: int | None = None
    multiline_argument_offset = -1
    state: dict = {'param_indent': None}

    def _commit_text() -> None:
        if current_text_lines:
            text = '\n'.join(current_text_lines)
            if text.strip():
                content.append(text)
            current_text_lines.clear()

    def _commit_section() -> None:
        nonlocal keyword, keyword_indent
        if keyword:
            content.append({keyword: list(current_section_lines)})
        current_section_lines.clear()
        keyword = None
        keyword_indent = None

    def _commit() -> None:
        if keyword:
            _commit_section()
        else:
            _commit_text()

    def is_continuation(line: str) -> bool:
        if state.get('param_indent') is None:
            state['param_indent'] = _get_indent_size(line)
            return False
        return _get_indent_size(line) > state.get('param_indent')

    param_match = None
    for line in docstring_text.split('\n'):
        multiline_argument_offset += 1
        if line.lstrip().startswith('```'):
            in_codeblock = not in_codeblock
            if keyword:
                current_section_lines.append(line)
            else:
                current_text_lines.append(line)
            if not in_codeblock:
                _commit()
            continue

        if in_codeblock:
            if keyword:
                current_section_lines.append(line)
            else:
                current_text_lines.append(line)
            continue

        stripped = line.strip()
        line_indent = _get_indent_size(line)

        if stripped in _KEYWORDS_MAP:
            _commit()
            keyword = _KEYWORDS_MAP[stripped]
            keyword_indent = line_indent
            continue

        if keyword is not None and stripped and line_indent <= keyword_indent:
            _commit()
            current_text_lines.append(stripped)
            continue

        if keyword is None:
            current_text_lines.append(stripped)
            continue

        param_match = None
        for param_re in _PARAM_RES:
            param_match = param_re.match(stripped)
            if param_match and not is_continuation(line):
                current_section_lines.append(param_match.groupdict())
                multiline_argument_offset = 0
                break

        if not param_match:
            if multiline_argument_offset == 1:
                current_section_lines[-1]['desc'] += '\n' + stripped
                multiline_argument_offset = 0
            else:
                current_section_lines.append(stripped)

    _commit()
    return json.dumps({'content': content}, indent=None)


# --- griffe -> docspec mapping --------------------------------------------------------------------

# griffe ParameterKind.value -> docspec Argument.Type name
_PARAM_KIND_MAP = {
    'positional-only': 'POSITIONAL_ONLY',
    'positional or keyword': 'POSITIONAL',
    'variadic positional': 'POSITIONAL_REMAINDER',
    'keyword-only': 'KEYWORD_ONLY',
    'variadic keyword': 'KEYWORD_REMAINDER',
}


def _def_lineno(obj) -> int:
    # griffe reports a decorated object's lineno at the first decorator; pydoc-markdown reports the
    # `def`/`class` statement line (the line after the last decorator).
    decos = getattr(obj, 'decorators', None) or []
    if decos:
        last = max((d.endlineno or d.lineno or 0) for d in decos)
        if last:
            return last + 1
    return obj.lineno if obj.lineno else 1


def _loc(obj) -> dict:
    return {'filename': str(obj.filepath), 'lineno': _def_lineno(obj)}


def _render(expr) -> str | None:
    return None if expr is None else str(expr)


def _emit_docstring(obj) -> dict | None:
    ds = getattr(obj, 'docstring', None)
    if ds is None or ds.value is None:
        return None
    location = {'filename': str(obj.filepath), 'lineno': ds.lineno if ds.lineno else (obj.lineno or 1)}
    return {'location': location, 'content': docstring_to_json_content(ds.value)}


def _emit_decorations(obj) -> list:
    out = []
    for d in getattr(obj, 'decorators', None) or []:
        s = str(d.value)
        if '(' in s:
            name = s[: s.index('(')]
            args = s[s.index('(') :]
        else:
            name = s
            args = None
        deco: dict = {'location': {'filename': str(obj.filepath), 'lineno': d.lineno or 1}, 'name': name}
        if args is not None:
            deco['args'] = args
        out.append(deco)
    return out


def _emit_arg(p) -> dict:
    a: dict = {'name': p.name, 'type': _PARAM_KIND_MAP.get(p.kind.value, 'POSITIONAL')}
    if p.annotation is not None:
        a['datatype'] = _render(p.annotation)
    # Variadic params (*args / **kwargs) have no default; griffe reports ()/{} which pydoc omits.
    if p.default is not None and p.kind.value not in ('variadic positional', 'variadic keyword'):
        a['default_value'] = _render(p.default)
    return a


def _is_synthesized(obj) -> bool:
    # griffe synthesizes a dataclass __init__ with lineno 0; pydoc-markdown never emits it.
    return obj.kind is griffe.Kind.FUNCTION and not obj.lineno


def _emit_function(obj) -> dict:
    d: dict = {
        'type': 'function',
        'name': obj.name,
        'location': _loc(obj),
        'decorations': _emit_decorations(obj),
        'args': [_emit_arg(p) for p in obj.parameters],
        'return_type': _render(obj.returns),
    }
    ds = _emit_docstring(obj)
    if ds is not None:
        d['docstring'] = ds
    if 'async' in (obj.labels or set()):
        d['modifiers'] = ['async']
    return d


def _emit_property(obj) -> dict:
    # griffe models @property as an Attribute with a 'property' label; the legacy pipeline emits it
    # as a function carrying a `property` decoration, a single `self` arg, and the return type.
    d: dict = {
        'type': 'function',
        'name': obj.name,
        'location': _loc(obj),
        'decorations': [{'location': _loc(obj), 'name': 'property'}],
        'args': [{'name': 'self', 'type': 'POSITIONAL'}],
        'return_type': _render(obj.annotation),
    }
    ds = _emit_docstring(obj)
    if ds is not None:
        d['docstring'] = ds
    return d


def _emit_attribute(obj) -> dict:
    d: dict = {'type': 'data', 'name': obj.name, 'location': _loc(obj)}
    if obj.annotation is not None:
        d['datatype'] = _render(obj.annotation)
    if obj.value is not None:
        d['value'] = _render(obj.value)
    ds = _emit_docstring(obj)
    if ds is not None:
        d['docstring'] = ds
    return d


def _emit_class(obj) -> dict:
    return {
        'type': 'class',
        'name': obj.name,
        'location': _loc(obj),
        'bases': [str(b) for b in (obj.bases or [])],
        'decorations': _emit_decorations(obj),
        **({'docstring': ds} if (ds := _emit_docstring(obj)) is not None else {}),
        'members': _emit_members(obj),
    }


# Mirrors pydoc-markdown FilterProcessor (exclude_private=True, exclude_special=True,
# documented_only=False), applied post-order: a node with surviving members is always kept.
_SPECIAL_MEMBERS = ('__path__', '__annotations__', '__name__', '__all__')


def _keep(name: str, members: list) -> bool:
    if members:
        return True
    if name.startswith('_') and not name.endswith('_'):
        return False  # private
    if name in _SPECIAL_MEMBERS:
        return False  # special
    return True


def _in_method(lineno, method_ranges) -> bool:
    return lineno is not None and any(lo <= lineno <= hi for lo, hi in method_ranges)


def _emit_one(m, method_ranges) -> dict | None:
    if getattr(m, 'is_alias', False):
        return None  # re-exports -> docspec indirections (hidden anyway)
    if m.kind is griffe.Kind.MODULE:
        return None  # submodules become their own top-level records
    if _is_synthesized(m):
        return None
    if m.kind is griffe.Kind.CLASS:
        node = _emit_class(m)
        return node if _keep(m.name, node['members']) else None
    if m.kind is griffe.Kind.FUNCTION:
        return _emit_function(m) if _keep(m.name, []) else None
    if m.kind is griffe.Kind.ATTRIBUTE:
        if 'property' in (m.labels or set()):
            return _emit_property(m) if _keep(m.name, []) else None
        # Instance attributes assigned inside a method (self.x = ...) aren't captured by
        # pydoc-markdown's class-body loader; only class-body declarations are.
        if _in_method(m.lineno, method_ranges):
            return None
        return _emit_attribute(m) if _keep(m.name, []) else None
    return None


def _emit_members(container) -> list:
    method_ranges = []
    if container.kind is griffe.Kind.CLASS:
        method_ranges = [
            (m.lineno, m.endlineno)
            for m in container.members.values()
            if m.kind is griffe.Kind.FUNCTION and m.lineno and m.endlineno
        ]
    out = []
    for m in container.members.values():
        node = _emit_one(m, method_ranges)
        if node is not None:
            out.append(node)
    return out


def _all_modules(mod):
    yield mod
    for m in mod.members.values():
        if not getattr(m, 'is_alias', False) and m.kind is griffe.Kind.MODULE:
            yield from _all_modules(m)


def _module_name(path: str, pkg_name: str) -> str:
    if path == pkg_name:
        return '__init__'
    return path[len(pkg_name) + 1 :]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('-i', '--input', help='Path to the Python module to generate the AST from.', required=True)
    parser.add_argument('output', help='Path to store the generated AST as a JSON file in.')
    args = parser.parse_args()

    project_path = os.path.abspath(args.input)
    repo_root_path = search_for_git_root(project_path)
    if not repo_root_path:
        raise Exception('Could not find git root directory. Are you sure the Python module is in a git repository?')

    pkg_name = os.path.basename(project_path)
    search_path = os.path.dirname(project_path)

    package = griffe.load(pkg_name, search_paths=[search_path])

    dump = []
    for mod in _all_modules(package):
        dump.append(
            {
                'name': _module_name(mod.path, pkg_name),
                'location': {'filename': str(mod.filepath), 'lineno': 1},
                'members': _emit_members(mod),
            }
        )

    with open(args.output, 'w') as f:
        f.write(json.dumps(dump, indent=4).replace(repo_root_path, 'REPO_ROOT_PLACEHOLDER'))


if __name__ == '__main__':
    main()
