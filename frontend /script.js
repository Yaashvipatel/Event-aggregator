
const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const name = document.getElementById("signupName").value;
        const studentId = document.getElementById("signupStudentId").value;
        const phone = document.getElementById("signupPhone").value;
        const password = document.getElementById("signupPassword").value;
        const message = document.getElementById("signupMessage");

        const phoneRegex = /^[6-9]\d{9}$/;

        if (!phoneRegex.test(phone)) {
            message.textContent = "Enter a valid phone number!";
            message.className = "message error";
            return;
        }

        if (localStorage.getItem(studentId)) {
            message.textContent = "Student ID already registered!";
            message.className = "message error";
        } else {
            const user = {
                name: name,
                studentId: studentId,
                phone: phone,
                password: password
            };

            localStorage.setItem(studentId, JSON.stringify(user));

            message.textContent = "Signup successful! Please login.";
            message.className = "message success";

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
        }
    });
}

const loginForm = document.getElementById("loginForm");

if(loginForm) {
    loginForm.addEventListener("submit",function(e) {
        e.preventDefault();

        const studentId = document.getElementById("loginStudentId").value;
        const password = document.getElementById("loginPassword").value;
        const message = document.getElementById("loginMessage");

        const user = JSON.parse(localStorage.getItem(studentId));

        if(user && user.password == password) {
            message.textContent = "Login Successful !";
            message.className = "message success";

            
            setTimeout(() => {
                window.location.href = "notices.html";
            }, 1000);
        } else{
            message.textContent = "Invalid Student ID or Password";
            message.className = "message error";
        }
    });
}

document.querySelectorAll(".toggle-password").forEach(toggle =>{
    toggle.addEventListener("click", function(e){
        const input = e.target.previousElementSibling;
        if(input.type === "password") {
        input.type = "text";
        e.target.innerText = "Hide";
    } else {
        input.type = "password";
        e.target.innerText = "Show";
    }
    });
});

async function signupUser() {

  const name = document.getElementById("signupName").value;
  const studentId = document.getElementById("signupStudentId").value;
  const password = document.getElementById("signupPassword").value;

  const res = await fetch("http://localhost:3000/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, studentId, password })
  });

  const data = await res.json();

  alert(data.message);
}

async function loginUser() {

  const studentId = document.getElementById("loginStudentId").value;
  const password = document.getElementById("loginPassword").value;

  const res = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ studentId, password })
  });

  const data = await res.json();

  if (data.token) {

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    window.location.href = "notices.html";

  } else {
    alert(data.message);
  }
}


