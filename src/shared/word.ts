/** Download markdown content as a Word-compatible .doc file */
export function downloadAsWord(markdown: string, title: string, filename: string) {
  const escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  const html = `\
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${title}</title>
<style>
  body { font-family: 'Calibri', sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.5; padding: 24pt; }
  h1 { font-size: 18pt; color: #861094; border-bottom: 2px solid #f0abfc; padding-bottom: 6pt; }
  h2 { font-size: 14pt; color: #a20fb5; margin-top: 16pt; }
  h3 { font-size: 12pt; color: #334155; }
  p { margin: 4pt 0; }
  strong { font-weight: bold; }
  em { font-style: italic; }
  ul, ol { margin: 4pt 0 4pt 20pt; }
  li { margin: 2pt 0; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 12pt 0; }
  code { font-family: 'Consolas', monospace; font-size: 9pt; background: #f1f5f9; padding: 1pt 4pt; border-radius: 3pt; }
  pre { font-family: 'Consolas', monospace; font-size: 9pt; background: #f8fafc; padding: 8pt; border: 1px solid #e2e8f0; border-radius: 4pt; }
</style>
</head>
<body>
<h1>${title}</h1>
<div>${escaped}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
