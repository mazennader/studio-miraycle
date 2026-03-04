const API_BASE = "https://artshop-backend.onrender.com";

const form = document.getElementById("adminLoginForm");
const note = document.getElementById("loginNote");

const emailEl = document.getElementById("adminEmail");
const passEl  = document.getElementById("adminPassword");

const codeWrap = document.getElementById("codeWrap");
const codeEl   = document.getElementById("adminCode");
const btnVerify = document.getElementById("btnVerify");

let lastEmail = "";

function setNote(text, ok=false){
  note.textContent = text;
  note.style.color = ok ? "#1d8a5a" : "#c23b3b";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailEl.value.trim();
  const password = passEl.value;

  if(!email || !password){
    setNote("Please enter email and password.");
    return;
  }

  setNote("Sending code...", true);

  try{
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if(!res.ok){
      setNote(data?.error || "Login failed.");
      return;
    }

    lastEmail = email;

    codeWrap.style.display = "block";
    codeEl.focus();

    setNote("Code sent to your email. Enter it below.", true);
  }catch(err){
    setNote("Backend not reachable. Make sure server.js is running.");
  }
});

btnVerify.addEventListener("click", async () => {
  const code = codeEl.value.trim();

  if(!lastEmail){
    setNote("Please send the code first.");
    return;
  }

  if(!/^\d{6}$/.test(code)){
    setNote("Enter a valid 6-digit code.");
    return;
  }

  setNote("Verifying...", true);

  try{
    const res = await fetch(`${API_BASE}/api/admin/verify-code`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      credentials: "include",
      body: JSON.stringify({ email: lastEmail, code })
    });

    const data = await res.json();

if(!res.ok){
  setNote(data?.error || "Wrong code.");
  return;
}

console.log("VERIFY RESPONSE:", data);


    setNote("Logged in ✅", true);
    window.location.href = "admin-dashboard.html";
  }catch(err){
    setNote("Backend not reachable. Make sure server.js is running.");
  }
});

codeEl.addEventListener("keydown", (e) => {
  if(e.key === "Enter") btnVerify.click();
});
