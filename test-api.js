import axios from 'axios';

const BASE_URL = `${process.env.BASE_URL || 'http://localhost:4000'}/api`;

// Test data
const testItem = {
  productID: 'TEST-001',
  variantName: 'Test Product',
  quantity: 10,
  price: 29.99,
  userId: '507f1f77bcf86cd799439011', // Mock ObjectId
  itemName: 'Test Product',
  itemType: 'Test',
  sku: 'TEST-SKU-001'
};

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoints...\n');

    // Test 1: Add item
    console.log('1️⃣ Testing Add Item...');
    const addResponse = await axios.post(`${BASE_URL}/add-item`, testItem);
    console.log('✅ Add Item Response:', {
      status: addResponse.status,
      success: addResponse.data.message,
      itemId: addResponse.data.data?.local?._id
    });

    const itemId = addResponse.data.data?.local?._id;
    if (!itemId) {
      console.log('❌ No item ID returned, cannot continue tests');
      return;
    }

    // Test 2: Get items
    console.log('\n2️⃣ Testing Get Items...');
    const getResponse = await axios.get(`${BASE_URL}/get-item?userId=${testItem.userId}`);
    console.log('✅ Get Items Response:', {
      status: getResponse.status,
      itemCount: getResponse.data.items?.length || 0
    });

    // Test 3: Update item
    console.log('\n3️⃣ Testing Update Item...');
    const updateData = {
      itemId: itemId,
      variantName: 'Updated Test Product',
      price: 39.99,
      quantity: 15
    };
    const updateResponse = await axios.put(`${BASE_URL}/update-item`, updateData);
    console.log('✅ Update Item Response:', {
      status: updateResponse.status,
      success: updateResponse.data.message,
      updatedItem: updateResponse.data.data
    });

    // Test 4: Delete item
    console.log('\n4️⃣ Testing Delete Item...');
    const deleteResponse = await axios.delete(`${BASE_URL}/delete-item/${itemId}`);
    console.log('✅ Delete Item Response:', {
      status: deleteResponse.status,
      success: deleteResponse.data.message
    });

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testAPI();


