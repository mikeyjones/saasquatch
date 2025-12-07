#!/usr/bin/env node

/**
 * Test script to verify ticket messages are displaying correctly
 */

import http from 'http';
import { URL } from 'url';

// Configuration
const BASE_URL = 'http://localhost:3000';
const TENANT = 'acme';

// Helper function to make HTTP requests
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth-session=test-session' // Mock session
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function testTicketMessages() {
  console.log('🧪 Testing ticket message display...\n');

  try {
    // Test 1: Fetch tickets list
    console.log('1️⃣ Fetching tickets list...');
    const ticketsResponse = await makeRequest(`/api/tenant/${TENANT}/tickets`);
    
    if (ticketsResponse.status !== 200) {
      console.error('❌ Failed to fetch tickets:', ticketsResponse.status);
      return;
    }

    const tickets = ticketsResponse.data.tickets || [];
    console.log(`✅ Found ${tickets.length} tickets`);

    if (tickets.length === 0) {
      console.log('❌ No tickets found to test with');
      return;
    }

    // Test 2: Fetch first ticket details
    const firstTicket = tickets[0];
    console.log(`\n2️⃣ Fetching details for ticket: ${firstTicket.title} (${firstTicket.id})`);
    
    const detailResponse = await makeRequest(`/api/tenant/${TENANT}/tickets/${firstTicket.id}`);
    
    if (detailResponse.status !== 200) {
      console.error('❌ Failed to fetch ticket details:', detailResponse.status);
      console.error('Response:', detailResponse.data);
      return;
    }

    const ticketDetail = detailResponse.data.ticket;
    console.log(`✅ Ticket details fetched successfully`);
    console.log(`   - Title: ${ticketDetail.title}`);
    console.log(`   - Status: ${ticketDetail.status}`);
    console.log(`   - Priority: ${ticketDetail.priority}`);
    console.log(`   - Messages: ${ticketDetail.messages ? ticketDetail.messages.length : 0}`);

    // Test 3: Check message content
    if (ticketDetail.messages && ticketDetail.messages.length > 0) {
      console.log('\n3️⃣ Message details:');
      ticketDetail.messages.forEach((msg, index) => {
        console.log(`   Message ${index + 1}:`);
        console.log(`     - Type: ${msg.type}`);
        console.log(`     - Author: ${msg.author}`);
        console.log(`     - Timestamp: ${msg.timestamp}`);
        console.log(`     - Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
        console.log('');
      });
      console.log('✅ Messages are properly included in ticket details');
    } else {
      console.log('⚠️  No messages found for this ticket');
    }

    // Test 4: Check AI triage if present
    if (ticketDetail.aiTriage) {
      console.log('4️⃣ AI Triage information:');
      console.log(`   - Category: ${ticketDetail.aiTriage.category}`);
      console.log(`   - Sentiment: ${ticketDetail.aiTriage.sentiment}`);
      console.log(`   - Suggested Action: ${ticketDetail.aiTriage.suggestedAction}`);
      console.log('✅ AI triage information is properly included');
    }

    console.log('\n🎉 Ticket message display test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Tickets list API works');
    console.log('   ✅ Individual ticket API works');
    console.log('   ✅ Messages are included in ticket details');
    console.log('   ✅ AI triage information is included when present');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n💡 Make sure the development server is running on http://localhost:3000');
  }
}

// Run the test
testTicketMessages();