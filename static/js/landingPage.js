const loaderRemoveDelay = 8000;  // Remove the Loader after 8 seconds
const isLoaderRemoved = sessionStorage.getItem("loader") || false;  // Check if the loader is already removed
const base = window.location.origin; // Get the base URL of the website
const endpoint = "user-validation"; // Endpoint to route to

// Function to remove the loader if the user is not on the page for the first time
function loaderHandler() {
    if (!isLoaderRemoved) {
        setTimeout(() => {
            let loader_wrapper = document.getElementById("loader-wrapper");
            document.body.removeChild(loader_wrapper);
            document.querySelectorAll(".feature").forEach((feature) => {
              feature.style.animation = "none";
            });
            sessionStorage.setItem("loader", true);
        }, loaderRemoveDelay);
        document.querySelector(".navbar").style.display = "flex";
    }
    else {
      let loader_wrapper = document.getElementById("loader-wrapper");
      document.body.removeChild(loader_wrapper);
      document.querySelector(".navbar").style.display = "flex";

      // Change the value of a CSS variable
      document.documentElement.style.setProperty(
        "--content-animation-start",
        "0.5s"
      );
      setTimeout(() => {
        document.querySelectorAll(".feature").forEach((feature) => {
          feature.style.animation = "none";
        });
      }, 1800);

    }
}

function route () {
  console.log("Route to user validation page");
  window.location.href = `${base}/${endpoint}`;
}

window.onload = loaderHandler;