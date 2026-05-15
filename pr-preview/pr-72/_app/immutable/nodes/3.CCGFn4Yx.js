import{$ as e,G as t,H as n,L as r,M as i,Q as a,R as o,S as s,U as c,V as l,W as u,Y as d,b as f,d as p,g as m,it as h,m as ee,r as g,st as _,w as v,x as y,y as b}from"../chunks/DNnrfcHJ.js";import{c as x}from"../chunks/DvD3Xexa.js";import"../chunks/DXLwiZ0H.js";import{t as S}from"../chunks/CPOUj3GO.js";import{r as C,t as w}from"../chunks/ugr-YbNe.js";import{a as T,c as te,d as E,f as ne,i as D,l as O,o as k,r as A,t as re,u as j,v as M}from"../chunks/C7ShPPyM.js";import{t as N}from"../chunks/DmuJ-I-A.js";var P=_({entries:()=>ie,prerender:()=>!0,ssr:()=>!0});function ie(){return[{locale:void 0},...C.map(e=>({locale:e}))]}var ae=v(`<style>html,
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
		}</style>`),oe=v(`<tr><th> </th><td> </td></tr>`),se=v(`<tr><th> </th><td> </td></tr>`),ce=v(`<section class="printpage-ingredients-section"><h3> </h3> <table class="printpage-ingredients"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr></tbody></table></section> <section class="printpage-ingredients-section"><h3> </h3> <table class="printpage-ingredients"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr></tbody></table></section> <section class="printpage-ingredients-section"><h3> </h3> <table class="printpage-ingredients"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr class="printpage-total"><th> </th><td> </td></tr></tbody></table></section>`,1),le=v(`<table class="printpage-ingredients"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr class="printpage-total"><th> </th><td> </td></tr></tbody></table>`),ue=v(`<tr><td class="printpage-when"> </td><td><div class="printpage-step-title"> </div> <div class="printpage-step-desc"> </div></td><td class="printpage-duration"> </td></tr>`),de=v(`<div class="printpage-qr"><svg aria-hidden="true"><path fill="currentColor"></path></svg> <p class="printpage-qr-caption"> </p></div>`),fe=v(`<div class="printpage"><header class="printpage-header"><div><h1> </h1> <h2 style="margin-top: 3mm;"> </h2> <table class="printpage-summary"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><!><!></tbody></table></div> <div><h2> </h2> <!></div></header> <section><h2> </h2> <table class="printpage-schedule"><thead><tr><th> </th><th> </th><th class="printpage-duration"> </th></tr></thead><tbody></tbody></table></section> <footer class="printpage-footer"><div><p> </p> <p> </p></div> <!></footer></div>`);function F(_,v){e(v,!0);function P(e){return typeof e==`string`&&C.includes(e)}let ie=P(S.params.locale)?S.params.locale:`en`;w.set(ie);let F=t({readyBy:new Date(Date.now()+1440*60*1e3),startAt:new Date,pizzaCount:6,ballWeight:280,hydration:70,saltPercent:3,yeastType:`fresh`,starterHydration:100,roomTempC:22,fridgeTempC:4,preFerment:null,...T(window.location.search)}),I=d(()=>re(F)),L=d(()=>w.t),R=d(()=>w.locale),pe=new Date().getFullYear(),z=d(()=>`${window.location.origin}${x}/?${k(F)}`),B=d(()=>i(z)?N(i(z)):null),me=d(()=>F.yeastType===`fresh`?i(L).ingredients.fresh_yeast:i(L).ingredients.sourdough_starter),he=d(()=>F.yeastType===`fresh`?i(L).form.yeast_fresh:i(L).form.yeast_sourdough),V=d(()=>i(I).preFerment?.type===`biga`?i(L).form.preFerment_biga:i(I).preFerment?.type===`poolish`?i(L).form.preFerment_poolish:null),H=d(()=>i(I).ingredients.preFerment?{flour:i(I).ingredients.flour+i(I).ingredients.preFerment.flour,water:i(I).ingredients.water+i(I).ingredients.preFerment.water,salt:i(I).ingredients.salt,yeast:i(I).ingredients.yeast+i(I).ingredients.preFerment.yeast}:null);g(()=>{let e=setTimeout(()=>window.print(),200);return()=>clearTimeout(e)});var U=fe();m(`1hugt37`,e=>{var t=ae();r(()=>{l.title=`${i(L).app.title??``} — ${i(L).print.recipe_heading??``}`}),s(e,t)});var W=n(U),G=n(W),K=n(G),q=n(K,!0);h(K);var ge=u(K,2),_e=n(ge,!0);h(ge);var ve=u(ge,2),J=n(ve),Y=n(J),ye=n(Y),be=n(ye,!0);h(ye);var xe=u(ye),X=n(xe,!0);h(xe),h(Y);var Z=u(Y),Se=n(Z),Ce=n(Se,!0);h(Se);var we=u(Se),Te=n(we);h(we),h(Z);var Q=u(Z),Ee=n(Q),De=n(Ee,!0);h(Ee);var Oe=u(Ee),ke=n(Oe);h(Oe),h(Q);var $=u(Q),Ae=n($),je=n(Ae,!0);h(Ae);var Me=u(Ae),Ne=n(Me);h(Me),h($);var Pe=u($),Fe=n(Pe),Ie=n(Fe,!0);h(Fe);var Le=u(Fe),Re=n(Le,!0);h(Le),h(Pe);var ze=u(Pe),Be=n(ze),Ve=n(Be,!0);h(Be);var He=u(Be),Ue=n(He);h(He),h(ze);var We=u(ze),Ge=e=>{var t=oe(),r=n(t),a=n(r,!0);h(r);var c=u(r),l=n(c);h(c),h(t),o(()=>{y(a,i(L).form.fridgeTemp),y(l,`${F.fridgeTempC??``} °C`)}),s(e,t)};f(We,e=>{i(I).mode===`cold`&&e(Ge)});var Ke=u(We),qe=e=>{var t=se(),r=n(t),a=n(r,!0);h(r);var c=u(r),l=n(c,!0);h(c),h(t),o(()=>{y(a,i(L).form.preFerment),y(l,i(V))}),s(e,t)};f(Ke,e=>{i(V)&&e(qe)}),h(J),h(ve),h(G);var Je=u(G,2),Ye=n(Je),Xe=n(Ye,!0);h(Ye);var Ze=u(Ye,2),Qe=e=>{var t=ce(),r=c(t),a=n(r),l=n(a,!0);h(a);var d=u(a,2),f=n(d),p=n(f),m=n(p),ee=n(m,!0);h(m);var g=u(m),_=n(g,!0);h(g),h(p);var v=u(p),b=n(v),x=n(b,!0);h(b);var S=u(b),C=n(S,!0);h(S),h(v);var w=u(v),T=n(w),te=n(T,!0);h(T);var D=u(T),O=n(D,!0);h(D),h(w),h(f),h(d),h(r);var k=u(r,2),A=n(k),re=n(A,!0);h(A);var j=u(A,2),M=n(j),N=n(M),P=n(N),ie=n(P,!0);h(P);var ae=u(P),oe=n(ae,!0);h(ae),h(N);var se=u(N),le=n(se),ue=n(le,!0);h(le);var de=u(le),fe=n(de,!0);h(de),h(se);var F=u(se),R=n(F),pe=n(R,!0);h(R);var z=u(R),B=n(z,!0);h(z),h(F),h(M),h(j),h(k);var he=u(k,2),V=n(he),U=n(V,!0);h(V);var W=u(V,2),G=n(W),K=n(G),q=n(K),ge=n(q,!0);h(q);var _e=u(q),ve=n(_e,!0);h(_e),h(K);var J=u(K),Y=n(J),ye=n(Y,!0);h(Y);var be=u(Y),xe=n(be,!0);h(be),h(J);var X=u(J),Z=n(X),Se=n(Z,!0);h(Z);var Ce=u(Z),we=n(Ce,!0);h(Ce),h(X);var Te=u(X),Q=n(Te),Ee=n(Q);h(Q);var De=u(Q),Oe=n(De,!0);h(De),h(Te);var ke=u(Te),$=n(ke),Ae=n($,!0);h($);var je=u($),Me=n(je,!0);h(je),h(ke),h(G),h(W),h(he),o((e,t,n,r,a,o,s,c,u,d,f,p)=>{y(l,i(L).ingredients.preFerment_heading),y(ee,i(L).ingredients.flour),y(_,e),y(x,i(L).ingredients.water),y(C,t),y(te,i(L).ingredients.fresh_yeast),y(O,n),y(re,i(L).ingredients.mainDough_heading),y(ie,i(L).ingredients.flour),y(oe,r),y(ue,i(L).ingredients.water),y(fe,a),y(pe,i(L).ingredients.salt),y(B,o),y(U,i(L).ingredients.totals_heading),y(ge,i(L).ingredients.flour),y(ve,s),y(ye,i(L).ingredients.water),y(xe,c),y(Se,i(L).ingredients.salt),y(we,u),y(Ee,`${i(me)??``} (${d??``})`),y(Oe,f),y(Ae,i(L).ingredients.total),y(Me,p)},[()=>E(i(I).ingredients.preFerment.flour),()=>E(i(I).ingredients.preFerment.water),()=>E(i(I).ingredients.preFerment.yeast),()=>E(i(I).ingredients.flour),()=>E(i(I).ingredients.water),()=>E(i(I).ingredients.salt),()=>E(i(H).flour),()=>E(i(H).water),()=>E(i(H).salt),()=>ne(i(I).yeastPercent),()=>E(i(H).yeast),()=>E(i(I).ingredients.totalDough)]),s(e,t)},$e=e=>{var t=le(),r=n(t),a=n(r),c=n(a),l=n(c,!0);h(c);var d=u(c),f=n(d,!0);h(d),h(a);var p=u(a),m=n(p),ee=n(m,!0);h(m);var g=u(m),_=n(g,!0);h(g),h(p);var v=u(p),b=n(v),x=n(b,!0);h(b);var S=u(b),C=n(S,!0);h(S),h(v);var w=u(v),T=n(w),te=n(T);h(T);var D=u(T),O=n(D,!0);h(D),h(w);var k=u(w),A=n(k),re=n(A,!0);h(A);var j=u(A),M=n(j,!0);h(j),h(k),h(r),h(t),o((e,t,n,r,a,o)=>{y(l,i(L).ingredients.flour),y(f,e),y(ee,i(L).ingredients.water),y(_,t),y(x,i(L).ingredients.salt),y(C,n),y(te,`${i(me)??``} (${r??``})`),y(O,a),y(re,i(L).ingredients.total),y(M,o)},[()=>E(i(I).ingredients.flour),()=>E(i(I).ingredients.water),()=>E(i(I).ingredients.salt),()=>ne(i(I).yeastPercent),()=>E(i(I).ingredients.yeast),()=>E(i(I).ingredients.totalDough)]),s(e,t)};f(Ze,e=>{i(I).ingredients.preFerment?e(Qe):e($e,-1)}),h(Je),h(W);var et=u(W,2),tt=n(et),nt=n(tt,!0);h(tt);var rt=u(tt,2),it=n(rt),at=n(it),ot=n(at),st=n(ot,!0);h(ot);var ct=u(ot),lt=n(ct,!0);h(ct);var ut=u(ct),dt=n(ut,!0);h(ut),h(at),h(it);var ft=u(it);b(ft,21,()=>i(I).steps,e=>e.kind+`-`+e.at.getTime(),(e,t)=>{let r=d(()=>i(t).kind===`ready`);var a=ue();let c;var l=n(a),f=n(l,!0);h(l);var p=u(l),m=n(p),g=n(m,!0);h(m);var _=u(m,2),v=n(_,!0);h(_),h(p);var b=u(p),x=n(b,!0);h(b),h(a),o((e,t,n,o)=>{c=ee(a,1,``,null,c,{"printpage-ready":i(r)}),y(f,e),y(g,t),y(v,n),y(x,o)},[()=>O(i(t).at,i(R)),()=>D(i(t),i(L)),()=>A(i(t),i(L),i(I)),()=>i(t).durationMinutes>0?j(i(t).durationMinutes,i(R)):`—`]),s(e,a)}),h(ft),h(rt),h(et);var pt=u(et,2),mt=n(pt),ht=n(mt),gt=n(ht,!0);h(ht);var _t=u(ht,2),vt=n(_t);h(_t),h(mt);var yt=u(mt,2),bt=e=>{var t=de(),r=n(t),a=n(r);h(r);var c=u(r,2),l=n(c,!0);h(c),h(t),o(()=>{p(r,`viewBox`,`0 0 ${i(B).size??``} ${i(B).size??``}`),p(a,`d`,i(B).path),y(l,i(L).print.scan_to_open)}),s(e,t)};f(yt,e=>{i(B)&&e(bt)}),h(pt),h(U),o((e,t,n)=>{y(q,i(L).app.title),y(_e,i(L).print.recipe_heading),y(be,i(L).form.readyBy),y(X,e),y(Ce,i(L).form.pizzaCount),y(Te,`${F.pizzaCount??``} × ${t??``} g`),y(De,i(L).form.hydration),y(ke,`${F.hydration??``}%`),y(je,i(L).form.salt),y(Ne,`${F.saltPercent??``}%`),y(Ie,i(L).form.yeastType),y(Re,i(he)),y(Ve,i(L).form.roomTemp),y(Ue,`${F.roomTempC??``} °C`),y(Xe,i(L).ingredients.heading),y(nt,i(L).schedule.heading),y(st,i(L).schedule.col_when),y(lt,i(L).schedule.col_step),y(dt,i(L).schedule.col_duration),y(gt,i(L).footer.about),y(vt,`${n??``} · v2.6.0`)},[()=>O(F.readyBy,i(R)),()=>te(F.ballWeight),()=>M(i(L).footer.license,{year:pe})]),s(_,U),a()}export{F as component,P as universal};