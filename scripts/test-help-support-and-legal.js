const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { Client } = require('C:/kings-taxi-db-test/node_modules/pg');

// Import compiled backend modules from dist
const { prisma } = require('../backend/dist/core/database/prisma');
const { supportService } = require('../backend/dist/modules/support/support.service');
const { renderAdminSupportDashboardHtml } = require('../backend/dist/modules/support/adminSupportDashboard');

async function runTestSuite() {
  console.log('================================================================');
  console.log('  KINGS TAXI — HELP & SUPPORT, TERMS & PRIVACY AUDIT & TEST     ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: DATABASE SCHEMA & MIGRATIONS
    // -------------------------------------------------------------------------
    console.log('\n--- 1. DATABASE SCHEMA & INTEGRITY AUDIT ---');

    const tblRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('support_tickets', 'support_messages')
    `);
    assert(tblRes.rows.length === 2, 'support_tickets and support_messages tables exist in PostgreSQL');

    const enumsRes = await client.query(`
      SELECT typname FROM pg_type WHERE typname IN ('SupportCategory', 'SupportTicketStatus', 'SupportSenderType')
    `);
    assert(enumsRes.rows.length === 3, 'SupportCategory, SupportTicketStatus, and SupportSenderType enums exist in PostgreSQL');

    const fkRes = await client.query(`
      SELECT constraint_name, table_name FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY' AND table_name IN ('support_tickets', 'support_messages')
    `);
    assert(fkRes.rows.length >= 3, `Foreign key constraints configured properly (found ${fkRes.rows.length} FK constraints)`);

    const migCheck = await client.query(
      "SELECT id FROM _prisma_migrations WHERE migration_name = '20261114000000_add_help_and_support_module'"
    );
    assert(migCheck.rows.length > 0, 'Migration recorded in _prisma_migrations ledger');

    // -------------------------------------------------------------------------
    // SUITE 2: TEST PASSENGER & AUTH SETUP
    // -------------------------------------------------------------------------
    console.log('\n--- 2. TEST PASSENGERS & DATA ISOLATION ---');

    // Find or create two test passengers for IDOR testing
    let p1 = await prisma.passenger.findFirst({
      where: { phoneNumber: '+251911990001' }
    });
    if (!p1) {
      p1 = await prisma.passenger.create({
        data: {
          phoneNumber: '+251911990001',
          fullName: 'Abebe Bikila Support Test',
          email: 'abebe.support@kingstaxi.et',
          passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash1',
          accountStatus: 'ACTIVE',
        }
      });
    }
    assert(!!p1?.id, 'Test Passenger 1 created/found (Abebe Bikila)');

    let p2 = await prisma.passenger.findFirst({
      where: { phoneNumber: '+251911990002' }
    });
    if (!p2) {
      p2 = await prisma.passenger.create({
        data: {
          phoneNumber: '+251911990002',
          fullName: 'Derartu Tulu Support Test',
          email: 'derartu.support@kingstaxi.et',
          passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash2',
          accountStatus: 'ACTIVE',
        }
      });
    }
    assert(!!p2?.id, 'Test Passenger 2 created/found (Derartu Tulu)');

    // -------------------------------------------------------------------------
    // SUITE 3: PASSENGER TICKET CREATION & NUMBERING
    // -------------------------------------------------------------------------
    console.log('\n--- 3. PASSENGER SUPPORT TICKET CREATION ---');

    const newTicket = await supportService.createPassengerTicket(p1.id, {
      category: 'PAYMENT_ISSUE',
      priority: 'HIGH',
      subject: 'Telebirr deduction query for trip to Gondar Castles',
      message: 'Hello support, my Telebirr account was debited 250 ETB but the driver app showed waiting for gateway.',
    });

    assert(!!newTicket.id, 'Support ticket created with UUID');
    assert(newTicket.ticketNumber.startsWith('KT-TKT-'), `Generated human-readable ticket number (${newTicket.ticketNumber})`);
    assert(newTicket.status === 'OPEN', 'Initial ticket status is OPEN');
    assert(newTicket.priority === 'HIGH', 'Ticket priority set to HIGH');
    assert(newTicket.category === 'PAYMENT_ISSUE', 'Category set to PAYMENT_ISSUE');
    assert(newTicket.messages.length === 1, 'Initial conversation message created transactionally');
    assert(newTicket.messages[0].senderType === 'PASSENGER', 'Initial message senderType is PASSENGER');
    assert(newTicket.messages[0].message.includes('Telebirr account was debited'), 'Message content matches input');

    // -------------------------------------------------------------------------
    // SUITE 4: PASSENGER TICKET LISTING & RETRIEVAL
    // -------------------------------------------------------------------------
    console.log('\n--- 4. PASSENGER TICKET LISTING & ORDERING ---');

    const p1List = await supportService.listPassengerTickets(p1.id, { limit: 10 });
    assert(p1List.items.length > 0, `Passenger 1 ticket list returned ${p1List.items.length} item(s)`);
    assert(p1List.items.some(t => t.id === newTicket.id), 'Newly created ticket found in passenger list');
    assert(typeof p1List.total === 'number' && p1List.total >= 1, 'Total count returned properly');

    // -------------------------------------------------------------------------
    // SUITE 5: IDOR SECURITY ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log('\n--- 5. IDOR & ACCESS CONTROL VERIFICATION ---');

    let idorBlocked = false;
    try {
      // Passenger 2 tries to access Passenger 1's ticket
      await supportService.getPassengerTicket(p2.id, newTicket.id);
    } catch (err) {
      idorBlocked = err.statusCode === 403 || err.message.includes('forbidden');
    }
    assert(idorBlocked, 'IDOR Protection: Passenger 2 is strictly forbidden from accessing Passenger 1 ticket');

    // Passenger 1 accesses their own ticket
    const p1TicketDetail = await supportService.getPassengerTicket(p1.id, newTicket.id);
    assert(p1TicketDetail.id === newTicket.id, 'Owner (Passenger 1) successfully retrieves full ticket detail');
    assert(p1TicketDetail.messages.length === 1, 'Conversation contains initial message');

    // -------------------------------------------------------------------------
    // SUITE 6: SUPER ADMIN OVERVIEW & INBOX MANAGEMENT
    // -------------------------------------------------------------------------
    console.log('\n--- 6. SUPER ADMIN INBOX & OVERVIEW ---');

    const overview = await supportService.getAdminOverview();
    assert(overview.total >= 1, `Overview total tickets: ${overview.total}`);
    assert(overview.open >= 1, `Overview open tickets: ${overview.open}`);
    assert(overview.unreadPassengerMessages >= 1, `Overview unread passenger messages: ${overview.unreadPassengerMessages}`);

    const adminTickets = await supportService.listAdminTickets({
      search: newTicket.ticketNumber,
    });
    assert(adminTickets.items.length === 1, `Admin search by ticket number (${newTicket.ticketNumber}) returned exact match`);
    assert(adminTickets.items[0].passenger?.fullName === p1.fullName, 'Admin ticket includes passenger profile summary');

    // Admin opens ticket -> marks passenger message as read
    const adminTicketView = await supportService.getAdminTicket(newTicket.id);
    assert(adminTicketView.messages.length === 1, 'Admin viewed ticket messages');

    // Verify unread count decreased or message readAt is set
    const dbMsg = await prisma.supportMessage.findFirst({
      where: { ticketId: newTicket.id, senderType: 'PASSENGER' }
    });
    assert(dbMsg.readAt !== null, 'Passenger message automatically marked read when viewed by admin');

    // -------------------------------------------------------------------------
    // SUITE 7: SUPER ADMIN REPLY & STATUS TRANSITION
    // -------------------------------------------------------------------------
    console.log('\n--- 7. SUPER ADMIN REPLY & STATUS TRANSITION ---');

    const testAdminUuid = randomUUID();
    const adminReply = await supportService.addAdminMessage(
      testAdminUuid,
      'Yared Dispatch Admin',
      newTicket.id,
      { message: 'Hello Abebe, we verified with Telebirr gateway. The duplicate charge has been reversed to your wallet.' }
    );
    assert(adminReply.senderType === 'ADMIN', 'Admin reply created with senderType: ADMIN');
    assert(adminReply.senderName === 'Yared Dispatch Admin', 'Sender name reflects admin identity');

    // Verify ticket status transitioned to WAITING_FOR_PASSENGER
    const updatedTicket = await prisma.supportTicket.findUnique({ where: { id: newTicket.id } });
    assert(updatedTicket.status === 'WAITING_FOR_PASSENGER', 'Ticket status transitioned to WAITING_FOR_PASSENGER upon admin reply');
    assert(updatedTicket.assignedAdminName === 'Yared Dispatch Admin', 'Assigned admin name recorded');

    // -------------------------------------------------------------------------
    // SUITE 8: PASSENGER REPLY & UNREAD TRACKING
    // -------------------------------------------------------------------------
    console.log('\n--- 8. PASSENGER REPLY & CONVERSATION CONTINUITY ---');

    // Check passenger view: admin message should show unread count = 1 before view
    const p1ListAfterReply = await supportService.listPassengerTickets(p1.id, { limit: 10 });
    const p1TicketSummary = p1ListAfterReply.items.find(t => t.id === newTicket.id);
    assert(p1TicketSummary.unreadCount === 1, 'Passenger ticket list flags 1 unread message from support');

    // Passenger opens ticket -> marks admin message read
    await supportService.getPassengerTicket(p1.id, newTicket.id);
    const dbAdminMsg = await prisma.supportMessage.findFirst({
      where: { ticketId: newTicket.id, senderType: 'ADMIN' }
    });
    assert(dbAdminMsg.readAt !== null, 'Admin reply automatically marked read when viewed by passenger');

    // Passenger replies
    const pReply = await supportService.addPassengerMessage(p1.id, newTicket.id, {
      message: 'Thank you Yared, confirmed received the 250 ETB refund in Telebirr! All good.'
    });
    assert(pReply.senderType === 'PASSENGER', 'Passenger response successfully appended to thread');

    // Check status re-opened to IN_PROGRESS
    const ticketAfterPReply = await prisma.supportTicket.findUnique({ where: { id: newTicket.id } });
    assert(ticketAfterPReply.status === 'IN_PROGRESS', 'Ticket status transitioned back to IN_PROGRESS upon passenger follow-up');

    // -------------------------------------------------------------------------
    // SUITE 9: TICKET RESOLUTION & CLOSURE STATE MACHINE
    // -------------------------------------------------------------------------
    console.log('\n--- 9. TICKET RESOLUTION & CLOSURE STATE MACHINE ---');

    const resolvedTicket = await supportService.updateTicketStatus(testAdminUuid, newTicket.id, {
      status: 'RESOLVED',
      resolutionNotes: 'Refund confirmed and verified by passenger.',
    });
    assert(resolvedTicket.status === 'RESOLVED', 'Ticket marked RESOLVED');
    assert(resolvedTicket.resolvedAt !== null, 'resolvedAt timestamp recorded');
    assert(resolvedTicket.resolutionNotes.includes('Refund confirmed'), 'Resolution notes saved');

    const closedTicket = await supportService.updateTicketStatus(testAdminUuid, newTicket.id, {
      status: 'CLOSED',
    });
    assert(closedTicket.status === 'CLOSED', 'Ticket marked CLOSED');
    assert(closedTicket.closedAt !== null, 'closedAt timestamp recorded');

    // Verify reply to closed ticket is rejected
    let replyClosedBlocked = false;
    try {
      await supportService.addPassengerMessage(p1.id, newTicket.id, {
        message: 'Can I ask one more thing?'
      });
    } catch (err) {
      replyClosedBlocked = err.statusCode === 400 && err.message.includes('closed');
    }
    assert(replyClosedBlocked, 'Closed Ticket Rule: Passenger replies to CLOSED tickets are strictly rejected');

    // -------------------------------------------------------------------------
    // SUITE 10: SUPER ADMIN HTML DASHBOARD RENDER
    // -------------------------------------------------------------------------
    console.log('\n--- 10. SUPER ADMIN HTML DASHBOARD AUDIT ---');

    const html = renderAdminSupportDashboardHtml();
    assert(typeof html === 'string' && html.length > 5000, 'HTML Admin Portal generated (>5KB code)');
    assert(html.includes('Kings Taxi Support Center'), 'Contains platform branding');
    assert(html.includes('#502D0A') && html.includes('#A36B31') && html.includes('#EDD987'), 'Adheres strictly to Gold & Chocolate color tokens');
    assert(html.includes('drawerMessageThread'), 'Includes real-time conversation drawer markup');
    assert(html.includes('loadDashboardData'), 'Includes asynchronous client fetch logic');

    // -------------------------------------------------------------------------
    // SUITE 11: TERMS OF SERVICE & PRIVACY POLICY COMPLIANCE AUDIT
    // -------------------------------------------------------------------------
    console.log('\n--- 11. TERMS OF SERVICE & PRIVACY POLICY AUDIT ---');

    const tosPath = path.join(__dirname, '../apps/passenger-mobile/src/content/termsOfService.ts');
    const tosContent = fs.readFileSync(tosPath, 'utf8');
    assert(fs.existsSync(tosPath), 'termsOfService.ts exists');
    assert(tosContent.includes('[LEGAL_PLACEHOLDER:'), 'Terms of Service explicitly contains [LEGAL_PLACEHOLDER: ...] tags');
    assert(tosContent.includes('Gondar City') && tosContent.includes('Atse Tewodros Airport'), 'Terms specifically cover Gondar City and Atse Tewodros Airport (GDQ)');
    assert(tosContent.includes('Telebirr') && tosContent.includes('Chapa') && tosContent.includes('CBE Birr'), 'Terms cover Ethiopian payment gateways');
    assert(tosContent.includes('Fasil Ghebbi') && tosContent.includes('Heritage Tours'), 'Terms cover verified heritage tours');

    const ppPath = path.join(__dirname, '../apps/passenger-mobile/src/content/privacyPolicy.ts');
    const ppContent = fs.readFileSync(ppPath, 'utf8');
    assert(fs.existsSync(ppPath), 'privacyPolicy.ts exists');
    assert(ppContent.includes('[LEGAL_PLACEHOLDER:'), 'Privacy Policy explicitly contains [LEGAL_PLACEHOLDER: ...] tags');
    assert(ppContent.includes('Cloudinary'), 'Privacy Policy documents Cloudinary account-isolated avatar storage');
    assert(ppContent.includes('GPS') && ppContent.includes('Telebirr'), 'Privacy Policy accurately documents GPS and payment handling');
    assert(ppContent.includes('Argon2id') && ppContent.includes('JWT'), 'Privacy Policy reflects real cryptographic infrastructure');

    // -------------------------------------------------------------------------
    // SUITE 12: FRONTEND COMPONENT & SCREEN ROUTING AUDIT
    // -------------------------------------------------------------------------
    console.log('\n--- 12. PASSENGER MOBILE SCREENS & ROUTING AUDIT ---');

    const files = [
      'apps/passenger-mobile/src/services/passengerSupport.service.ts',
      'apps/passenger-mobile/src/components/LegalDocumentView.tsx',
      'apps/passenger-mobile/app/legal/terms.tsx',
      'apps/passenger-mobile/app/legal/privacy.tsx',
      'apps/passenger-mobile/app/support/index.tsx',
      'apps/passenger-mobile/app/support/create.tsx',
      'apps/passenger-mobile/app/support/[id].tsx',
    ];

    files.forEach(f => {
      const fullPath = path.join(__dirname, '..', f);
      assert(fs.existsSync(fullPath), `Verified mobile file exists: ${f}`);
    });

    const profilePath = path.join(__dirname, '../apps/passenger-mobile/app/(tabs)/profile.tsx');
    const profileContent = fs.readFileSync(profilePath, 'utf8');
    assert(profileContent.includes('/legal/terms'), 'Profile screen links to /legal/terms');
    assert(profileContent.includes('/legal/privacy'), 'Profile screen links to /legal/privacy');
    assert(profileContent.includes('/support'), 'Profile screen links to /support');

    console.log('\n================================================================');
    console.log(`  AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ Test Suite crashed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
    await prisma.$disconnect();
  }
}

runTestSuite();
