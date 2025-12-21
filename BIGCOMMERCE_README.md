# BigCommerce Integration for Zakapo Backend

## 🚀 Overview

This integration adds BigCommerce platform support to your Zakapo inventory management system. Now when you add, update, or delete items in your local inventory, they will automatically sync with BigCommerce, providing a seamless multi-platform experience.

## ✨ Features

- **🔄 Automatic Sync**: Items added locally are automatically created in BigCommerce
- **📝 Real-time Updates**: Changes to local items sync to BigCommerce in real-time
- **🗑️ Clean Deletion**: Deleting local items removes them from BigCommerce
- **🖼️ Image Support**: Product images are automatically uploaded to BigCommerce
- **📊 Inventory Management**: Stock levels are synchronized across platforms
- **🛡️ Error Resilience**: System continues working even if BigCommerce is unavailable

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local DB      │    │    Shopify      │    │   BigCommerce   │
│                 │    │                 │    │                 │
│ • Add Item      │───▶│ • Create        │───▶│ • Create        │
│ • Update Item   │───▶│ • Update        │───▶│ • Update        │
│ • Delete Item   │───▶│ • Delete        │───▶│ • Delete        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- Node.js 16+ and npm
- BigCommerce store account
- BigCommerce API credentials
- MongoDB database

## 🔧 Installation

### 1. Clone and Install Dependencies

```bash
cd Zakapo-Backend
npm install
```

### 2. Configure Environment Variables

Copy the environment template and configure your BigCommerce credentials:

```bash
cp env.template .env
```

Edit `.env` and add your BigCommerce credentials:

```env
# BigCommerce Configuration
BIGCOMMERCE_STORE_HASH=your_store_hash_here
BIGCOMMERCE_ACCESS_TOKEN=your_access_token_here
BIGCOMMERCE_CLIENT_ID=your_client_id_here
BIGCOMMERCE_CLIENT_SECRET=your_client_secret_here
```

### 3. Get BigCommerce API Credentials

1. **Log into BigCommerce Admin Panel**
2. **Go to Settings → API → API Accounts**
3. **Click "Create API Account"**
4. **Select required scopes:**
   - `Products` (Read/Write)
   - `Categories` (Read/Write)
   - `Brands` (Read/Write)
   - `Inventory` (Read/Write)
   - `Images` (Read/Write)
5. **Copy the credentials**

### 4. Start the Server

```bash
npm start
```

## 🧪 Testing

### Run the Test Suite

```bash
node test-bigcommerce-sync.js
```

### Manual Testing

1. **Add an item** using POST `/api/add-item`
2. **Check BigCommerce** to see the product
3. **Update the item** using PUT `/api/update-item`
4. **Verify changes** in BigCommerce
5. **Delete the item** using DELETE `/api/delete-item/:id`

## 📚 API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/add-item` | Add item to local + Shopify + BigCommerce |
| `PUT` | `/api/update-item` | Update item across all platforms |
| `DELETE` | `/api/delete-item/:id` | Delete item from all platforms |

### BigCommerce Direct Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/bigcommerce` | Fetch all BigCommerce products |
| `PUT` | `/api/bigcommerce` | Update BigCommerce product directly |
| `DELETE` | `/api/bigcommerce/:id` | Delete BigCommerce product directly |

## 🔄 How It Works

### 1. Item Creation Flow

```
User Request → Local DB → Shopify API → BigCommerce API
     ↓           ↓           ↓            ↓
   Success    Item saved   Product      Product
   Response   locally      created      created
```

### 2. Item Update Flow

```
User Update → Local DB → Shopify Sync → BigCommerce Sync
     ↓           ↓           ↓            ↓
   Success    Item updated  Product      Product
   Response   locally       updated      updated
```

### 3. Item Deletion Flow

```
User Delete → Local DB → Shopify Cleanup → BigCommerce Cleanup
     ↓           ↓           ↓              ↓
   Success    Item removed   Product        Product
   Response   locally        deleted        deleted
```

## 🛠️ Configuration Options

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BIGCOMMERCE_STORE_HASH` | Your BigCommerce store hash | Yes |
| `BIGCOMMERCE_ACCESS_TOKEN` | Your BigCommerce access token | Yes |
| `BIGCOMMERCE_CLIENT_ID` | Your BigCommerce client ID | Yes |
| `BIGCOMMERCE_CLIENT_SECRET` | Your BigCommerce client secret | Yes |

### Optional Settings

- **Image Upload**: Automatically uploads product images to BigCommerce
- **Inventory Sync**: Real-time inventory level synchronization
- **Error Handling**: Graceful fallback if BigCommerce is unavailable

## 🚨 Error Handling

The system is designed to be resilient:

- **BigCommerce Unavailable**: Operations continue with local and Shopify
- **API Failures**: Detailed logging without breaking the main flow
- **Partial Sync**: If one platform fails, others continue working

## 📊 Monitoring and Logs

### Key Log Messages

```javascript
// Success logs
console.log("BigCommerce product created successfully:", productId);
console.log("BigCommerce inventory updated successfully:", quantity);

// Error logs
console.error("BigCommerce integration error:", error);
console.error("BigCommerce API error:", apiError);
```

### Debug Information

Enable debug logging by setting `NODE_ENV=development` in your environment.

## 🔒 Security

- **API Credentials**: Stored securely in environment variables
- **HTTPS Required**: All API calls use HTTPS
- **Scope Limitation**: Only necessary API permissions are requested
- **No Hardcoded Secrets**: All sensitive data is externalized

## 🚀 Performance

- **Async Operations**: Non-blocking API calls
- **Timeout Protection**: 30-second timeouts prevent hanging requests
- **Batch Processing**: Images are processed efficiently
- **Memory Management**: Large files are handled safely

## 🔧 Troubleshooting

### Common Issues

1. **"BigCommerce not configured"**
   - Check your `.env` file
   - Verify environment variables are loaded
   - Restart the server

2. **"BigCommerce API error"**
   - Verify API credentials
   - Check API scopes
   - Verify store status

3. **"Product not visible"**
   - Check `is_visible` setting
   - Verify category assignment
   - Check store settings

### Debug Steps

1. Check server logs for error messages
2. Verify BigCommerce API credentials
3. Test API endpoints directly
4. Check network connectivity

## 📈 Best Practices

1. **Test First**: Always test with development store
2. **Monitor Limits**: Watch for API rate limits
3. **Regular Sync**: Keep platforms synchronized
4. **Backup Data**: Regular backups before major operations
5. **Error Monitoring**: Monitor logs for issues

## 🤝 Support

### Getting Help

1. Check the troubleshooting section
2. Review server logs
3. Test with the provided test suite
4. Verify BigCommerce API documentation

### Resources

- [BigCommerce API Documentation](https://developer.bigcommerce.com/api-reference)
- [BigCommerce Authentication Guide](https://developer.bigcommerce.com/api-docs/getting-started/authentication)
- [Integration Guide](./BIGCOMMERCE_INTEGRATION_GUIDE.md)

## 📝 Changelog

### Version 1.0.0
- Initial BigCommerce integration
- Full CRUD operations support
- Image upload functionality
- Inventory synchronization
- Error handling and resilience

## 🎯 Roadmap

- [ ] Bulk operations support
- [ ] Advanced product options
- [ ] Category management
- [ ] Order synchronization
- [ ] Analytics integration

## 📄 License

This integration is part of the Zakapo Backend system and follows the same licensing terms.

---

**Need help?** Check the [Integration Guide](./BIGCOMMERCE_INTEGRATION_GUIDE.md) for detailed setup instructions.
