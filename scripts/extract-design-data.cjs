const fs=require('fs');
const src=fs.readFileSync(process.argv[2] || 'design/Main.dc.html','utf8');
const js=src.slice(src.indexOf('var DOT'),src.lastIndexOf('</script>'));
const names=['NODE_DEFS','CATS','ACCEPTS','NODE_OPTS','NODE_HINT','BUILTIN_SUM','BUILTIN_BACKEND','DEFAULT_PINS','DEFAULT_SHELF','PIN_MAX','NODE_STK','DOCK','HZ_STK','STICKERS','SHAPES','STICKY_COLORS','SHAPE_FILLS','FRAME_FILLS','TEXT_COLORS','INK','TEXT_STYLES','ARROW_WEIGHTS','PEN_WEIGHTS','TEMPLATES','MARKET','PKG_TEMPLATE','PKG_SPEC','PKG_STK','UI_RULES','MCP_TOOLS','BOARD_TOOLS','HARNESS','HZ_RES','HZ_ORDER','HZ_PERMS','HZ_SUBS','HZ_OPW','HZ_PCOL','HZ_PNAME','HZ_PNEXT','API','API_ORDER','API_USER','API_EX','ZH','I_EN','I_ZH','WORKSPACES','AVATARS','NEXT_STEP','PREFIX','CORE_NODES','AREA_COL','GRID','AGAP','CHIP_STK'];
const X=new Function('class DCLogic{constructor(p){this.props=p}setState(){}};'+js+'; return {'+names.map(n=>n+': typeof '+n+'==="undefined"?null:'+n).join(',')+'}')();
fs.writeFileSync(process.argv[3] || '/tmp/draft-data.json', JSON.stringify(X,null,1));
for(const n of names) console.log(n, X[n]===null?'MISSING':(Array.isArray(X[n])?'array '+X[n].length:typeof X[n]==='object'?'obj '+Object.keys(X[n]).length:JSON.stringify(X[n]).slice(0,40)));
