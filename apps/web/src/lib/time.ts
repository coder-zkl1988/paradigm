import { getLang } from './i18n';

/** "2 hours ago", "yesterday", "last week", in the page's language. */
export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000), zh = getLang() === 'zh';
  const m = s / 60, h = m / 60, d = h / 24;
  if (s < 60) return zh ? '刚刚' : 'just now';
  if (m < 60) return zh ? `${Math.floor(m)} 分钟前` : `${Math.floor(m)} minute${Math.floor(m) === 1 ? '' : 's'} ago`;
  if (h < 24) return zh ? `${Math.floor(h)} 小时前` : `${Math.floor(h)} hour${Math.floor(h) === 1 ? '' : 's'} ago`;
  if (d < 2) return zh ? '昨天' : 'yesterday';
  if (d < 7) return zh ? `${Math.floor(d)} 天前` : `${Math.floor(d)} days ago`;
  if (d < 14) return zh ? '上周' : 'last week';
  return new Date(iso).toLocaleDateString(zh ? 'zh-CN' : 'en', { month: 'short', day: 'numeric', year: d > 300 ? 'numeric' : undefined });
}
