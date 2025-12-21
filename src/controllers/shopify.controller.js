import axios from "axios";
import config from "../config/config.js";

const getShopifyProducts = async (req, res) => {
  try {
    const storeUrl = process.env.SHOPIFY_STORE_URL || config.SHOPIFY_STORE_URL;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || config.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || config.SHOPIFY_API_VERSION || "2025-07";

    if (!storeUrl || !accessToken) {
      console.log("Shopify credentials not configured");
      return res.status(200).json({ 
        success: true, 
        data: { products: [] },
        message: "Shopify not configured" 
      });
    }

    const endpoint = `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/products.json`;
    
    console.log("Fetching Shopify products from:", endpoint);
    
    const response = await axios.get(endpoint, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
      timeout: 30000, // 30 second timeout
    });

    const products = response.data?.products || [];
    console.log(`Successfully fetched ${products.length} Shopify products`);

    // Transform Shopify products to match our local format
    const transformedProducts = products.map(product => ({
      productID: product.id?.toString() || '',
      variantName: product.title || 'Untitled Product',
      quantity: product.variants?.[0]?.inventory_quantity || 0,
      price: product.variants?.[0]?.price || '0.00',
      shopifyId: product.id,
      status: product.status,
      vendor: product.vendor,
      productType: product.product_type,
      tags: product.tags,
      createdAt: product.created_at,
      updatedAt: product.updated_at
    }));

    res.status(200).json({
      success: true,
      data: { products: transformedProducts },
      message: `Successfully fetched ${products.length} Shopify products`
    });

  } catch (error) {
    console.error("Error fetching Shopify products:", error?.response?.data || error.message);
    
    // Return empty products array instead of error to prevent frontend crashes
    res.status(200).json({
      success: false,
      data: { products: [] },
      error: error?.response?.data || error.message,
      message: "Failed to fetch Shopify products"
    });
  }
};

const updateShopifyProduct = async (req, res) => {
  try {
    const { shopifyId, title, price, quantity, status, vendor, productType, tags } = req.body;
    
    if (!shopifyId) {
      return res.status(400).json({ 
        success: false, 
        error: "Shopify product ID is required" 
      });
    }

    const storeUrl = process.env.SHOPIFY_STORE_URL || config.SHOPIFY_STORE_URL;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || config.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || config.SHOPIFY_API_VERSION || "2025-07";

    if (!storeUrl || !accessToken) {
      return res.status(400).json({ 
        success: false, 
        error: "Shopify credentials not configured" 
      });
    }

    // 1) Get current product to obtain correct variant and inventory IDs
    const getProductEndpoint = `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/products/${shopifyId}.json`;
    const currentProductResponse = await axios.get(getProductEndpoint, {
      headers: { "X-Shopify-Access-Token": accessToken },
      timeout: 30000,
    });
    const currentProduct = currentProductResponse.data?.product;
    if (!currentProduct || !currentProduct.variants || currentProduct.variants.length === 0) {
      return res.status(400).json({ success: false, error: "No variants found in Shopify product" });
    }

    const firstVariantId = currentProduct.variants[0].id;
    const inventoryItemId = currentProduct.variants[0].inventory_item_id;

    // 2) Update product details and variant price
    const endpoint = `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/products/${shopifyId}.json`;
    const updateData = { product: { id: shopifyId } };
    if (title) updateData.product.title = title;
    if (status) updateData.product.status = status;
    if (vendor) updateData.product.vendor = vendor;
    if (productType) updateData.product.product_type = productType;
    if (tags) updateData.product.tags = tags;
    if (price !== undefined) {
      updateData.product.variants = [{ id: firstVariantId, price: price.toString() }];
    }

    console.log("Updating Shopify product:", shopifyId, "with data:", updateData);
    const response = await axios.put(endpoint, updateData, {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      timeout: 30000,
    });
    const updatedProduct = response.data?.product;

    // 3) Update inventory quantity via InventoryLevel API
    if (quantity !== undefined && inventoryItemId) {
      try {
        let locationId = process.env.SHOPIFY_LOCATION_ID || config.SHOPIFY_LOCATION_ID;
        if (!locationId) {
          const locRes = await axios.get(
            `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/locations.json`,
            { headers: { "X-Shopify-Access-Token": accessToken } }
          );
          locationId = locRes.data?.locations?.[0]?.id;
        }
        if (locationId) {
          await axios.post(
            `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/inventory_levels/set.json`,
            { location_id: locationId, inventory_item_id: inventoryItemId, available: Number(quantity) || 0 },
            { headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken } }
          );
        }
      } catch (inventoryError) {
        console.warn("Shopify inventory update failed:", inventoryError?.response?.data || inventoryError.message);
      }
    }

    res.status(200).json({ success: true, data: { product: updatedProduct }, message: "Shopify product updated successfully" });

  } catch (error) {
    console.error("Error updating Shopify product:", error?.response?.data || error.message);
    res.status(500).json({ success: false, error: error?.response?.data || error.message, message: "Failed to update Shopify product" });
  }
};

const deleteShopifyProduct = async (req, res) => {
  try {
    const { shopifyId } = req.params;
    
    if (!shopifyId) {
      return res.status(400).json({ 
        success: false, 
        error: "Shopify product ID is required" 
      });
    }

    const storeUrl = process.env.SHOPIFY_STORE_URL || config.SHOPIFY_STORE_URL;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || config.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || config.SHOPIFY_API_VERSION || "2025-07";

    if (!storeUrl || !accessToken) {
      return res.status(400).json({ 
        success: false, 
        error: "Shopify credentials not configured" 
      });
    }

    const endpoint = `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/products/${shopifyId}.json`;
    
    console.log("Deleting Shopify product:", shopifyId);
    
    await axios.delete(endpoint, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
      timeout: 30000,
    });

    console.log("Successfully deleted Shopify product:", shopifyId);

    res.status(200).json({
      success: true,
      message: "Shopify product deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting Shopify product:", error?.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: error?.response?.data || error.message,
      message: "Failed to delete Shopify product"
    });
  }
};

export { getShopifyProducts, updateShopifyProduct, deleteShopifyProduct };



