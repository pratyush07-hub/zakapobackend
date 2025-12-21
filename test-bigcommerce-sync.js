import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const BASE_URL = process.env.BASE_URL || "http://localhost:4000";

// Test data
const testItem = {
  productID: "TEST-BC-001",
  variantName: "BigCommerce Test Product",
  quantity: 50,
  price: "29.99",
  userId: "507f1f77bcf86cd799439011", // Replace with actual user ID
  itemName: "BigCommerce Test Product",
  itemType: "physical",
  sku: "TEST-BC-001",
  brand: "Test Brand",
  manufacturer: "Test Manufacturer",
  weight: "0.5",
  salesDescription: "This is a test product for BigCommerce integration"
};

// Test BigCommerce API endpoints
const testBigCommerceIntegration = async () => {
  console.log("🚀 Testing BigCommerce Integration...\n");

  try {
    // Test 1: Add item (should create in local DB, Shopify, and BigCommerce)
    console.log("1️⃣ Testing Add Item...");
    const addResponse = await axios.post(`${BASE_URL}/api/add-item`, testItem);
    console.log("✅ Add Item Response:", {
      status: addResponse.status,
      message: addResponse.data.message,
      local: addResponse.data.data.local ? "✅ Created" : "❌ Failed",
      shopify: addResponse.data.data.shopify ? "✅ Created" : "❌ Failed",
      bigcommerce: addResponse.data.data.bigcommerce ? "✅ Created" : "❌ Failed"
    });

    if (addResponse.data.data.local) {
      const itemId = addResponse.data.data.local._id;
      const shopifyId = addResponse.data.data.shopify?.id;
      const bigcommerceId = addResponse.data.data.bigcommerce?.id;

      console.log(`   📍 Item ID: ${itemId}`);
      console.log(`   🛍️  Shopify ID: ${shopifyId || 'N/A'}`);
      console.log(`   🛒 BigCommerce ID: ${bigcommerceId || 'N/A'}`);

      // Test 2: Update item (should sync to all platforms)
      if (itemId) {
        console.log("\n2️⃣ Testing Update Item...");
        const updateData = {
          itemId: itemId,
          variantName: "Updated BigCommerce Test Product",
          price: "39.99",
          quantity: 75
        };

        const updateResponse = await axios.put(`${BASE_URL}/api/update-item`, updateData);
        console.log("✅ Update Item Response:", {
          status: updateResponse.status,
          message: updateResponse.data.message
        });

        // Test 3: Get BigCommerce products
        console.log("\n3️⃣ Testing Get BigCommerce Products...");
        try {
          const bcProductsResponse = await axios.get(`${BASE_URL}/api/bigcommerce`);
          console.log("✅ BigCommerce Products Response:", {
            status: bcProductsResponse.status,
            productCount: bcProductsResponse.data.data?.products?.length || 0
          });
        } catch (error) {
          console.log("❌ BigCommerce Products Error:", error.response?.data?.message || error.message);
        }

        // Test 4: Delete item (should delete from all platforms)
        console.log("\n4️⃣ Testing Delete Item...");
        const deleteResponse = await axios.delete(`${BASE_URL}/api/delete-item/${itemId}`);
        console.log("✅ Delete Item Response:", {
          status: deleteResponse.status,
          message: deleteResponse.data.message
        });
      }
    }

  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
};

// Test BigCommerce direct API endpoints
const testBigCommerceDirectAPI = async () => {
  console.log("\n🔧 Testing BigCommerce Direct API Endpoints...\n");

  try {
    // Test 1: Get BigCommerce products
    console.log("1️⃣ Testing GET /api/bigcommerce...");
    const getResponse = await axios.get(`${BASE_URL}/api/bigcommerce`);
    console.log("✅ GET Response:", {
      status: getResponse.status,
      success: getResponse.data.success,
      productCount: getResponse.data.data?.products?.length || 0
    });

    // Test 2: Update BigCommerce product (if products exist)
    if (getResponse.data.data?.products?.length > 0) {
      const firstProduct = getResponse.data.data.products[0];
      console.log(`\n2️⃣ Testing PUT /api/bigcommerce with product ID: ${firstProduct.bigcommerceId}...`);
      
      const updateData = {
        bigcommerceId: firstProduct.bigcommerceId,
        name: "Updated via Direct API",
        price: "49.99",
        quantity: 100
      };

      const updateResponse = await axios.put(`${BASE_URL}/api/bigcommerce`, updateData);
      console.log("✅ PUT Response:", {
        status: updateResponse.status,
        success: updateResponse.data.success,
        message: updateResponse.data.message
      });
    } else {
      console.log("2️⃣ Skipping PUT test - no BigCommerce products found");
    }

  } catch (error) {
    console.error("❌ Direct API test failed:", error.response?.data || error.message);
  }
};

// Main test execution
const runTests = async () => {
  console.log("🧪 Starting BigCommerce Integration Tests...\n");
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔑 BigCommerce Store Hash: ${process.env.BIGCOMMERCE_STORE_HASH || 'Not configured'}`);
  console.log(`🔑 BigCommerce Access Token: ${process.env.BIGCOMMERCE_ACCESS_TOKEN ? 'Configured' : 'Not configured'}`);
  console.log(`🔑 BigCommerce Client ID: ${process.env.BIGCOMMERCE_CLIENT_ID || 'Not configured'}`);
  console.log(`🔑 BigCommerce Client Secret: ${process.env.BIGCOMMERCE_CLIENT_SECRET ? 'Configured' : 'Not configured'}\n`);

  await testBigCommerceIntegration();
  await testBigCommerceDirectAPI();

  console.log("\n✨ BigCommerce Integration Tests Completed!");
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testBigCommerceIntegration, testBigCommerceDirectAPI };
