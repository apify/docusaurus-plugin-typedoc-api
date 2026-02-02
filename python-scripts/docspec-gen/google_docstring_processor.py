# -*- coding: utf8 -*-
# Copyright (c) 2019 Niklas Rosenstein
# !!! Modified 2024 Jindřich Bär
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to
# deal in the Software without restriction, including without limitation the
# rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
# sell copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
# IN THE SOFTWARE.

import dataclasses
import re
import typing as t

import docspec

from pydoc_markdown.contrib.processors.sphinx import generate_sections_markdown
from pydoc_markdown.interfaces import Processor, Resolver

import json


@dataclasses.dataclass
class ApifyGoogleProcessor(Processor):
    """
    This class implements the preprocessor for Google and PEP 257 docstrings. It converts
    docstrings formatted in the Google docstyle to Markdown syntax.

    References:

    * https://sphinxcontrib-napoleon.readthedocs.io/en/latest/example_google.html
    * https://www.python.org/dev/peps/pep-0257/

    Example:

    ```
    Attributes:
        module_level_variable1 (int): Module level variables may be documented in
            either the ``Attributes`` section of the module docstring, or in an
            inline docstring immediately following the variable.

            Either form is acceptable, but the two should not be mixed. Choose
            one convention to document module level variables and be consistent
            with it.

    Todo:
        * For module TODOs
        * You have to also use ``sphinx.ext.todo`` extension
    ```

    Renders as:

    Attributes:
        module_level_variable1 (int): Module level variables may be documented in
            either the ``Attributes`` section of the module docstring, or in an
            inline docstring immediately following the variable.

            Either form is acceptable, but the two should not be mixed. Choose
            one convention to document module level variables and be consistent
            with it.

    Todo:
        * For module TODOs
        * You have to also use ``sphinx.ext.todo`` extension

    @doc:fmt:google
    """

    _param_res = [
        re.compile(r"^(?P<param>\S+):\s+(?P<desc>.+)$"),
        re.compile(r"^(?P<param>\S+)\s+\((?P<type>[^)]+)\):\s+(?P<desc>.+)$"),
        re.compile(r"^(?P<param>\S+)\s+--\s+(?P<desc>.+)$"),
        re.compile(r"^(?P<param>\S+)\s+\{\[(?P<type>\S+)\]\}\s+--\s+(?P<desc>.+)$"),
        re.compile(r"^(?P<param>\S+)\s+\{(?P<type>\S+)\}\s+--\s+(?P<desc>.+)$"),
    ]

    _keywords_map = {
        "Args:": "Arguments",
        "Arguments:": "Arguments",
        "Attributes:": "Attributes",
        "Example:": "Example",
        "Examples:": "Examples",
        "Keyword Args:": "Arguments",
        "Keyword Arguments:": "Arguments",
        "Methods:": "Methods",
        "Other Parameters:": "Arguments",
        "Parameters:": "Arguments",
        "Return:": "Returns",
        "Returns:": "Returns",
        "Raises:": "Raises",
        "References:": "References",
        "See Also:": "See Also",
        "Todo:": "Todo",
        "Note:": "Note",
        "Tip:": "Tip",
        "Info:": "Info",
        "Warning:": "Warning",
        "Danger:": "Danger",
        "Warns:": "Warns",
        "Yield:": "Yields",
        "Yields:": "Yields",
    }

    def check_docstring_format(self, docstring: str) -> bool:
        for section_name in self._keywords_map:
            if section_name in docstring:
                return True
        return False

    def process(self, modules: t.List[docspec.Module], resolver: t.Optional[Resolver]) -> None:
        docspec.visit(modules, self._process)

    def get_indent_size(self, line: str) -> int:
        return len(line) - len(line.lstrip())

    def _process(self, node: docspec.ApiObject):
        if not node.docstring:
            return

        content = []  # Interleaved list of text strings and section dicts
        current_text_lines: t.List[str] = []
        current_section_lines: t.List[str] = []
        in_codeblock = False
        keyword = None
        keyword_indent = None
        multiline_argument_offset = -1
        state = { 'param_indent': None }

        def _commit_text():
            """Commit accumulated text lines to content."""
            if current_text_lines:
                text = "\n".join(current_text_lines)
                if text.strip():
                    content.append(text)
                current_text_lines.clear()

        def _commit_section():
            """Commit accumulated section to content."""
            nonlocal keyword, keyword_indent
            if keyword:
                content.append({keyword: list(current_section_lines)})
            current_section_lines.clear()
            keyword = None
            keyword_indent = None

        def _commit():
            nonlocal keyword, keyword_indent
            if keyword:
                _commit_section()
            else:
                _commit_text()

        def is_continuation(line: str) -> bool:
            if state.get('param_indent') is None:
                state['param_indent'] = self.get_indent_size(line)
                return False

            return self.get_indent_size(line) > state.get('param_indent')

        for line in node.docstring.content.split("\n"):
            multiline_argument_offset += 1
            if line.lstrip().startswith("```"):
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
            line_indent = self.get_indent_size(line)

            if stripped in self._keywords_map:
                _commit()
                keyword = self._keywords_map[stripped]
                keyword_indent = line_indent
                continue

            # Check if we've exited the current section (line at same or less indent than keyword)
            if keyword is not None and stripped and line_indent <= keyword_indent:
                _commit()
                # Process this line as regular text
                current_text_lines.append(stripped)
                continue

            if keyword is None:
                current_text_lines.append(stripped)
                continue

            for param_re in self._param_res:
                param_match = param_re.match(stripped)
                if param_match and not is_continuation(line):
                    current_section_lines.append(param_match.groupdict())
                    multiline_argument_offset = 0
                    break

            if not param_match:
                if multiline_argument_offset == 1:
                    current_section_lines[-1]["desc"] += "\n" + stripped
                    multiline_argument_offset = 0
                else:
                    current_section_lines.append(stripped)

        _commit()
        node.docstring.content = json.dumps({
            "content": content,
        }, indent=None)


