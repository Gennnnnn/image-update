document.addEventListener("DOMContentLoaded", () => {
  const userInput = document.getElementById("userID");

  // Trigger on Enter key press
  userInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") redirectToUserPage();
  });
});

async function redirectToUserPage() {
  const userID = document.getElementById("userID").value.trim();

  if (!userID) {
    alert("Please enter a valid User ID.");
    return;
  }

  try {
    const response = await fetch(
      `https://image-update-o45tq68h1-genesis-villareals-projects-c9368217.vercel.app/users/${userID}`
    );

    console.log("Response Status:", response.status); // Debug

    if (!response.ok) {
      alert("❌ Invalid User ID. Please try again!");
      return;
    }

    const data = await response.json();
    console.log("Parsed Data:", data); // Debug

    // Ensure the returned data is valid
    if (!data || data.error) {
      alert("❌ Invalid User ID. Please try again!");
      return;
    }

    // Redirect only if the userID is valid
    window.location.href = `user.html?id=${userID}`;
  } catch (error) {
    console.error(`Error fetching user data: ${error}`);
    alert("❌ An error occurred. Please try again later!");
  }
}

async function getUser(userID) {
  try {
    const response = await fetch(
      `https://image-update-o45tq68h1-genesis-villareals-projects-c9368217.vercel.app/users/${userID}`
    );
    if (!response.ok) throw new Error("User not found");

    const userData = await response.json();
    console.log(userData);
  } catch (error) {
    console.error("Error fetching user:", error);
  }
}

async function updateUserName(userID, newName) {
  try {
    const response = await fetch(
      "https://image-update-o45tq68h1-genesis-villareals-projects-c9368217.vercel.app/update-name",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userID, name: newName }),
      }
    );

    if (!response.ok) throw new Error("Failed to update name");

    const result = await response.json();
    console.log(result.message);

    const userRow = document.querySelector(`[data-user-id="${userID}"]`);
    if (userRow) {
      const nameCell = userRow.querySelector(".user-name");
      if (nameCell) nameCell.textContent = newName;
    }

    document.getElementById("editModal").style.display = "none";
  } catch (error) {
    console.error("Error updating name: ", error);
  }
}
