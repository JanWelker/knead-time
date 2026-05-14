import{A as e,B as t,C as n,F as r,H as i,I as a,T as o,U as s,V as c,X as l,Z as u,at as d,b as f,h as p,nt as m,p as h,q as g,r as _,v as ee,x as v,y,z as b}from"../chunks/-KuUnI0l.js";import"../chunks/DEDqjojZ.js";import{t as x}from"../chunks/iRNYTO4B.js";import{n as S,t as C}from"../chunks/CGfLsJTe.js";import{a as w,d as T,i as te,l as ne,m as E,o as re,r as ie,t as ae,u as D}from"../chunks/4xtt5DDa.js";var O=d({entries:()=>k,prerender:()=>!0,ssr:()=>!0});function k(){return[{locale:void 0},...S.map(e=>({locale:e}))]}function A(e,t){let n=t.getTime(),r=-1;for(let t=0;t<e.length&&e[t].at.getTime()<=n;t++)r=t;return r}var oe=n(`<style>html,
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
		}
		.trmnl .brand {
			display: flex;
			flex-direction: column;
			gap: 2px;
			min-width: 0;
		}
		.trmnl .title {
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
		}
		.trmnl .panelDesc {
			font-size: 14px;
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
		}</style>`),se=n(`<div class="panelTitle"> </div>`),ce=n(`<div class="panelTitle"><span> </span> <span class="panelTime"> </span></div> <div class="panelDesc"> </div>`,1),le=n(`<section><div class="panelLabel"> </div> <!></section>`),ue=n(`<tr><td class="rowTime"> </td><td class="rowStep"> </td></tr>`),de=n(`<div class="trmnl"><header class="head"><div class="brand"><span class="title"> </span> <span class="summary"> <!> </span></div> <div class="ready"><span class="readyLabel"> </span> <span class="readyTime"> </span></div></header> <!> <table class="rows"><tbody></tbody></table></div>`);function j(n,d){u(d,!0);function O(e){return typeof e==`string`&&S.includes(e)}let k=O(x.params.locale)?x.params.locale:`en`;C.set(k);let j=s({readyBy:new Date(Date.now()+1440*60*1e3),startAt:new Date,pizzaCount:6,ballWeight:280,hydration:70,saltPercent:3,yeastType:`fresh`,starterHydration:100,roomTempC:22,fridgeTempC:4,preFerment:null,...re(window.location.search)}),M=new ie;_(()=>{let e=setInterval(()=>M.setTime(Date.now()),3e4);return()=>clearInterval(e)});let N=g(()=>ae(j)),P=g(()=>A(e(N).steps,M)),F=g(()=>C.t),I=g(()=>C.locale),L=g(()=>{let t=e(N).steps;if(t.length===0)return null;let n=t.length-1;return e(P)===n?{step:t[n],label:e(F).trmnl.done,isDone:!0}:e(P)>=0?{step:t[e(P)],label:e(F).trmnl.now,isDone:!1}:{step:t[0],label:e(F).trmnl.next,isDone:!1}}),R=g(()=>j.yeastType===`fresh`?e(F).form.yeast_fresh:e(F).form.yeast_sourdough),z=g(()=>j.preFerment?.type===`biga`?e(F).form.preFerment_biga:j.preFerment?.type===`poolish`?e(F).form.preFerment_poolish:null);var B=de();p(`5xcj7v`,t=>{var n=oe();r(()=>{b.title=`${e(F).app.title??``} — TRMNL`}),v(t,n)});var V=t(B),H=t(V),U=t(H),fe=t(U,!0);m(U);var W=i(U,2),G=t(W),K=i(G),q=t=>{var n=o();a(()=>f(n,`· ${e(z)??``}`)),v(t,n)};y(K,t=>{e(z)&&t(q)});var pe=i(K);m(W),m(H);var J=i(H,2),Y=t(J),me=t(Y,!0);m(Y);var X=i(Y,2),he=t(X,!0);m(X),m(J),m(V);var Z=i(V,2),ge=n=>{var r=le();let o;var s=t(r),l=t(s,!0);m(s);var u=i(s,2),d=n=>{var r=se(),i=t(r,!0);m(r),a(e=>f(i,e),[()=>w(e(L).step,e(F))]),v(n,r)},p=n=>{var r=ce(),o=c(r),s=t(o),l=t(s,!0);m(s);var u=i(s,2),d=t(u);m(u),m(o);var p=i(o,2),h=t(p,!0);m(p),a((e,t,n,r,i)=>{f(l,e),f(d,`${t??``} - ${n??``}
						(${r??``})`),f(h,i)},[()=>w(e(L).step,e(F)),()=>E(e(L).step.at,e(I)),()=>E(new Date(e(L).step.at.getTime()+e(L).step.durationMinutes*6e4),e(I)),()=>T(e(L).step.durationMinutes,e(I)),()=>te(e(L).step,e(F),e(N))]),v(n,r)};y(u,t=>{e(L).isDone?t(d):t(p,-1)}),m(r),a(()=>{o=h(r,1,`panel`,null,o,{done:e(L).isDone}),f(l,e(L).label)}),v(n,r)};y(Z,t=>{e(L)&&t(ge)});var Q=i(Z,2),$=t(Q);ee($,23,()=>e(N).steps,e=>e.kind+`-`+e.at.getTime(),(n,r,o)=>{var s=ue();let c;var l=t(s),u=t(l,!0);m(l);var d=i(l),p=t(d,!0);m(d),m(s),a((t,n)=>{c=h(s,1,``,null,c,{past:e(o)<e(P),current:e(o)===e(P)&&e(P)<e(N).steps.length-1,rowReady:e(r).kind===`ready`}),f(u,t),f(p,n)},[()=>D(e(r).at,e(I)),()=>w(e(r),e(F))]),v(n,s)}),m($),m(Q),m(B),a((t,n)=>{f(fe,e(F).app.title),f(G,`${j.pizzaCount??``} × ${t??``} g · ${j.hydration??``}% · ${e(R)??``}`),f(pe,` · ${(e(N).mode===`cold`?e(F).mode.cold:e(F).mode.room)??``}`),f(me,e(F).form.readyBy),f(he,n)},[()=>ne(j.ballWeight),()=>D(j.readyBy,e(I)).replace(/,/g,``)]),v(n,B),l()}export{j as component,O as universal};