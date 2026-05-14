import{A as e,B as t,C as n,F as r,H as i,I as a,T as o,U as s,V as c,X as l,Z as u,at as d,b as f,h as p,nt as m,p as h,q as g,r as _,v,x as y,y as b,z as ee}from"../chunks/-KuUnI0l.js";import"../chunks/DEDqjojZ.js";import{t as x}from"../chunks/g-N2ah6M.js";import{n as S,t as C}from"../chunks/CGfLsJTe.js";import{a as w,d as T,h as E,i as te,l as D,m as ne,o as re,r as ie,t as O,u as ae}from"../chunks/Ce5iO_eE.js";var k=d({entries:()=>A,prerender:()=>!0,ssr:()=>!0});function A(){return[{locale:void 0},...S.map(e=>({locale:e}))]}function oe(e,t){let n=t.getTime(),r=-1;for(let t=0;t<e.length&&e[t].at.getTime()<=n;t++)r=t;return r}var se=n(`<style>html,
		body {
			background: #ffffff !important;
			color: #000000 !important;
		}
		.trmnl {
			width: 800px;
			height: 480px;
			margin: 0 auto;
			padding: 16px 20px;
			box-sizing: border-box;
			background: #ffffff;
			color: #000000;
			font-family:
				'Inter',
				ui-sans-serif,
				system-ui,
				-apple-system,
				sans-serif;
			font-size: 19px;
			line-height: 1.3;
			display: flex;
			flex-direction: column;
			gap: 8px;
		}
		.trmnl .head {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			gap: 16px;
		}
		.trmnl .brand {
			display: flex;
			flex-direction: column;
			gap: 2px;
			min-width: 0;
		}
		.trmnl .title {
			font-size: 32px;
			font-weight: 600;
			letter-spacing: -0.01em;
		}
		.trmnl .summary {
			font-size: 15px;
		}
		.trmnl .ready {
			display: flex;
			flex-direction: column;
			align-items: flex-end;
			text-align: right;
			/* Don't let the flex layout squeeze the readyTime narrower than its
			   content — a long recipe summary on the left would otherwise force
			   "Fri May 15 02:09 PM" to wrap into two lines. */
			flex-shrink: 0;
		}
		.trmnl .readyLabel {
			font-size: 13px;
			text-transform: uppercase;
			letter-spacing: 0.08em;
			white-space: nowrap;
		}
		.trmnl .readyTime {
			font-size: 26px;
			font-weight: 600;
			font-variant-numeric: tabular-nums;
			white-space: nowrap;
		}
		.trmnl .panel {
			border: 2px solid #000;
			padding: 10px 14px;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}
		.trmnl .panel.done {
			border-width: 3px;
			text-align: center;
			justify-content: center;
			align-items: center;
			padding: 18px 14px;
		}
		.trmnl .panelLabel {
			font-size: 13px;
			text-transform: uppercase;
			letter-spacing: 0.1em;
		}
		.trmnl .panelTitle {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			font-size: 32px;
			font-weight: 600;
			gap: 12px;
		}
		.trmnl .panel.done .panelTitle {
			font-size: 44px;
			justify-content: center;
		}
		.trmnl .panelTime {
			font-size: 26px;
			font-weight: 500;
			font-variant-numeric: tabular-nums;
		}
		.trmnl .panelDesc {
			font-size: 17px;
		}
		.trmnl .rows {
			width: 100%;
			border-collapse: collapse;
			font-variant-numeric: tabular-nums;
		}
		.trmnl .rows td {
			padding: 4px 0;
			font-size: 18px;
			vertical-align: middle;
		}
		.trmnl .rowTime {
			width: 100px;
			white-space: nowrap;
			padding-right: 10px;
			font-variant-numeric: tabular-nums;
		}
		.trmnl .rowDate {
			width: 140px;
			white-space: nowrap;
			padding-right: 16px;
		}
		.trmnl .rowDuration {
			width: 130px;
			white-space: nowrap;
			text-align: right;
			padding-left: 10px;
		}
		.trmnl .rows tr.past td {
			text-decoration: line-through;
			color: #666;
		}
		.trmnl .rows tr.current td {
			font-weight: 700;
			background: #000;
			color: #fff;
			padding-left: 6px;
			padding-right: 6px;
		}
		.trmnl .rows tr.rowReady td {
			font-weight: 700;
		}</style>`),ce=n(`<div class="panelTitle"> </div>`),le=n(`<div class="panelTitle"><span> </span> <span class="panelTime"> </span></div> <div class="panelDesc"> </div>`,1),ue=n(`<section><div class="panelLabel"> </div> <!></section>`),j=n(`<tr><td class="rowTime"> </td><td class="rowDate"> </td><td class="rowStep"> </td><td class="rowDuration"> </td></tr>`),de=n(`<div class="trmnl"><header class="head"><div class="brand"><span class="title"> </span> <span class="summary"> <!> </span></div> <div class="ready"><span class="readyLabel"> </span> <span class="readyTime"> </span></div></header> <!> <table class="rows"><tbody></tbody></table></div>`);function M(n,d){u(d,!0);function k(e){return typeof e==`string`&&S.includes(e)}let A=k(x.params.locale)?x.params.locale:`en`;C.set(A);let M=s({readyBy:new Date(Date.now()+1440*60*1e3),startAt:new Date,pizzaCount:6,ballWeight:280,hydration:70,saltPercent:3,yeastType:`fresh`,starterHydration:100,roomTempC:22,fridgeTempC:4,preFerment:null,...re(window.location.search)}),N=new ie;_(()=>{let e=setInterval(()=>N.setTime(Date.now()),3e4);return()=>clearInterval(e)});let P=g(()=>O(M)),F=g(()=>oe(e(P).steps,N)),I=g(()=>C.t),L=g(()=>C.locale),R=g(()=>{let t=e(P).steps;if(t.length===0)return null;let n=t.length-1;return e(F)===n?{step:t[n],label:e(I).trmnl.done,isDone:!0}:e(F)>=0?{step:t[e(F)],label:e(I).trmnl.now,isDone:!1}:{step:t[0],label:e(I).trmnl.next,isDone:!1}}),z=g(()=>M.yeastType===`fresh`?e(I).form.yeast_fresh:e(I).form.yeast_sourdough),B=g(()=>M.preFerment?.type===`biga`?e(I).form.preFerment_biga:M.preFerment?.type===`poolish`?e(I).form.preFerment_poolish:null);var V=de();p(`5xcj7v`,t=>{var n=se();r(()=>{ee.title=`${e(I).app.title??``} — TRMNL`}),y(t,n)});var H=t(V),U=t(H),W=t(U),fe=t(W,!0);m(W);var G=i(W,2),K=t(G),q=i(K),pe=t=>{var n=o();a(()=>f(n,`· ${e(B)??``}`)),y(t,n)};b(q,t=>{e(B)&&t(pe)});var me=i(q);m(G),m(U);var J=i(U,2),Y=t(J),he=t(Y,!0);m(Y);var X=i(Y,2),ge=t(X,!0);m(X),m(J),m(H);var Z=i(H,2),_e=n=>{var r=ue();let o;var s=t(r),l=t(s,!0);m(s);var u=i(s,2),d=n=>{var r=ce(),i=t(r,!0);m(r),a(e=>f(i,e),[()=>w(e(R).step,e(I))]),y(n,r)},p=n=>{var r=le(),o=c(r),s=t(o),l=t(s,!0);m(s);var u=i(s,2),d=t(u);m(u),m(o);var p=i(o,2),h=t(p,!0);m(p),a((e,t,n,r,i)=>{f(l,e),f(d,`${t??``} - ${n??``}
						(${r??``})`),f(h,i)},[()=>w(e(R).step,e(I)),()=>E(e(R).step.at,e(L)),()=>E(new Date(e(R).step.at.getTime()+e(R).step.durationMinutes*6e4),e(L)),()=>T(e(R).step.durationMinutes,e(L)),()=>te(e(R).step,e(I),e(P))]),y(n,r)};b(u,t=>{e(R).isDone?t(d):t(p,-1)}),m(r),a(()=>{o=h(r,1,`panel`,null,o,{done:e(R).isDone}),f(l,e(R).label)}),y(n,r)};b(Z,t=>{e(R)&&t(_e)});var Q=i(Z,2),$=t(Q);v($,23,()=>e(P).steps,e=>e.kind+`-`+e.at.getTime(),(n,r,o)=>{var s=j();let c;var l=t(s),u=t(l,!0);m(l);var d=i(l),p=t(d,!0);m(d);var g=i(d),_=t(g,!0);m(g);var v=i(g),b=t(v,!0);m(v),m(s),a((t,n,i,a)=>{c=h(s,1,``,null,c,{past:e(o)<e(F),current:e(o)===e(F)&&e(F)<e(P).steps.length-1,rowReady:e(r).kind===`ready`}),f(u,t),f(p,n),f(_,i),f(b,a)},[()=>E(e(r).at,e(L)),()=>ne(e(r).at,e(L)),()=>w(e(r),e(I)),()=>e(r).durationMinutes>0?T(e(r).durationMinutes,e(L)):`—`]),y(n,s)}),m($),m(Q),m(V),a((t,n)=>{f(fe,e(I).app.title),f(K,`${M.pizzaCount??``} × ${t??``} g · ${M.hydration??``}% · ${e(z)??``}`),f(me,` · ${(e(P).mode===`cold`?e(I).mode.cold:e(I).mode.room)??``}`),f(he,e(I).form.readyBy),f(ge,n)},[()=>D(M.ballWeight),()=>ae(M.readyBy,e(L)).replace(/,/g,``)]),y(n,V),l()}export{M as component,k as universal};