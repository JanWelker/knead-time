import{A as e,B as t,C as n,F as r,H as i,I as a,T as o,U as s,V as c,X as l,Z as u,at as d,b as f,h as p,nt as m,p as h,q as g,r as _,v as ee,x as v,y,z as te}from"../chunks/-KuUnI0l.js";import"../chunks/DEDqjojZ.js";import{t as b}from"../chunks/S6SzXhcZ.js";import{n as x,t as S}from"../chunks/CGfLsJTe.js";import{a as C,i as ne,l as re,m as w,o as ie,r as ae,t as oe,u as T}from"../chunks/4xtt5DDa.js";var E=d({entries:()=>D,prerender:()=>!0,ssr:()=>!0});function D(){return[{locale:void 0},...x.map(e=>({locale:e}))]}function O(e,t){let n=t.getTime(),r=-1;for(let t=0;t<e.length&&e[t].at.getTime()<=n;t++)r=t;return r}var se=n(`<style>html,
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
			font-size: 16px;
			line-height: 1.3;
			display: flex;
			flex-direction: column;
			gap: 10px;
		}
		.trmnl .head {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			gap: 16px;
			border-bottom: 1px solid #000;
			padding-bottom: 6px;
		}
		.trmnl .brand {
			display: flex;
			flex-direction: column;
			gap: 2px;
			min-width: 0;
		}
		.trmnl .title {
			font-family: 'Fraunces', 'Inter', ui-serif, Georgia, serif;
			font-size: 28px;
			font-weight: 600;
			letter-spacing: -0.01em;
		}
		.trmnl .summary {
			font-size: 13px;
		}
		.trmnl .ready {
			display: flex;
			flex-direction: column;
			align-items: flex-end;
			text-align: right;
		}
		.trmnl .readyLabel {
			font-size: 11px;
			text-transform: uppercase;
			letter-spacing: 0.08em;
		}
		.trmnl .readyTime {
			font-family: 'Fraunces', 'Inter', ui-serif, Georgia, serif;
			font-size: 22px;
			font-weight: 600;
			font-variant-numeric: tabular-nums;
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
			font-size: 11px;
			text-transform: uppercase;
			letter-spacing: 0.1em;
		}
		.trmnl .panelTitle {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			font-family: 'Fraunces', 'Inter', ui-serif, Georgia, serif;
			font-size: 28px;
			font-weight: 600;
			gap: 12px;
		}
		.trmnl .panel.done .panelTitle {
			font-size: 40px;
			justify-content: center;
		}
		.trmnl .panelTime {
			font-family: 'Inter', sans-serif;
			font-size: 22px;
			font-weight: 500;
			font-variant-numeric: tabular-nums;
		}
		.trmnl .panelDesc {
			font-size: 14px;
		}
		.trmnl .panelNext {
			font-size: 13px;
			font-style: italic;
			border-top: 1px dotted #000;
			padding-top: 4px;
			margin-top: 2px;
		}
		.trmnl .rows {
			width: 100%;
			border-collapse: collapse;
			font-variant-numeric: tabular-nums;
		}
		.trmnl .rows td {
			padding: 5px 0;
			font-size: 15px;
			vertical-align: middle;
		}
		.trmnl .rowTime {
			width: 200px;
			white-space: nowrap;
			padding-right: 12px;
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
		}</style>`),ce=n(`<div class="panelTitle"> </div>`),le=n(`<div class="panelNext"> </div>`),ue=n(`<div class="panelTitle"><span> </span> <span class="panelTime"> </span></div> <div class="panelDesc"> </div> <!>`,1),k=n(`<section><div class="panelLabel"> </div> <!></section>`),A=n(`<tr><td class="rowTime"> </td><td class="rowStep"> </td></tr>`),de=n(`<div class="trmnl"><header class="head"><div class="brand"><span class="title"> </span> <span class="summary"> <!> </span></div> <div class="ready"><span class="readyLabel"> </span> <span class="readyTime"> </span></div></header> <!> <table class="rows"><tbody></tbody></table></div>`);function j(n,d){u(d,!0);function E(e){return typeof e==`string`&&x.includes(e)}let D=E(b.params.locale)?b.params.locale:`en`;S.set(D);let j=s({readyBy:new Date(Date.now()+1440*60*1e3),startAt:new Date,pizzaCount:6,ballWeight:280,hydration:70,saltPercent:3,yeastType:`fresh`,starterHydration:100,roomTempC:22,fridgeTempC:4,preFerment:null,...ie(window.location.search)}),M=new ae;_(()=>{let e=setInterval(()=>M.setTime(Date.now()),3e4);return()=>clearInterval(e)});let N=g(()=>oe(j)),P=g(()=>O(e(N).steps,M)),F=g(()=>S.t),I=g(()=>S.locale),L=g(()=>{let t=e(N).steps;if(t.length===0)return null;let n=t.length-1;return e(P)===n?{step:t[n],label:e(F).trmnl.done,isDone:!0}:e(P)>=0?{step:t[e(P)],label:e(F).trmnl.now,isDone:!1}:{step:t[0],label:e(F).trmnl.next,isDone:!1}}),R=g(()=>e(P)>=0&&e(P)<e(N).steps.length-1?e(N).steps[e(P)+1]:null),fe=g(()=>j.yeastType===`fresh`?e(F).form.yeast_fresh:e(F).form.yeast_sourdough),z=g(()=>j.preFerment?.type===`biga`?e(F).form.preFerment_biga:j.preFerment?.type===`poolish`?e(F).form.preFerment_poolish:null);var B=de();p(`5xcj7v`,t=>{var n=se();r(()=>{te.title=`${e(F).app.title??``} — TRMNL`}),v(t,n)});var V=t(B),H=t(V),U=t(H),pe=t(U,!0);m(U);var W=i(U,2),G=t(W),K=i(G),me=t=>{var n=o();a(()=>f(n,`· ${e(z)??``}`)),v(t,n)};y(K,t=>{e(z)&&t(me)});var q=i(K);m(W),m(H);var J=i(H,2),Y=t(J),he=t(Y,!0);m(Y);var X=i(Y,2),ge=t(X,!0);m(X),m(J),m(V);var Z=i(V,2),_e=n=>{var r=k();let o;var s=t(r),l=t(s,!0);m(s);var u=i(s,2),d=n=>{var r=ce(),i=t(r,!0);m(r),a(e=>f(i,e),[()=>C(e(L).step,e(F))]),v(n,r)},p=n=>{var r=ue(),o=c(r),s=t(o),l=t(s,!0);m(s);var u=i(s,2),d=t(u,!0);m(u),m(o);var p=i(o,2),h=t(p,!0);m(p);var g=i(p,2),_=n=>{var r=le(),i=t(r);m(r),a((t,n)=>f(i,`${e(F).trmnl.next??``}: ${t??``} ·
						${n??``}`),[()=>C(e(R),e(F)),()=>w(e(R).at,e(I))]),v(n,r)};y(g,t=>{e(R)&&t(_)}),a((e,t,n)=>{f(l,e),f(d,t),f(h,n)},[()=>C(e(L).step,e(F)),()=>w(e(L).step.at,e(I)),()=>ne(e(L).step,e(F),e(N))]),v(n,r)};y(u,t=>{e(L).isDone?t(d):t(p,-1)}),m(r),a(()=>{o=h(r,1,`panel`,null,o,{done:e(L).isDone}),f(l,e(L).label)}),v(n,r)};y(Z,t=>{e(L)&&t(_e)});var Q=i(Z,2),$=t(Q);ee($,23,()=>e(N).steps,e=>e.kind+`-`+e.at.getTime(),(n,r,o)=>{var s=A();let c;var l=t(s),u=t(l,!0);m(l);var d=i(l),p=t(d,!0);m(d),m(s),a((t,n)=>{c=h(s,1,``,null,c,{past:e(o)<e(P),current:e(o)===e(P)&&e(P)<e(N).steps.length-1,rowReady:e(r).kind===`ready`}),f(u,t),f(p,n)},[()=>T(e(r).at,e(I)),()=>C(e(r),e(F))]),v(n,s)}),m($),m(Q),m(B),a((t,n)=>{f(pe,e(F).app.title),f(G,`${j.pizzaCount??``} × ${t??``} g · ${j.hydration??``}% · ${e(fe)??``}`),f(q,` · ${(e(N).mode===`cold`?e(F).mode.cold:e(F).mode.room)??``}`),f(he,e(F).form.readyBy),f(ge,n)},[()=>re(j.ballWeight),()=>T(j.readyBy,e(I))]),v(n,B),l()}export{j as component,E as universal};