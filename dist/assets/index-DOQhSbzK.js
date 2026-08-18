import{c as v,r as n,j as R}from"./index-DQsIDAnN.js";import{M as T,i as z,u as I,P as q,a as V,b as W,L as F}from"./proxy-CLNaH4Ek.js";/**
 * @license lucide-react v1.6.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G=[["path",{d:"m12 14 4-4",key:"9kzdfg"}],["path",{d:"M3.34 19a10 10 0 1 1 17.32 0",key:"19p75a"}]],oe=v("gauge",G);/**
 * @license lucide-react v1.6.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D=[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]],se=v("menu",D);/**
 * @license lucide-react v1.6.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K=[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}]],re=v("scan",K);/**
 * @license lucide-react v1.6.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=[["path",{d:"M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5",key:"slp6dd"}],["path",{d:"M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244",key:"o0xfot"}],["path",{d:"M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05",key:"wn3emo"}]],ie=v("store",U);/**
 * @license lucide-react v1.6.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]],ce=v("truck",B);/**
 * @license lucide-react v1.6.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X=[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0",key:"dnpr2z"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0",key:"1x1e6c"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}]],ae=v("wifi",X);function H(e,r){if(typeof e=="function")return e(r);e!=null&&(e.current=r)}function Y(...e){return r=>{let t=!1;const s=e.map(u=>{const c=H(u,r);return!t&&typeof c=="function"&&(t=!0),c});if(t)return()=>{for(let u=0;u<s.length;u++){const c=s[u];typeof c=="function"?c():H(e[u],null)}}}}function J(...e){return n.useCallback(Y(...e),e)}class O extends n.Component{getSnapshotBeforeUpdate(r){const t=this.props.childRef.current;if(z(t)&&r.isPresent&&!this.props.isPresent&&this.props.pop!==!1){const s=t.offsetParent,u=z(s)&&s.offsetWidth||0,c=z(s)&&s.offsetHeight||0,d=getComputedStyle(t),o=this.props.sizeRef.current;o.height=parseFloat(d.height),o.width=parseFloat(d.width),o.top=t.offsetTop,o.left=t.offsetLeft,o.right=u-o.width-o.left,o.bottom=c-o.height-o.top}return null}componentDidUpdate(){}render(){return this.props.children}}function Q({children:e,isPresent:r,anchorX:t,anchorY:s,root:u,pop:c}){const d=n.useId(),o=n.useRef(null),C=n.useRef({width:0,height:0,top:0,left:0,right:0,bottom:0}),{nonce:x}=n.useContext(T),f=e.props?.ref??e?.ref,w=J(o,f);return n.useInsertionEffect(()=>{const{width:a,height:p,top:h,left:y,right:k,bottom:$}=C.current;if(r||c===!1||!o.current||!a||!p)return;const _=t==="left"?`left: ${y}`:`right: ${k}`,b=s==="bottom"?`bottom: ${$}`:`top: ${h}`;o.current.dataset.motionPopId=d;const l=document.createElement("style");x&&(l.nonce=x);const M=u??document.head;return M.appendChild(l),l.sheet&&l.sheet.insertRule(`
          [data-motion-pop-id="${d}"] {
            position: absolute !important;
            width: ${a}px !important;
            height: ${p}px !important;
            ${_}px !important;
            ${b}px !important;
          }
        `),()=>{o.current?.removeAttribute("data-motion-pop-id"),M.contains(l)&&M.removeChild(l)}},[r]),R.jsx(O,{isPresent:r,childRef:o,sizeRef:C,pop:c,children:c===!1?e:n.cloneElement(e,{ref:w})})}const Z=({children:e,initial:r,isPresent:t,onExitComplete:s,custom:u,presenceAffectsLayout:c,mode:d,anchorX:o,anchorY:C,root:x})=>{const f=I(ee),w=n.useId();let a=!0,p=n.useMemo(()=>(a=!1,{id:w,initial:r,isPresent:t,custom:u,onExitComplete:h=>{f.set(h,!0);for(const y of f.values())if(!y)return;s&&s()},register:h=>(f.set(h,!1),()=>f.delete(h))}),[t,f,s]);return c&&a&&(p={...p}),n.useMemo(()=>{f.forEach((h,y)=>f.set(y,!1))},[t]),n.useEffect(()=>{!t&&!f.size&&s&&s()},[t]),e=R.jsx(Q,{pop:d==="popLayout",isPresent:t,anchorX:o,anchorY:C,root:x,children:e}),R.jsx(q.Provider,{value:p,children:e})};function ee(){return new Map}const E=e=>e.key||"";function L(e){const r=[];return n.Children.forEach(e,t=>{n.isValidElement(t)&&r.push(t)}),r}const ue=({children:e,custom:r,initial:t=!0,onExitComplete:s,presenceAffectsLayout:u=!0,mode:c="sync",propagate:d=!1,anchorX:o="left",anchorY:C="top",root:x})=>{const[f,w]=V(d),a=n.useMemo(()=>L(e),[e]),p=d&&!f?[]:a.map(E),h=n.useRef(!0),y=n.useRef(a),k=I(()=>new Map),$=n.useRef(new Set),[_,b]=n.useState(a),[l,M]=n.useState(a);W(()=>{h.current=!1,y.current=a;for(let m=0;m<l.length;m++){const i=E(l[m]);p.includes(i)?(k.delete(i),$.current.delete(i)):k.get(i)!==!0&&k.set(i,!1)}},[l,p.length,p.join("-")]);const j=[];if(a!==_){let m=[...a];for(let i=0;i<l.length;i++){const g=l[i],P=E(g);p.includes(P)||(m.splice(i,0,g),j.push(g))}return c==="wait"&&j.length&&(m=j),M(L(m)),b(a),null}const{forceRender:N}=n.useContext(F);return R.jsx(R.Fragment,{children:l.map(m=>{const i=E(m),g=d&&!f?!1:a===l||p.includes(i),P=()=>{if($.current.has(i))return;if(k.has(i))$.current.add(i),k.set(i,!0);else return;let S=!0;k.forEach(A=>{A||(S=!1)}),S&&(N?.(),M(y.current),d&&w?.(),s&&s())};return R.jsx(Z,{isPresent:g,initial:!h.current||t?void 0:!1,custom:r,presenceAffectsLayout:u,mode:c,root:x,onExitComplete:g?void 0:P,anchorX:o,anchorY:C,children:m},i)})})};export{ue as A,oe as G,se as M,re as S,ce as T,ae as W,ie as a};
