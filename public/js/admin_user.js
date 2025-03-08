document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userID = urlParams.get("userID");

  if (!userID) {
    alert("User not found!");
    window.location.href = "admin.html";
    return;
  }

  fetch(`https://image-update.onrender.com/get-user-images/${userID}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!data.name) {
        console.error("User not found or no name available:", data);
        document.getElementById("userTitle").textContent =
          "Images for Unknown User";
        return;
      }

      // ✅ Set the user's name
      document.getElementById(
        "userTitle"
      ).textContent = `Images for ${data.name}`;

      const container = document.getElementById("imageContainer");
      container.innerHTML = "";

      if (!data.categories || data.categories.length === 0) {
        container.innerHTML = "<p>No images available.</p>";
        return;
      }

      const fragment = document.createDocumentFragment();
      // const categoriesMap = new Map(); // To group images by category

      // Organize images by category
      (data.categories || []).forEach((category) => {
        const categoryWrapper = document.createElement("div");

        // Create category heading
        const categoryTitle = document.createElement("h2");
        categoryTitle.textContent = category.category_name;
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
          // Ensure the URL is correctly formatted
          const validUrl = image.image_url.startsWith("http")
            ? image.image_url // ✅ If it's already a full URL, use it
            : `${window.location.origin}${image.image_url}`;

          imgElement.src = validUrl;

          imgElement.alt = "Uploaded Image";
          imgElement.classList.add("uploaded-image");

          // Add a click event to open the modal
          imgElement.onclick = () => openImagePreview(imgElement.src);

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "❌ Delete";
          deleteBtn.classList.add("delete-image-btn");
          deleteBtn.onclick = async () => {
            if (!image.image_id) {
              console.error("Missing image_id for deletion:", image);
              return;
            }

            showCustomModal(
              "Are you sure you want to delete this image?",
              async () => {
                try {
                  await deleteImage(image.image_url, imageContainer);
                } catch (error) {
                  console.error("Failed to delete this image", error);
                  alert("❌ Failed to delete the image. Please try again.");
                }
              }
            );
          };

          imageContainer.appendChild(imgElement);
          imageContainer.appendChild(deleteBtn);
          imageWrapper.appendChild(imageContainer);
        });

        categoryWrapper.appendChild(imageWrapper);
        fragment.appendChild(categoryWrapper);
      });

      container.appendChild(fragment);
    })
    .catch((error) => {
      console.error("Error loading images:", error);
      document.getElementById("imageContainer").innerHTML =
        "<p>Failed to load images.</p>";
    });
});

// Delete Image Function
async function deleteImage(imageUrl, imageWrapper) {
  if (!imageWrapper) {
    console.warn("⚠️ Could not find image wrapper.");
    return;
  }

  if (imageWrapper instanceof HTMLElement) {
    const deleteButton = imageWrapper.querySelector(".delete-btn");
    if (deleteButton) {
      deleteButton.disabled = true;
    }
  } else {
    console.warn("⚠️ imageWrapper is not a valid HTML element:", imageWrapper);
  }

  fetch("https://image-update.onrender.com/delete-image", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(`Server error: ${response.status} - ${text}`);
        });
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        // Check if imageWrapper exists before removing
        if (imageWrapper && imageWrapper.remove) {
          imageWrapper.remove();
        } else {
          console.warn("⚠️ Image wrapper not found or already removed.");
        }

        // Optionally, replace alert with a toast notification
        alert("✅ Image deleted successfully!");

        // alert("✅ Image deleted successfully!");
      } else {
        alert("❌ Failed to delete image.");
      }
    })
    .catch((error) => console.error("Error deleting image:", error));
  // alert("⚠️ An error occurred while deleting the image.", () => {});
}

function showCustomModal(message, onConfirm) {
  // Remove any existing modal to prevent duplicaates
  const existingModal = document.querySelector(".custom-modal");
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal container
  const modal = document.createElement("div");
  modal.classList.add("custom-modal");

  // Create modal content
  modal.innerHTML = `
  <div class="modal-content">
    <p>${message}</p>
    <div class="modal-buttons">
      <button class="btn-confirm">Yes</button>
      <button class="btn-cancel">No</button>
    </div>
  </div>
  `;

  // Append modal to the body
  document.body.appendChild(modal);

  // Add animation
  setTimeout(() => {
    modal.classList.add("visible");
  }, 10);

  // **Remove any previous event listeners before adding new ones**
  const confirmBtn = modal.querySelector(".btn-confirm");
  const cancelBtn = modal.querySelector(".btn-cancel");

  confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));

  modal.querySelector(".btn-confirm").addEventListener("click", () => {
    onConfirm();
    closeModal();
  });

  modal.querySelector(".btn-cancel").addEventListener("click", closeModal);

  // Close modal function
  function closeModal() {
    modal.classList.remove("visible");
    setTimeout(() => {
      modal.remove();
    }, 200);
  }

  // Close modal on escape key
  document.addEventListener("keydown", function escHandler(event) {
    if (event.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", escHandler);
    }
  });

  confirmBtn.focus();
}

// Go Back
function goBack() {
  window.location.href = "admin.html";
}

function openImagePreview(imageURL) {
  const modal = document.getElementById("imagePreviewModal");
  const modalImage = document.getElementById("previewImage");

  if (!modal || !modalImage) {
    console.error("Modal elements not found");
    return;
  }

  modalImage.src = imageURL;
  modal.style.display = "flex";
}

function closeImagePreview() {
  document.getElementById("imagePreviewModal").style.display = "none";
}
