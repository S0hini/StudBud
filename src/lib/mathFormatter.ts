/**
 * Math and LaTeX expression normalizer for StudBud.
 * Converts various LLM mathematical outputs (LaTeX bracket notation, raw parentheses,
 * unformatted inequalities, exponential forms) into standard KaTeX/Markdown format.
 * Protects already-formatted LaTeX blocks to prevent corruption of piecewise functions and sub-formulas.
 */
export function formatMathExpressions(text: string): string {
  if (!text) return '';

  const blocks: string[] = [];

  // Step 1: Protect existing display math $$...$$ and inline math $...$
  // Use function replacer to prevent JavaScript $1/$& token corruption
  let formatted = text.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (match) => {
    blocks.push(match);
    return `___MATH_RESERVED_${blocks.length - 1}___`;
  });

  // Step 2: Remove weird LLM artifacts like \Bigl(, or \left(,
  formatted = formatted.replace(/\\(Bigl|left|bigl|biggl|Biggl)\(\s*,\s*/g, '\\$1(');
  formatted = formatted.replace(/,\s*\\(Bigr|right|bigr|biggr|Biggr)\)/g, '\\$1)');

  // Step 3: Convert standard LaTeX block delimiters \[ ... \] (not preceded by backslash like \\[4pt])
  formatted = formatted.replace(/(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/g, (_, inner) => {
    return `\n\n$$ ${inner.trim()} $$\n\n`;
  });

  // Step 4: Convert inline LaTeX delimiters \( ... \) (not preceded by backslash)
  formatted = formatted.replace(/(?<!\\)\\\(([\s\S]*?)(?<!\\)\\\)/g, (_, inner) => {
    return `$${inner.trim()}$`;
  });

  // Step 5: Convert bare bracketed LaTeX formulas like [ \lim_{...} ... ]
  formatted = formatted.replace(/(?:^|\n)\s*\[\s*(\\lim|\\frac|\\int|\\sum|\\prod|\\exp|\\sqrt|[a-zA-Z0-9_.\-^]+\s*=)[\s\S]*?\]\s*(?:\n|$)/g, (match) => {
    const trimmed = match.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1).trim();
      return `\n\n$$ ${inner} $$\n\n`;
    }
    return match;
  });

  // Step 6: Convert parenthesized exponential expressions like (a^{\infty}), (1^{\infty}), (0^{0}), (\infty^{0})
  formatted = formatted.replace(/\(([a-zA-Z0-9_.\-\\]+\^\{?[a-zA-Z0-9_.\-\\]+\}?(?:=[^)]+)?)\)/g, (_, inner) => {
    return `$${inner}$`;
  });

  // Step 7: Convert parenthesized symbols like (\infty), (\alpha), (\beta), (\theta)
  formatted = formatted.replace(/\((\\[a-zA-Z]+(?:\{[^}]*\}|_[a-zA-Z0-9{}]+|\^[a-zA-Z0-9{}]+)*)\)/g, (_, inner) => {
    return `$${inner}$`;
  });

  // Step 8: Convert parenthesized inequalities like (0<a<1), (a>1), (x \to a)
  formatted = formatted.replace(/\(([a-zA-Z0-9_.\-\\]+\s*(?:<|>|<=|>=|\\le|\\ge|\\to|\\neq|=)\s*[a-zA-Z0-9_.\-\\]+(?:\s*(?:<|>|<=|>=)\s*[a-zA-Z0-9_.\-\\]+)?)\)/g, (_, inner) => {
    return `$${inner}$`;
  });

  // Step 9: Restore all protected math blocks safely using functional replacement
  formatted = formatted.replace(/___MATH_RESERVED_(\d+)___/g, (_, idStr) => {
    const idx = parseInt(idStr, 10);
    return blocks[idx] || '';
  });

  // Step 10: Clean up spacing around display math
  formatted = formatted.replace(/\$\$\s*\n\s*\$\$/g, '$$$$');

  return formatted;
}
