import{B as e,E as t,H as n,I as r,J as i,L as a,Q as o,S as s,U as c,V as l,W as u,Z as d,b as f,g as p,j as m,m as h,ot as g,r as _,rt as v,w as y,x as b,y as ee}from"../chunks/DSgfH8D2.js";import"../chunks/DEDqjojZ.js";import{t as x}from"../chunks/nTWNy8E4.js";import{r as S,t as C}from"../chunks/DxHX2bQy.js";import{_ as w,c as te,d as ne,f as re,g as T,i as ie,o as ae,p as E,r as oe,s as D,t as O}from"../chunks/CQdlym-I.js";var k=g({entries:()=>A,prerender:()=>!0,ssr:()=>!0});function A(){return[{locale:void 0},...S.map(e=>({locale:e}))]}var se=y(`<style>html,
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
			font-size: 28px;
			font-weight: 600;
			gap: 12px;
		}
		.trmnl .panel.done .panelTitle {
			font-size: 40px;
			justify-content: center;
		}
		.trmnl .panelTime {
			font-size: 22px;
			font-weight: 500;
			font-variant-numeric: tabular-nums;
			/* "15:22 - 15:37 (15 Min)" must stay one line — wrapping after the
			   opening paren reads as a layout glitch. */
			white-space: nowrap;
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
		}</style>`),ce=y(`<div class="panelTitle"> </div>`),le=y(`<div class="panelTitle"><span> </span> <span class="panelTime"> </span></div> <div class="panelDesc"> </div>`,1),j=y(`<section><div class="panelLabel"> </div> <!></section>`),ue=y(`<tr><td class="rowTime"> </td><td class="rowDate"> </td><td class="rowStep"> </td><td class="rowDuration"> </td></tr>`),de=y(`<div class="trmnl"><header class="head"><div class="brand"><span class="title"> </span> <span class="summary"> <!> </span></div> <div class="ready"><span class="readyLabel"> </span> <span class="readyTime"> </span></div></header> <!> <table class="rows"><tbody></tbody></table></div>`);function M(g,y){o(y,!0);function k(e){return typeof e==`string`&&S.includes(e)}let A=k(x.params.locale)?x.params.locale:`en`;C.set(A);let M=u({readyBy:new Date(Date.now()+1440*60*1e3),startAt:new Date,pizzaCount:6,ballWeight:280,hydration:70,saltPercent:3,yeastType:`fresh`,starterHydration:100,roomTempC:22,fridgeTempC:4,preFerment:null,...te(window.location.search)}),N=new oe;_(()=>{let e=setInterval(()=>N.setTime(Date.now()),3e4);return()=>clearInterval(e)});let P=i(()=>O(M)),F=i(()=>ie(m(P).steps,N)),I=i(()=>C.t),L=i(()=>C.locale),R=i(()=>{let e=m(P).steps;if(e.length===0)return null;let t=e.length-1;return m(F)===t?{step:e[t],label:m(I).trmnl.done,isDone:!0}:m(F)>=0?{step:e[m(F)],label:m(I).trmnl.now,isDone:!1}:{step:e[0],label:m(I).trmnl.next,isDone:!1}}),z=i(()=>M.yeastType===`fresh`?m(I).form.yeast_fresh:m(I).form.yeast_sourdough),B=i(()=>M.preFerment?.type===`biga`?m(I).form.preFerment_biga:M.preFerment?.type===`poolish`?m(I).form.preFerment_poolish:null);var V=de();p(`5xcj7v`,t=>{var n=se();r(()=>{e.title=`${m(I).app.title??``} — TRMNL`}),s(t,n)});var H=l(V),U=l(H),W=l(U),fe=l(W,!0);v(W);var G=c(W,2),K=l(G),q=c(K),pe=e=>{var n=t();a(()=>b(n,`· ${m(B)??``}`)),s(e,n)};f(q,e=>{m(B)&&e(pe)});var me=c(q);v(G),v(U);var J=c(U,2),Y=l(J),he=l(Y,!0);v(Y);var X=c(Y,2),ge=l(X,!0);v(X),v(J),v(H);var Z=c(H,2),_e=e=>{var t=j();let r;var i=l(t),o=l(i,!0);v(i);var u=c(i,2),d=e=>{var t=ce(),n=l(t,!0);v(t),a(e=>b(n,e),[()=>D(m(R).step,m(I))]),s(e,t)},p=e=>{var t=le(),r=n(t),i=l(r),o=l(i,!0);v(i);var u=c(i,2),d=l(u);v(u),v(r);var f=c(r,2),p=l(f,!0);v(f),a((e,t,n,r,i)=>{b(o,e),b(d,`${t??``} - ${n??``}
						(${r??``})`),b(p,i)},[()=>D(m(R).step,m(I)),()=>w(m(R).step.at,m(L)),()=>w(new Date(m(R).step.at.getTime()+m(R).step.durationMinutes*6e4),m(L)),()=>E(m(R).step.durationMinutes,m(L)),()=>ae(m(R).step,m(I),m(P))]),s(e,t)};f(u,e=>{m(R).isDone?e(d):e(p,-1)}),v(t),a(()=>{r=h(t,1,`panel`,null,r,{done:m(R).isDone}),b(o,m(R).label)}),s(e,t)};f(Z,e=>{m(R)&&e(_e)});var Q=c(Z,2),$=l(Q);ee($,23,()=>m(P).steps,e=>e.kind+`-`+e.at.getTime(),(e,t,n)=>{var r=ue();let i;var o=l(r),u=l(o,!0);v(o);var d=c(o),f=l(d,!0);v(d);var p=c(d),g=l(p,!0);v(p);var _=c(p),y=l(_,!0);v(_),v(r),a((e,a,o,s)=>{i=h(r,1,``,null,i,{past:m(n)<m(F),current:m(n)===m(F)&&m(F)<m(P).steps.length-1,rowReady:m(t).kind===`ready`}),b(u,e),b(f,a),b(g,o),b(y,s)},[()=>w(m(t).at,m(L)),()=>T(m(t).at,m(L)),()=>D(m(t),m(I)),()=>m(t).durationMinutes>0?E(m(t).durationMinutes,m(L)):`—`]),s(e,r)}),v($),v(Q),v(V),a((e,t)=>{b(fe,m(I).app.title),b(K,`${M.pizzaCount??``} × ${e??``} g · ${M.hydration??``}% · ${m(z)??``}`),b(me,` · ${(m(P).mode===`cold`?m(I).mode.cold:m(I).mode.room)??``}`),b(he,m(I).form.readyBy),b(ge,t)},[()=>ne(M.ballWeight),()=>re(M.readyBy,m(L)).replace(/,/g,``)]),s(g,V),d()}export{M as component,k as universal};