import{B as e,F as t,H as n,K as r,P as i,R as a,S as o,V as s,X as c,Y as l,_ as u,b as d,f,it as p,k as m,m as h,n as g,tt as _,v,w as ee,y,z as b}from"../chunks/BK5hkLvn.js";import"../chunks/DXLwiZ0H.js";import{t as x}from"../chunks/D35_xbLn.js";import{a as S,i as te,l as ne,m as C,o as re,r as w,t as T,u as E}from"../chunks/DWk8PAiC.js";var D=p({prerender:()=>!0,ssr:()=>!0});function ie(e,t){let n=t.getTime(),r=-1;for(let t=0;t<e.length&&e[t].at.getTime()<=n;t++)r=t;return r}var ae=o(`<style>html,
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
			font-size: 13px;
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
			font-size: 20px;
			font-weight: 600;
			letter-spacing: -0.01em;
		}
		.trmnl .summary {
			font-size: 11px;
		}
		.trmnl .ready {
			display: flex;
			flex-direction: column;
			align-items: flex-end;
			text-align: right;
		}
		.trmnl .readyLabel {
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 0.08em;
		}
		.trmnl .readyTime {
			font-family: 'Fraunces', 'Inter', ui-serif, Georgia, serif;
			font-size: 18px;
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
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 0.1em;
		}
		.trmnl .panelTitle {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			font-family: 'Fraunces', 'Inter', ui-serif, Georgia, serif;
			font-size: 22px;
			font-weight: 600;
			gap: 12px;
		}
		.trmnl .panel.done .panelTitle {
			font-size: 36px;
			justify-content: center;
		}
		.trmnl .panelTime {
			font-family: 'Inter', sans-serif;
			font-size: 18px;
			font-weight: 500;
			font-variant-numeric: tabular-nums;
		}
		.trmnl .panelDesc {
			font-size: 12px;
		}
		.trmnl .panelNext {
			font-size: 11px;
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
			font-size: 12px;
			vertical-align: middle;
		}
		.trmnl .rowTime {
			width: 170px;
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
		.trmnl .rows tr.ready td {
			font-weight: 700;
		}</style>`),O=o(`<div class="panelTitle"> </div>`),k=o(`<div class="panelNext"> </div>`),oe=o(`<div class="panelTitle"><span> </span> <span class="panelTime"> </span></div> <div class="panelDesc"> </div> <!>`,1),se=o(`<section><div class="panelLabel"> </div> <!></section>`),A=o(`<tr><td class="rowTime"> </td><td class="rowStep"> </td></tr>`),j=o(`<div class="trmnl"><header class="head"><div class="brand"><span class="title"> </span> <span class="summary"> <!> </span></div> <div class="ready"><span class="readyLabel"> </span> <span class="readyTime"> </span></div></header> <!> <table class="rows"><tbody></tbody></table></div>`);function M(o,p){c(p,!0);let D=n({readyBy:new Date(Date.now()+1440*60*1e3),startAt:new Date,pizzaCount:6,ballWeight:280,hydration:70,saltPercent:3,yeastType:`fresh`,starterHydration:100,roomTempC:22,fridgeTempC:4,preFerment:null,...re(window.location.search)}),M=new w;g(()=>{let e=setInterval(()=>M.setTime(Date.now()),3e4);return()=>clearInterval(e)});let N=r(()=>T(D)),P=r(()=>ie(m(N).steps,M)),F=r(()=>x.t),I=r(()=>x.locale),L=r(()=>{let e=m(N).steps;if(e.length===0)return null;let t=e.length-1;return m(P)===t?{step:e[t],label:m(F).trmnl.done,isDone:!0}:m(P)>=0?{step:e[m(P)],label:m(F).trmnl.now,isDone:!1}:{step:e[0],label:m(F).trmnl.next,isDone:!1}}),R=r(()=>m(P)>=0&&m(P)<m(N).steps.length-1?m(N).steps[m(P)+1]:null),ce=r(()=>D.yeastType===`fresh`?m(F).form.yeast_fresh:m(F).form.yeast_sourdough),z=r(()=>D.preFerment?.type===`biga`?m(F).form.preFerment_biga:D.preFerment?.type===`poolish`?m(F).form.preFerment_poolish:null);var B=j();h(`wjw1nc`,e=>{var t=ae();i(()=>{a.title=`${m(F).app.title??``} — TRMNL`}),d(e,t)});var V=b(B),H=b(V),U=b(H),W=b(U,!0);_(U);var G=s(U,2),K=b(G),q=s(K),le=e=>{var n=ee();t(()=>y(n,`· ${m(z)??``}`)),d(e,n)};v(q,e=>{m(z)&&e(le)});var ue=s(q);_(G),_(H);var J=s(H,2),Y=b(J),de=b(Y,!0);_(Y);var X=s(Y,2),fe=b(X,!0);_(X),_(J),_(V);var Z=s(V,2),pe=n=>{var r=se();let i;var a=b(r),o=b(a,!0);_(a);var c=s(a,2),l=e=>{var n=O(),r=b(n,!0);_(n),t(e=>y(r,e),[()=>S(m(L).step,m(F))]),d(e,n)},u=n=>{var r=oe(),i=e(r),a=b(i),o=b(a,!0);_(a);var c=s(a,2),l=b(c,!0);_(c),_(i);var u=s(i,2),f=b(u,!0);_(u);var p=s(u,2),h=e=>{var n=k(),r=b(n);_(n),t((e,t)=>y(r,`${m(F).trmnl.next??``}: ${e??``} ·
						${t??``}`),[()=>S(m(R),m(F)),()=>C(m(R).at,m(I))]),d(e,n)};v(p,e=>{m(R)&&e(h)}),t((e,t,n)=>{y(o,e),y(l,t),y(f,n)},[()=>S(m(L).step,m(F)),()=>C(m(L).step.at,m(I)),()=>te(m(L).step,m(F),m(N))]),d(n,r)};v(c,e=>{m(L).isDone?e(l):e(u,-1)}),_(r),t(()=>{i=f(r,1,`panel`,null,i,{done:m(L).isDone}),y(o,m(L).label)}),d(n,r)};v(Z,e=>{m(L)&&e(pe)});var Q=s(Z,2),$=b(Q);u($,23,()=>m(N).steps,e=>e.kind+`-`+e.at.getTime(),(e,n,r)=>{var i=A();let a;var o=b(i),c=b(o,!0);_(o);var l=s(o),u=b(l,!0);_(l),_(i),t((e,t)=>{a=f(i,1,``,null,a,{past:m(r)<m(P),current:m(r)===m(P)&&m(P)<m(N).steps.length-1,ready:m(n).kind===`ready`}),y(c,e),y(u,t)},[()=>E(m(n).at,m(I)),()=>S(m(n),m(F))]),d(e,i)}),_($),_(Q),_(B),t((e,t)=>{y(W,m(F).app.title),y(K,`${D.pizzaCount??``} × ${e??``} g · ${D.hydration??``}% · ${m(ce)??``}`),y(ue,` · ${(m(N).mode===`cold`?m(F).mode.cold:m(F).mode.room)??``}`),y(de,m(F).form.readyBy),y(fe,t)},[()=>ne(D.ballWeight),()=>E(D.readyBy,m(I))]),d(o,B),l()}export{M as component,D as universal};