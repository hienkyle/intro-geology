/* Shared behaviour for every unit page: key terms panel, theme toggle, return to top, contents highlighting, image fallback. */
(function(){
  // Key terms come from the page: <script type="application/json" id="terms"> holding [term, section id, definition] rows.
  var TERMS=[];try{TERMS=JSON.parse(document.getElementById('terms').textContent)}catch(e){}
  TERMS.sort(function(a,b){return a[0].localeCompare(b[0],document.querySelector('body [lang]')?document.querySelector('body [lang]').getAttribute('lang'):'en',{sensitivity:'base'})});

  var root=document.documentElement;
  // Interface text in the page's language (set lang="vi" on the page wrapper for Vietnamese).
  var langEl=document.querySelector('body [lang]')||root;
  var LANG=(langEl.getAttribute('lang')||'en').slice(0,2);
  var STR={
    en:{count:function(n,t){return n+' of '+t+' terms'},none:function(q){return 'No terms match "'+q+'".'},light:'Light mode',dark:'Dark mode',imgFail:'Photo could not load here.',imgOpen:'Open the image ↗'},
    vi:{count:function(n,t){return n+' / '+t+' thuật ngữ'},none:function(q){return 'Không có thuật ngữ nào khớp với "'+q+'".'},light:'Chế độ sáng',dark:'Chế độ tối',imgFail:'Không tải được ảnh.',imgOpen:'Mở ảnh ↗'}
  };
  var T=STR[LANG]||STR.en;
  // Fold accents so "da tram tich" finds "đá trầm tích"; keeps string length so highlights line up.
  function fold(s){return s.toLowerCase().split('').map(function(c){return c==='đ'?'d':c.normalize('NFD').charAt(0)}).join('')}
  var list=document.getElementById('termList'), search=document.getElementById('termSearch'), count=document.getElementById('termCount');
  var panel=document.getElementById('notes'), btn=document.getElementById('notesBtn');
  function esc(s){return s.replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function hi(s,q){if(!q)return esc(s);var i=fold(s).indexOf(q);if(i<0)return esc(s);return esc(s.slice(0,i))+'<mark>'+esc(s.slice(i,i+q.length))+'</mark>'+esc(s.slice(i+q.length))}
  function slug(t){return 'term-'+fold(t).replace(/[^a-z0-9]+/g,'-')}
  function render(){
    var q=fold(search.value.trim()), html='', n=0;
    TERMS.forEach(function(t){
      if(q && fold(t[0]).indexOf(q)<0 && fold(t[2]).indexOf(q)<0) return;
      n++;
      html+='<dt id="'+slug(t[0])+'"><span>'+hi(t[0],q)+'</span><a href="#'+t[1]+'" data-go="'+t[1]+'">§'+t[1].replace(/^s/,'').replace(/-/g,'.')+'</a></dt><dd>'+hi(t[2],q)+'</dd>';
    });
    list.innerHTML=html||'<p class="empty">'+esc(T.none(search.value))+'</p>';
    count.textContent=T.count(n,TERMS.length);
  }
  function openNotes(focusTerm){
    panel.hidden=false;btn.setAttribute('aria-expanded','true');
    if(focusTerm){
      search.value='';render();
      var el=document.getElementById(slug(focusTerm));
      if(el){el.scrollIntoView({block:'center'});el.classList.add('flash');setTimeout(function(){el.classList.remove('flash')},1600)}
    } else search.focus();
  }
  function closeNotes(){panel.hidden=true;btn.setAttribute('aria-expanded','false');btn.focus()}
  search.addEventListener('input',render);
  btn.addEventListener('click',function(){panel.hidden?openNotes():closeNotes()});
  document.getElementById('notesClose').addEventListener('click',closeNotes);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!panel.hidden)closeNotes()});
  document.addEventListener('click',function(e){if(!panel.hidden&&!e.target.closest('#notes,#notesBtn,.term'))closeNotes()});
  list.addEventListener('click',function(e){var a=e.target.closest('a[data-go]');if(a&&window.innerWidth<700)panel.hidden=true});
  document.querySelectorAll('.term').forEach(function(b){b.addEventListener('click',function(){openNotes(b.dataset.term)})});
  render();

  // Theme toggle
  var tBtn=document.getElementById('themeBtn'), tLabel=document.getElementById('themeLabel');
  var mq=window.matchMedia('(prefers-color-scheme: dark)');
  function isDark(){var t=root.getAttribute('data-theme');return t?t==='dark':mq.matches}
  function sync(){tLabel.textContent=isDark()?T.light:T.dark;if(window.__figReady)fixFigures()}
  try{var saved=localStorage.getItem('geol-theme');if(saved==='dark'||saved==='light')root.setAttribute('data-theme',saved)}catch(e){}
  tBtn.addEventListener('click',function(){var next=isDark()?'light':'dark';root.setAttribute('data-theme',next);try{localStorage.setItem('geol-theme',next)}catch(e){}sync()});
  mq.addEventListener&&mq.addEventListener('change',sync);
  sync();

  // Dark mode: keep figure labels readable. Hand-drawn SVGs use fixed colors, so after a theme change
  // each label's real background (the shape under it, or its halo) is measured and the label's
  // lightness is nudged (same hue) until it reads. Light mode keeps the drawn colors untouched.
  function rgbOf(s){var m=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(s||'');return m?[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]:null}
  function lumOf(c){return [0,1,2].reduce(function(a,i){var v=c[i]/255;v=v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);return a+[0.2126,0.7152,0.0722][i]*v},0)}
  function ratio(a,b){var x=lumOf(a),y=lumOf(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
  function toHsl(c){var r=c[0]/255,g=c[1]/255,b=c[2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,h=0,s=0,d=mx-mn;
    if(d){s=l>0.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6}return [h,s,l]}
  function fromHsl(h,s,l){function f(p,q,t){if(t<0)t+=1;if(t>1)t-=1;return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p}
    if(!s)return [l*255,l*255,l*255];var q=l<0.5?l*(1+s):l+s-l*s,p=2*l-q;return [f(p,q,h+1/3)*255,f(p,q,h)*255,f(p,q,h-1/3)*255]}
  function readable(fg,bg,target){
    if(ratio(fg,bg)>=target)return null;
    var hsl=toHsl(fg),up=lumOf(bg)<0.35,best=null;
    for(var k=0;k<2&&!best;k++){var dir=(up?1:-1)*(k?-1:1);
      for(var l=hsl[2];l>=0&&l<=1;l+=dir*0.02){var c=fromHsl(hsl[0],hsl[1],l);if(ratio(c,bg)>=target){best=c;break}}}
    if(!best)best=up?[255,255,255]:[17,17,17];
    return 'rgb('+best.map(Math.round).join(',')+')'}
  function paintOf(s,cs){var f=rgbOf(cs.fill);if(f)return f;var m=/url\("?#([^")]+)/.exec(cs.fill||'');if(!m)return null;
    var g=document.getElementById(m[1]);if(!g)return null;
    if(/Gradient$/.test(g.tagName)){var st=g.querySelectorAll('stop');if(!st.length&&g.href&&g.href.baseVal){g=document.getElementById(g.href.baseVal.slice(1));st=g?g.querySelectorAll('stop'):[]}
      var acc=[0,0,0],n=0;[].forEach.call(st,function(x){var c=rgbOf(getComputedStyle(x).stopColor);if(c){acc[0]+=c[0];acc[1]+=c[1];acc[2]+=c[2];n++}});return n?[acc[0]/n,acc[1]/n,acc[2]/n,1]:null}
    var r=g.querySelector('rect,path,circle,polygon');return r?rgbOf(getComputedStyle(r).fill):null}
  function inClip(n,sp,svg){for(;n&&n!==svg.parentNode;n=n.parentNode){if(n.nodeType!==1)continue;var cp=getComputedStyle(n).clipPath,m=/url\("?#([^")]+)/.exec(cp||'');if(!m)continue;
      var c=document.getElementById(m[1]),ctm=n.getScreenCTM&&n.getScreenCTM();if(!c||!ctm)continue;var lp=sp.matrixTransform(ctm.inverse()),hit=false;
      [].forEach.call(c.querySelectorAll('rect,path,circle,ellipse,polygon'),function(k){var p=svg.createSVGPoint();p.x=lp.x;p.y=lp.y;try{if(k.isPointInFill(p))hit=true}catch(e){}});if(!hit)return false}return true}
  function alphaOf(s,svg){var a=1;for(var n=s;n&&n!==svg.parentNode;n=n.parentNode){if(n.nodeType===1)a*=+getComputedStyle(n).opacity}return a}
  function baseBg(svg){for(var n=svg;n&&n.nodeType===1;n=n.parentNode){var c=rgbOf(getComputedStyle(n).backgroundColor);if(c&&c[3]>0.5)return c}
    return rgbOf(getComputedStyle(document.body).backgroundColor)}
  function moving(t,svg){for(var n=t;n&&n!==svg;n=n.parentNode){if(n.getAnimations&&n.getAnimations().length)return true;if(n.tagName==='animate'||n.querySelector&&n.querySelector(':scope>animate,:scope>animateTransform,:scope>animateMotion'))return true}return false}
  function bgAt(svg,t,sp){
    var shapes=svg.querySelectorAll('rect,path,circle,ellipse,polygon,image'),layers=[];
    for(var i=shapes.length-1;i>=0;i--){var s=shapes[i];
      if(!(s.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING))continue; // only shapes painted before t
      if(s.closest('defs,clipPath,mask,marker,pattern,symbol'))continue;
      var cs=getComputedStyle(s);if(cs.display==='none'||cs.visibility==='hidden')continue;
      var sm=s.getScreenCTM();if(!sm)continue;var lp=sp.matrixTransform(sm.inverse()),hit=false;
      if(s.tagName==='image'){var ib=s.getBBox();hit=lp.x>=ib.x&&lp.x<=ib.x+ib.width&&lp.y>=ib.y&&lp.y<=ib.y+ib.height;if(hit&&inClip(s,sp,svg))return 'img';continue}
      var f=paintOf(s,cs);if(!f||!f[3])continue;
      var p=svg.createSVGPoint();p.x=lp.x;p.y=lp.y;try{hit=s.isPointInFill(p)}catch(e){}
      if(!hit||!inClip(s,sp,svg))continue;
      var a=alphaOf(s,svg)*+cs.fillOpacity*f[3];if(a<0.03)continue;
      layers.push([f,a]);if(a>=0.97)break}
    var c=layers.length&&layers[layers.length-1][1]>=0.97?layers.pop()[0].slice(0,3):baseBg(svg).slice(0,3);
    for(var j=layers.length-1;j>=0;j--){var L=layers[j];c=[0,1,2].map(function(k){return L[0][k]*L[1]+c[k]*(1-L[1])})}
    return c.concat(1)}
  function textBgs(svg,t){ // backgrounds at 5 points across a label
    var b;try{b=t.getBBox()}catch(e){return null}if(!b.width)return null;var m=t.getScreenCTM();if(!m)return null;var out=[];
    [[.5,.5],[.1,.5],[.9,.5],[.3,.3],[.7,.7]].forEach(function(q){var p=svg.createSVGPoint();p.x=b.x+b.width*q[0];p.y=b.y+b.height*q[1];out.push(bgAt(svg,t,p.matrixTransform(m)))});
    return out.indexOf('img')>=0?'img':out}
  function lineBgs(svg,e){var m=e.getScreenCTM();if(!m||!e.getTotalLength)return null;var L;try{L=e.getTotalLength()}catch(x){return null}var out=[];
    for(var k=0;k<=6;k++){var p=e.getPointAtLength(L*k/6);var q=svg.createSVGPoint();q.x=p.x;q.y=p.y;out.push(bgAt(svg,e,q.matrixTransform(m)))}
    return out.indexOf('img')>=0?null:out}
  function minRatio(c,bgs){return Math.min.apply(null,bgs.map(function(b){return ratio(c,b)}))}
  function meanLum(bgs){return bgs.reduce(function(a,b){return a+lumOf(b)},0)/bgs.length}
  function lightest(bgs){return bgs.slice().sort(function(a,b){return lumOf(b)-lumOf(a)})[Math.floor(bgs.length/2)]}
  var DK=['fill','stroke','strokeWidth','paintOrder','strokeLinejoin'];
  function fixSvg(svg,dark){
    [].forEach.call(svg.querySelectorAll('[data-dk]'),function(t){DK.forEach(function(k){t.style[k]=''});t.removeAttribute('data-dk')});
    if(!dark)return;
    var surf=getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
    [].forEach.call(svg.querySelectorAll('text,tspan'),function(t){
      var own=[].some.call(t.childNodes,function(n){return n.nodeType===3&&n.textContent.trim()});if(!own)return;
      var cs=getComputedStyle(t),fill=rgbOf(cs.fill);if(!fill||!fill[3])return;
      var el=t.tagName==='tspan'?t.closest('text'):t,nf;
      var st=rgbOf(cs.stroke),halo=st&&st[3]>0&&parseFloat(cs.strokeWidth)>=2&&/^stroke/.test(cs.paintOrder);
      if(!halo&&moving(el,svg)){ // a label that moves crosses many colors: give it a halo in the page color
        t.style.stroke=surf||'rgb('+baseBg(svg).slice(0,3).join(',')+')';t.style.strokeWidth='3px';t.style.paintOrder='stroke';t.style.strokeLinejoin='round';
        st=rgbOf(getComputedStyle(t).stroke)||baseBg(svg);nf=readable(fill,st,4.5);if(nf)t.style.fill=nf;t.setAttribute('data-dk','');return}
      var bgs=textBgs(svg,el);if(!bgs||bgs==='img')return;
      if(halo){
        if(meanLum(bgs)>0.3&&lumOf(st)<0.2){var hb=lightest(bgs); // dark halo on a light drawing: halo takes the drawing's color
          t.style.stroke='rgb('+hb.slice(0,3).map(Math.round).join(',')+')';nf=readable(fill,hb,4.5)}
        else nf=readable(fill,st,4.5)}
      else if(minRatio(fill,bgs)<4.5){var mid=bgs[0];nf=readable(fill,mid,4.5)}
      if(nf)t.style.fill=nf;
      if(nf||t.style.stroke)t.setAttribute('data-dk','')});
    // leader lines and dots drawn in the text color
    [].forEach.call(svg.querySelectorAll('line,polyline,path,circle'),function(e){
      if(e.closest('defs,clipPath,mask,marker,pattern,symbol'))return;
      var a=(e.getAttribute('stroke')||'')+(e.getAttribute('fill')||'')+(e.getAttribute('class')||'');if(!/--fg|--muted|svg-ink|svg-muted/.test(a))return;
      var cs=getComputedStyle(e),isDot=e.tagName==='circle'&&rgbOf(cs.fill)&&rgbOf(cs.fill)[3]>0,prop=isDot?'fill':'stroke',col=rgbOf(cs[prop]);if(!col||!col[3])return;
      var bgs;if(isDot){var m=e.getScreenCTM(),p=svg.createSVGPoint();p.x=+e.getAttribute('cx');p.y=+e.getAttribute('cy');if(!m)return;bgs=[bgAt(svg,e,p.matrixTransform(m))];if(bgs[0]==='img')return}
      else bgs=lineBgs(svg,e);
      if(!bgs||minRatio(col,bgs)>=2.5)return;
      var cands=[col,[30,30,30],[245,245,245]],best=col,bv=minRatio(col,bgs);
      cands.forEach(function(c){var v=minRatio(c,bgs);if(v>bv+0.3){bv=v;best=c}});
      if(best!==col){e.style[prop]='rgb('+best.map(Math.round).join(',')+')';e.setAttribute('data-dk','')}});
  }
  function fixFigures(){var d=isDark();[].forEach.call(document.querySelectorAll('main svg'),function(s){if(s.getBoundingClientRect().width>60)fixSvg(s,d)})}
  document.addEventListener('click',function(e){var s=e.target.closest('figure');if(s)setTimeout(function(){[].forEach.call(s.querySelectorAll('svg'),function(v){fixSvg(v,isDark())})},30)});
  document.addEventListener('input',function(e){var s=e.target.closest('figure');if(s)[].forEach.call(s.querySelectorAll('svg'),function(v){fixSvg(v,isDark())})});
  if(document.readyState==='complete')fixFigures();else window.addEventListener('load',fixFigures);
  window.__figReady=true;

  // Return to top
  var top=document.getElementById('toTop');
  function onScroll(){top.classList.toggle('hide',window.scrollY<500)}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  top.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});

  // Contents highlighting
  var toc=document.querySelector('.toc');
  function setNavH(){root.style.setProperty('--navh',window.innerWidth<=900?toc.offsetHeight+'px':'0px')}
  setNavH();window.addEventListener('resize',setNavH);
  var links=[].slice.call(toc.querySelectorAll('a[href^="#"]'));
  var targets=links.map(function(a){return document.getElementById(a.getAttribute('href').slice(1))}).filter(Boolean);
  function current(){
    var off=(window.innerWidth<=900?toc.offsetHeight:0)+90, cur=targets[0];
    targets.forEach(function(t){if(t.getBoundingClientRect().top-off<=0)cur=t});
    if(window.innerHeight+window.scrollY>=document.body.scrollHeight-4)cur=targets[targets.length-1];
    return cur;
  }
  var last=null;
  function highlight(){
    var cur=current(); if(cur===last)return; last=cur;
    links.forEach(function(a){a.classList.remove('active')});
    var a=toc.querySelector('a[href="#'+cur.id+'"]'); if(!a)return;
    a.classList.add('active');
    // on phones, the sub-items are hidden: highlight the parent too
    var parent=a.closest('ol ol'); if(parent&&window.innerWidth<=900){var p=parent.parentElement.querySelector(':scope > a');if(p){p.classList.add('active');a=p}}
    else if(parent){var p2=parent.parentElement.querySelector(':scope > a');if(p2)p2.classList.add('active')}
    var box=window.innerWidth<=900?toc.querySelector('ol'):toc;
    var r=a.getBoundingClientRect(), br=box.getBoundingClientRect();
    if(window.innerWidth<=900){box.scrollLeft+= (r.left-br.left)-(br.width/2-r.width/2)}
    else if(r.top<br.top||r.bottom>br.bottom){box.scrollTop+=(r.top-br.top)-br.height/3}
  }
  window.addEventListener('scroll',highlight,{passive:true});window.addEventListener('resize',highlight);highlight();


  // Photo fallback when a textbook image can't load
  document.querySelectorAll('figure img').forEach(function(img){
    function fail(){var d=document.createElement('div');d.className='img-fallback';d.innerHTML='<span>'+T.imgFail+'</span><a href="'+img.src+'" target="_blank" rel="noopener">'+T.imgOpen+'</a>';img.replaceWith(d)}
    if(img.complete&&img.naturalWidth===0)fail();else img.addEventListener('error',fail);
  });
})();
