import{B as e,H as t,I as n,J as r,L as i,Q as a,S as o,U as s,V as c,W as l,Z as u,b as d,d as f,g as p,j as m,m as ee,ot as h,r as g,rt as _,w as v,x as y,y as b}from"../chunks/DSgfH8D2.js";import{c as x}from"../chunks/RiLcmkL1.js";import"../chunks/DEDqjojZ.js";import{t as S}from"../chunks/Dynwu4ap.js";import{r as C,t as w}from"../chunks/BkifMPUY.js";import{a as T,b as te,c as E,d as D,f as O,m as ne,n as k,p as A,r as re,s as j,t as M,u as N}from"../chunks/oaoGCxLP.js";var P=h({entries:()=>ie,prerender:()=>!0,ssr:()=>!0});function ie(){return[{locale:void 0},...C.map(e=>({locale:e}))]}var ae=v(`<style>html,
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
		}</style>`),oe=v(`<tr><th> </th><td> </td></tr>`),se=v(`<tr><th> </th><td> </td></tr>`),ce=v(`<section class="printpage-ingredients-section"><h3> </h3> <table class="printpage-ingredients"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr></tbody></table></section> <section class="printpage-ingredients-section"><h3> </h3> <table class="printpage-ingredients"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr></tbody></table></section> <section class="printpage-ingredients-section"><h3> </h3> <table class="printpage-ingredients"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr class="printpage-total"><th> </th><td> </td></tr></tbody></table></section>`,1),le=v(`<table class="printpage-ingredients"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr class="printpage-total"><th> </th><td> </td></tr></tbody></table>`),ue=v(`<tr><td class="printpage-when"> </td><td><div class="printpage-step-title"> </div> <div class="printpage-step-desc"> </div></td><td class="printpage-duration"> </td></tr>`),de=v(`<div class="printpage-qr"><svg aria-hidden="true"><path fill="currentColor"></path></svg> <p class="printpage-qr-caption"> </p></div>`),fe=v(`<div class="printpage"><header class="printpage-header"><div><h1> </h1> <h2 style="margin-top: 3mm;"> </h2> <table class="printpage-summary"><tbody><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><tr><th> </th><td> </td></tr><!><!></tbody></table></div> <div><h2> </h2> <!></div></header> <section><h2> </h2> <table class="printpage-schedule"><thead><tr><th> </th><th> </th><th class="printpage-duration"> </th></tr></thead><tbody></tbody></table></section> <footer class="printpage-footer"><div><p> </p> <p> </p></div> <!></footer></div>`);function F(h,v){a(v,!0);function P(e){return typeof e==`string`&&C.includes(e)}let ie=P(S.params.locale)?S.params.locale:`en`;w.set(ie);let F=l({readyBy:new Date(Date.now()+1440*60*1e3),startAt:new Date,pizzaCount:6,ballWeight:280,hydration:70,saltPercent:3,yeastType:`fresh`,starterHydration:100,roomTempC:22,fridgeTempC:4,preFerment:null,...j(window.location.search)}),I=r(()=>T(F)),L=r(()=>w.t),R=r(()=>w.locale),pe=new Date().getFullYear(),z=r(()=>`${window.location.origin}${x}/?${E(F)}`),B=r(()=>m(z)?M(m(z)):null),me=r(()=>F.yeastType===`fresh`?m(L).ingredients.fresh_yeast:m(L).ingredients.sourdough_starter),he=r(()=>F.yeastType===`fresh`?m(L).form.yeast_fresh:m(L).form.yeast_sourdough),V=r(()=>m(I).preFerment?.type===`biga`?m(L).form.preFerment_biga:m(I).preFerment?.type===`poolish`?m(L).form.preFerment_poolish:null),H=r(()=>m(I).ingredients.preFerment?{flour:m(I).ingredients.flour+m(I).ingredients.preFerment.flour,water:m(I).ingredients.water+m(I).ingredients.preFerment.water,salt:m(I).ingredients.salt,yeast:m(I).ingredients.yeast+m(I).ingredients.preFerment.yeast}:null);g(()=>{let e=setTimeout(()=>window.print(),200);return()=>clearTimeout(e)});var U=fe();p(`1hugt37`,t=>{var r=ae();n(()=>{e.title=`${m(L).app.title??``} — ${m(L).print.recipe_heading??``}`}),o(t,r)});var W=c(U),G=c(W),K=c(G),q=c(K,!0);_(K);var ge=s(K,2),_e=c(ge,!0);_(ge);var ve=s(ge,2),J=c(ve),Y=c(J),ye=c(Y),be=c(ye,!0);_(ye);var xe=s(ye),X=c(xe,!0);_(xe),_(Y);var Z=s(Y),Se=c(Z),Ce=c(Se,!0);_(Se);var we=s(Se),Te=c(we);_(we),_(Z);var Q=s(Z),Ee=c(Q),De=c(Ee,!0);_(Ee);var Oe=s(Ee),ke=c(Oe);_(Oe),_(Q);var $=s(Q),Ae=c($),je=c(Ae,!0);_(Ae);var Me=s(Ae),Ne=c(Me);_(Me),_($);var Pe=s($),Fe=c(Pe),Ie=c(Fe,!0);_(Fe);var Le=s(Fe),Re=c(Le,!0);_(Le),_(Pe);var ze=s(Pe),Be=c(ze),Ve=c(Be,!0);_(Be);var He=s(Be),Ue=c(He);_(He),_(ze);var We=s(ze),Ge=e=>{var t=oe(),n=c(t),r=c(n,!0);_(n);var a=s(n),l=c(a);_(a),_(t),i(()=>{y(r,m(L).form.fridgeTemp),y(l,`${F.fridgeTempC??``} °C`)}),o(e,t)};d(We,e=>{m(I).mode===`cold`&&e(Ge)});var Ke=s(We),qe=e=>{var t=se(),n=c(t),r=c(n,!0);_(n);var a=s(n),l=c(a,!0);_(a),_(t),i(()=>{y(r,m(L).form.preFerment),y(l,m(V))}),o(e,t)};d(Ke,e=>{m(V)&&e(qe)}),_(J),_(ve),_(G);var Je=s(G,2),Ye=c(Je),Xe=c(Ye,!0);_(Ye);var Ze=s(Ye,2),Qe=e=>{var n=ce(),r=t(n),a=c(r),l=c(a,!0);_(a);var u=s(a,2),d=c(u),f=c(d),p=c(f),ee=c(p,!0);_(p);var h=s(p),g=c(h,!0);_(h),_(f);var v=s(f),b=c(v),x=c(b,!0);_(b);var S=s(b),C=c(S,!0);_(S),_(v);var w=s(v),T=c(w),te=c(T,!0);_(T);var E=s(T),D=c(E,!0);_(E),_(w),_(d),_(u),_(r);var O=s(r,2),k=c(O),re=c(k,!0);_(k);var j=s(k,2),M=c(j),N=c(M),P=c(N),ie=c(P,!0);_(P);var ae=s(P),oe=c(ae,!0);_(ae),_(N);var se=s(N),le=c(se),ue=c(le,!0);_(le);var de=s(le),fe=c(de,!0);_(de),_(se);var F=s(se),R=c(F),pe=c(R,!0);_(R);var z=s(R),B=c(z,!0);_(z),_(F),_(M),_(j),_(O);var he=s(O,2),V=c(he),U=c(V,!0);_(V);var W=s(V,2),G=c(W),K=c(G),q=c(K),ge=c(q,!0);_(q);var _e=s(q),ve=c(_e,!0);_(_e),_(K);var J=s(K),Y=c(J),ye=c(Y,!0);_(Y);var be=s(Y),xe=c(be,!0);_(be),_(J);var X=s(J),Z=c(X),Se=c(Z,!0);_(Z);var Ce=s(Z),we=c(Ce,!0);_(Ce),_(X);var Te=s(X),Q=c(Te),Ee=c(Q);_(Q);var De=s(Q),Oe=c(De,!0);_(De),_(Te);var ke=s(Te),$=c(ke),Ae=c($,!0);_($);var je=s($),Me=c(je,!0);_(je),_(ke),_(G),_(W),_(he),i((e,t,n,r,i,a,o,s,c,u,d,f)=>{y(l,m(L).ingredients.preFerment_heading),y(ee,m(L).ingredients.flour),y(g,e),y(x,m(L).ingredients.water),y(C,t),y(te,m(L).ingredients.fresh_yeast),y(D,n),y(re,m(L).ingredients.mainDough_heading),y(ie,m(L).ingredients.flour),y(oe,r),y(ue,m(L).ingredients.water),y(fe,i),y(pe,m(L).ingredients.salt),y(B,a),y(U,m(L).ingredients.totals_heading),y(ge,m(L).ingredients.flour),y(ve,o),y(ye,m(L).ingredients.water),y(xe,s),y(Se,m(L).ingredients.salt),y(we,c),y(Ee,`${m(me)??``} (${u??``})`),y(Oe,d),y(Ae,m(L).ingredients.total),y(Me,f)},[()=>A(m(I).ingredients.preFerment.flour),()=>A(m(I).ingredients.preFerment.water),()=>A(m(I).ingredients.preFerment.yeast),()=>A(m(I).ingredients.flour),()=>A(m(I).ingredients.water),()=>A(m(I).ingredients.salt),()=>A(m(H).flour),()=>A(m(H).water),()=>A(m(H).salt),()=>ne(m(I).yeastPercent),()=>A(m(H).yeast),()=>A(m(I).ingredients.totalDough)]),o(e,n)},$e=e=>{var t=le(),n=c(t),r=c(n),a=c(r),l=c(a,!0);_(a);var u=s(a),d=c(u,!0);_(u),_(r);var f=s(r),p=c(f),ee=c(p,!0);_(p);var h=s(p),g=c(h,!0);_(h),_(f);var v=s(f),b=c(v),x=c(b,!0);_(b);var S=s(b),C=c(S,!0);_(S),_(v);var w=s(v),T=c(w),te=c(T);_(T);var E=s(T),D=c(E,!0);_(E),_(w);var O=s(w),k=c(O),re=c(k,!0);_(k);var j=s(k),M=c(j,!0);_(j),_(O),_(n),_(t),i((e,t,n,r,i,a)=>{y(l,m(L).ingredients.flour),y(d,e),y(ee,m(L).ingredients.water),y(g,t),y(x,m(L).ingredients.salt),y(C,n),y(te,`${m(me)??``} (${r??``})`),y(D,i),y(re,m(L).ingredients.total),y(M,a)},[()=>A(m(I).ingredients.flour),()=>A(m(I).ingredients.water),()=>A(m(I).ingredients.salt),()=>ne(m(I).yeastPercent),()=>A(m(I).ingredients.yeast),()=>A(m(I).ingredients.totalDough)]),o(e,t)};d(Ze,e=>{m(I).ingredients.preFerment?e(Qe):e($e,-1)}),_(Je),_(W);var et=s(W,2),tt=c(et),nt=c(tt,!0);_(tt);var rt=s(tt,2),it=c(rt),at=c(it),ot=c(at),st=c(ot,!0);_(ot);var ct=s(ot),lt=c(ct,!0);_(ct);var ut=s(ct),dt=c(ut,!0);_(ut),_(at),_(it);var ft=s(it);b(ft,21,()=>m(I).steps,e=>e.kind+`-`+e.at.getTime(),(e,t)=>{let n=r(()=>m(t).kind===`ready`);var a=ue();let l;var u=c(a),d=c(u,!0);_(u);var f=s(u),p=c(f),h=c(p,!0);_(p);var g=s(p,2),v=c(g,!0);_(g),_(f);var b=s(f),x=c(b,!0);_(b),_(a),i((e,t,r,i)=>{l=ee(a,1,``,null,l,{"printpage-ready":m(n)}),y(d,e),y(h,t),y(v,r),y(x,i)},[()=>D(m(t).at,m(R)),()=>re(m(t),m(L)),()=>k(m(t),m(L),m(I)),()=>m(t).durationMinutes>0?O(m(t).durationMinutes,m(R)):`—`]),o(e,a)}),_(ft),_(rt),_(et);var pt=s(et,2),mt=c(pt),ht=c(mt),gt=c(ht,!0);_(ht);var _t=s(ht,2),vt=c(_t);_(_t),_(mt);var yt=s(mt,2),bt=e=>{var t=de(),n=c(t),r=c(n);_(n);var a=s(n,2),l=c(a,!0);_(a),_(t),i(()=>{f(n,`viewBox`,`0 0 ${m(B).size??``} ${m(B).size??``}`),f(r,`d`,m(B).path),y(l,m(L).print.scan_to_open)}),o(e,t)};d(yt,e=>{m(B)&&e(bt)}),_(pt),_(U),i((e,t,n)=>{y(q,m(L).app.title),y(_e,m(L).print.recipe_heading),y(be,m(L).form.readyBy),y(X,e),y(Ce,m(L).form.pizzaCount),y(Te,`${F.pizzaCount??``} × ${t??``} g`),y(De,m(L).form.hydration),y(ke,`${F.hydration??``}%`),y(je,m(L).form.salt),y(Ne,`${F.saltPercent??``}%`),y(Ie,m(L).form.yeastType),y(Re,m(he)),y(Ve,m(L).form.roomTemp),y(Ue,`${F.roomTempC??``} °C`),y(Xe,m(L).ingredients.heading),y(nt,m(L).schedule.heading),y(st,m(L).schedule.col_when),y(lt,m(L).schedule.col_step),y(dt,m(L).schedule.col_duration),y(gt,m(L).footer.about),y(vt,`${n??``} · v3.3.1`)},[()=>D(F.readyBy,m(R)),()=>N(F.ballWeight),()=>te(m(L).footer.license,{year:pe})]),o(h,U),u()}export{F as component,P as universal};