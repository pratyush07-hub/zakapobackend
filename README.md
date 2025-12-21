# Zakapo Backend

A Node.js backend application built with Express.js and MongoDB.

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Zakapo-Backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (optional):
   - Copy `.env.example` to `.env` (if it exists)
   - Or create a `.env` file with the following variables:

```env
# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017

# Server Configuration
PORT=4000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d

# Email Configuration (if using nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## Running the Application

### Development Mode
```bash
npm start
```
This will start the server with nodemon for auto-restart on file changes.

### Production Mode
```bash
node src/index.js
```

## Default Configuration

If no `.env` file is provided, the application will use these default values:
- **Port**: 4000
- **MongoDB URI**: mongodb://localhost:27017
- **Database Name**: Zakapo
- **Environment**: development

## API Endpoints

- `/api/user` - User management
- `/api/organisation` - Organisation details management
- `/api/legal` - Legal details management
- `/api/add-item` - Add items
- `/api/get-item` - Get items
- `/api/update-item` - Update items
- `/api/all-products` - Product management
- `/api/product-stocks` - Stock management
- `/api/sales-report` - Sales reporting
- `/api/sales-stats` - Sales statistics
- `/api/auth` - Authentication (forgot password)

## Database Connection

The application will automatically connect to MongoDB using the connection string from your environment variables or the default localhost connection.

## Troubleshooting

1. **MongoDB Connection Error**: Make sure MongoDB is running locally or update the `MONGODB_URI` in your `.env` file.

2. **Port Already in Use**: Change the `PORT` in your `.env` file or kill the process using the current port.

3. **Module Not Found**: Run `npm install` to install dependencies.

4. **CORS Error (ERR_FAILED)**: 
   - Make sure the backend server is running on port 4000
   - Check that the frontend is making requests to the correct port
   - Verify CORS configuration allows your frontend origin
   - Test the health endpoint: `GET http://localhost:4000/api/health`

5. **Registration Error**: 
   - Ensure all required fields are sent: `companyName`, `emailAddress`, `accountPassword`, `userState`, `contactNumber`
   - Check MongoDB connection
   - Verify the request body format matches the expected schema

## Development

The application uses ES modules and includes:
- Express.js for the web framework
- Mongoose for MongoDB ODM
- JWT for authentication
- CORS for cross-origin requests
- Cookie parser for handling cookies
- Body parser for request body parsing

## API Endpoint Details

### Organisation Details (`/api/organisation`)
- **POST** `/` - Create or update organisation details
  - Requires authentication
  - Body: `{ company, address1, address2, city, state, pincode, industry }`
- **GET** `/` - Get organisation details for authenticated user

### Legal Details (`/api/legal`)
- **POST** `/` - Create or update legal details
  - Requires authentication
  - Body: `{ companyId, gstNo, otherTax, taxNo, contactMemberName, designation, contactNo, websiteLink }`
- **GET** `/` - Get legal details for authenticated user

### Authentication Required
- **POST** endpoints for organisation and legal details can work with or without authentication:
  - If authenticated: Uses JWT token to identify user
  - If not authenticated: Requires `emailAddress` in request body to identify user
- **GET** endpoints require a valid JWT token in cookies (`accessToken`)
- This allows users to submit organisation/legal details immediately after signup without logging in first
