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
  function sync(){tLabel.textContent=isDark()?T.light:T.dark}
  try{var saved=localStorage.getItem('geol-theme');if(saved==='dark'||saved==='light')root.setAttribute('data-theme',saved)}catch(e){}
  tBtn.addEventListener('click',function(){var next=isDark()?'light':'dark';root.setAttribute('data-theme',next);try{localStorage.setItem('geol-theme',next)}catch(e){}sync()});
  mq.addEventListener&&mq.addEventListener('change',sync);
  sync();

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
