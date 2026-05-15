import{$ as e,G as t,H as n,L as r,M as i,Q as a,R as o,S as s,U as c,V as l,W as u,Y as d,b as f,d as p,g as m,it as h,m as ee,r as g,st as _,w as v,x as y,y as b}from"../chunks/DNnrfcHJ.js";import{c as x}from"../chunks/WuDkahmr.js";import"../chunks/DXLwiZ0H.js";import{t as S}from"../chunks/DSYt-1rX.js";import{r as C,t as w}from"../chunks/BVslvLVo.js";import{a as T,d as te,f as E,i as D,l as ne,n as O,o as k,p as re,s as ie,u as A,y as j}from"../chunks/DMk_cmO7.js";import{t as M}from"../chunks/DmuJ-I-A.js";var N=_({entries:()=>ae,prerender:()=>!0,ssr:()=>!0});function ae(){return[{locale:void 0},...C.map(e=>({locale:e}))]}var oe=v(`<style>html,
		body {
			background: #ffffff !important;
			color: #000000 !important;
			margin: 0;
		}
		@page {
			size: auto;
			margin: 9mm 10mm;
		}
		.printpage {
			font-family:
				'Inter',
				ui-sans-serif,
				system-ui,
				-apple-system,
				sans-serif;
			color: #000;
			background: #fff;
			max-width: 190mm;
			margin: 0 auto;
			padding: 6mm 4mm;
			font-size: 9pt;
			line-height: 1.4;
		}
		.printpage h1,
		.printpage h2,
		.printpage h3 {
			margin: 0;
			font-weight: 700;
			letter-spacing: -0.01em;
		}
		.printpage h1 {
			font-size: 18pt;
		}
		.printpage h2 {
			font-size: 12pt;
			margin-bottom: 2mm;
		}
		.printpage h3 {
			font-size: 9.5pt;
			margin-bottom: 1mm;
		}
		.printpage-header {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 8mm;
			margin-bottom: 4mm;
			padding-bottom: 3mm;
			border-bottom: 1px solid #000;
		}
		.printpage-summary,
		.printpage-ingredients {
			width: 100%;
			border-collapse: collapse;
			font-variant-numeric: tabular-nums;
		}
		.printpage-summary th {
			text-align: left;
			font-weight: 400;
			padding: 0.8mm 0;
			color: #333;
		}
		.printpage-summary td {
			text-align: right;
			font-weight: 500;
			padding: 0.8mm 0;
		}
		.printpage-ingredients th {
			text-align: left;
			padding: 0.8mm 0;
			font-weight: 500;
		}
		.printpage-ingredients td {
			text-align: right;
			padding: 0.8mm 0;
		}
		.printpage-ingredients tr.printpage-total th,
		.printpage-ingredients tr.printpage-total td {
			font-weight: 700;
			border-top: 1px solid #000;
			padding-top: 1.2mm;
		}
		.printpage-ingredients-section {
			margin-bottom: 3mm;
		}
		.printpage-schedule {
			width: 100%;
			border-collapse: collapse;
			font-variant-numeric: tabular-nums;
		}
		.printpage-schedule thead th {
			font-size: 8pt;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			font-weight: 600;
			text-align: left;
			border-bottom: 1px solid #000;
			padding: 1mm 3mm 1mm 0;
		}
		.printpage-schedule tbody td {
			padding: 1.2mm 3mm 1.2mm 0;
			vertical-align: top;
			border-bottom: 1px solid #ccc;
		}
		.printpage-schedule tbody tr:last-child td {
			border-bottom: none;
		}
		.printpage-when {
			white-space: nowrap;
			font-weight: 500;
		}
		.printpage-duration {
			white-space: nowrap;
			text-align: right;
		}
		.printpage-step-title {
			font-weight: 600;
		}
		.printpage-step-desc {
			font-size: 8pt;
			color: #444;
			margin-top: 0.5mm;
		}
		.printpage-schedule tr.printpage-ready .printpage-step-title {
			font-weight: 700;
		}
		.printpage-footer {
			margin-top: 4mm;
			padding-top: 2mm;
			border-top: 1px solid #000;
			display: flex;
			justify-content: space-between;
			align-items: flex-end;
			gap: 8mm;
			font-size: 7.5pt;
			color: #333;
		}
		.printpage-footer p {
			margin: 0 0 0.5mm 0;
		}
		.printpage-qr {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 1mm;
			flex-shrink: 0;
		}
		.printpage-qr svg {
			width: 22mm;
			height: 22mm;
		}
		.printpage-qr-caption {
			font-size: 7pt;
		}</style>`),se=v(`<tr><th> </th><td> </td></tr>`),ce=v(`<tr><th> </th><td> </td></tr>`),le=v(`<section class="printpage-ingredients-section"><h3> </h3> <table class="printpage-ingredients"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr></tbody></table></section> <section class="printpage-ingredients-section"><h3> </h3> <table class="printpage-ingredients"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr></tbody></table></section> <section class="printpage-ingredients-section"><h3> </h3> <table class="printpage-ingredients"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr class="printpage-total"><th> </th><td> </td></tr></tbody></table></section>`,1),ue=v(`<table class="printpage-ingredients"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr class="printpage-total"><th> </th><td> </td></tr></tbody></table>`),de=v(`<tr><td class="printpage-when"> </td><td><div class="printpage-step-title"> </div> <div class="printpage-step-desc"> </div></td><td class="printpage-duration"> </td></tr>`),fe=v(`<div class="printpage-qr"><svg aria-hidden="true"><path fill="currentColor"></path></svg> <p class="printpage-qr-caption"> </p></div>`),pe=v(`<div class="printpage"><header class="printpage-header"><div><h1> </h1> <h2 style="margin-top: 3mm;"> </h2> <table class="printpage-summary"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><!><!></tbody></table></div> <div><h2> </h2> <!></div></header> <section><h2> </h2> <table class="printpage-schedule"><thead><tr><th> </th><th> </th><th class="printpage-duration"> </th></tr></thead><tbody></tbody></table></section> <footer class="printpage-footer"><div><p> </p> <p> </p></div> <!></footer></div>`);function P(_,v){e(v,!0);function N(e){return typeof e==`string`&&C.includes(e)}let ae=N(S.params.locale)?S.params.locale:`en`;w.set(ae);let P=t({readyBy:new Date(Date.now()+1440*60*1e3),startAt:new Date,pizzaCount:6,ballWeight:280,hydration:70,saltPercent:3,yeastType:`fresh`,starterHydration:100,roomTempC:22,fridgeTempC:4,preFerment:null,...k(window.location.search)}),F=d(()=>O(P)),I=d(()=>w.t),L=d(()=>w.locale),me=new Date().getFullYear(),R=d(()=>`${window.location.origin}${x}/?${ie(P)}`),z=d(()=>i(R)?M(i(R)):null),he=d(()=>P.yeastType===`fresh`?i(I).ingredients.fresh_yeast:i(I).ingredients.sourdough_starter),ge=d(()=>P.yeastType===`fresh`?i(I).form.yeast_fresh:i(I).form.yeast_sourdough),B=d(()=>i(F).preFerment?.type===`biga`?i(I).form.preFerment_biga:i(F).preFerment?.type===`poolish`?i(I).form.preFerment_poolish:null),V=d(()=>i(F).ingredients.preFerment?{flour:i(F).ingredients.flour+i(F).ingredients.preFerment.flour,water:i(F).ingredients.water+i(F).ingredients.preFerment.water,salt:i(F).ingredients.salt,yeast:i(F).ingredients.yeast+i(F).ingredients.preFerment.yeast}:null);g(()=>{let e=setTimeout(()=>window.print(),200);return()=>clearTimeout(e)});var H=pe();m(`1hugt37`,e=>{var t=oe();r(()=>{l.title=`${i(I).app.title??``} — ${i(I).print.recipe_heading??``}`}),s(e,t)});var U=n(H),W=n(U),G=n(W),K=n(G,!0);h(G);var _e=u(G,2),ve=n(_e,!0);h(_e);var ye=u(_e,2),q=n(ye),J=n(q),be=n(J),xe=n(be,!0);h(be);var Se=u(be),Y=n(Se,!0);h(Se),h(J);var X=u(J),Ce=n(X),we=n(Ce,!0);h(Ce);var Te=u(Ce),Ee=n(Te);h(Te),h(X);var Z=u(X),De=n(Z),Oe=n(De,!0);h(De);var ke=u(De),Ae=n(ke);h(ke),h(Z);var Q=u(Z),$=n(Q),je=n($,!0);h($);var Me=u($),Ne=n(Me);h(Me),h(Q);var Pe=u(Q),Fe=n(Pe),Ie=n(Fe,!0);h(Fe);var Le=u(Fe),Re=n(Le,!0);h(Le),h(Pe);var ze=u(Pe),Be=n(ze),Ve=n(Be,!0);h(Be);var He=u(Be),Ue=n(He);h(He),h(ze);var We=u(ze),Ge=e=>{var t=se(),r=n(t),a=n(r,!0);h(r);var c=u(r),l=n(c);h(c),h(t),o(()=>{y(a,i(I).form.fridgeTemp),y(l,`${P.fridgeTempC??``} °C`)}),s(e,t)};f(We,e=>{i(F).mode===`cold`&&e(Ge)});var Ke=u(We),qe=e=>{var t=ce(),r=n(t),a=n(r,!0);h(r);var c=u(r),l=n(c,!0);h(c),h(t),o(()=>{y(a,i(I).form.preFerment),y(l,i(B))}),s(e,t)};f(Ke,e=>{i(B)&&e(qe)}),h(q),h(ye),h(W);var Je=u(W,2),Ye=n(Je),Xe=n(Ye,!0);h(Ye);var Ze=u(Ye,2),Qe=e=>{var t=le(),r=c(t),a=n(r),l=n(a,!0);h(a);var d=u(a,2),f=n(d),p=n(f),m=n(p),ee=n(m,!0);h(m);var g=u(m),_=n(g,!0);h(g),h(p);var v=u(p),b=n(v),x=n(b,!0);h(b);var S=u(b),C=n(S,!0);h(S),h(v);var w=u(v),T=n(w),te=n(T,!0);h(T);var D=u(T),ne=n(D,!0);h(D),h(w),h(f),h(d),h(r);var O=u(r,2),k=n(O),ie=n(k,!0);h(k);var A=u(k,2),j=n(A),M=n(j),N=n(M),ae=n(N,!0);h(N);var oe=u(N),se=n(oe,!0);h(oe),h(M);var ce=u(M),ue=n(ce),de=n(ue,!0);h(ue);var fe=u(ue),pe=n(fe,!0);h(fe),h(ce);var P=u(ce),L=n(P),me=n(L,!0);h(L);var R=u(L),z=n(R,!0);h(R),h(P),h(j),h(A),h(O);var ge=u(O,2),B=n(ge),H=n(B,!0);h(B);var U=u(B,2),W=n(U),G=n(W),K=n(G),_e=n(K,!0);h(K);var ve=u(K),ye=n(ve,!0);h(ve),h(G);var q=u(G),J=n(q),be=n(J,!0);h(J);var xe=u(J),Se=n(xe,!0);h(xe),h(q);var Y=u(q),X=n(Y),Ce=n(X,!0);h(X);var we=u(X),Te=n(we,!0);h(we),h(Y);var Ee=u(Y),Z=n(Ee),De=n(Z);h(Z);var Oe=u(Z),ke=n(Oe,!0);h(Oe),h(Ee);var Ae=u(Ee),Q=n(Ae),$=n(Q,!0);h(Q);var je=u(Q),Me=n(je,!0);h(je),h(Ae),h(W),h(U),h(ge),o((e,t,n,r,a,o,s,c,u,d,f,p)=>{y(l,i(I).ingredients.preFerment_heading),y(ee,i(I).ingredients.flour),y(_,e),y(x,i(I).ingredients.water),y(C,t),y(te,i(I).ingredients.fresh_yeast),y(ne,n),y(ie,i(I).ingredients.mainDough_heading),y(ae,i(I).ingredients.flour),y(se,r),y(de,i(I).ingredients.water),y(pe,a),y(me,i(I).ingredients.salt),y(z,o),y(H,i(I).ingredients.totals_heading),y(_e,i(I).ingredients.flour),y(ye,s),y(be,i(I).ingredients.water),y(Se,c),y(Ce,i(I).ingredients.salt),y(Te,u),y(De,`${i(he)??``} (${d??``})`),y(ke,f),y($,i(I).ingredients.total),y(Me,p)},[()=>E(i(F).ingredients.preFerment.flour),()=>E(i(F).ingredients.preFerment.water),()=>E(i(F).ingredients.preFerment.yeast),()=>E(i(F).ingredients.flour),()=>E(i(F).ingredients.water),()=>E(i(F).ingredients.salt),()=>E(i(V).flour),()=>E(i(V).water),()=>E(i(V).salt),()=>re(i(F).yeastPercent),()=>E(i(V).yeast),()=>E(i(F).ingredients.totalDough)]),s(e,t)},$e=e=>{var t=ue(),r=n(t),a=n(r),c=n(a),l=n(c,!0);h(c);var d=u(c),f=n(d,!0);h(d),h(a);var p=u(a),m=n(p),ee=n(m,!0);h(m);var g=u(m),_=n(g,!0);h(g),h(p);var v=u(p),b=n(v),x=n(b,!0);h(b);var S=u(b),C=n(S,!0);h(S),h(v);var w=u(v),T=n(w),te=n(T);h(T);var D=u(T),ne=n(D,!0);h(D),h(w);var O=u(w),k=n(O),ie=n(k,!0);h(k);var A=u(k),j=n(A,!0);h(A),h(O),h(r),h(t),o((e,t,n,r,a,o)=>{y(l,i(I).ingredients.flour),y(f,e),y(ee,i(I).ingredients.water),y(_,t),y(x,i(I).ingredients.salt),y(C,n),y(te,`${i(he)??``} (${r??``})`),y(ne,a),y(ie,i(I).ingredients.total),y(j,o)},[()=>E(i(F).ingredients.flour),()=>E(i(F).ingredients.water),()=>E(i(F).ingredients.salt),()=>re(i(F).yeastPercent),()=>E(i(F).ingredients.yeast),()=>E(i(F).ingredients.totalDough)]),s(e,t)};f(Ze,e=>{i(F).ingredients.preFerment?e(Qe):e($e,-1)}),h(Je),h(U);var et=u(U,2),tt=n(et),nt=n(tt,!0);h(tt);var rt=u(tt,2),it=n(rt),at=n(it),ot=n(at),st=n(ot,!0);h(ot);var ct=u(ot),lt=n(ct,!0);h(ct);var ut=u(ct),dt=n(ut,!0);h(ut),h(at),h(it);var ft=u(it);b(ft,21,()=>i(F).steps,e=>e.kind+`-`+e.at.getTime(),(e,t)=>{let r=d(()=>i(t).kind===`ready`);var a=de();let c;var l=n(a),f=n(l,!0);h(l);var p=u(l),m=n(p),g=n(m,!0);h(m);var _=u(m,2),v=n(_,!0);h(_),h(p);var b=u(p),x=n(b,!0);h(b),h(a),o((e,t,n,o)=>{c=ee(a,1,``,null,c,{"printpage-ready":i(r)}),y(f,e),y(g,t),y(v,n),y(x,o)},[()=>A(i(t).at,i(L)),()=>T(i(t),i(I)),()=>D(i(t),i(I),i(F)),()=>i(t).durationMinutes>0?te(i(t).durationMinutes,i(L)):`—`]),s(e,a)}),h(ft),h(rt),h(et);var pt=u(et,2),mt=n(pt),ht=n(mt),gt=n(ht,!0);h(ht);var _t=u(ht,2),vt=n(_t);h(_t),h(mt);var yt=u(mt,2),bt=e=>{var t=fe(),r=n(t),a=n(r);h(r);var c=u(r,2),l=n(c,!0);h(c),h(t),o(()=>{p(r,`viewBox`,`0 0 ${i(z).size??``} ${i(z).size??``}`),p(a,`d`,i(z).path),y(l,i(I).print.scan_to_open)}),s(e,t)};f(yt,e=>{i(z)&&e(bt)}),h(pt),h(H),o((e,t,n)=>{y(K,i(I).app.title),y(ve,i(I).print.recipe_heading),y(xe,i(I).form.readyBy),y(Y,e),y(we,i(I).form.pizzaCount),y(Ee,`${P.pizzaCount??``} × ${t??``} g`),y(Oe,i(I).form.hydration),y(Ae,`${P.hydration??``}%`),y(je,i(I).form.salt),y(Ne,`${P.saltPercent??``}%`),y(Ie,i(I).form.yeastType),y(Re,i(ge)),y(Ve,i(I).form.roomTemp),y(Ue,`${P.roomTempC??``} °C`),y(Xe,i(I).ingredients.heading),y(nt,i(I).schedule.heading),y(st,i(I).schedule.col_when),y(lt,i(I).schedule.col_step),y(dt,i(I).schedule.col_duration),y(gt,i(I).footer.about),y(vt,`${n??``} · v3.1.0`)},[()=>A(P.readyBy,i(L)),()=>ne(P.ballWeight),()=>j(i(I).footer.license,{year:me})]),s(_,H),a()}export{P as component,N as universal};