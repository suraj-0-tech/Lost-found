document.addEventListener("DOMContentLoaded", () => {
  renderNav(null);

  // If already logged in, skip straight to browsing
  if (Auth.isLoggedIn()) {
    window.location.href = "search.html";
    return;
  }

  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const errorBox = document.getElementById("error-box");
  const successBox = document.getElementById("success-box");

  function clearMessages() {
    errorBox.classList.remove("show");
    successBox.classList.remove("show");
  }

  tabLogin.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    clearMessages();
  });

  tabRegister.addEventListener("click", () => {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    clearMessages();
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessages();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      const data = await apiRequest("/auth/login", { method: "POST", body: { email, password } });
      Auth.setSession(data.token, data.user);
      window.location.href = "search.html";
    } catch (err) {
      showMessage(errorBox, err.message, true);
    }
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessages();
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const phone = document.getElementById("reg-phone").value.trim();
    const password = document.getElementById("reg-password").value;

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: { name, email, phone, password },
      });
      Auth.setSession(data.token, data.user);
      window.location.href = "search.html";
    } catch (err) {
      showMessage(errorBox, err.message, true);
    }
  });
});
