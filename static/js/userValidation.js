
// Validate Input Fields
// function validateForm(event) {
//   event.preventDefault();
//   const username = document.getElementById("username");
//   const password = document.getElementById("password");
//   const confirmPassword = document.getElementById("confirmPassword");

//   if (!username.value.match(/^[a-zA-Z_]{3,}$/)) {
//     username.parentElement.classList.add("shake");
//     setTimeout(() => username.parentElement.classList.remove("shake"), 500);
//     return false;
//   }

//   if (password.value.length < 8) {
//     password.parentElement.classList.add("shake");
//     setTimeout(() => password.parentElement.classList.remove("shake"), 500);
//     return false;
//   }

//   if (password.value !== confirmPassword.value) {
//     confirmPassword.parentElement.classList.add("shake");
//     setTimeout(
//       () => confirmPassword.parentElement.classList.remove("shake"),
//       500
//     );
//     return false;
//   }

//   return true;
// }

const regex = [
  "^[a-zA-Z0-9_]+$",
  "^[a-z0-9.%]+@[a-z]{2,}\.[a-z]{2,}$", // mail
  "^[a-zA-Z0-9_.@]+$"
];

// Prevent user from entering invalid characters
let live_input_validation = function (e) {
  if (this.type === "text") {
    if (this.id === "email" || this.id === "emailin") return;
    if (!this.value.match(regex[0])) {
      this.value = this.value.slice(0, -1);
    }
  } else if (this.type === "password") {
    if (!this.value.match(regex[2])) {
      this.value = this.value.slice(0, -1);
    }
  }
};

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function save_auth(data) {
  let check = document.querySelector("#remember").checked;
  if (!check) return;
  localStorage.setItem("user_auth", JSON.stringify(
    {
      email: data.email,
      password: data.password
    }
  ));
}

async function registerUser(event, registrationType) {
  event.preventDefault();

  let user_data;
  if (registrationType === "signup") {
    let username = document.getElementById("username").value;
    let email = document.getElementById("email").value;
    let password = document.getElementById("pass").value;
    let confirmPassword = document.getElementById("pass2").value;

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    data = {
      username: username,
      email: email,
      password: password,
      registrationType: registrationType,
    };
  } else {
    let email = document.getElementById("emailin").value;
    let password = document.getElementById("passin").value;

    user_data = {
      email: email,
      password: password,
      registrationType: registrationType,
    };
  }

  let isInvited = document.querySelector(".hidden-attributes.loginType");
  let group_id = document.querySelector(".hidden-attributes.group_id");
  let group_name = document.querySelector(".hidden-attributes.group_name");
  let group_dp = document.querySelector(".hidden-attributes.group_dp");
  if (isInvited && group_id && group_name && group_dp) {
    user_data.invited = true;
    user_data.group_id = group_id.value;
    user_data.group_name = group_name.value;
    user_data.group_dp = group_dp.value;
    // user_data.additional = isInvited.value;
  }

  console.log(user_data);


  const csrftoken = getCookie('csrftoken');
  await fetch("/validate-user/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify(user_data),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        console.log("Registration successful");
        save_auth(user_data);
        window.location.href = window.location.origin + data.url;
      } else {
        alert(`Registration failed: ${data.message}`);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}


document.querySelectorAll("input").forEach((input) => {
  input.addEventListener("input", live_input_validation);
});

document.getElementById("sign-up-btn").
  addEventListener("click", (e) => registerUser(e, "signup"));
document
  .getElementById("log-in-btn")
  .addEventListener("click", (e) => registerUser(e, "login"));



function autofill_auth () {
  user_auth = localStorage.getItem("user_auth") || null;
  if (!user_auth) return;

  user_auth = JSON.parse(user_auth);
  const mail = user_auth.email;
  const password = user_auth.password;

  document.getElementById("emailin").value = mail;
  document.getElementById("passin").value = password;
  document.getElementById("remember").checked = true;
}




$("#sign-up-1").submit(function (e) {
  e.preventDefault();

  $(".form-1").removeClass("goback");
  $(".form-1").addClass("submitted");
  $(".form-2").removeClass("push");
  $(".form-2").addClass("pull");
});

$("#log-in").click(function () {
  $(".form-3").addClass("active");
  autofill_auth();
});

$("#go-to-signup").click(function () {
  $(".form-3").removeClass("active");
});

$("#back").click(function (e) {
  $(".form-1").removeClass("submitted");
  $(".form-1").addClass("goback");
  $(".form-2").removeClass("pull");
  $(".form-2").addClass("push");
});