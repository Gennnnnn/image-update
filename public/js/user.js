document.addEventListener("DOMContentLoaded", async () => {
  const userID = new URLSearchParams(window.location.search).get("id");
  const passwordInput = document.getElementById("password");
  const submitButton = document.getElementById("submitButton");
  const logoutButton = document.getElementById("logoutButton");
  const togglePassword = document.getElementById("togglePassword");
  const eyeIcon = document.getElementById("eyeIcon");

  if (!userID) {
    alert("❌ User ID is missing.");
    window.location.href = "index.html";
    return;
  }

  // Check if the user is already logged in
  if (localStorage.getItem("loggedInUser") === userID) {
    hideLoginFields();
    await fetchUserImages(userID);
  }

  // Handle login submission
  submitButton.addEventListener("click", async () => {
    const password = passwordInput.value;
    if (!password) return alert("❌ Please enter a password!");

    try {
      const response = await fetch(
        "https://image-update.onrender.com/validate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userID, password }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Store login session
        localStorage.setItem("loggedInUser", userID);
        hideLoginFields();
        await fetchUserImages(userID);
      } else {
        alert(data.error || "Incorrect Password. Please try again!");
      }
    } catch (error) {
      console.error("Error validating password:", error);
      alert("An error occurred. Please try again later.");
    }
  });

  // Detect Enter key on password input
  passwordInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") submitButton.click();
  });

  // Toggle Password Visibility
  togglePassword.addEventListener("click", () => {
    passwordInput.type =
      passwordInput.type === "password" ? "text" : "password";
    eyeIcon.classList.toggle("fa-eye");
    eyeIcon.classList.toggle("fa-eye-slash");
  });

  // Logout Button Click Event
  if (logoutButton) logoutButton.addEventListener("click", logout);
});

function hideLoginFields() {
  document.getElementById("submitButton").style.display = "none";
  document.querySelector(".password-container").style.display = "none";
  document.querySelector(".container").style.display = "none";
  document.getElementById("header").style.display = "none";
  document.getElementById("imageContainer").style.display = "block";
}

// Logout Function
function logout() {
  localStorage.removeItem("loggedInUser"); // ✅ Clear login state
  window.location.replace("index.html"); // Redirect to login page
}

// Fetch and Display Categorized Images
async function fetchUserImages(userID) {
  try {
    const response = await fetch(
      `https://image-update.onrender.com/get-user-images/${userID}`
    );
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const data = await response.json();

    // Ensure imageContainer is visible
    const userTitleElement = document.getElementById("userTitle");
    if (userTitleElement) {
      userTitleElement.textContent = `Images for ${data.name}`;
    } else {
      console.error("Element with ID 'userTitle' not found");
    }

    const container = document.getElementById("imageContainer");
    container.style.display = "block";
    container.innerHTML = "";

    if (!data.categories || data.categories.length === 0) {
      container.innerHTML = "<p>No images available</p>";
      return;
    }

    const fragment = document.createDocumentFragment();

    data.categories.forEach((category) => {
      const categoryWrapper = document.createElement("div");

      // Create category heading
      const categoryTitle = document.createElement("h2");
      categoryTitle.textContent = category.category_name || "Uncategorized";
      categoryWrapper.appendChild(categoryTitle);

      // Add divider line
      const divider = document.createElement("hr");
      categoryWrapper.appendChild(divider);

      // Create image section
      const imageWrapper = document.createElement("div");
      imageWrapper.classList.add("image-grid");

      (category.images || []).forEach((image) => {
        const imageContainer = document.createElement("div");
        imageContainer.classList.add("image-wrapper");

        const imgElement = document.createElement("img");
        const validUrl = image.image_url ? image.image_url.trim() : "";
        imgElement.src = validUrl.startsWith("/")
          ? `${window.location.origin}${validUrl}`
          : validUrl;
        imgElement.alt = "Uploaded Image";
        imgElement.classList.add("uploaded-image");

        imgElement.onclick = () => openImagePreview(imgElement.src);

        imageContainer.appendChild(imgElement);
        imageWrapper.appendChild(imageContainer);
      });
      categoryWrapper.appendChild(imageWrapper);
      fragment.appendChild(categoryWrapper);
    });

    container.appendChild(fragment);
  } catch (error) {
    console.error("Error loading images:", error);
    document.getElementById("imageContainer").innerHTML =
      "<p>Failed to load images.</p>";
  }
}

function openImagePreview(imageURL) {
  const modal = document.getElementById("imagePreviewModal");
  const modalImage = document.getElementById("previewImage");

  modalImage.src = imageURL;
  modal.style.display = "flex";
}

function closeImagePreview() {
  document.getElementById("imagePreviewModal").style.display = "none";
}
