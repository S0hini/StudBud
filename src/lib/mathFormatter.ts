/**
 * Math and LaTeX expression normalizer for StudBud.
 * Converts various LLM mathematical outputs (LaTeX bracket notation, raw parentheses,
 * unformatted inequalities, exponential forms) into standard KaTeX/Markdown format.
 */
export function formatMathExpressions(text: string): string {
  if (!text) return '';

  let formatted = text;

  // 1. Remove weird LLM artifacts like \Bigl(, or \left(,
  formatted = formatted.replace(/\\(Bigl|left|bigl|biggl|Biggl)\(\s*,\s*/g, '\\$1(');
  formatted = formatted.replace(/,\s*\\(Bigr|right|bigr|biggr|Biggr)\)/g, '\\$1)');

  // 2. Convert standard LaTeX block delimiters \[ ... \] to $$ ... $$
  formatted = formatted.replace(/\\\[([\s\S]*?)\\\]/g, '\n\n$$$$$1$$$$\n\n');

  // 3. Convert bare bracketed LaTeX formulas like [ \lim_{...} ... ] to $$ ... $$
  formatted = formatted.replace(/(?:^|\n)\s*\[\s*(\\lim|\\frac|\\int|\\sum|\\prod|\\exp|\\sqrt|[a-zA-Z0-9_.\-^]+\s*=)[\s\S]*?\]\s*(?:\n|$)/g, (match) => {
    const trimmed = match.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1).trim();
      return `\n\n$$ ${inner} $$\n\n`;
    }
    return match;
  });

  // 4. Convert inline LaTeX delimiters \( ... \) to $ ... $
  formatted = formatted.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  // 5. Convert double-parenthesized math like ((0.5)^{\infty}=0) to $(0.5)^{\infty}=0$
  formatted = formatted.replace(/\(\(([0-9_.\-]+(?:\^[a-zA-Z0-9_.\-{}]+)+=[^)]+)\)\)/g, '$$$1$$');

  // 6. Convert parenthesized exponential expressions like (a^{\infty}), (1^{\infty}), (0^{0}), (\infty^{0}), (2^{\infty}=\infty)
  formatted = formatted.replace(/\(([a-zA-Z0-9_.\-\\]+\^\{?[a-zA-Z0-9_.\-\\]+\}?(?:=[^)]+)?)\)/g, '$$$1$$');

  // 7. Convert parenthesized LaTeX symbols like (\infty), (\alpha), (\beta), (\theta), (\lim_{...})
  formatted = formatted.replace(/\((\\[a-zA-Z]+(?:\{[^}]*\}|_[a-zA-Z0-9{}]+|\^[a-zA-Z0-9{}]+)*)\)/g, '$$$1$$');

  // 8. Convert parenthesized inequalities containing math symbols like (0<a<1), (a>1), (x \to a), (x \neq 0)
  formatted = formatted.replace(/\(([a-zA-Z0-9_.\-\\]+\s*(?:<|>|<=|>=|\\le|\\ge|\\to|\\neq|=)\s*[a-zA-Z0-9_.\-\\]+(?:\s*(?:<|>|<=|>=)\s*[a-zA-Z0-9_.\-\\]+)?)\)/g, '$$$1$$');

  // 9. Clean up spacing around display math
  formatted = formatted.replace(/\$\$\s*\n\s*\$\$/g, '$$$$');

  return formatted;
}
