
import Item from "../models/Item.js";
import axios from "axios";
import dotenv from "dotenv";
import mongoose from "mongoose";
import config from "../config/config.js";

const addItem = async (req, res) => {
  try {
    const { 
      productID, 
      variantName, 
      quantity, 
      price, 
      userId,
      itemName,
      itemType,
      sku,
      upc,
      brand,
      weight,
      manufacturer,
      mpn,
      ean,
      isbn,
      salesTax,
      salesAccount,
      salesDescription,
      costPrice,
      purchaseTax,
      purchaseAccount,
      purchaseDescription,
      sizeVariants,
      colorVariants,
      images
    } = req.body;
    
    console.log("addItem called with data:", { 
      productID, 
      variantName, 
      quantity, 
      price, 
      userId,
      itemName,
      itemType,
      images: images ? 'Images present' : 'No images'
    }); // Debug log

    if (!productID || !variantName || !quantity || !price || !userId) {
      return res.status(400).json({ error: "All required fields are missing." });
    }

    // Validate and convert userId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid userId provided." });
    }
    const objectIdUserId = new mongoose.Types.ObjectId(userId);

    const newItem = new Item({
      productID,
      variantName: itemName,
      quantity,
      price,
      userId: objectIdUserId,
    });

    const savedItem = await newItem.save();
    console.log("Item saved:", savedItem); // Debug log

    // Try to create Shopify product if environment variables are set
    let shopifyResponse = null;
    const storeUrl = process.env.SHOPIFY_STORE_URL || config.SHOPIFY_STORE_URL;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || config.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || config.SHOPIFY_API_VERSION || "2025-07";
    
    // Try to create BigCommerce product if environment variables are set
    let bigcommerceResponse = null;
    const storeHash = process.env.BIGCOMMERCE_STORE_HASH || config.BIGCOMMERCE_STORE_HASH;
    const bigcommerceAccessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN || config.BIGCOMMERCE_ACCESS_TOKEN;
    const clientId = process.env.BIGCOMMERCE_CLIENT_ID || config.BIGCOMMERCE_CLIENT_ID;
    const clientSecret = process.env.BIGCOMMERCE_CLIENT_SECRET || config.BIGCOMMERCE_CLIENT_SECRET;
    
    if (storeUrl && accessToken) {
      try {
        const endpoint = `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/products.json`;
        // Build comprehensive product data for Shopify
        const shopifyProductData = {
          product: {
            title: itemName || variantName,
            body_html: buildProductDescription({
              salesDescription,
              itemType,
              brand,
              manufacturer,
              weight,
              upc,
              ean,
              isbn,
              mpn
            }),
            vendor: brand || manufacturer || "zakapo",
            product_type: itemType || "items",
            status: "active",
            tags: buildTags({ itemType, brand, manufacturer }),
            // SEO and listing fields
            seo: {
              title: itemName || variantName,
              description: salesDescription || `Shop ${itemName || variantName} from ${brand || manufacturer || 'Zakapo'}`
            },
            // Additional required fields for proper listing
            handle: (itemName || variantName).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            published_at: new Date().toISOString(),
            template_suffix: "",
            // Handle variants - combine size and color variants
            variants: buildShopifyVariants({
              sizeVariants,
              colorVariants,
              basePrice: price,
              productID,
              sku,
              upc,
              ean,
              isbn,
              mpn,
              quantity
            }),
            // Include all product options
            options: buildProductOptions({ sizeVariants, colorVariants }),
            // SEO fields
            metafields: buildMetafields({
              upc,
              ean,
              isbn,
              mpn,
              weight,
              costPrice,
              salesTax,
              purchaseTax
            })
          },
        };

        console.log("Sending Shopify product data:", JSON.stringify(shopifyProductData, null, 2));
        
        const response = await axios.post(endpoint, shopifyProductData, {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          timeout: 30000, // 30 second timeout
        });
        
        const createdProduct = response.data?.product || null;
        if (createdProduct) {
          console.log("Shopify product created successfully:", createdProduct.id);
          shopifyResponse = createdProduct;
          
          // Update the local item with Shopify product ID
          try {
            const updateResult = await Item.findByIdAndUpdate(savedItem._id, {
              shopifyProductId: createdProduct.id.toString()
            }, { new: true });
            
            console.log("Local item updated with Shopify product ID:", createdProduct.id);
            console.log("Updated local item:", updateResult);
            
            // Update the savedItem reference to include shopifyProductId
            savedItem.shopifyProductId = createdProduct.id.toString();
          } catch (updateError) {
            console.error("Failed to update local item with Shopify ID:", updateError);
            console.error("Update error details:", updateError.message);
          }
        } else {
          console.error("Shopify API response missing product data:", response.data);
          throw new Error("Failed to create Shopify product: Invalid response");
        }

        // Handle image uploads to Shopify if images are present
        if (createdProduct && images && (images.main || (images.size && images.size.some(img => img)) || (images.color && images.color.some(img => img)))) {
          try {
            // Process images in batches to avoid memory issues
            await uploadImagesToShopify(createdProduct.id, images, storeUrl, accessToken, apiVersion);
            console.log("Images uploaded to Shopify successfully");
          } catch (imageError) {
            console.error("Failed to upload images to Shopify:", imageError?.response?.data || imageError.message);
            // Continue without images - don't fail the entire operation
          }
        }

        // After creation, set inventory using InventoryLevel API
        if (createdProduct && Array.isArray(createdProduct.variants) && createdProduct.variants.length > 0) {
          const primaryVariant = createdProduct.variants[0];
          const inventoryItemId = primaryVariant.inventory_item_id;

          // Get location id either from env or first active location
          let locationId = process.env.SHOPIFY_LOCATION_ID || config.SHOPIFY_LOCATION_ID;
          if (!locationId) {
            try {
              const locRes = await axios.get(
                `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/locations.json`,
                { headers: { "X-Shopify-Access-Token": accessToken } }
              );
              locationId = locRes.data?.locations?.[0]?.id;
            } catch (e) {
              console.error("Failed to fetch Shopify locations:", e?.response?.data || e.message);
            }
          }

          if (locationId && inventoryItemId) {
            try {
              await axios.post(
                `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/inventory_levels/set.json`,
                {
                  location_id: locationId,
                  inventory_item_id: inventoryItemId,
                  available: Number(quantity) || 0,
                },
                { headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken } }
              );
            } catch (e) {
              console.error("Failed to set Shopify inventory level:", e?.response?.data || e.message);
            }
          } else {
            console.warn("Missing Shopify location or inventory item; inventory not set.");
          }

          // Attempt to publish to Online Store via Publications API (optional)
          try {
            const pubs = await axios.get(
              `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/publications.json`,
              { headers: { "X-Shopify-Access-Token": accessToken } }
            );
            const onlineStore = (pubs.data?.publications || []).find((p) =>
              /online store/i.test(p.name || p.channel?.handle || "")
            );
            if (onlineStore?.id && createdProduct.id) {
              await axios.post(
                `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/publications/${onlineStore.id}/listings.json`,
                { product_id: createdProduct.id },
                { headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken } }
              );
            }
          } catch (e) {
            // Non-fatal: product may already be available on default sales channel when status=active
            console.warn("Publishing to Online Store failed or unavailable:", e?.response?.data || e.message);
          }
        }
      } catch (shopifyError) {
        const detail = shopifyError?.response?.data || shopifyError.message;
        console.error("Shopify integration error:", detail);
        // Continue without Shopify - don't fail the entire operation
      }
    }

    // Try to create BigCommerce product if environment variables are set
    if (storeHash && bigcommerceAccessToken && clientId && clientSecret) {
      try {
        const endpoint = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products`;
        
        // Build comprehensive product data for BigCommerce
        const bigcommerceProductData = {
          name: itemName || variantName,
          // BigCommerce requires type to be either "physical" or "digital"
          type: "physical",
          sku: sku || productID,
          description: buildBigCommerceDescription({
            salesDescription,
            itemType,
            brand,
            manufacturer,
            weight,
            upc,
            ean,
            isbn,
            mpn
          }),
          price: parseFloat(price) || 0.00,
          weight: parseFloat(weight) || 0,
          is_visible: true,
          is_featured: false,
          inventory_level: parseInt(quantity) || 0,
          inventory_warning_level: 0,
          inventory_tracking: "product",
          categories: [], // Can be populated with category IDs if needed
          brand_id: 0, // Can be populated with brand ID if needed
          // BigCommerce expects an array of strings here
          meta_keywords: buildBigCommerceMetaKeywords({ itemType, brand, manufacturer }),
          meta_description: salesDescription || `Shop ${itemName || variantName} from ${brand || manufacturer || 'Zakapo'}`,
          page_title: itemName || variantName
        };

        // Compute variants only when options exist
        const bcVariants = buildBigCommerceVariants({
          sizeVariants,
          colorVariants,
          basePrice: price,
          productID,
          sku,
          upc,
          ean,
          isbn,
          mpn,
          quantity
        });
        if (bcVariants.length > 0) {
          bigcommerceProductData.variants = bcVariants;
        }

        console.log("Sending BigCommerce product data:", JSON.stringify(bigcommerceProductData, null, 2));
        
        const response = await axios.post(endpoint, bigcommerceProductData, {
          headers: {
            "X-Auth-Token": bigcommerceAccessToken,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          timeout: 30000, // 30 second timeout
        });
        
        const createdProduct = response.data?.data || null;
        if (createdProduct) {
          console.log("BigCommerce product created successfully:", createdProduct.id);
          bigcommerceResponse = createdProduct;
          
          // Update the local item with BigCommerce product ID
          try {
            const updateResult = await Item.findByIdAndUpdate(savedItem._id, {
              bigcommerceProductId: createdProduct.id.toString()
            }, { new: true });
            
            console.log("Local item updated with BigCommerce product ID:", createdProduct.id);
            console.log("Updated local item:", updateResult);
            
            // Update the savedItem reference to include bigcommerceProductId
            savedItem.bigcommerceProductId = createdProduct.id.toString();
          } catch (updateError) {
            console.error("Failed to update local item with BigCommerce ID:", updateError);
            console.error("Update error details:", updateError.message);
          }
        } else {
          console.error("BigCommerce API response missing product data:", response.data);
          throw new Error("Failed to create BigCommerce product: Invalid response");
        }

        // Handle image uploads to BigCommerce if images are present
        if (createdProduct && images && (images.main || (images.size && images.size.some(img => img)) || (images.color && images.color.some(img => img)))) {
          try {
            // Process images in batches to avoid memory issues
            await uploadImagesToBigCommerce(createdProduct.id, images, storeHash, bigcommerceAccessToken);
            console.log("Images uploaded to BigCommerce successfully");
          } catch (imageError) {
            console.error("Failed to upload images to BigCommerce:", imageError?.response?.data || imageError.message);
            // Continue without images - don't fail the entire operation
          }
        }

      } catch (bigcommerceError) {
        const detail = bigcommerceError?.response?.data || bigcommerceError.message;
        console.error("BigCommerce integration error:", detail);
        // Continue without BigCommerce - don't fail the entire operation
      }
    }

    return res.status(201).json({
      message: "Item added successfully",
      data: {
        local: savedItem,
        shopify: shopifyResponse,
        bigcommerce: bigcommerceResponse,
      },
    });
  } catch (error) {
    console.error("Error in addItem:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};

const getItems = async (req, res) => {
  try {
    const { userId } = req.query;
    console.log("getItems called with userId:", userId); // Debug log
    
    if (!userId) {
      console.log("No userId provided"); // Debug log
      return res.status(400).json({ error: "User ID is required." });
    }
    
    // Validate and convert userId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid userId provided." });
    }
    const objectIdUserId = new mongoose.Types.ObjectId(userId);

    const items = await Item.find({ userId: objectIdUserId });
    console.log("Found items:", items); // Debug log
    
    res.status(200).json({ items });
  } catch (error) {
    console.error("Error in getItems:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

const updateItems = async (req, res) => {
  try {
    const { itemId, productID, variantName, quantity, price, category, channel } = req.body;

    const item = await Item.findById(itemId)
    const shopifyId = item.shopifyProductId;

    console.log("update Items: ", shopifyId)
    // If shopifyId is provided, update Shopify product directly
    if (shopifyId) {
      try {
        const storeUrl = process.env.SHOPIFY_STORE_URL || config.SHOPIFY_STORE_URL;
        const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || config.SHOPIFY_ACCESS_TOKEN;
        const apiVersion = process.env.SHOPIFY_API_VERSION || config.SHOPIFY_API_VERSION || "2025-07";

        if (!storeUrl || !accessToken) {
          return res.status(400).json({ error: "Shopify credentials not configured" });
        }

        // First, get the current product details from Shopify to get the correct variant IDs
        const getProductEndpoint = `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/products/${shopifyId}.json`;
        
        console.log("Fetching current product details for direct update...");
        const currentProductResponse = await axios.get(getProductEndpoint, {
          headers: {
            "X-Shopify-Access-Token": accessToken,
          },
          timeout: 30000,
        });
        
        const currentProduct = currentProductResponse.data?.product;
        if (!currentProduct || !currentProduct.variants || currentProduct.variants.length === 0) {
          console.error("No variants found in current Shopify product for direct update");
          return res.status(400).json({ error: "No variants found in Shopify product" });
        }
        
        // Get the first variant ID (usually the main variant)
        const firstVariantId = currentProduct.variants[0].id;
        console.log("Using variant ID for direct update:", firstVariantId);

        const endpoint = `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/products/${shopifyId}.json`;
        
        const updateData = {
          product: {
            id: shopifyId
          }
        };

        if (variantName) updateData.product.title = variantName;
        if (price !== undefined) {
          updateData.product.variants = [{ 
            id: firstVariantId,  // Use the actual variant ID from Shopify
            price: price.toString() 
          }];
        }
        if (quantity !== undefined) {
          updateData.product.variants[0].inventory_quantity = quantity.toString();
        }

        const response = await axios.put(endpoint, updateData, {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          timeout: 30000,
        });

        console.log("Shopify response:", response.data.variants);

        console.log("Shopify product updated successfully:", shopifyId);

        // Now handle inventory update separately using Inventory Level API
        if (quantity !== undefined && currentProduct.variants[0].inventory_item_id) {
          try {
            const inventoryItemId = currentProduct.variants[0].inventory_item_id;
            
            // Get location ID (use first available location if not specified)
            let locationId = process.env.SHOPIFY_LOCATION_ID || config.SHOPIFY_LOCATION_ID;
            if (!locationId) {
              try {
                const locRes = await axios.get(
                  `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/locations.json`,
                  { headers: { "X-Shopify-Access-Token": accessToken } }
                );
                locationId = locRes.data?.locations?.[0]?.id;
                console.log("Using location ID for direct update:", locationId);
              } catch (e) {
                console.error("Failed to fetch Shopify locations:", e?.response?.data || e.message);
              }
            }

            if (locationId) {
              // Update inventory level using the Inventory Level API
              const inventoryEndpoint = `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/inventory_levels/set.json`;
              
              const inventoryData = {
                location_id: locationId,
                inventory_item_id: inventoryItemId,
                available: Number(quantity) || 0,
              };

              console.log("Updating inventory for direct update with data:", inventoryData);
              
              const inventoryResponse = await axios.post(inventoryEndpoint, inventoryData, {
                headers: {
                  "Content-Type": "application/json",
                  "X-Shopify-Access-Token": accessToken,
                },
                timeout: 30000,
              });

              console.log("Inventory updated successfully for direct update:", inventoryResponse.data);
              console.log("New available quantity:", quantity);
            } else {
              console.warn("No location ID available for direct update, skipping inventory update");
            }
          } catch (inventoryError) {
            console.error("Inventory update error for direct update:", inventoryError?.response?.data || inventoryError.message);
            console.log("Product updated but inventory sync failed for direct update. Continuing...");
          }
        }
      } catch (shopifyError) {
        console.error("Shopify update error:", shopifyError?.response?.data || shopifyError.message);
        return res.status(500).json({ error: "Failed to update Shopify product" });
      }
    }

    // Update local item
    let updateQuery = {};
    if (itemId) {
      // Use MongoDB _id
      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({ error: "Invalid item ID provided." });
      }
      updateQuery = { _id: new mongoose.Types.ObjectId(itemId) };
    } else if (productID) {
      // Fallback to productID
      updateQuery = { productID };
    } else {
      return res.status(400).json({ error: "Either itemId or productID is required." });
    }

    const updateFields = {};
    if (variantName) updateFields.variantName = variantName;
    if (quantity !== undefined) updateFields.quantity = quantity;
    if (price !== undefined) updateFields.price = price;
    if (category !== undefined) updateFields.category = category;
    if (channel !== undefined) updateFields.channel = channel;

    const updatedItem = await Item.findOneAndUpdate(
      updateQuery,
      updateFields,
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ error: "Item not found." });
    }

    // If missing Shopify ID, try to auto-link by searching Shopify by title/SKU once
    if (!updatedItem.shopifyProductId) {
      try {
        const storeUrl = process.env.SHOPIFY_STORE_URL || config.SHOPIFY_STORE_URL;
        const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || config.SHOPIFY_ACCESS_TOKEN;
        const apiVersion = process.env.SHOPIFY_API_VERSION || config.SHOPIFY_API_VERSION || "2025-07";
        if (storeUrl && accessToken) {
          const title = updatedItem.variantName;
          const searchEndpoint = `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/products.json?title=${encodeURIComponent(title)}`;
          const searchRes = await axios.get(searchEndpoint, { headers: { "X-Shopify-Access-Token": accessToken }, timeout: 20000 });
          const match = (searchRes.data?.products || []).find(p => (p.title || '').toLowerCase() === (title || '').toLowerCase());
          if (match?.id) {
            await Item.findByIdAndUpdate(updatedItem._id, { shopifyProductId: String(match.id) });
            updatedItem.shopifyProductId = String(match.id);
            console.log("Auto-linked Shopify product ID:", match.id);
          }
        }
      } catch (e) {
        console.warn("Auto-link Shopify ID failed:", e?.response?.data || e.message);
      }
    }

    // CRITICAL FIX: If this item has a Shopify product ID, update it there too
    if (updatedItem.shopifyProductId && (variantName || price !== undefined || quantity !== undefined)) {
      try {
        const storeUrl = process.env.SHOPIFY_STORE_URL || config.SHOPIFY_STORE_URL;
        const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || config.SHOPIFY_ACCESS_TOKEN;
        const apiVersion = process.env.SHOPIFY_API_VERSION || config.SHOPIFY_API_VERSION || "2025-07";

        if (storeUrl && accessToken) {
          // First, get the current product details from Shopify to get the correct variant IDs
          const getProductEndpoint = `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/products/${updatedItem.shopifyProductId}.json`;
          
          console.log("Fetching current product details from Shopify...");
          const currentProductResponse = await axios.get(getProductEndpoint, {
            headers: {
              "X-Shopify-Access-Token": accessToken,
            },
            timeout: 30000,
          });
          
          const currentProduct = currentProductResponse.data?.product;
          if (!currentProduct || !currentProduct.variants || currentProduct.variants.length === 0) {
            console.error("No variants found in current Shopify product");
            throw new Error("No variants found in current Shopify product");
          }
          
          // Get the first variant ID (usually the main variant)
          const firstVariantId = currentProduct.variants[0].id;
          const inventoryItemId = currentProduct.variants[0].inventory_item_id;
          console.log("Using variant ID from Shopify:", firstVariantId);
          console.log("Inventory item ID:", inventoryItemId);
          
          const endpoint = `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/products/${updatedItem.shopifyProductId}.json`;
          
          const shopifyUpdateData = {
            product: {
              id: updatedItem.shopifyProductId
            }
          };

          // Update title if variantName changed
          if (variantName) {
            shopifyUpdateData.product.title = variantName;
          }

          // Update price in variants using the correct variant ID
          if (price !== undefined) {
            shopifyUpdateData.product.variants = [{ 
              id: firstVariantId  // Use the actual variant ID from Shopify
            }];
            shopifyUpdateData.product.variants[0].price = price.toString();
          }

          console.log("Syncing to Shopify with data:", shopifyUpdateData);

          // Update product details (title, price) first
          const shopifyResponse = await axios.put(endpoint, shopifyUpdateData, {
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": accessToken,
            },
            timeout: 30000,
          });

          console.log("Shopify product synced successfully:", updatedItem.shopifyProductId);
          console.log("Shopify response:", shopifyResponse.data);

          // Now handle inventory update separately using Inventory Level API
          if (quantity !== undefined && inventoryItemId) {
            try {
              // Get location ID (use first available location if not specified)
              let locationId = process.env.SHOPIFY_LOCATION_ID || config.SHOPIFY_LOCATION_ID;
              if (!locationId) {
                try {
                  const locRes = await axios.get(
                    `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/locations.json`,
                    { headers: { "X-Shopify-Access-Token": accessToken } }
                  );
                  locationId = locRes.data?.locations?.[0]?.id;
                  console.log("Using location ID:", locationId);
                } catch (e) {
                  console.error("Failed to fetch Shopify locations:", e?.response?.data || e.message);
                }
              }

              if (locationId) {
                // Update inventory level using the Inventory Level API
                const inventoryEndpoint = `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/inventory_levels/set.json`;
                
                const inventoryData = {
                  location_id: locationId,
                  inventory_item_id: inventoryItemId,
                  available: Number(quantity) || 0,
                };

                console.log("Updating inventory with data:", inventoryData);
                
                const inventoryResponse = await axios.post(inventoryEndpoint, inventoryData, {
                  headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": accessToken,
                  },
                  timeout: 30000,
                });

                console.log("Inventory updated successfully:", inventoryResponse.data);
                console.log("New available quantity:", quantity);
              } else {
                console.warn("No location ID available, skipping inventory update");
              }
            } catch (inventoryError) {
              console.error("Inventory update error:", inventoryError?.response?.data || inventoryError.message);
              console.log("Product updated but inventory sync failed. Continuing...");
            }
          }
        }
      } catch (shopifyError) {
        console.error("Shopify sync error:", shopifyError?.response?.data || shopifyError.message);
        // Continue with local update even if Shopify sync fails
        console.log("Local item updated but Shopify sync failed. Continuing...");
      }
    }

    // If missing BigCommerce ID, try to auto-link by searching BigCommerce by name/SKU once
    if (!updatedItem.bigcommerceProductId) {
      try {
        const storeHash = process.env.BIGCOMMERCE_STORE_HASH || config.BIGCOMMERCE_STORE_HASH;
        const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN || config.BIGCOMMERCE_ACCESS_TOKEN;
        const clientId = process.env.BIGCOMMERCE_CLIENT_ID || config.BIGCOMMERCE_CLIENT_ID;
        const clientSecret = process.env.BIGCOMMERCE_CLIENT_SECRET || config.BIGCOMMERCE_CLIENT_SECRET;
        if (storeHash && accessToken && clientId && clientSecret) {
          const query = encodeURIComponent(updatedItem.productID || updatedItem.variantName || "");
          const searchEndpoint = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products?name=${query}`;
          const searchRes = await axios.get(searchEndpoint, { headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }, timeout: 20000 });
          const match = (searchRes.data?.data || [])[0];
          if (match?.id) {
            await Item.findByIdAndUpdate(updatedItem._id, { bigcommerceProductId: String(match.id) });
            updatedItem.bigcommerceProductId = String(match.id);
            console.log("Auto-linked BigCommerce product ID:", match.id);
          }
        }
      } catch (e) {
        console.warn("Auto-link BigCommerce ID failed:", e?.response?.data || e.message);
      }
    }

    // CRITICAL FIX: If this item has a BigCommerce product ID, update it there too
    if (updatedItem.bigcommerceProductId && (variantName || price !== undefined || quantity !== undefined)) {
      try {
        const storeHash = process.env.BIGCOMMERCE_STORE_HASH || config.BIGCOMMERCE_STORE_HASH;
        const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN || config.BIGCOMMERCE_ACCESS_TOKEN;
        const clientId = process.env.BIGCOMMERCE_CLIENT_ID || config.BIGCOMMERCE_CLIENT_ID;
        const clientSecret = process.env.BIGCOMMERCE_CLIENT_SECRET || config.BIGCOMMERCE_CLIENT_SECRET;

        if (storeHash && accessToken && clientId && clientSecret) {
          const endpoint = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${updatedItem.bigcommerceProductId}`;
          
          const bigcommerceUpdateData = {};

          // Update name if variantName changed
          if (variantName) {
            bigcommerceUpdateData.name = variantName;
          }

          // Update price if provided
          if (price !== undefined) {
            bigcommerceUpdateData.price = parseFloat(price);
          }

          if (quantity !== undefined) {
            bigcommerceUpdateData.inventory_level = parseInt(quantity);
          }

          console.log("Syncing to BigCommerce with data:", bigcommerceUpdateData);

          // Update product details (name, price) first
          if (Object.keys(bigcommerceUpdateData).length > 0) {
            const bigcommerceResponse = await axios.put(endpoint, bigcommerceUpdateData, {
              headers: {
                "X-Auth-Token": accessToken,
                "Content-Type": "application/json",
                "Accept": "application/json"
              },
              timeout: 30000,
            });

            console.log("BigCommerce product synced successfully:", updatedItem.bigcommerceProductId);
            console.log("BigCommerce response:", bigcommerceResponse.data);
          }

          // Now handle inventory update separately
          if (quantity !== undefined) {
            try {
              const inventoryEndpoint = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${updatedItem.bigcommerceProductId}/inventory`;
              
              const inventoryData = {
                inventory_level: parseInt(quantity) || 0,
                inventory_warning_level: 0
              };

              console.log("Updating BigCommerce inventory with data:", inventoryData);
              
              const inventoryResponse = await axios.put(inventoryEndpoint, inventoryData, {
                headers: {
                  "X-Auth-Token": accessToken,
                  "Content-Type": "application/json",
                  "Accept": "application/json"
                },
                timeout: 30000,
              });

              console.log("BigCommerce inventory updated successfully:", inventoryResponse.data);
              console.log("New available quantity:", quantity);
            } catch (inventoryError) {
              console.error("BigCommerce inventory update error:", inventoryError?.response?.data || inventoryError.message);
              console.log("Product updated but BigCommerce inventory sync failed. Continuing...");
            }
          }
        }
      } catch (bigcommerceError) {
        console.error("BigCommerce sync error:", bigcommerceError?.response?.data || bigcommerceError.message);
        // Continue with local update even if BigCommerce sync fails
        console.log("Local item updated but BigCommerce sync failed. Continuing...");
      }
    }

    res.status(200).json({
      message: "Item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Error in updateItems:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    if (!itemId) {
      return res.status(400).json({ error: "Item ID is required." });
    }

    // Validate and convert itemId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ error: "Invalid item ID provided." });
    }
    const objectIdItemId = new mongoose.Types.ObjectId(itemId);

    // First get the item to check if it has Shopify integration
    const itemToDelete = await Item.findById(objectIdItemId);
    if (!itemToDelete) {
      return res.status(404).json({ error: "Item not found." });
    }

    console.log("Deleting item:", itemToDelete.variantName, "Shopify ID:", itemToDelete.shopifyProductId, "BigCommerce ID:", itemToDelete.bigcommerceProductId);

    // If this item was created in Shopify, delete it there too
    if (itemToDelete.shopifyProductId) {
      try {
        const storeUrl = process.env.SHOPIFY_STORE_URL || config.SHOPIFY_STORE_URL;
        const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || config.SHOPIFY_ACCESS_TOKEN;
        const apiVersion = process.env.SHOPIFY_API_VERSION || config.SHOPIFY_API_VERSION || "2025-07";

        if (storeUrl && accessToken) {
          const endpoint = `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/products/${itemToDelete.shopifyProductId}.json`;
          
          console.log("Deleting from Shopify:", endpoint);
          
          const shopifyResponse = await axios.delete(endpoint, {
            headers: {
              "X-Shopify-Access-Token": accessToken,
            },
            timeout: 30000,
          });
          
          console.log("Shopify product deleted successfully:", itemToDelete.shopifyProductId);
          console.log("Shopify response status:", shopifyResponse.status);
        } else {
          console.log("Shopify credentials not configured, skipping Shopify deletion");
        }
      } catch (shopifyError) {
        console.error("Shopify delete error:", shopifyError?.response?.data || shopifyError.message);
        console.error("Shopify delete error status:", shopifyError?.response?.status);
        // Continue with local deletion even if Shopify deletion fails
        console.log("Local item will be deleted even though Shopify deletion failed");
      }
    }

    // If this item was created in BigCommerce, delete it there too
    if (itemToDelete.bigcommerceProductId) {
      try {
        const storeHash = process.env.BIGCOMMERCE_STORE_HASH || config.BIGCOMMERCE_STORE_HASH;
        const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN || config.BIGCOMMERCE_ACCESS_TOKEN;
        const clientId = process.env.BIGCOMMERCE_CLIENT_ID || config.BIGCOMMERCE_CLIENT_ID;
        const clientSecret = process.env.BIGCOMMERCE_CLIENT_SECRET || config.BIGCOMMERCE_CLIENT_SECRET;

        if (storeHash && accessToken && clientId && clientSecret) {
          const endpoint = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${itemToDelete.bigcommerceProductId}`;
          
          console.log("Deleting from BigCommerce:", endpoint);
          
          const bigcommerceResponse = await axios.delete(endpoint, {
            headers: {
              "X-Auth-Token": accessToken,
              "Accept": "application/json"
            },
            timeout: 30000,
          });
          
          console.log("BigCommerce product deleted successfully:", itemToDelete.bigcommerceProductId);
          console.log("BigCommerce response status:", bigcommerceResponse.status);
        } else {
          console.log("BigCommerce credentials not configured, skipping BigCommerce deletion");
        }
      } catch (bigcommerceError) {
        console.error("BigCommerce delete error:", bigcommerceError?.response?.data || bigcommerceError.message);
        console.error("BigCommerce delete error status:", bigcommerceError?.response?.status);
        // Continue with local deletion even if BigCommerce deletion fails
        console.log("Local item will be deleted even though BigCommerce deletion failed");
      }
    }

    // Delete local item
    const deletedItem = await Item.findByIdAndDelete(objectIdItemId);
    
    console.log("Local item deleted successfully:", deletedItem._id);
    
    res.status(200).json({
      message: "Item deleted successfully",
      data: deletedItem,
    });
  } catch (error) {
    console.error("Error in deleteItem:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Helper functions for building Shopify product data
const buildProductDescription = ({ salesDescription, itemType, brand, manufacturer, weight, upc, ean, isbn, mpn }) => {
  let description = salesDescription || '';
  
  if (itemType) description += `<p><strong>Type:</strong> ${itemType}</p>`;
  if (brand) description += `<p><strong>Brand:</strong> ${brand}</p>`;
  if (manufacturer) description += `<p><strong>Manufacturer:</strong> ${manufacturer}</p>`;
  if (weight) description += `<p><strong>Weight:</strong> ${weight}</p>`;
  
  // Add identifiers
  const identifiers = [];
  if (upc) identifiers.push(`UPC: ${upc}`);
  if (ean) identifiers.push(`EAN: ${ean}`);
  if (isbn) identifiers.push(`ISBN: ${isbn}`);
  if (mpn) identifiers.push(`MPN: ${mpn}`);
  
  if (identifiers.length > 0) {
    description += `<p><strong>Identifiers:</strong> ${identifiers.join(', ')}</p>`;
  }
  
  return description || `<p>Product details available</p>`;
};

const buildTags = ({ itemType, brand, manufacturer }) => {
  const tags = ['zakapo'];
  if (itemType) tags.push(itemType);
  if (brand) tags.push(brand);
  if (manufacturer) tags.push(manufacturer);
  return tags.join(', ');
};

const buildShopifyVariants = ({ sizeVariants, colorVariants, basePrice, productID, sku, upc, ean, isbn, mpn, quantity }) => {
  const variants = [];
  
  // Handle size variants
  if (sizeVariants && sizeVariants.length > 0) {
    sizeVariants.forEach((sizeVariant, index) => {
      if (sizeVariant.size && sizeVariant.quantity) {
        variants.push({
          option1: sizeVariant.size,
          option2: colorVariants?.[0]?.color || 'Default',
          price: basePrice?.toString?.() || String(basePrice),
          inventory_management: "shopify",
          inventory_policy: "deny",
          requires_shipping: true,
          sku: sku ? `${sku}-${sizeVariant.size}` : `${productID}-${sizeVariant.size}`,
          inventory_quantity: parseInt(sizeVariant.quantity) || 0,
          weight: 0,
          weight_unit: "kg",
          taxable: true,
          barcode: sizeVariant.upc || sizeVariant.ean || sizeVariant.isbn || sizeVariant.mpn || ''
        });
      }
    });
  }
  
  // Handle color variants
  if (colorVariants && colorVariants.length > 0 && variants.length === 0) {
    colorVariants.forEach((colorVariant, index) => {
      if (colorVariant.color && colorVariant.quantity) {
        variants.push({
          option1: 'Default',
          option2: colorVariant.color,
          price: basePrice?.toString?.() || String(basePrice),
          inventory_management: "shopify",
          inventory_policy: "deny",
          requires_shipping: true,
          sku: sku ? `${sku}-${colorVariant.color}` : `${productID}-${colorVariant.color}`,
          inventory_quantity: parseInt(colorVariant.quantity) || 0,
          weight: 0,
          weight_unit: "kg",
          taxable: true,
          barcode: colorVariant.upc || colorVariant.ean || colorVariant.isbn || colorVariant.mpn || ''
        });
      }
    });
  }
  
  // Default variant if no specific variants
  if (variants.length === 0) {
    variants.push({
      option1: 'Default',
      price: basePrice?.toString?.() || String(basePrice),
      inventory_management: "shopify",
      inventory_policy: "deny",
      requires_shipping: true,
      sku: sku || productID,
      inventory_quantity: parseInt(quantity) || 0,
      weight: 0,
      weight_unit: "kg",
      taxable: true,
      barcode: upc || ean || isbn || mpn || ''
    });
  }
  
  return variants;
};

const buildProductOptions = ({ sizeVariants, colorVariants }) => {
  const options = [];
  
  // Add size option if size variants exist
  if (sizeVariants && sizeVariants.length > 0 && sizeVariants.some(v => v.size)) {
    options.push({
      name: "Size",
      values: sizeVariants.map(v => v.size).filter(Boolean)
    });
  }
  
  // Add color option if color variants exist
  if (colorVariants && colorVariants.length > 0 && colorVariants.some(v => v.color)) {
    options.push({
      name: "Color",
      values: colorVariants.map(v => v.color).filter(Boolean)
    });
  }
  
  return options;
};

const buildMetafields = ({ upc, ean, isbn, mpn, weight, costPrice, salesTax, purchaseTax }) => {
  const metafields = [];
  
  if (upc) metafields.push({ 
    namespace: "custom", 
    key: "upc", 
    value: upc, 
    type: "single_line_text_field" 
  });
  if (ean) metafields.push({ 
    namespace: "custom", 
    key: "ean", 
    value: ean, 
    type: "single_line_text_field" 
  });
  if (isbn) metafields.push({ 
    namespace: "custom", 
    key: "isbn", 
    value: isbn, 
    type: "single_line_text_field" 
  });
  if (mpn) metafields.push({ 
    namespace: "custom", 
    key: "mpn", 
    value: mpn, 
    type: "single_line_text_field" 
  });
  if (weight) metafields.push({ 
    namespace: "custom", 
    key: "weight", 
    value: weight, 
    type: "single_line_text_field" 
  });
  if (costPrice) metafields.push({ 
    namespace: "custom", 
    key: "cost_price", 
    value: costPrice, 
    type: "single_line_text_field" 
  });
  if (salesTax) metafields.push({ 
    namespace: "custom", 
    key: "sales_tax", 
    value: salesTax, 
    type: "single_line_text_field" 
  });
  if (purchaseTax) metafields.push({ 
    namespace: "custom", 
    key: "purchase_tax", 
    value: purchaseTax, 
    type: "single_line_text_field" 
  });
  
  return metafields;
};

// Function to upload images to Shopify
const uploadImagesToShopify = async (productId, images, storeUrl, accessToken, apiVersion) => {
  try {
    const imageData = [];
    
    // Add main image (prefer preview data URL from client, which is serializable)
    if (images.main && (images.main.preview || images.main.file)) {
      try {
        let base64Data = null;
        let filename = images.main?.file?.name || "image-1.png";
        if (images.main.preview && typeof images.main.preview === "string") {
          // Expecting a data URL like data:image/png;base64,XXXX
          const parts = images.main.preview.split(',');
          base64Data = parts.length > 1 ? parts[1] : null;
        }
        if (!base64Data && images.main.file && images.main.file.preview) {
          const parts = images.main.file.preview.split(',');
          base64Data = parts.length > 1 ? parts[1] : null;
        }
        if (base64Data) {
          imageData.push({
            attachment: base64Data,
            filename,
            position: 1
          });
        }
      } catch (error) {
        console.error("Failed to process main image:", error);
      }
    }
    
    // Add size variant images (limit to first 3 to avoid payload issues)
    if (images.size && Array.isArray(images.size)) {
      for (let index = 0; index < Math.min(images.size.length, 3); index++) {
        const img = images.size[index];
        if (img && (img.preview || img.file)) {
          try {
            let base64Data = null;
            let filename = img?.file?.name || `image-size-${index + 1}.png`;
            if (img.preview && typeof img.preview === "string") {
              const parts = img.preview.split(',');
              base64Data = parts.length > 1 ? parts[1] : null;
            }
            if (!base64Data && img.file && img.file.preview) {
              const parts = img.file.preview.split(',');
              base64Data = parts.length > 1 ? parts[1] : null;
            }
            if (base64Data) {
              imageData.push({
                attachment: base64Data,
                filename,
                position: index + 2
              });
            }
          } catch (error) {
            console.error(`Failed to process size image ${index}:`, error);
          }
        }
      }
    }
    
    // Add color variant images (limit to first 3 to avoid payload issues)
    if (images.color && Array.isArray(images.color)) {
      for (let index = 0; index < Math.min(images.color.length, 3); index++) {
        const img = images.color[index];
        if (img && (img.preview || img.file)) {
          try {
            let base64Data = null;
            let filename = img?.file?.name || `image-color-${index + 1}.png`;
            if (img.preview && typeof img.preview === "string") {
              const parts = img.preview.split(',');
              base64Data = parts.length > 1 ? parts[1] : null;
            }
            if (!base64Data && img.file && img.file.preview) {
              const parts = img.file.preview.split(',');
              base64Data = parts.length > 1 ? parts[1] : null;
            }
            if (base64Data) {
              imageData.push({
                attachment: base64Data,
                filename,
                position: imageData.length + 1
              });
            }
          } catch (error) {
            console.error(`Failed to process color image ${index}:`, error);
          }
        }
      }
    }
    
    if (imageData.length > 0) {
      const imageEndpoint = `${storeUrl.replace(/\/$/, "")}/admin/api/${apiVersion}/products/${productId}/images.json`;
      
      // Upload images one by one to avoid overwhelming the API
      for (const image of imageData) {
        try {
          await axios.post(imageEndpoint, { image }, {
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": accessToken,
            },
            timeout: 30000, // 30 second timeout for image uploads
          });
          console.log(`Image uploaded: ${image.filename}`);
        } catch (uploadError) {
          console.error(`Failed to upload image ${image.filename}:`, uploadError?.response?.data || uploadError.message);
        }
      }
    }
  } catch (error) {
    console.error("Error in uploadImagesToShopify:", error);
    throw error;
  }
};

// Note: Do not use FileReader in Node.js environment. We expect client to send
// preview data URLs which we parse server-side into base64 strings.

// BigCommerce helper functions
const buildBigCommerceDescription = ({ salesDescription, itemType, brand, manufacturer, weight, upc, ean, isbn, mpn }) => {
  let description = salesDescription || '';
  
  if (itemType) description += `<p><strong>Type:</strong> ${itemType}</p>`;
  if (brand) description += `<p><strong>Brand:</strong> ${brand}</p>`;
  if (manufacturer) description += `<p><strong>Manufacturer:</strong> ${manufacturer}</p>`;
  if (weight) description += `<p><strong>Weight:</strong> ${weight}</p>`;
  
  // Add identifiers
  const identifiers = [];
  if (upc) identifiers.push(`UPC: ${upc}`);
  if (ean) identifiers.push(`EAN: ${ean}`);
  if (isbn) identifiers.push(`ISBN: ${isbn}`);
  if (mpn) identifiers.push(`MPN: ${mpn}`);
  
  if (identifiers.length > 0) {
    description += `<p><strong>Identifiers:</strong> ${identifiers.join(', ')}</p>`;
  }
  
  return description || `<p>Product details available</p>`;
};

const buildBigCommerceTags = ({ itemType, brand, manufacturer }) => {
  const tags = ['zakapo'];
  if (itemType) tags.push(itemType);
  if (brand) tags.push(brand);
  if (manufacturer) tags.push(manufacturer);
  return tags.join(', ');
};

// BigCommerce expects meta_keywords as an array of strings
const buildBigCommerceMetaKeywords = ({ itemType, brand, manufacturer }) => {
  const keywords = ['zakapo'];
  if (itemType) keywords.push(String(itemType));
  if (brand) keywords.push(String(brand));
  if (manufacturer) keywords.push(String(manufacturer));
  return keywords;
};

const buildBigCommerceVariants = ({ sizeVariants, colorVariants, basePrice, productID, sku, upc, ean, isbn, mpn, quantity }) => {
  const variants = [];
  
  // Handle size variants
  if (sizeVariants && sizeVariants.length > 0) {
    sizeVariants.forEach((sizeVariant, index) => {
      if (sizeVariant.size && sizeVariant.quantity) {
        variants.push({
          option_values: [
            {
              option_display_name: "Size",
              label: sizeVariant.size
            }
          ],
          sku: sku ? `${sku}-${sizeVariant.size}` : `${productID}-${sizeVariant.size}`,
          price: parseFloat(basePrice) || 0.00,
          weight: 0,
          inventory_level: parseInt(sizeVariant.quantity) || 0,
          inventory_warning_level: 0,
          inventory_tracking: "variant"
        });
      }
    });
  }
  
  // Handle color variants
  if (colorVariants && colorVariants.length > 0 && variants.length === 0) {
    colorVariants.forEach((colorVariant, index) => {
      if (colorVariant.color && colorVariant.quantity) {
        variants.push({
          option_values: [
            {
              option_display_name: "Color",
              label: colorVariant.color
            }
          ],
          sku: sku ? `${sku}-${colorVariant.color}` : `${productID}-${colorVariant.color}`,
          price: parseFloat(basePrice) || 0.00,
          weight: 0,
          inventory_level: parseInt(colorVariant.quantity) || 0,
          inventory_warning_level: 0,
          inventory_tracking: "variant"
        });
      }
    });
  }
  
  // If no option-based variants, return empty array so we create a simple product
  // and then set inventory via the inventory endpoint.
  
  return variants;
};

// Function to upload images to BigCommerce
const uploadImagesToBigCommerce = async (productId, images, storeHash, accessToken) => {
  try {
    const imageData = [];
    
    // Add main image (use preview data URL when available)
    if (images.main && (images.main.preview || images.main.file)) {
      try {
        let dataUrl = null;
        if (images.main.preview && typeof images.main.preview === "string") {
          dataUrl = images.main.preview;
        } else if (images.main.file && images.main.file.preview) {
          dataUrl = images.main.file.preview;
        }
        if (dataUrl) {
          imageData.push({
            image_url: dataUrl,
            is_thumbnail: true
          });
        }
      } catch (error) {
        console.error("Failed to process main image:", error);
      }
    }
    
    // Add size variant images (limit to first 3 to avoid payload issues)
    if (images.size && Array.isArray(images.size)) {
      for (let index = 0; index < Math.min(images.size.length, 3); index++) {
        const img = images.size[index];
        if (img && (img.preview || img.file)) {
          try {
            let dataUrl = null;
            if (img.preview && typeof img.preview === "string") {
              dataUrl = img.preview;
            } else if (img.file && img.file.preview) {
              dataUrl = img.file.preview;
            }
            if (dataUrl) {
              imageData.push({
                image_url: dataUrl,
                is_thumbnail: false
              });
            }
          } catch (error) {
            console.error(`Failed to process size image ${index}:`, error);
          }
        }
      }
    }
    
    // Add color variant images (limit to first 3 to avoid payload issues)
    if (images.color && Array.isArray(images.color)) {
      for (let index = 0; index < Math.min(images.color.length, 3); index++) {
        const img = images.color[index];
        if (img && (img.preview || img.file)) {
          try {
            let dataUrl = null;
            if (img.preview && typeof img.preview === "string") {
              dataUrl = img.preview;
            } else if (img.file && img.file.preview) {
              dataUrl = img.file.preview;
            }
            if (dataUrl) {
              imageData.push({
                image_url: dataUrl,
                is_thumbnail: false
              });
            }
          } catch (error) {
            console.error(`Failed to process color image ${index}:`, error);
          }
        }
      }
    }
    
    if (imageData.length > 0) {
      const imageEndpoint = `https://api.bigcommerce.com/stores/${storeHash}/v3/catalog/products/${productId}/images`;
      
      // Upload images one by one to avoid overwhelming the API
      for (const image of imageData) {
        try {
          await axios.post(imageEndpoint, image, {
            headers: {
              "X-Auth-Token": accessToken,
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            timeout: 30000, // 30 second timeout for image uploads
          });
          console.log(`BigCommerce image uploaded: ${image.image_url.substring(0, 50)}...`);
        } catch (uploadError) {
          console.error(`Failed to upload BigCommerce image:`, uploadError?.response?.data || uploadError.message);
        }
      }
    }
  } catch (error) {
    console.error("Error in uploadImagesToBigCommerce:", error);
    throw error;
  }
};

export { addItem, getItems, updateItems, deleteItem };