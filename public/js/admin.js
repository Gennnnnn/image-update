document.addEventListener("DOMContentLoaded", () => {
  // Reset all modals to hidden
  document.getElementById("nameModal").style.display = "none";
  document.getElementById("editModal").style.display = "none";
  document.getElementById("uploadModal").style.display = "none";
  const userTableBody = document.getElementById("usersTable");
  const generateUserButton = document.getElementById("generateUser");

  // Generate new user only on button click
  generateUserButton.addEventListener("click", () => {
    generateUserButton.disabled = true;

    fetch("/generate-user", {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          console.error("❌ Error:", data.error);
          alert("Error: " + data.error);
          return;
        }

        // Store userID temporarily for updating name
        window.newUserID = data.userID;

        // Open the name modal
        openNameModal();

        // Add the new user row with "Pending..."
        const rowCount = userTableBody.querySelectorAll("tr").length;

        const row = document.createElement("tr");
        row.setAttribute("data-user-id", data.userID);

        row.innerHTML = `
            <td>${rowCount + 1}</td>
            <td>${data.userID}</td>
            <td class="name-column">
              <a href="admin_user.html?userID=${
                data.userID
              }" class="user-link">Pending...</a>
            </td>
            <td>${data.password}</td>
              <td class="action-buttons">
                <button class="edit-btn" onclick="openEditModal('${
                  data.userID
                }', \`${data.name || ""}\`)">Edit</button>
                <button class="upload-btn" onclick="openUploadModal('${
                  data.userID
                }')">Upload</button>
                <button class="delete-btn" onclick="deleteUser('${
                  data.userID
                }')">Delete</button>
              </td>
            `;

        userTableBody.appendChild(row);

        // ✅ Ensure name updates in real time after modal closes
        window.updateUserNameUI = (newName) => {
          const userRow = document.querySelector(
            `tr[data-user-id="${data.userID}"]`
          );
          if (userRow) {
            let nameColumn = userRow.querySelector(".name-column");

            if (nameColumn) {
              let nameLink = nameColumn.querySelector("a");

              if (nameLink) {
                // ✅ If link exists, update text and href
                nameLink.textContent = newName;
                nameLink.href = `admin_user.html?userID=${data.userID}`;
              } else {
                // ✅ If no link exists, create one dynamically
                nameColumn.innerHTML = `<a href="admin_user.html?userID=${data.userID}" class="user-link">${newName}</a>`;
              }
            }
          }
        };
      })
      .catch((error) => console.error("Error generating user:", error))
      .finally(() => {
        generateUserButton.disabled = false;
      });
  });

  // Fetch users from PostgreSQL and populate the table
  fetch("/users")
    .then((response) => response.json())
    .then((users) => {
      let rowIndex = 1; // ✅ Start row index at 1

      users.forEach((user) => {
        const row = document.createElement("tr");
        row.setAttribute("data-user-id", user.user_id);

        row.innerHTML = `
        <td>${rowIndex}</td>  <!-- ✅ Use rowIndex instead of dynamic querySelector -->
        <td>${user.user_id}</td>
        <td class="name-column">
          <a href="admin_user.html?userID=${user.user_id}" class="user-link">
            ${user.name || "Pending..."}
          </a>
        </td>
        <td>${user.password}</td>
        <td class="action-buttons">
          <button class="edit-btn" onclick="openEditModal('${
            user.user_id
          }', \`${user.name || ""}\`)">Edit</button>
          <button class="upload-btn" onclick="openUploadModal('${
            user.user_id
          }')">Upload</button>
          <button class="delete-btn" onclick="deleteUser('${
            user.user_id
          }')">Delete</button>
        </td>
      `;

        userTableBody.appendChild(row);
        rowIndex++; // ✅ Increment index after adding a row
      });
    })
    .catch((error) => console.error("Error fetching users:", error));
});

// Delete User Function
function deleteUser(userID) {
  if (confirm(`Are you sure you want to delete user ${userID}?`)) {
    fetch(`/users/${userID}`, { method: "DELETE" })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          alert("Error: " + data.error);
        } else {
          alert(data.message);
          // location.reload();
          document.querySelector(`tr[data-user-id="${userID}"]`).remove();
        }
      })
      .catch((error) => console.error("Error deleting user:", error));
  }
}

function openEditModal(userID, currentName) {
  window.editingUserID = userID;
  const editInput = document.getElementById("editNameInput");
  editInput.value = currentName;

  // document.getElementById("editNameInput").value = currentName;
  document.getElementById("editModal").style.display = "block";

  // Fcous on the input field
  editInput.focus();

  // 🔹 Remove previous event listeners to avoid duplicates
  editInput.removeEventListener("keypress", handleEnterKey);
  editInput.addEventListener("keypress", handleEnterKey);
}

// Separate function to handle Enter key
function handleEnterKey(event) {
  if (event.key === "Enter") confirmEdit();
}

function closeModal() {
  document.getElementById("editModal").style.display = "none";
  document.getElementById("nameModal").style.display = "none";
}

async function confirmEdit() {
  const newName = document.getElementById("editNameInput").value.trim();

  if (!newName) {
    alert("⚠️ Please enter a valid name.");
    return;
  }

  if (!window.editingUserID) {
    console.error("❌ Editing user ID is missing.");
    alert("❌ Something went wrong. Please try again.");
    return;
  }

  try {
    const response = await fetch("/update-user-name", {
      method: "POST", // Ensure this matches your backend
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userID: window.editingUserID, name: newName }), // Use correct variable
    });

    const result = await response.json();

    if (response.ok) {
      // Find the correct row in the table
      const userRow = document.querySelector(
        `tr[data-user-id="${window.editingUserID}"]`
      );

      if (userRow) {
        const nameColumn = userRow.querySelector(".name-column");

        // Ensure there's always a clickable link inside
        let nameLink = nameColumn.querySelector("a");
        if (!nameLink) {
          nameLink = document.createElement("a");
          nameLink.className = "user-link";
          nameColumn.appendChild(nameLink);
        }

        // Update link text & href dynamically
        nameLink.textContent = newName;
        nameLink.href = `admin_user.html?userID=${window.editingUserID}`;
      }

      alert("✅ Name Updated Successfully!");
      closeModal();
    } else {
      alert("❌ Failed to Update Name: " + result.error);
    }
  } catch (error) {
    console.error("❌ Error updating name: ", error);
  }

  // Clear input field for the next edit
  document.getElementById("editNameInput").value = "";
}

// Function to open name modal
function openNameModal() {
  document.getElementById("nameModal").style.display = "block";
}

// Function to close name modal
function closeNameModal() {
  // const nameInputField = document.getElementById("nameInput");
  // const enteredName = nameInputField.value.trim();

  // Check if user canceled without entering a name **BEFORE** clearing the field
  // if (!enteredName) {
  //   console.warn("⚠️ User canceled, deleting generated user...");
  //   deleteGeneratedUser(window.newUserID);
  // }

  if (window.newUserID) {
    console.warn("⚠️ User canceled, deleting generated user...");
    deleteGeneratedUser(window.newUserID);
    window.newUserID = "";
  }

  // Clear input field
  document.getElementById("nameInput").value = "";
  document.getElementById("nameModal").style.display = "none";
}

// Function to delete the generated user if canceled
function deleteGeneratedUser(userID) {
  if (!userID) return;

  fetch("/delete-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userID }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        // Remove the user from the table UI
        const userRow = document.querySelector(`tr[data-user-id="${userID}"]`);
        if (userRow) userRow.remove();
      } else {
        console.error("❌ Failed to delete user:", data.error);
      }
    })
    .catch((error) => console.error("Error deleting user:", error));

  // Clear stored userID
  window.newUserID = "";
}

// Function to confirm name input
function confirmName() {
  const nameInput = document.getElementById("nameInput").value.trim();

  if (!nameInput) {
    alert("⚠️ Please enter a name.");
    return;
  }

  if (!window.newUserID) {
    console.error("❌ No newUserID found.");
    return;
  }

  // ✅ Update the name in the UI immediately
  if (window.updateUserNameUI) {
    window.updateUserNameUI(nameInput);
  } else {
    console.error("❌ updateUserNameUI function is missing.");
  }

  // ✅ Send the name to the backend to update the database
  fetch("/update-user-name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userID: window.newUserID, name: nameInput }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        // Update the user row directly
        const userRow = document.querySelector(
          `tr[data-user-id="${window.newUserID}"]`
        );

        if (userRow) {
          let nameColumn = userRow.querySelector(".name-column a");
          if (nameColumn) {
            nameColumn.textContent = nameInput;
          } else {
            console.warn("⚠️ Name column anchor tag not found.");
          }
        }

        // Clear the stored userID after update
        window.newUserID = "";

        // ✅ Close the modal
        document.getElementById("nameInput").value = "";
        document.getElementById("nameModal").style.display = "none";
        // closeNameModal();
      } else {
        console.error("❌ Failed to update name:", data.error);
      }
    })
    .catch((error) => console.error("Error updating user name:", error));

  // Clear input field for next use
  // document.getElementById("nameInput").value = "";
}

async function fetchUsers() {
  try {
    const response = await fetch("/get-users");
    const users = await response.json();
    const tableBody = document
      .getElementById("usersTable")
      .getElementsByTagName("tbody")[0];
    tableBody.innerHTML = "";

    users.forEach((user, index) => {
      const row = tableBody.insertRow();
      row.innerHTML = `
          <td>${index + 1}</td>
          <td>${user.user_id}</td>
          <td class="name-column">${user.name || "Pending..."}</td>
          <td>${user.password}</td>
          <td class="action-buttons">
            <button class="edit-btn" onclick="openEditModal('${
              user.user_id
            }', \`${user.name || ""}\`)"
            >Edit</button>
            <button class="upload-btn" onclick="openUploadModal('${
              user.user_id
            }')">Upload</button>
            <button class="delete-btn" onclick="deleteUser('${
              user.user_id
            }')">Delete</button>
          </td>
        `;
    });
  } catch (error) {
    console.error("Error fetching users:", error);
  }
}

// Open Upload Modal
function openUploadModal(userID) {
  // Get elements safely
  const userIDInput = document.getElementById("userID");
  const uploadModal = document.getElementById("uploadModal");

  if (!userIDInput) {
    console.error("❌ Error: 'userID' input field not found!");
    return;
  }
  if (!uploadModal) {
    console.error("❌ Error: 'uploadModal' element not found");
    return;
  }

  // Assign user ID
  userIDInput.value = userID;
  uploadModal.setAttribute("data-user-id", userID);

  document.getElementById("uploadModal").style.display = "flex";
  loadUserCategories(userID);
}

// Close Upload Modal
function closeUploadModal() {
  document.getElementById("uploadModal").style.display = "none";
}

// File Input Click Upload a Photo
document.getElementById("uploadButton").addEventListener("click", () => {
  document.getElementById("imageUpload").click();
});

let capturedImage = null; // Global variable to store the image

document.addEventListener("DOMContentLoaded", () => {
  const captureButton = document.getElementById("capturePhotoButton");
  const fileInput = document.getElementById("imageUpload");
  const previewImage = document.getElementById("previewImage");
  const canvas = document.getElementById("photoCanvas");
  const ctx = canvas.getContext("2d");

  // Handle file upload
  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        previewImage.src = reader.result;
        previewImage.style.display = "block";
        capturedImage = file; // Store the file globally
      };
      reader.readAsDataURL(file);
    }
  });

  // Handle taking a photo
  captureButton.addEventListener("click", async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      setTimeout(() => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        capturedImage = canvas.toDataURL("image/png"); // Convert canvas to Base64
        previewImage.src = capturedImage;
        previewImage.style.display = "block";

        // Stop the camera after capturing
        stream.getTracks().forEach((track) => track.stop());
      }, 2000);
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("❌ Camera access denied or unavailable");
    }
  });

  // Ensure submit button has a working event listener
  document.querySelector(".submit-btn").addEventListener("click", submitUpload);
});

// Function to upload the selected/captured image
async function submitUpload() {
  console.log("submitUpload() called");

  if (!capturedImage) {
    alert("Please take or select an image first");
    return;
  }

  const userID = document.getElementById("userID").value;
  const category = document.getElementById("categoryDropdown").value;

  if (!userID) {
    alert("❌ User ID is missing. Please try again.");
    return;
  }

  if (!category) {
    alert("Please select a category!");
    return;
  }

  const formData = new FormData();
  formData.append("userID", userID);
  formData.append("category", category);

  if (typeof capturedImage === "string") {
    // If captured via camera (Base64)
    formData.append("image", dataURItoBlob(capturedImage), "captured.png");
  } else {
    // If uploaded via file input
    formData.append("image", capturedImage);
  }

  try {
    const response = await fetch("/upload-image", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (response.ok) {
      alert("✅ Image uploaded successfully!");
      document.getElementById("previewImage").style.display = "none";
      closeUploadModal();
    } else {
      alert(data.error || "Upload failed.");
    }
  } catch (error) {
    console.error("Upload error:", error);
    alert("An error occurred. Try again.");
  }
}

// Helper Function: Convert Base64 to Blob
function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([arrayBuffer], { type: mimeString });
}

// Submit Uplaod
// function submitUpload() {
//   const uploadModal = document.getElementById("uploadModal");
//   const userID = uploadModal ? uploadModal.getAttribute("data-user-id") : null;
//   const categoryID = document.getElementById("categoryDropdown").value;
//   const fileInput = document.getElementById("imageUpload");
//   const file = fileInput.files[0];

//   // Ensure all required values exist
//   if (!userID) {
//     alert("❌ User ID is missing. Please try again");
//     return;
//   }

//   if (!categoryID) {
//     alert("❌ Please select a category.");
//     return;
//   }

//   if (!file) {
//     alert("❌ Please upload an image.");
//     return;
//   }

//   // Prepare FormData
//   const formData = new FormData();
//   formData.append("userID", userID);
//   formData.append("category", categoryID);
//   formData.append("image", file);

//   // Send the request
//   fetch("/upload-image", {
//     method: "POST",
//     body: formData,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       if (data.success) {
//         alert("✅ Image uploaded successfully!");
//         closeUploadModal();

//         // Clear file input safely
//         fileInput.value = "";
//         fileInput.replaceWith(fileInput.cloneNode(true));
//       } else {
//         alert("❌ Upload failed.");
//       }
//     })
//     .catch((error) => console.error("Upload error", error));
// }

document.addEventListener("DOMContentLoaded", loadCategories);

function loadCategories() {
  fetch("/categories")
    .then((response) => response.json())
    .then((data) => {
      const dropdown = document.getElementById("categoryDropdown");
      dropdown.innerHTML = `<option value="" disabled selected>Select a category</option>`;
      data.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.name;
        option.textContent = category.name;
        dropdown.appendChild(option);
      });
    })
    .catch((error) => console.error("Error fetching categories:", error));
}

// Add Category (Saves to Database)
function addCategory() {
  const categoryInputField = document.getElementById("categoryInput");
  const categoryInput = categoryInputField.value.trim();

  // Ensure userID is retrieved correctly
  const userID = document.getElementById("userID").value;
  if (!userID) {
    alert("❌ Error: User ID is missing! Please select a user.");
    return;
  }

  if (!categoryInput) {
    alert("❌ Please enter a category name.");
    return;
  }

  fetch("/add-category", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userID, category: categoryInput }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        alert("✅ Category added successfully!");
        // **DO NOT CLOSE THE MODAL** – Just clear the input field
        categoryInputField.value = "";

        loadUserCategories(userID);
      } else {
        alert("❌ Failed to add category: " + data.error);
      }
    })
    .catch((error) => console.error("Error adding category", error));
}

// Delete Category (Removes from Database)
function deleteCategory() {
  const dropdown = document.getElementById("categoryDropdown");
  const selectedCategory = dropdown.value;
  const selectedCategoryName =
    dropdown.options[dropdown.selectedIndex]?.textContent || "Unknown";
  const userID = document.getElementById("userID").value;

  if (!selectedCategory) {
    alert("❌ Please select a category to delete.");
    return;
  }

  if (!userID) {
    alert("❌ User ID is missing! Please select a user.");
    return;
  }

  fetch("/delete-category", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryID: selectedCategory, userID }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert(`❌ Error: ${data.error}`);
        return;
      }

      alert(`✅ Category '${selectedCategoryName}' deleted.`);

      // Remove category from dropdown
      const optionToRemove = dropdown.querySelector(
        `option[value="${selectedCategory}"]`
      );
      if (optionToRemove) {
        optionToRemove.remove();
      }

      // Reset dropdown selection
      dropdown.value = "";
    })
    .catch((error) => console.error("❌ Error deleting category:", error));
}

async function loadUserCategories(userID) {
  try {
    const response = await fetch(`/get-categories/${userID}?_=${Date.now()}`);
    const data = await response.json();

    if (!data.categories || !Array.isArray(data.categories)) {
      console.error("❌ Invalid categories response:", data);
      return;
    }

    const categoryDropdown = document.getElementById("categoryDropdown");
    if (!categoryDropdown) {
      console.error("❌ Error: categoryDropdown element not found");
      return;
    }

    // Store previous selection before clearing
    const previousSelection = categoryDropdown.value;

    // Reset dropdown with default "Select a category" option
    categoryDropdown.innerHTML = `<option value="" disabled selected>Select a category ▼</option>`;

    if (data.categories.length === 0) {
      categoryDropdown.innerHTML += `<option disabled>No categories available</option>`;
    } else {
      data.categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        categoryDropdown.appendChild(option);
      });

      // Restore previous selection if still valid
      if (
        data.categories.some((category) => category.id == previousSelection)
      ) {
        categoryDropdown.value = previousSelection;
      } else {
        categoryDropdown.value =
          data.categories[data.categories.length - 1]?.id || "";
      }
    }
  } catch (error) {
    console.error("❌ Error loading categories:", error);
  }
}
