# 🏠 Furniture Image Update

A simple **User & Admin System** for managing users and their uploaded images. This ensures that the admin provides updates for the users.

## 🚀 Features

- **User Management:** Generate, update, and delete users.
- **Image Uploads:** Upload and categorize images for each user.
- **Admin Panel:** Secure admin access with authentication.
- **Database:** Uses PostgreSQL for storing user and image data.
- **REST API:** Built with Express.js and integrates with the frontend.

## 📂 Project Structure

```
📦 furniture-app
├── 📁 public          # Static frontend files (HTML, CSS, JS)
├── 📁 uploads         # User uploaded images
├── 📁 js              # Client-side scripts
├── 📄 server.js       # Backend API (Express.js)
├── 📄 .env            # Environment variables (DATABASE_URL, ADMIN_KEY)
├── 📄 README.md       # Project documentation
```

## 🔧 Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo/furniture-app.git
   cd furniture-app
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up **PostgreSQL** and create a database.
4. Configure `.env` file:
   ```env
   DATABASE_URL=postgresql://postgres:2000@localhost:5432/furniture_app
   ```
5. Start the server:
   ```sh
   node server.js
   ```

## 📜 API Endpoints

| Method | Endpoint         | Description         |
| ------ | ---------------- | ------------------- |
| POST   | `/generate-user` | Create a new user   |
| POST   | `/validate`      | Validate user login |
| POST   | `/upload-image`  | Upload an image     |
| GET    | `/users`         | Get all users       |
| DELETE | `/users/:userID` | Delete a user       |

## 🛠 Built With

- **Node.js** + **Express.js** - Backend
- **PostgreSQL** - Database
- **Multer** - Image Uploads
- **Dotenv** - Environment Variables

## 💡 Future Improvements

- 🔒 Implement proper authentication
- 📊 Improve admin dashboard UI
- 📱 Enhance mobile responsiveness

---
