import fs from 'node:fs'
import Papa from 'papaparse'

const DOCS = '/Users/seungchuloh/Documents'
function decode(p){const b=fs.readFileSync(p);let t;try{t=new TextDecoder('utf-8',{fatal:true}).decode(b)}catch{t=new TextDecoder('euc-kr').decode(b)}if(t.charCodeAt(0)===0xfeff)t=t.slice(1);return t}
const clean=(v)=>String(v??'').replace(/\s+/g,' ').trim()
const isNum=(v)=>/[0-9]/.test(String(v??''))
const push=(a,v)=>{const t=String(v??'').trim();if(t)a.push(t)}
const collapse=(t)=>t.split('\n').map(l=>l.trim()).filter(Boolean).join('\n')
function amt(raw,div){let s=String(raw??'').replace(/[,\s]/g,'');if(!s||!/[0-9]/.test(s))return null;s=s.replace(/[△▲]/g,'-');const n=parseFloat(s);if(isNaN(n))return null;return Math.round(div?n/1000:n)}
function meta(title,fn){const src=title+' '+fn;let ty=/경상/.test(src)?'경상':/투자/.test(src)?'투자':'';const yT=title.match(/'?\s*(\d{2})\s*[.년]/);const yF=fn.match(/(\d{2})\s*년/)??fn.match(/(\d{2})/);const yr=(yT?.[1]??yF?.[1]??'').trim();let ch='';const cn=src.match(/제?\s*(\d)\s*회?\s*추(?:가경정|경)/);if(cn)ch=`제${cn[1]}회 추경`;else if(/추가경정|추경/.test(src))ch='추경';else if(/본예산/.test(src))ch='본예산';return{년도:yr,차수:ch,사업유형:ty}}

function parseG(rows,m){const out=[];let up='',dn='',pg='',cur=null
  const flush=()=>{if(!cur)return;cur.사업개요=cur._ov.join('\n');cur.검토내용=collapse(cur._rv.join('\n'));cur.조건검색어=cur._kw.join(' ').replace(/\s+/g,' ').trim();delete cur._ov;delete cur._rv;delete cur._kw;out.push(cur);cur=null}
  for(let i=5;i<rows.length;i++){const r=rows[i];if(!r||r.length<10)continue
    const c0=clean(r[0]),c1r=String(r[1]??'').trim(),c1=clean(r[1]),req=String(r[5]??''),adj=String(r[6]??''),rev=String(r[7]??'').trim(),tong=clean(r[8]),kw=String(r[9]??'').trim()
    const hb=isNum(req)||isNum(adj)||isNum(r[3])
    if(c0==='합계')continue
    if(c0){flush();const sp=/\s/.test(c0);if(!sp&&/(과|담당관)$/.test(c0))dn=c0;else if(!sp&&/(국|실|본부|처|위원회|청|관|원|센터|사업소|단)$/.test(c0)){up=c0;dn=''}else pg=c0;continue}
    if(c1&&hb){flush();cur={type:'경상사업',...m,부서명:[up,dn].filter(Boolean).join(' '),정책사업:pg,사업명:c1,통계목:tong,요구액:amt(req,true),조정액:amt(adj,true),요구_국비:null,요구_시비:null,조정_국비:null,조정_시비:null,재원내역:false,_ov:[],_rv:[],_kw:[]};push(cur._rv,rev);push(cur._kw,kw);continue}
    if(cur){if(c1r&&c1!==up&&c1!==dn&&c1!==pg)push(cur._ov,c1r);push(cur._rv,rev);push(cur._kw,kw)}}
  flush();return out}

function parseT(rows,m){const out=[];let gk='',cur=null
  const flush=()=>{if(!cur)return;let gwa='';for(const l of cur._ov){const mm=l.match(/^([가-힣A-Za-z0-9]{2,12}과)(?:[,\s]|$)/);if(mm){gwa=mm[1];break}}cur.부서명=[gk,gwa].filter(Boolean).join(' ');cur.사업개요=cur._ov.join('\n');cur.검토내용=collapse(cur._rv.join('\n'));cur.조건검색어=cur._kw.join(' ').replace(/\s+/g,' ').trim();delete cur._ov;delete cur._rv;delete cur._kw;out.push(cur);cur=null}
  for(let i=0;i<rows.length;i++){const r=rows[i];if(!r||r.length<13)continue
    const seq=clean(r[0]),c2r=String(r[2]??'').trim(),c2=c2r.replace(/\s+/g,' ').trim(),c3=clean(r[3]),c4=clean(r[4]),col8=String(r[8]??''),col9=String(r[9]??''),rev=String(r[10]??'').trim(),tong=clean(r[11]),kw=String(r[12]??'').trim()
    if(!seq&&c2&&c3==='계'){flush();gk=c2r.split('\n')[0].replace(/\(.*$/,'').trim();continue}
    if(seq&&isNum(seq)&&c2){flush();cur={type:'투자사업',...m,부서명:'',정책사업:'',사업명:c2r.split('\n')[0].trim(),통계목:tong,요구액:amt(col8,false),조정액:amt(col9,false),요구_국비:null,요구_시비:null,조정_국비:null,조정_시비:null,재원내역:true,_ov:[],_rv:[],_kw:[]};push(cur._rv,rev);push(cur._kw,kw);continue}
    if(cur){if(c4==='시비'){cur.요구_시비=amt(col8);cur.조정_시비=amt(col9)}else if(c4==='국비'){cur.요구_국비=amt(col8);cur.조정_국비=amt(col9)}if(c2r&&c2!==cur.사업명)push(cur._ov,c2r);push(cur._rv,rev);push(cur._kw,kw)}}
  flush();return out}

const files=fs.readdirSync(DOCS).map(f=>({raw:f,n:f.normalize('NFC')})).filter(f=>f.n.endsWith('.csv')&&/25년/.test(f.n))
for(const f of files){
  const rows=Papa.parse(decode(DOCS+'/'+f.raw),{header:false,skipEmptyLines:false}).data
  const cols=(()=>{const mp=new Map();for(const r of rows)if(r&&r.length>1)mp.set(r.length,(mp.get(r.length)||0)+1);return[...mp.entries()].sort((a,b)=>b[1]-a[1])[0][0]})()
  const title=String(rows[0]?.[0]??'').normalize('NFC')
  const m=meta(title,f.n)
  const recs=cols===10?parseG(rows,m):parseT(rows,m)
  console.log('\n########',f.n)
  console.log('meta:',JSON.stringify(m),'| records:',recs.length)
  const sample=recs.slice(0,2)
  for(const s of sample){
    console.log('---')
    console.log('유형라벨:',`${s.년도} ${s.차수} ${s.사업유형}사업`)
    console.log('부서명:',JSON.stringify(s.부서명))
    console.log('사업명(통계목):',`${s.사업명}(${s.통계목})`)
    console.log('요구액:',s.요구액,'백만원 | 국비',s.요구_국비,'시비',s.요구_시비,'| 재원내역',s.재원내역)
    console.log('조정액:',s.조정액,'백만원 | 국비',s.조정_국비,'시비',s.조정_시비)
    console.log('사업개요:\n'+(s.사업개요||'(없음)'))
    console.log('검토내용:\n'+(s.검토내용||'(없음)'))
  }
}
