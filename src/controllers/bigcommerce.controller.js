import axios from "axios";
import config from "../config/config.js";

const getBigCommerceProducts = async (req, res) => {
  try {
    const storeHash = process.env.BIGCOMMERCE_STORE_HASH || config.BIGCOMMERCE_STORE_HASH;
    const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN || config.BIGCOMMERCE_ACCESS_TOKEN;
    const clientId = process.env.BIGCOMMERCE_CLIENT_ID || config.BIGCOMMERCE_CLIENT_ID;
    const clientSecret = process.env.BIGCOMMERCE_CLIENT_SECRET || config.BIGCOMMERCE_CLIENT_SECRET;

    if (!storeHash || !accessToken || !clientId || !clientSecret) {
      console.log("BigCommerce credentials not configured");
      return res.status(200).json({ 
        success: true, 
        data: { products: [] },
        message: "BigCommerce not configured" 
      });
    }

    const endpoint = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;
    
    console.log("Fetching BigCommerce products from:", endpoint);
    
    const response = await axios.get(endpoint, {
      headers: {
        "X-Auth-Token": accessToken,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      timeout: 30000, // 30 second timeout
    });

    const products = response.data?.data || [];
    console.log(`Successfully fetched ${products.length} BigCommerce products`);

    // Transform BigCommerce products to match our local format
    const transformedProducts = products.map(product => ({
      productID: product.id?.toString() || '',
      variantName: product.name || 'Untitled Product',
      quantity: product.inventory_level || 0,
      price: product.price || '0.00',
      bigcommerceId: product.id,
      status: product.is_visible ? 'active' : 'draft',
      vendor: product.brand_name || product.brand_id?.toString(),
      productType: product.type || 'physical',
      sku: product.sku,
      weight: product.weight,
      categories: product.categories,
      createdAt: product.date_created,
      updatedAt: product.date_modified
    }));

    res.status(200).json({
      success: true,
      data: { products: transformedProducts },
      message: `Successfully fetched ${products.length} BigCommerce products`
    });

  } catch (error) {
    console.error("Error fetching BigCommerce products:", error?.response?.data || error.message);
    
    // Return empty products array instead of error to prevent frontend crashes
    res.status(200).json({
      success: false,
      data: { products: [] },
      error: error?.response?.data || error.message,
      message: "Failed to fetch BigCommerce products"
    });
  }
};

const updateBigCommerceProduct = async (req, res) => {
  try {
    const { bigcommerceId, name, price, quantity, status, brandId, type, sku, weight } = req.body;
    
    if (!bigcommerceId) {
      return res.status(400).json({ 
        success: false, 
        error: "BigCommerce product ID is required" 
      });
    }

    const storeHash = process.env.BIGCOMMERCE_STORE_HASH || config.BIGCOMMERCE_STORE_HASH;
    const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN || config.BIGCOMMERCE_ACCESS_TOKEN;
    const clientId = process.env.BIGCOMMERCE_CLIENT_ID || config.BIGCOMMERCE_CLIENT_ID;
    const clientSecret = process.env.BIGCOMMERCE_CLIENT_SECRET || config.BIGCOMMERCE_CLIENT_SECRET;

    if (!storeHash || !accessToken || !clientId || !clientSecret) {
      return res.status(400).json({ 
        success: false, 
        error: "BigCommerce credentials not configured" 
      });
    }

    const endpoint = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${bigcommerceId}`;
    
    // Prepare update data
    const updateData = {};

    if (name) updateData.name = name;
    if (status !== undefined) updateData.is_visible = status === 'active';
    if (brandId) updateData.brand_id = parseInt(brandId);
    if (type) updateData.type = type;
    if (sku) updateData.sku = sku;
    if (weight !== undefined) updateData.weight = parseFloat(weight);

    // Update price if provided
    if (price !== undefined) {
      updateData.price = parseFloat(price);
    }

    console.log("Updating BigCommerce product:", bigcommerceId, "with data:", updateData);
    
    const response = await axios.put(endpoint, updateData, {
      headers: {
        "X-Auth-Token": accessToken,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      timeout: 30000,
    });

    const updatedProduct = response.data?.data;
    console.log("Successfully updated BigCommerce product:", updatedProduct?.id);

    // Update inventory separately if quantity is provided
    if (quantity !== undefined) {
      try {
        const inventoryEndpoint = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${bigcommerceId}/inventory`;
        
        const inventoryData = {
          inventory_level: parseInt(quantity),
          inventory_warning_level: 0
        };

        await axios.put(inventoryEndpoint, inventoryData, {
          headers: {
            "X-Auth-Token": accessToken,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          timeout: 30000,
        });

        console.log("BigCommerce inventory updated successfully:", quantity);
      } catch (inventoryError) {
        console.error("Failed to update BigCommerce inventory:", inventoryError?.response?.data || inventoryError.message);
        // Continue without failing the entire operation
      }
    }

    res.status(200).json({
      success: true,
      data: { product: updatedProduct },
      message: "BigCommerce product updated successfully"
    });

  } catch (error) {
    console.error("Error updating BigCommerce product:", error?.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: error?.response?.data || error.message,
      message: "Failed to update BigCommerce product"
    });
  }
};

const deleteBigCommerceProduct = async (req, res) => {
  try {
    const { bigcommerceId } = req.params;
    
    if (!bigcommerceId) {
      return res.status(400).json({ 
        success: false, 
        error: "BigCommerce product ID is required" 
      });
    }

    const storeHash = process.env.BIGCOMMERCE_STORE_HASH || config.BIGCOMMERCE_STORE_HASH;
    const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN || config.BIGCOMMERCE_ACCESS_TOKEN;
    const clientId = process.env.BIGCOMMERCE_CLIENT_ID || config.BIGCOMMERCE_CLIENT_ID;
    const clientSecret = process.env.BIGCOMMERCE_CLIENT_SECRET || config.BIGCOMMERCE_CLIENT_SECRET;

    if (!storeHash || !accessToken || !clientId || !clientSecret) {
      return res.status(400).json({ 
        success: false, 
        error: "BigCommerce credentials not configured" 
      });
    }

    const endpoint = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${bigcommerceId}`;
    
    console.log("Deleting BigCommerce product:", bigcommerceId);
    
    await axios.delete(endpoint, {
      headers: {
        "X-Auth-Token": accessToken,
        "Accept": "application/json"
      },
      timeout: 30000,
    });

    console.log("Successfully deleted BigCommerce product:", bigcommerceId);

    res.status(200).json({
      success: true,
      message: "BigCommerce product deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting BigCommerce product:", error?.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: error?.response?.data || error.message,
      message: "Failed to delete BigCommerce product"
    });
  }
};

export { getBigCommerceProducts, updateBigCommerceProduct, deleteBigCommerceProduct };
