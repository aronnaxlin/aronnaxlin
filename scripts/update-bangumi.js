const fs = require('fs');
const https = require('https');

const BANGUMI_API = 'https://api.bgm.tv/v0/users/aronnax/collections?subject_type=2&type=3&limit=4&offset=0';
const README_PATH = 'README.md';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'aronnaxlin-profile/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function main() {
  console.log('获取 Bangumi 在看列表...');
  const data = await fetchJSON(BANGUMI_API);
  const watching = data.data || [];

  if (watching.length === 0) {
    console.log('没有在看动画');
    return;
  }

  let html = '<table align="center">\n  <tr>\n';

  for (let j = 0; j < Math.min(4, watching.length); j++) {
    const item = watching[j];
    const subject = item.subject;
    const name = subject.name_cn || subject.name;
    const img = subject.images?.common || subject.images?.medium || subject.images?.large || '';
    const url = `https://bgm.tv/subject/${subject.id}`;
    const progress = item.ep_status !== undefined && subject.eps
      ? `${item.ep_status} / ${subject.eps}`
      : (item.ep_status !== undefined ? `${item.ep_status}集` : '未开始');

    html += `    <td align="center" width="180" valign="top">\n`;
    html += `      <a href="${url}">\n`;
    html += `        <img src="${escapeHtml(img)}" width="140" alt="${escapeHtml(name)}"><br>\n`;
    html += `        <b>${escapeHtml(name)}</b>\n`;
    html += `      </a><br>\n`;
    html += `      <sub>📺 ${progress}</sub>\n`;
    html += `    </td>\n`;
  }

  html += '  </tr>\n</table>\n';

  const total = data.total ?? watching.length;
  const badge = `<p align="center">\n  <a href="https://bangumi.tv/user/aronnax">\n    <img src="https://img.shields.io/badge/Bangumi-${total}部在看-F09199?style=for-the-badge&logo=anime&logoColor=white" alt="Bangumi" />\n  </a>\n</p>\n`;

  let readme = fs.readFileSync(README_PATH, 'utf8');

  const replaceBetween = (text, startMarker, endMarker, content) => {
    const startIdx = text.indexOf(startMarker);
    const endIdx = text.indexOf(endMarker);
    if (startIdx === -1 || endIdx === -1) {
      console.error(`README 中找不到标记: ${startMarker}`);
      process.exit(1);
    }
    return text.substring(0, startIdx + startMarker.length) + '\n' + content + text.substring(endIdx);
  };

  readme = replaceBetween(readme, '<!-- BANGUMI-BADGE:START -->', '<!-- BANGUMI-BADGE:END -->', badge);
  readme = replaceBetween(readme, '<!-- BANGUMI:START -->', '<!-- BANGUMI:END -->', html);
  fs.writeFileSync(README_PATH, readme);
  console.log(`README 更新成功（在看 ${total} 部）`);
}

main().catch(err => {
  console.error('出错:', err);
  process.exit(1);
});
