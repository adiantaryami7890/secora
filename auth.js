const HOME_URL = new URL("home.html", window.location.href).href;
const LOGIN_URL = new URL("index.html", window.location.href).href;
function showStatus(el,msg,type="neutral"){if(!el)return;el.textContent=msg;el.classList.toggle("is-error",type==="error");el.classList.toggle("is-success",type==="success")}
async function requireSession(){const {data:{session},error}=await secoraSupabase.auth.getSession();if(error||!session){location.replace(LOGIN_URL);return null}return session}
async function redirectIfAuthenticated(){const {data:{session}}=await secoraSupabase.auth.getSession();if(session)location.replace(HOME_URL)}
