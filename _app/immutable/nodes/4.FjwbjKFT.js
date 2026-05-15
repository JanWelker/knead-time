import{$ as e,D as t,H as n,L as r,M as i,Q as a,R as o,S as s,U as c,V as l,W as u,Y as d,b as f,g as p,it as m,m as h,r as g,rt as _,st as v,w as y,x as b,y as x}from"../chunks/DNnrfcHJ.js";import"../chunks/DXLwiZ0H.js";import{t as S}from"../chunks/DSYt-1rX.js";import{r as C,t as w}from"../chunks/BVslvLVo.js";import{n as T,o as E}from"../chunks/DMk_cmO7.js";import{a as D,n as O,r as k,t as ee}from"../chunks/DmdJeG9H.js";var A=v({entries:()=>j,prerender:()=>!0,ssr:()=>!0});function j(){return[{locale:void 0},...C.map(e=>({locale:e}))]}var M=t(y(`<style>html,
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
		}</style> <script>
		(function () {
			try {
				if (typeof location === 'undefined' || typeof document === 'undefined') return;
				var m = location.search.match(/[?&]p=([^&]+)/);
				if (!m) return;
				var raw = decodeURIComponent(m[1]);
				if (raw.length <= 40) return; // legacy \`p=b30\` etc. — let the bundle handle it
				var bin = atob(raw);
				var bytes = new Uint8Array(bin.length);
				for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
				var json = new TextDecoder().decode(bytes);
				var p = JSON.parse(json);
				var set = function (id, text) {
					var el = document.getElementById(id);
					if (el && text !== undefined && text !== null) el.textContent = text;
				};
				set('trmnl-title', p.title);
				set('trmnl-summary', p.summary);
				set('trmnl-ready-label', p.readyLabel);
				set('trmnl-ready-time', p.readyTime);
				var panel = document.getElementById('trmnl-panel');
				if (panel) {
					if (!p.featured) {
						panel.style.display = 'none';
					} else {
						set('trmnl-featured-label', p.featured.label);
						set('trmnl-featured-title', p.featured.title);
						var time = document.getElementById('trmnl-featured-time');
						var desc = document.getElementById('trmnl-featured-desc');
						if (p.featured.isDone) {
							panel.className = 'panel done';
							if (time) time.style.display = 'none';
							if (desc) desc.style.display = 'none';
						} else {
							panel.className = 'panel';
							if (time) {
								time.style.display = '';
								time.textContent = p.featured.timeRange;
							}
							if (desc) {
								desc.style.display = '';
								desc.textContent = p.featured.description;
							}
						}
					}
				}
				var tbody = document.getElementById('trmnl-rows');
				if (tbody && p.steps) {
					var nowMs = Date.now();
					var lastIdx = -1;
					for (var j = 0; j < p.steps.length; j++) {
						if (new Date(p.steps[j].atIso).getTime() <= nowMs) lastIdx = j;
						else break;
					}
					var html = '';
					for (var k = 0; k < p.steps.length; k++) {
						var s = p.steps[k];
						var cls =
							(k < lastIdx ? 'past' : '') +
							(k === lastIdx && lastIdx < p.steps.length - 1 ? ' current' : '') +
							(s.isReady ? ' rowReady' : '');
						html +=
							'<tr class="' +
							cls.trim() +
							'">' +
							'<td class="rowTime">' +
							s.time +
							'</td>' +
							'<td class="rowDate">' +
							s.date +
							'</td>' +
							'<td class="rowStep">' +
							s.title +
							'</td>' +
							'<td class="rowDuration">' +
							s.duration +
							'</td>' +
							'</tr>';
					}
					tbody.innerHTML = html;
				}
			} catch (e) {
				// Best-effort — leave the prerendered defaults in place if anything fails.
			}
		})();
	<\/script>`,1)),N=y(`<div class="panelTitle"><span id="trmnl-featured-title"> </span></div>`),P=y(`<div class="panelTitle"><span id="trmnl-featured-title"> </span> <span class="panelTime" id="trmnl-featured-time"> </span></div> <div class="panelDesc" id="trmnl-featured-desc"> </div>`,1),F=y(`<section id="trmnl-panel"><div class="panelLabel" id="trmnl-featured-label"> </div> <!></section>`),I=y(`<tr><td class="rowTime"> </td><td class="rowDate"> </td><td class="rowStep"> </td><td class="rowDuration"> </td></tr>`),L=y(`<div class="trmnl"><header class="head"><div class="brand"><span class="title" id="trmnl-title"> </span> <span class="summary" id="trmnl-summary"> </span></div> <div class="ready"><span class="readyLabel" id="trmnl-ready-label"> </span> <span class="readyTime" id="trmnl-ready-time"> </span></div></header> <!> <table class="rows"><tbody id="trmnl-rows"></tbody></table></div>`);function R(t,v){e(v,!0);function y(e){return typeof e==`string`&&C.includes(e)}let A=y(S.params.locale)?S.params.locale:`en`;w.set(A);let j={readyBy:new Date(Date.now()+1440*60*1e3),startAt:new Date,pizzaCount:6,ballWeight:280,hydration:70,saltPercent:3,yeastType:`fresh`,starterHydration:100,roomTempC:22,fridgeTempC:4,preFerment:null},R=new ee,z=d(()=>w.t),B=d(()=>{let e=new URLSearchParams(window.location.search).get(`p`);if(e&&e.length>40){let t=k(e);if(t)return{kind:`payload`,payload:t}}let t=E(window.location.search);return{kind:`inputs`,inputs:{...j,...t}}}),V=d(()=>{if(i(B)?.kind===`payload`)return i(B).payload;let e=i(B)?.kind===`inputs`?i(B).inputs:j;return O(e,T(e),i(z),A,R)}),H=d(()=>D(i(V).steps.map(e=>({kind:e.isReady?`ready`:`mix`,at:new Date(e.atIso),durationMinutes:0})),R));g(()=>{let e=setInterval(()=>R.setTime(Date.now()),3e4);return()=>clearInterval(e)});var U=L();p(`5xcj7v`,e=>{var t=M();_(2),r(()=>{l.title=`${i(V).title??``} — TRMNL`}),s(e,t)});var W=n(U),G=n(W),K=n(G),te=n(K,!0);m(K);var q=u(K,2),ne=n(q,!0);m(q),m(G);var J=u(G,2),Y=n(J),re=n(Y,!0);m(Y);var X=u(Y,2),ie=n(X,!0);m(X),m(J),m(W);var Z=u(W,2),ae=e=>{var t=F();let r;var a=n(t),l=n(a,!0);m(a);var d=u(a,2),p=e=>{var t=N(),r=n(t),a=n(r,!0);m(r),m(t),o(()=>b(a,i(V).featured.title)),s(e,t)},g=e=>{var t=P(),r=c(t),a=n(r),l=n(a,!0);m(a);var d=u(a,2),f=n(d,!0);m(d),m(r);var p=u(r,2),h=n(p,!0);m(p),o(()=>{b(l,i(V).featured.title),b(f,i(V).featured.timeRange),b(h,i(V).featured.description)}),s(e,t)};f(d,e=>{i(V).featured.isDone?e(p):e(g,-1)}),m(t),o(()=>{r=h(t,1,`panel`,null,r,{done:i(V).featured.isDone}),b(l,i(V).featured.label)}),s(e,t)};f(Z,e=>{i(V).featured&&e(ae)});var Q=u(Z,2),$=n(Q);x($,23,()=>i(V).steps,e=>e.atIso+`-`+e.title,(e,t,r)=>{var a=I();let c;var l=n(a),d=n(l,!0);m(l);var f=u(l),p=n(f,!0);m(f);var g=u(f),_=n(g,!0);m(g);var v=u(g),y=n(v,!0);m(v),m(a),o(()=>{c=h(a,1,``,null,c,{past:i(r)<i(H),current:i(r)===i(H)&&i(H)<i(V).steps.length-1,rowReady:i(t).isReady}),b(d,i(t).time),b(p,i(t).date),b(_,i(t).title),b(y,i(t).duration)}),s(e,a)}),m($),m(Q),m(U),o(()=>{b(te,i(V).title),b(ne,i(V).summary),b(re,i(V).readyLabel),b(ie,i(V).readyTime)}),s(t,U),a()}export{R as component,A as universal};