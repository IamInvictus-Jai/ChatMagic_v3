
// Validate Input Fields
function validateForm(event) {
  event.preventDefault();
  const username = document.getElementById("username");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");

  if (!username.value.match(/^[a-zA-Z_]{3,}$/)) {
    username.parentElement.classList.add("shake");
    setTimeout(() => username.parentElement.classList.remove("shake"), 500);
    return false;
  }

  if (password.value.length < 8) {
    password.parentElement.classList.add("shake");
    setTimeout(() => password.parentElement.classList.remove("shake"), 500);
    return false;
  }

  if (password.value !== confirmPassword.value) {
    confirmPassword.parentElement.classList.add("shake");
    setTimeout(
      () => confirmPassword.parentElement.classList.remove("shake"),
      500
    );
    return false;
  }

  return true;
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