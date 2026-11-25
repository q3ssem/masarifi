// Shared bounds for journal and interchange formats. UTF-8, not UTF-16.
export const JOURNAL_MAX_COMMANDS=20000,JOURNAL_MAX_BYTES=8*1024*1024;
export function utf8Bytes(s){let n=0;for(const c of s){const v=c.codePointAt(0);n+=v<=127?1:v<=2047?2:v<=65535?3:4;}return n;}
