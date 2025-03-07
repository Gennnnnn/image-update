import "dotenv/config";

import express from "express";
import fs from "fs";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import crypto from "crypto";
import pg from "pg";

// Convert __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// PostgreSQL Database Connection
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool
  .connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => {
    console.error("❌ Database Connection Error:", err);
    process.exit(1);
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files from the furniapp directory
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve static files from the public directory

// Ensure necessary directories exist
(async () => {
  await fs.promises.mkdir(path.join(__dirname, "uploads"), { recursive: true });
})();

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "uploads")),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// 📌 1. Generate new user
app.post("/generate-user", async (req, res) => {
  // if (!req.headers["x-requested-with"])
  //   return res.status(400).json({ error: "Invalid Request" });

  try {
    // Generate random userID & password
    const userID = `user${crypto.randomBytes(4).toString("hex")}`;
    const rawPassword = crypto.randomBytes(6).toString("hex");
    // const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Store hashed password in DB, not raw password
    await pool.query(
      "INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)",
      [userID, rawPassword, ""]
    );

    // Return raw password for admin
    res.json({ userID, password: rawPassword, name: "" });
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 2. Upload images for a user
app.post("/upload-image", upload.single("image"), async (req, res) => {
  const userID = req.body.userID;
  const categoryName = req.body.category; // Category ID, not name
  const imageURL = req.file ? `uploads/${req.file.filename}` : null;

  if (!userID || !categoryName || !imageURL || isNaN(categoryName)) {
    console.error("❌ Invalid or missing required fields:", {
      userID,
      categoryName,
      imageURL,
    });
    return res
      .status(400)
      .json({ error: "Invalid or missing required fields" });
  }

  try {
    const categoryCheck = await pool.query(
      `SELECT * FROM categories WHERE id = $1`,
      [categoryName]
    );

    if (categoryCheck.rows.length === 0) {
      console.error("❌ Invalid category ID:", categoryName);
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const userCategoryCheck = await pool.query(
      `SELECT * FROM user_categories WHERE user_id = $1 AND category_id = $2`,
      [userID, categoryName]
    );

    if (userCategoryCheck.rows.length === 0) {
      console.error(
        `❌ Category ID ${categoryName} is NOT linked to user ${userID}`
      );
      return res.status(400).json({ error: "Category not linked to user" });
    }

    await pool.query(
      `INSERT INTO images (user_id, category_id, image_url)
      VALUES ($1, $2, $3)`,
      [userID, categoryName, imageURL]
    );

    res.json({ success: true, message: "Image uploaded successfully!" });
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 3. Get all users (For Admin)
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users ORDER BY created_at ASC"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 4. Validate User
app.post("/validate", async (req, res) => {
  const { userID, password } = req.body;

  try {
    const userResult = await pool.query(
      "SELECT password FROM users WHERE user_id = $1",
      [userID]
    );

    if (
      userResult.rows.length === 0 ||
      userResult.rows[0].password !== password
    )
      return res.status(401).json({ error: "Incorrect Password" });

    const imageResult = await pool.query(
      "SELECT image_url FROM images WHERE user_id = $1",
      [userID]
    );
    res.json({
      success: true,
      images: imageResult.rows.map((row) => row.image_url),
    });
  } catch (err) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", err);
  }
});

// 📌 5. Delete User
app.delete("/users/:userID", async (req, res) => {
  const { userID } = req.params;

  try {
    const userCheck = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userID]
    );
    if (userCheck.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    await pool.query("DELETE FROM users WHERE user_id = $1", [userID]);

    res.json({ message: "Users deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 6. Add New User (For Admin)
app.post("/users", async (req, res) => {
  const { userID, password, images } = req.body;

  if (!userID || !password) {
    return res
      .status(400)
      .json({ error: "User ID and password are required." });
  }

  try {
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userID]
    );

    if (existingUser.rows.length > 0)
      return res.status(400).json({ error: "User ID already exists" });

    await pool.query("INSERT INTO users (user_id, password) VALUES ($1, $2)", [
      userID,
      password,
    ]);

    if (images && images.length > 0) {
      for (const img of images) {
        await pool.query(
          "INSERT INTO images (user_id, image_url) VALUES ($1, $2)",
          [userID, img]
        );
      }
    }

    res.json({ message: "User added successfully" });
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 7. Update Name (For Admin)
app.put("/update-name", async (req, res) => {
  const { userID, name } = req.body;

  if (!userID || !name)
    return res.status(400).json({ error: "User ID and Name are required" });

  try {
    const result = await pool.query(
      "UPDATE users SET name = $1 WHERE user_id = $2 RETURNING *",
      [name, userID]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "User not found!" });

    res.json({ message: "Name updated successfully", user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 8. Get a specific user by ID
app.get("/users/:userID", async (req, res) => {
  const { userID } = req.params;

  try {
    // Check if user exists in the 'users' table
    const userCheck = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [userID]
    );

    if (userCheck.rows.length === 0) {
      console.warn("⚠️ User not found in database:", userID);
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch the image & categories if user exists
    const result = await pool.query(
      `
      SELECT categories.name AS category, images.image_url
      FROM images
      LEFT JOIN categories ON images.category_id = categories.id
      WHERE images.user_id = $1
      ORDER BY categories.id ASC
      `,
      [userID]
    );

    // If no results, send an error response
    // if (result.rows.length === 0) {
    //   return res.status(404).json({ error: "User not found" });
    // }

    // Return all images for the user
    res.json(result.rows);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// 📌 9. Update Name
app.post("/update-user-name", async (req, res) => {
  const { userID, name } = req.body;

  if (!userID || !name) {
    return res.status(400).json({
      error: "Invalid request. User ID and a valid name are required.",
    });
  }

  try {
    const result = await pool.query(
      "UPDATE users SET name = $1 WHERE user_id = $2 RETURNING *",
      [name, userID]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, updatedUser: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 10. Fetch the users
app.get("/get-users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users  ORDER BY created_at ASC"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 11. Fetch categories from the database
app.get("/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT name FROM categories");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 12. Add a new category to the database
app.post("/add-category", async (req, res) => {
  const { userID, category } = req.body;

  if (!userID || !category) {
    return res.status(400).json({ error: "User ID and category are required" });
  }

  try {
    // Check if user exists
    const userCheck = await pool.query(
      "SELECT user_id FROM users WHERE user_id = $1",
      [userID]
    );

    if (userCheck.rowCount === 0) {
      await pool.query("INSERT INTO users (user_id) VALUES ($1)", [userID]);
    }

    // Insert the category if it doesn't exist
    const categoryResult = await pool.query(
      `INSERT INTO categories (name) 
      VALUES ($1) ON CONFLICT (name) 
      DO NOTHING RETURNING id`,
      [category]
    );

    // let categoryID = categoryResult.rows[0]?.id;
    const categoryID = categoryResult.rows.length
      ? categoryResult.rows[0].id
      : null;

    if (!categoryID) {
      const existingCategory = await pool.query(
        "SELECT id FROM categories WHERE name = $1",
        [category]
      );
      categoryID = existingCategory.rows[0].id;
    }

    // Link user to category in `user_categories`
    // await pool.query(
    //   `INSERT INTO user_categories (user_id, category_id)
    //    VALUES ($1, $2)
    //    ON CONFLICT DO NOTHING`,
    //   [userID, categoryID]
    // );
    if (categoryID) {
      await pool.query(
        `INSERT INTO user_categories (user_id, category_id) 
         VALUES ($1, $2) ON CONFLICT (user_id, category_id) DO NOTHING`,
        [userID, categoryID]
      );
    }

    return res.json({
      success: true,
      category: { id: categoryID, name: category },
    });
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 13. Delete a category from the database
app.delete("/delete-category", async (req, res) => {
  const { categoryID, userID } = req.body;

  if (!categoryID || !userID)
    return res.status(400).json({ error: "Missing categoryID or userID" });

  try {
    await pool.query(
      "DELETE FROM user_categories WHERE category_id = $1 AND user_id = $2",
      [categoryID, userID]
    );

    await pool.query("DELETE FROM categories WHERE id = $1", [categoryID]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 14. Get images for a specific user
app.get("/users/:userID/images", async (req, res) => {
  const { userID } = req.params;

  try {
    // Fetch user's name and images using a JSON
    const result = await pool.query(
      `
      SELECT u.name, i.image_url
      FROM users u
      LEFT JOIN images i ON u.user_id = i.user_id
      WHERE u.user_id = $1
      ORDER BY i.id ASC
      `,
      [userID]
    );

    // If the user exists but has no images, still return the name
    if (result.rows.length === 0) {
      const nameResult = await pool.query(
        "SELECT name FROM users WHERE user_id = $1",
        [userID]
      );
      if (nameResult.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "User not found", name: null, images: [] });
      }
      return res.json({ name: nameResult.rows[0].name, images: [] });
    }

    // Extract name and images
    const name = result.rows[0].name;
    const images = result.rows
      .filter((row) => row.image_url)
      .map((row) => ({
        image_url: `/uploads/${row.image_url.split("\\").pop()}`,
      }));

    res.json({ name, images });
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 15. Delete Image
app.delete("/delete-image", async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res
        .status(400)
        .json({ success: false, error: "Missing image URL" });
    }

    // Example: Delete from database

    // Decode URL to avoid encoding issues
    const decodedImageUrl = decodeURIComponent(imageUrl.trim());

    // Extract image filename from path
    // const imageFilename = decodeURIComponent(imageUrl.split("/").pop().trim());

    // Delete from the database
    const deleteResult = await pool.query(
      "DELETE FROM images WHERE image_url = $1 RETURNING *",
      [decodedImageUrl]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Image not found" });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 15. Delete user when canceled
app.post("/delete-user", async (req, res) => {
  const { userID } = req.body;

  if (!userID) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const result = await pool.query("DELETE FROM users WHERE user_id = $1", [
      userID,
    ]);

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 16. Fetch images for a specific user
app.get("/get-user-images/:userID", async (req, res) => {
  const { userID } = req.params;

  try {
    // Fetch user name
    const userResult = await pool.query(
      "SELECT name FROM users WHERE user_id = $1",
      [userID]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userName = userResult.rows[0].name;

    // Fetch categories for the user
    const imagesQuery = await pool.query(
      `SELECT i.image_id, i.image_url, c.id AS category_id, c.name AS category_name
      FROM images i
      JOIN categories c ON i.category_id = c.id  
      WHERE i.user_id = $1
      ORDER BY c.id, i.image_id ASC`,
      [userID]
    );

    // Group images by category
    const categoriesMap = new Map();

    imagesQuery.rows.forEach((row) => {
      if (!categoriesMap.has(row.category_id)) {
        categoriesMap.set(row.category_id, {
          category_id: row.category_id,
          category_name: row.category_name,
          images: [],
        });
      }

      // Only add image if it exists
      if (row.image_id) {
        categoriesMap.get(row.category_id).images.push({
          image_id: row.image_id,
          image_url: row.image_url,
        });
      }
    });

    const categoryData = Array.from(categoriesMap.values());

    res.json({
      name: userName,
      categories: categoryData,
    });
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// 📌 17. Fetch categories for a specific user
app.get("/get-categories/:userID", async (req, res) => {
  const { userID } = req.params;

  try {
    const queryText = `
    SELECT categories.id, categories.name 
    FROM categories 
    JOIN user_categories 
    ON categories.id = user_categories.category_id 
    WHERE user_categories.user_id = $1`;

    const categories = await pool.query(queryText, [userID]);

    res.json({ categories: categories.rows });
  } catch (error) {
    res.status(500).json({ error: "An internal server error occurred." });
    console.error("Database error:", error);
  }
});

// Serve index.html at the root routech
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Server Start
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT} for Customers`);
  console.log(
    `✅ Server running at http://localhost:${PORT}/admin.html for Admin`
  );
});

export default pool;
