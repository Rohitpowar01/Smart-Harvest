  function togglePassword() {
  const x = document.getElementById("password");
  const show_eye = document.getElementById("show_eye");
  const hide_eye = document.getElementById("hide_eye");

  if (x.type === "password") {
    x.type = "text";
    show_eye.style.display = "none";
    hide_eye.style.display = "inline";
  } else {
    x.type = "password";
    show_eye.style.display = "inline";
    hide_eye.style.display = "none";
  }
}
