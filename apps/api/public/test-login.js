const form=document.getElementById('login-form');
const signed=document.getElementById('signed');
const profile=document.getElementById('profile');
const message=document.getElementById('message');
const logout=document.getElementById('logout');
function show(user){
  signed.hidden=!user; form.hidden=!!user;
  if(user)profile.textContent=user.name+' ('+user.username+') — '+(user.role==='test_admin'?'Тестов администратор':user.role);
}
async function refresh(){
  try{const r=await fetch('/api/v1/test-auth/me',{credentials:'same-origin'});
    show(r.ok?(await r.json()).user:null);
  }catch{show(null);}
}
form.addEventListener('submit',async e=>{
  e.preventDefault();message.textContent='Проверка на данните...';
  const username=form.elements.username.value.trim();
  const password=form.elements.password.value;
  try{
    const r=await fetch('/api/v1/test-auth/login',{method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
    form.elements.password.value='';
    if(!r.ok){message.textContent=r.status===429?'Твърде много опити. Опитай по-късно.':'Невалидни данни за вход.';return;}
    show((await r.json()).user);message.textContent='Успешен тестов вход.';
  }catch{message.textContent='Сървърът не отговаря.';}
});
logout.addEventListener('click',async()=>{
  try{await fetch('/api/v1/test-auth/logout',{method:'POST',credentials:'same-origin'});}
  finally{show(null);message.textContent='Изходът е завършен.';}
});
refresh();
