# DocBot Backend

A Node.js backend service for document processing and loan application management with OCR capabilities and real-time notifications.

## Features

- Document OCR using Google Vision API and Tesseract.js
- PDF to image conversion
- File upload with Multer
- Real-time notifications using Socket.IO
- Cloudinary integration for document storage
- PostgreSQL database with Drizzle ORM
- OpenAI integration for enhanced text extraction
- Excel document generation
- User management system
- Loan application processing

## Tech Stack

- Node.js & Express
- Socket.IO for real-time communication
- PostgreSQL with Drizzle ORM
- Google Cloud Vision API
- OpenAI API
- Tesseract.js for OCR
- Cloudinary for file storage
- Multer for file uploads
- ExcelJS for document generation

## Prerequisites

- Node.js v14+
- PostgreSQL database
- Google Cloud Vision API credentials
- OpenAI API key
- Cloudinary account

## Environment Variables

Create a `.env` file with these variables:

```sh
PORT=8000
NEON_DATABASE_URL=your_postgres_connection_string
GOOGLE_CLOUD_CREDENTIALS=your_google_cloud_credentials
OPENAI_API_KEY=your_openai_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

## Installation

1. Clone the repository:

```sh
git clone <repository-url>
cd docbot_backend
```

2. Install dependencies:

```sh
npm install
```

3. Run database migrations:

```sh
npm run db:generate
npm run db:push
```

4. Start the development server:

```sh
npm run dev
```

## API Endpoints

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Documents

- `POST /api/upload-docs` - Upload documents
- `POST /api/admin-verify/upload` - Verify and process documents

## Socket Events

- `connection` - Client connects
- `join-user-room` - User joins their private room
- `join-admin-to-user-room` - Admin joins user's room
- `document-submitted` - New document submission
- `admin-comment` - Admin comments on document
- `disconnect` - Client disconnects

## Project Structure

```
├── controller/          # Route controllers
├── db/                  # Database configuration and migrations
├── middlewares/         # Express middlewares
├── public/             # Static files
├── routes/             # API routes
├── services/           # Business logic services
├── temp/               # Temporary file storage
├── utils/              # Utility functions
└── index.js            # Application entry point
```

## License

ISC

## Author

Builders Academy 
