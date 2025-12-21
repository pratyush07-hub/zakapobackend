# BigCommerce Integration Guide

This guide explains how to set up and use the BigCommerce integration in the Zakapo Backend system.

## Overview

The BigCommerce integration allows you to:
- **Add items** to your local inventory and automatically create them in BigCommerce
- **Update items** locally and have changes sync to BigCommerce
- **Delete items** locally and have them removed from BigCommerce
- **Fetch products** directly from BigCommerce
- **Manage inventory** across all platforms (Local + Shopify + BigCommerce)

## Prerequisites

1. **BigCommerce Store Account**: You need an active BigCommerce store
2. **API Access**: BigCommerce API credentials (Store Hash, Access Token, Client ID, Client Secret)
3. **Node.js Environment**: The backend must be running with proper environment variables

## Setup Instructions

### 1. Get BigCommerce API Credentials

1. **Log into your BigCommerce Admin Panel**
2. **Go to Settings → API → API Accounts**
3. **Click "Create API Account"**
4. **Select the following scopes:**
   - `Products` (Read/Write)
   - `Categories` (Read/Write)
   - `Brands` (Read/Write)
   - `Inventory` (Read/Write)
   - `Images` (Read/Write)
5. **Copy the credentials:**
   - Store Hash
   - Access Token
   - Client ID
   - Client Secret

### 2. Configure Environment Variables

Add the following variables to your `.env` file:

```env
# BigCommerce Configuration
BIGCOMMERCE_STORE_HASH=your_store_hash_here
BIGCOMMERCE_ACCESS_TOKEN=your_access_token_here
BIGCOMMERCE_CLIENT_ID=your_client_id_here
BIGCOMMERCE_CLIENT_SECRET=your_client_secret_here

# Optional: Base URL for testing
BASE_URL=http://localhost:4000
```

### 3. Verify Configuration

The system will automatically detect if BigCommerce credentials are configured. You can verify this by checking the server logs when starting the application.

## API Endpoints

### 1. Add Item with BigCommerce Integration

**Endpoint:** `POST /api/add-item`

**Request Body:**
```json
{
  "productID": "PROD-001",
  "variantName": "Product Name",
  "quantity": 100,
  "price": "29.99",
  "userId": "user_id_here",
  "itemName": "Product Name",
  "itemType": "physical",
  "sku": "SKU-001",
  "brand": "Brand Name",
  "manufacturer": "Manufacturer Name",
  "weight": "0.5",
  "salesDescription": "Product description"
}
```

**Response:**
```json
{
  "message": "Item added successfully",
  "data": {
    "local": { /* Local item data */ },
    "shopify": { /* Shopify product data or null */ },
    "bigcommerce": { /* BigCommerce product data or null */ }
  }
}
```

### 2. Update Item with BigCommerce Sync

**Endpoint:** `PUT /api/update-item`

**Request Body:**
```json
{
  "itemId": "item_id_here",
  "variantName": "Updated Product Name",
  "price": "39.99",
  "quantity": 75
}
```

**Response:**
```json
{
  "message": "Item updated successfully",
  "data": { /* Updated item data */ }
}
```

### 3. Delete Item with BigCommerce Cleanup

**Endpoint:** `DELETE /api/delete-item/:itemId`

**Response:**
```json
{
  "message": "Item deleted successfully",
  "data": { /* Deleted item data */ }
}
```

### 4. Direct BigCommerce API Endpoints

#### Get BigCommerce Products
**Endpoint:** `GET /api/bigcommerce`

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "productID": "123",
        "variantName": "Product Name",
        "quantity": 100,
        "price": "29.99",
        "bigcommerceId": 123,
        "status": "active",
        "vendor": "Brand Name",
        "productType": "physical",
        "sku": "SKU-001",
        "weight": "0.5"
      }
    ]
  },
  "message": "Successfully fetched X BigCommerce products"
}
```

#### Update BigCommerce Product
**Endpoint:** `PUT /api/bigcommerce`

**Request Body:**
```json
{
  "bigcommerceId": 123,
  "name": "Updated Product Name",
  "price": "39.99",
  "quantity": 75,
  "status": "active"
}
```

#### Delete BigCommerce Product
**Endpoint:** `DELETE /api/bigcommerce/:bigcommerceId`

## How It Works

### 1. Item Creation Flow

```
User adds item → Local DB → Shopify API → BigCommerce API
     ↓              ↓           ↓            ↓
   Success      Item saved   Product      Product
   Response     locally      created      created
```

### 2. Item Update Flow

```
User updates item → Local DB updated → Shopify sync → BigCommerce sync
     ↓                    ↓              ↓            ↓
   Success            Item updated    Product      Product
   Response           locally         updated      updated
```

### 3. Item Deletion Flow

```
User deletes item → Local DB deleted → Shopify cleanup → BigCommerce cleanup
     ↓                    ↓              ↓            ↓
   Success            Item removed    Product      Product
   Response           locally         deleted      deleted
```

## Error Handling

The system is designed to be resilient:

- **If BigCommerce is not configured**: Operations continue with local and Shopify only
- **If BigCommerce API fails**: Local operations succeed, BigCommerce operations are logged but don't fail the entire operation
- **Partial failures**: If one platform fails, others continue to work

## Testing the Integration

### 1. Run the Test Suite

```bash
cd Zakapo-Backend
node test-bigcommerce-sync.js
```

### 2. Manual Testing

1. **Add an item** using the `/api/add-item` endpoint
2. **Check BigCommerce** to see if the product was created
3. **Update the item** using the `/api/update-item` endpoint
4. **Verify changes** appear in BigCommerce
5. **Delete the item** using the `/api/delete-item/:id` endpoint
6. **Confirm removal** from BigCommerce

## Troubleshooting

### Common Issues

1. **"BigCommerce not configured"**
   - Check your environment variables
   - Verify the credentials are correct
   - Restart the server after updating .env

2. **"BigCommerce API error"**
   - Check your API credentials
   - Verify API scopes include required permissions
   - Check BigCommerce store status

3. **"Product created but not visible"**
   - Check if `is_visible` is set to `true`
   - Verify the product is assigned to a category
   - Check BigCommerce store settings

### Debug Logs

The system provides detailed logging for debugging:

```javascript
// Check server logs for:
console.log("BigCommerce product created successfully:", createdProduct.id);
console.log("BigCommerce inventory updated successfully:", quantity);
console.error("BigCommerce integration error:", detail);
```

## Best Practices

1. **Test in Development**: Always test with a development BigCommerce store first
2. **Monitor API Limits**: BigCommerce has rate limits; the system includes timeouts
3. **Handle Failures Gracefully**: The system continues working even if BigCommerce fails
4. **Regular Sync**: Keep your local inventory in sync with BigCommerce
5. **Backup Data**: Always have backups before major operations

## Security Considerations

1. **API Credentials**: Never commit API credentials to version control
2. **Environment Variables**: Use .env files for sensitive data
3. **API Scopes**: Only grant necessary permissions to your API account
4. **HTTPS**: Always use HTTPS in production

## Support

If you encounter issues:

1. Check the server logs for error messages
2. Verify your BigCommerce API credentials
3. Test the BigCommerce API directly using their documentation
4. Check the troubleshooting section above

## API Reference

For more details on BigCommerce API endpoints, refer to:
- [BigCommerce API Documentation](https://developer.bigcommerce.com/api-reference)
- [BigCommerce API Authentication](https://developer.bigcommerce.com/api-docs/getting-started/authentication)
- [BigCommerce Product Management](https://developer.bigcommerce.com/api-reference/catalog/catalog-api/products)
