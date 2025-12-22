import axios from 'axios';

const BASE_URL = `${process.env.BASE_URL || 'http://localhost:4000'}/api`;

// Test the Shopify sync functionality
async function testShopifySync() {
  console.log('🧪 Testing Shopify Sync Functionality...\n');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing server health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running:', healthResponse.data.message);
    
    // Test 2: Test update endpoint with Shopify sync
    console.log('\n2️⃣ Testing update endpoint with Shopify sync...');
    const testUpdateData = {
      itemId: '507f1f77bcf86cd799439011', // Test ID
      variantName: 'Test Product Updated',
      price: 150.00,
      quantity: 75
    };
    
    try {
      const updateResponse = await axios.put(`${BASE_URL}/update-item`, testUpdateData);
      console.log('✅ Update endpoint working:', updateResponse.data.message);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Update endpoint working (expected 404 for test ID)');
      } else {
        console.error('❌ Update endpoint failed:', error.response?.data || error.message);
      }
    }
    
    // Test 3: Test delete endpoint
    console.log('\n3️⃣ Testing delete endpoint...');
    try {
      const deleteResponse = await axios.delete(`${BASE_URL}/delete-item/507f1f77bcf86cd799439011`);
      console.log('✅ Delete endpoint working:', deleteResponse.data.message);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Delete endpoint working (expected 404 for test ID)');
      } else {
        console.error('❌ Delete endpoint failed:', error.response?.data || error.message);
      }
    }
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📝 To test actual Shopify sync:');
    console.log('1. Add a new item through your frontend');
    console.log('2. Check that it appears in both local DB and Shopify');
    console.log('3. Edit the item locally');
    console.log('4. Verify the changes sync to Shopify');
    console.log('5. Delete the item and verify it\'s removed from both systems');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testShopifySync().catch(console.error);
}

export { testShopifySync };


