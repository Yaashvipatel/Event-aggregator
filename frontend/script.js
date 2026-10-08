//----- Redirect if already signed in -----
if (App.getToken() && App.getUser() && document.getElementById("loginForm")) {
    window.location.href = "notices.html";
}

//----- SIGNUP -----
const signupForm = document.getElementById("signupForm");

if (signupForm) {
    const chipBox = document.getElementById("interestChips");
    const selected = new Set();
    App.INTERESTS.forEach((name) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.textContent = name;
        chip.addEventListener("click", () => {
            selected.has(name) ? selected.delete(name) : selected.add(name);
            chip.classList.toggle("on", selected.has(name));
        });
        chipBox.appendChild(chip);
    });

    signupForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const message = document.getElementById("signupMessage");
        try {
            const data = await App.api("/auth/register", {
                method: "POST",
                body: {
                    name: document.getElementById("signupName").value,
                    studentId: document.getElementById("signupStudentId").value,
                    password: document.getElementById("signupPassword").value,
                    interests: [...selected],
                },
            });
            App.saveSession(data.token, data.user);
            message.textContent = "Signup successful! Redirecting...";
            message.className = "message success";
            setTimeout(() => { window.location.href = "notices.html"; }, 800);
        } catch (err) {
            message.textContent = err.message;
            message.className = "message error";
        }
    });
}

//----- LOGIN -----
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const message = document.getElementById("loginMessage");
        try {
            const data = await App.api("/auth/login", {
                method: "POST",
                body: {
                    studentId: document.getElementById("loginStudentId").value,
                    password: document.getElementById("loginPassword").value,
                },
            });
            App.saveSession(data.token, data.user);
            message.textContent = "Login Successful !";
            message.className = "message success";
            setTimeout(() => { window.location.href = "notices.html"; }, 500);
        } catch (err) {
            message.textContent = err.message;
            message.className = "message error";
        }
    });
}

document.querySelectorAll(".toggle-password").forEach((toggle) => {
    toggle.addEventListener("click", function (e) {
        const input = e.target.previousElementSibling;
        if (input.type === "password") {
            input.type = "text";
            e.target.innerText = "Hide";
        } else {
            input.type = "password";
            e.target.innerText = "Show";
        }
    });
});
