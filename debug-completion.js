// Debug script to test task completion endpoint
// Run this in the browser console while logged into MindOS

async function debugTaskCompletion(itemId) {
    console.log('🔍 Testing task completion for item:', itemId);
    
    // Get the auth token
    const authToken = localStorage.getItem('mindos_token');
    if (!authToken) {
        console.error('❌ No auth token found. Please log in first.');
        return;
    }
    
    // First, get the current item status
    console.log('1️⃣ Fetching current item status...');
    try {
        const getResponse = await fetch(`/api/memories/${itemId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!getResponse.ok) {
            console.error('❌ Failed to fetch item:', getResponse.status, await getResponse.text());
            return;
        }
        
        const currentItem = await getResponse.json();
        console.log('✅ Current item:', currentItem);
        console.log('   Status:', currentItem.status);
        console.log('   Type:', currentItem.type);
        
        // Try to update the status
        console.log('2️⃣ Attempting to mark as completed...');
        const updateData = {
            status: 'completed'
        };
        
        console.log('📤 Sending update:', updateData);
        
        const updateResponse = await fetch(`/api/memories/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(updateData)
        });
        
        console.log('📥 Response status:', updateResponse.status);
        const responseText = await updateResponse.text();
        console.log('📥 Response body:', responseText);
        
        if (updateResponse.ok) {
            const updatedItem = JSON.parse(responseText);
            console.log('✅ SUCCESS! Item updated:', updatedItem);
            console.log('   New status:', updatedItem.status);
        } else {
            console.error('❌ Update failed:', responseText);
        }
        
    } catch (error) {
        console.error('❌ Error during completion test:', error);
    }
}

// Test with different update payloads
async function testDifferentUpdates(itemId) {
    const authToken = localStorage.getItem('mindos_token');
    
    const testPayloads = [
        { status: 'completed' },
        { status: 'completed', completed_date: new Date().toISOString().split('T')[0] },
        { status: 'completed', modified: new Date().toISOString().split('T')[0] }
    ];
    
    for (let i = 0; i < testPayloads.length; i++) {
        console.log(`\n🧪 Test ${i + 1}: Testing payload:`, testPayloads[i]);
        
        try {
            const response = await fetch(`/api/memories/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(testPayloads[i])
            });
            
            console.log('Response status:', response.status);
            const result = await response.text();
            console.log('Response:', result);
            
            if (response.ok) {
                console.log('✅ This payload worked!');
                break;
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

// Get database schema info
async function checkDatabaseSchema() {
    try {
        // This endpoint doesn't require auth
        const response = await fetch('/api/debug/schema');
        
        if (response.ok) {
            const schema = await response.json();
            console.log('📊 Database schema:', schema);
            return schema;
        }
    } catch (error) {
        console.error('Error fetching schema:', error);
    }
}

// Check if user is logged in
function checkAuth() {
    const authToken = localStorage.getItem('mindos_token');
    if (!authToken) {
        console.error('❌ Not logged in! Please log in first.');
        console.log('💡 Tip: Check if the token key is correct. Looking for: mindos_token');
        console.log('📦 Current localStorage keys:', Object.keys(localStorage));
        return false;
    }
    console.log('✅ Auth token found:', authToken.substring(0, 20) + '...');
    return true;
}

// Instructions
console.log(`
🔧 Debug Functions Available:
================================
1. checkAuth() - Verify you're logged in
2. debugTaskCompletion(itemId) - Test marking a task as completed
3. testDifferentUpdates(itemId) - Try different update payloads
4. checkDatabaseSchema() - Check what columns are available
5. listItemIds() - List all item IDs in your feed

Example usage:
- First run: checkAuth()
- Then find an item ID: listItemIds()
- Then test: debugTaskCompletion(123)
`);

// Helper to list all item IDs
function listItemIds() {
    const items = document.querySelectorAll('[data-item-id]');
    if (items.length === 0) {
        console.log('❌ No items found in the feed');
        return;
    }
    
    console.log(`📋 Found ${items.length} items:`);
    items.forEach((item, index) => {
        const id = item.getAttribute('data-item-id');
        const title = item.querySelector('.card-title')?.textContent || 'No title';
        console.log(`   ${index + 1}. ID: ${id} - "${title}"`);
    });
}

// Export to window for easy access
window.debugTaskCompletion = debugTaskCompletion;
window.testDifferentUpdates = testDifferentUpdates;
window.checkDatabaseSchema = checkDatabaseSchema;
window.checkAuth = checkAuth;
window.listItemIds = listItemIds;